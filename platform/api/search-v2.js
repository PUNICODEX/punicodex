/**
 * Search Engine Kernel v2 — Universal vertical search with personalization,
 * instant answers, A/B ranking, cursor pagination, and query intelligence.
 */
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const { searchWeb } = require('./crawler-db');
const { didYouMean, relatedSearches, autocomplete } = require('./query-intel');
const { askOracle, detectIntent } = require('./oracle');
const { getDbPath } = require('../db/db');
const { normalizeQuery: normalizeSearchQuery, toSearchKey } = require('./query-normalize');
const { analyzeConfusables } = require('./confusables');
const { classifyTerm } = require('./homograph-service');
const { getOrSetJson } = require('./redis-client');
const tenantAds = require('./tenant-ads-service');

const DB_PATH = getDbPath();
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Migration: ensure v2 personalization / analytics tables exist.
 * Safe to call repeatedly.
 */
function migrateSearchV2() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS search_sessions (
      token TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      preferences TEXT DEFAULT '{}',
      ab_variant TEXT DEFAULT 'control'
    );

    CREATE TABLE IF NOT EXISTS search_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token TEXT,
      query TEXT NOT NULL,
      site_id INTEGER,
      entry_id TEXT,
      helpful INTEGER DEFAULT 0,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_feedback_session ON search_feedback(session_token);
    CREATE INDEX IF NOT EXISTS idx_feedback_query ON search_feedback(query);
    CREATE INDEX IF NOT EXISTS idx_feedback_site ON search_feedback(site_id);

    CREATE TABLE IF NOT EXISTS ab_assignments (
      session_token TEXT PRIMARY KEY,
      variant TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trending_searches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      vertical TEXT DEFAULT 'all',
      count INTEGER DEFAULT 1,
      last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(query, vertical)
    );

    CREATE INDEX IF NOT EXISTS idx_trending_query ON trending_searches(query);
    CREATE INDEX IF NOT EXISTS idx_trending_last ON trending_searches(last_seen_at);
  `);
}

const LORE_CATALOG = loadLoreCatalog();

function loadLoreCatalog() {
  try {
    return require('../browser/renderer/lore-catalog.json');
  } catch (_e) {
    return {};
  }
}

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/v1/names', description: 'List or search scholarly names' },
  { method: 'GET', path: '/api/v1/names/:id', description: 'Full record for a name' },
  { method: 'GET', path: '/api/v1/names/:id/variants', description: 'Alternate Unicode forms' },
  {
    method: 'GET',
    path: '/api/v1/names/:id/breakdown',
    description: 'ASCII → Unicode transformation',
  },
  {
    method: 'GET',
    path: '/api/v1/names/:id/original-script',
    description: 'Original writing system',
  },
  { method: 'GET', path: '/api/v1/pantheons', description: 'List pantheons' },
  { method: 'GET', path: '/api/v1/tiers', description: 'Tier system documentation' },
  { method: 'GET', path: '/api/v1/autocomplete', description: 'Autocomplete suggestions' },
  { method: 'GET', path: '/api/v1/convert', description: 'Convert a query to punycode' },
  { method: 'POST', path: '/api/v1/convert/batch', description: 'Batch conversion' },
  { method: 'GET', path: '/api/v1/version', description: 'Dataset version manifest' },
  { method: 'GET', path: '/api/v1/openapi.json', description: 'OpenAPI specification' },
  { method: 'GET', path: '/api/v1/docs', description: 'Interactive Swagger UI' },
  { method: 'GET', path: '/api/search/web', description: 'Legacy web search' },
  {
    method: 'GET',
    path: '/api/search/v2',
    description: 'Universal vertical search (this endpoint)',
  },
  { method: 'POST', path: '/api/crawl', description: 'Crawl a single domain' },
  { method: 'GET', path: '/api/oracle', description: 'Scholarly Oracle answers' },
];

const VALID_VERTICALS = ['all', 'sites', 'domains', 'lore', 'api', 'images', 'history', 'ads'];
const VALID_SORTS = ['relevance', 'alphabetical', 'tier', 'recently_crawled', 'quality'];
const RANK_VARIANTS = ['control', 'freshness', 'authority', 'engagement', 'keyword'];

function getSessionToken(req) {
  const header = req.headers['x-session-token'] || '';
  if (header.length >= 8 && header.length <= 64) return header;

  // Derive a stable anonymous token from UA + IP (not personally identifying)
  const ua = req.headers['user-agent'] || '';
  const ip = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || '';
  if (!ua && !ip) return null;
  return crypto.createHash('sha256').update(`punycodex:${ua}:${ip}`).digest('hex').substring(0, 32);
}

function getOrCreateSession(token) {
  if (!token) return null;
  const db = getDb();
  migrateSearchV2();
  let row = db.prepare('SELECT * FROM search_sessions WHERE token = ?').get(token);
  if (!row) {
    const variant = assignVariant(token);
    const insert = db.prepare(
      'INSERT OR IGNORE INTO search_sessions (token, ab_variant) VALUES (?, ?)'
    );
    insert.run(token, variant);
    row = db.prepare('SELECT * FROM search_sessions WHERE token = ?').get(token);
  }
  db.prepare("UPDATE search_sessions SET last_seen_at = datetime('now') WHERE token = ?").run(
    token
  );
  return {
    token: row.token,
    preferences: parseJson(row.preferences, {}),
    variant: row.ab_variant,
  };
}

function assignVariant(token) {
  const db = getDb();
  const existing = db
    .prepare('SELECT variant FROM ab_assignments WHERE session_token = ?')
    .get(token);
  if (existing) return existing.variant;

  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const idx = parseInt(hash.substring(0, 8), 16) % RANK_VARIANTS.length;
  const variant = RANK_VARIANTS[idx];
  db.prepare('INSERT OR IGNORE INTO ab_assignments (session_token, variant) VALUES (?, ?)').run(
    token,
    variant
  );
  return variant;
}

function parseJson(str, fallback) {
  try {
    return JSON.parse(str || '{}');
  } catch {
    return fallback;
  }
}

function encodeCursor(offset) {
  return Buffer.from(`v2:${offset}`).toString('base64url');
}

function decodeCursor(cursor) {
  if (!cursor) return 0;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const match = decoded.match(/^v2:(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Main v2 search entry point.
 */
async function searchV2(q, options = {}, req = null) {
  const startTime = Date.now();
  migrateSearchV2();

  const rawQ = (q || '').trim();
  if (!rawQ) {
    return emptyResponse(rawQ);
  }

  const sessionToken =
    (options.sessionToken && options.sessionToken.length >= 8 && options.sessionToken.length <= 64
      ? options.sessionToken
      : null) || (req ? getSessionToken(req) : null);
  const session = sessionToken ? getOrCreateSession(sessionToken) : null;
  const normalizedQ = normalizeSearchInput(rawQ);
  const spellSuggestion = await maybeCorrectSpell(normalizedQ);
  const finalQ = spellSuggestion?.use || normalizedQ;

  const oracleMode = options.oracle === 'true' || options.oracle === true;
  const vertical = oracleMode
    ? 'lore'
    : VALID_VERTICALS.includes(options.vertical)
      ? options.vertical
      : 'all';
  const limit = Math.min(Math.max(1, parseInt(options.limit, 10) || 20), 100);
  const offset = decodeCursor(options.cursor);
  const sort = VALID_SORTS.includes(options.sort) ? options.sort : 'relevance';
  const filters = {
    pantheon: options.pantheon || null,
    tier: options.tier || null,
    unicodeOnly: options.unicodeOnly === 'true' || options.unicodeOnly === true,
    hasSite: options.hasSite === 'true' || options.hasSite === true,
    concept: options.concept || null,
    trust: ['safe', 'canonical', 'styled', 'all'].includes(options.trust) ? options.trust : 'safe',
  };

  const requestedVariant = RANK_VARIANTS.includes(options.variant) ? options.variant : null;
  const rankVariant = requestedVariant || session?.variant || 'control';

  // Track query for analytics / trending (always recorded, never cached)
  const queryId = recordQuery(finalQ, vertical, req);

  // Try Redis-backed response cache. Session-specific fields are injected
  // after the cache lookup so the same cached payload can serve anonymous
  // and personalized users. The rank variant is part of the key because
  // it changes scoring/shuffling.
  const cacheKey = buildSearchCacheKey({
    rawQ,
    finalQ,
    vertical,
    limit,
    offset,
    sort,
    filters,
    rankVariant,
  });
  const cached = await getOrSetJson(cacheKey, SEARCH_CACHE_TTL_SECONDS, async () => {
    return buildSearchResponse({
      rawQ,
      finalQ,
      vertical,
      limit,
      offset,
      sort,
      filters,
      rankVariant,
      spellSuggestion,
      instantAnswer: computeInstantAnswer(rawQ),
    });
  });

  const response = { ...cached };

  // Update the recorded query with the actual result count now that results exist.
  if (queryId) {
    const resultCount =
      (response.results?.sites?.total || 0) + (response.results?.names?.total || 0);
    updateQueryResultCount(queryId, resultCount);
  }

  // History is session-specific and not cached.
  if (vertical === 'all' || vertical === 'history') {
    response.results.history = session
      ? searchHistory(session.token, finalQ, { limit, offset })
      : { results: [], total: 0, note: 'history requires session' };
  }

  // Personalization boosts are applied after the cache lookup.
  const appliedPersonalization = applyPersonalization(response.results, session, finalQ);

  if (session) {
    response.personalization = {
      preferences: session.preferences || {},
      applied: appliedPersonalization || [],
    };
  }

  response.sessionToken = session?.token || null;
  response.timing = ((Date.now() - startTime) / 1000).toFixed(3);
  return response;
}

const SEARCH_CACHE_TTL_SECONDS = 60;

function buildSearchCacheKey({
  rawQ,
  finalQ,
  vertical,
  limit,
  offset,
  sort,
  filters,
  rankVariant,
}) {
  const payload = { q: finalQ || rawQ, vertical, limit, offset, sort, filters, rankVariant };
  return `punycodex:search:v2:${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

async function buildSearchResponse({
  rawQ,
  finalQ,
  vertical,
  limit,
  offset,
  sort,
  filters,
  rankVariant,
  spellSuggestion,
  instantAnswer,
}) {
  // --- Vertical dispatch (parallel where possible) ---
  const resultSets = {};
  const fetchList =
    vertical === 'all'
      ? ['sites', 'domains', 'lore', 'api', 'images', 'history', 'ads']
      : [vertical];

  const verticalTasks = [];

  if (fetchList.includes('sites')) {
    verticalTasks.push(
      searchWeb(finalQ, {
        limit,
        offset,
        sort,
        mode: 'all',
        ...filters,
        variant: rankVariant,
      }).then((res) => {
        resultSets.sites = res;
      })
    );
  }

  if (fetchList.includes('domains')) {
    verticalTasks.push(
      Promise.resolve().then(() => {
        resultSets.domains = searchDomains(finalQ, { limit, offset, filters });
      })
    );
  }

  if (fetchList.includes('lore')) {
    verticalTasks.push(
      Promise.resolve().then(() => {
        resultSets.lore = searchLore(finalQ, { limit, offset });
      })
    );
  }

  if (fetchList.includes('api')) {
    verticalTasks.push(
      Promise.resolve().then(() => {
        resultSets.api = searchApi(finalQ, { limit, offset });
      })
    );
  }

  if (fetchList.includes('ads')) {
    verticalTasks.push(
      Promise.resolve().then(() => {
        resultSets.ads = searchTenantAds(finalQ, { limit, offset });
      })
    );
  }

  if (fetchList.includes('images')) {
    verticalTasks.push(
      Promise.resolve().then(() => {
        resultSets.images = searchImages(finalQ, { limit, offset, filters });
      })
    );
  }

  await Promise.all(verticalTasks);

  // --- Oracle answer (parallel with verticals, quick mode for speed) ---
  let oraclePromise = Promise.resolve(null);
  if (vertical === 'all' || vertical === 'lore') {
    try {
      const intent = detectIntent(finalQ);
      const questionLike =
        finalQ.endsWith('?') ||
        /\b(who|what|where|how|why|when|which|is|are|was|were|does|did|do|can|could|would|should)\b/i.test(
          finalQ
        );
      const directNameMatch =
        !questionLike &&
        db
          .prepare(
            `SELECT 1 FROM entries WHERE LOWER(id) = ? OR LOWER(ascii) = ? OR LOWER(unicode) = ? OR search_key = ?`
          )
          .get(
            finalQ.toLowerCase(),
            finalQ.toLowerCase(),
            finalQ.toLowerCase(),
            toSearchKey(finalQ)
          ) != null;

      if (
        questionLike ||
        directNameMatch ||
        intent === 'who' ||
        intent === 'etymology' ||
        intent === 'meaning' ||
        intent === 'mythology' ||
        intent === 'symbols' ||
        intent === 'pronunciation' ||
        intent === 'attribute' ||
        intent === 'script' ||
        intent === 'variants'
      ) {
        oraclePromise = askOracle(finalQ, [], { quick: true });
      }
    } catch (_e) {
      // Oracle is optional; never break search
    }
  }

  // Await Oracle in parallel (with a timeout so it never blocks results)
  let oracle = null;
  try {
    oracle = await Promise.race([
      oraclePromise,
      new Promise((resolve) => setTimeout(() => resolve(null), 1200)),
    ]);
  } catch (_e) {
    oracle = null;
  }

  // --- Related / trending sidebars ---
  const related = relatedSearches(finalQ, 6);
  const trending = trendingSearches(vertical, 6);

  const nextOffset = offset + limit;
  const hasMore = Object.values(resultSets).some((r) => r && r.total > nextOffset);

  const resultCounts = {};
  for (const [key, set] of Object.entries(resultSets)) {
    resultCounts[key] = set?.total || 0;
  }

  const facets = computeFacets(finalQ);
  const confusableAnalysis = analyzeConfusables(rawQ);
  const queryTrust = classifyTerm(rawQ);

  return {
    query: rawQ,
    normalizedQuery: finalQ,
    vertical,
    sort,
    filters,
    rankVariant,
    spellCorrection: spellSuggestion?.correction || null,
    confusableAnalysis: confusableAnalysis.hasConfusables ? confusableAnalysis : null,
    queryTrust: {
      tier: queryTrust.tier,
      reason: queryTrust.reason,
      visualDeviation: queryTrust.visualDeviation,
      canonicalMatch: queryTrust.canonicalMatch,
    },
    instantAnswer: instantAnswer || null,
    oracle: oracle
      ? {
          answer: oracle.answer,
          citations: oracle.citations || [],
          followUps: oracle.followUps || [],
          intent: oracle.intent,
        }
      : null,
    results: resultSets,
    resultCounts,
    facets,
    related,
    trending,
    pagination: {
      limit,
      offset,
      nextCursor: hasMore ? encodeCursor(nextOffset) : null,
      hasMore,
    },
  };
}

function emptyResponse(q) {
  return {
    query: q,
    normalizedQuery: '',
    vertical: 'all',
    results: {},
    related: [],
    trending: trendingSearches('all', 6),
    pagination: { limit: 20, offset: 0, nextCursor: null, hasMore: false },
    timing: '0.000',
  };
}

function normalizeSearchInput(q) {
  return normalizeSearchQuery(q).canonical;
}

async function maybeCorrectSpell(q) {
  const suggestions = didYouMean(q, 1);
  if (suggestions.length === 0) return null;
  const best = suggestions[0];
  if (best.score >= 0.85 && best.text.toLowerCase() !== q.toLowerCase()) {
    return { correction: best.text, use: best.text, score: best.score };
  }
  return null;
}

function recordQuery(q, vertical, req) {
  try {
    const db = getDb();
    const ua = req?.headers?.['user-agent'] || '';
    const ip = req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || '';
    const uaHash = ua
      ? crypto.createHash('sha256').update(ua).digest('hex').substring(0, 16)
      : null;
    const ipHash = ip
      ? crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16)
      : null;

    const info = db
      .prepare(
        'INSERT INTO search_queries (query, result_count, mode, user_agent_hash, ip_hash) VALUES (?, ?, ?, ?, ?)'
      )
      .run(q, 0, `v2:${vertical}`, uaHash, ipHash);

    db.prepare(
      `INSERT INTO trending_searches (query, vertical, count, last_seen_at)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT(query, vertical) DO UPDATE SET
         count = count + 1,
         last_seen_at = datetime('now')`
    ).run(q, vertical);

    return info.lastInsertRowid;
  } catch (_e) {
    // Analytics failures are non-fatal
    return null;
  }
}

function updateQueryResultCount(queryId, count) {
  if (!queryId) return;
  try {
    const db = getDb();
    db.prepare('UPDATE search_queries SET result_count = ? WHERE id = ?').run(count, queryId);
  } catch (_e) {
    // Analytics failures are non-fatal
  }
}

function computeFacets(q) {
  try {
    const db = getDb();
    const like = q ? `%${q.toLowerCase()}%` : '%';
    const keyLike = q ? `%${toSearchKey(q)}%` : '%';

    const pantheons = db
      .prepare(`
        SELECT e.pantheon, COUNT(*) as count
        FROM entries e
        WHERE (LOWER(e.ascii) LIKE ? OR LOWER(e.unicode) LIKE ? OR LOWER(e.id) LIKE ? OR e.search_key LIKE ?)
          AND e.pantheon IS NOT NULL
        GROUP BY e.pantheon
        ORDER BY count DESC
      `)
      .all(like, like, like, keyLike);

    const tiers = db
      .prepare(`
        SELECT e.tier, COUNT(*) as count
        FROM entries e
        WHERE (LOWER(e.ascii) LIKE ? OR LOWER(e.unicode) LIKE ? OR LOWER(e.id) LIKE ? OR e.search_key LIKE ?)
        GROUP BY e.tier
        ORDER BY CASE e.tier WHEN 'dual' THEN 1 WHEN '1' THEN 2 WHEN '2' THEN 3 ELSE 4 END
      `)
      .all(like, like, like, keyLike);

    return {
      pantheons: pantheons.map((p) => ({ id: p.pantheon, count: p.count })),
      tiers: tiers.map((t) => ({ id: t.tier, count: t.count })),
    };
  } catch (_e) {
    return { pantheons: [], tiers: [] };
  }
}

function trendingSearches(vertical, limit = 6) {
  try {
    const db = getDb();
    return db
      .prepare(
        `SELECT query, vertical, count
         FROM trending_searches
         WHERE vertical = ? OR ? = 'all'
         ORDER BY count DESC, last_seen_at DESC
         LIMIT ?`
      )
      .all(vertical, vertical, limit);
  } catch (_e) {
    return [];
  }
}

function computeInstantAnswer(q) {
  const lower = q.toLowerCase();

  // Unicode / punycode conversion
  const convertMatch = lower.match(/^(?:convert|punycode|encode|decode|idna|xn--)\s+(.+)$/i);
  if (convertMatch) {
    const target = convertMatch[1].trim();
    return buildConvertAnswer(target);
  }

  // Availability intent
  const availMatch = lower.match(
    /^(?:is\s+)?['"]?(.+?)['"]?\s+(?:available|for sale|lease|rent|buy|register|domain)/i
  );
  if (availMatch) {
    return buildAvailabilityAnswer(availMatch[1].trim());
  }

  // Tier system question
  if (
    lower.includes('tier') &&
    (lower.includes('what') || lower.includes('how') || lower.includes('system'))
  ) {
    return {
      type: 'tier-system',
      title: 'The Definitive Tier System',
      body: 'PUNYCODEX classifies Unicode name restorations into Dual-Tier (3 names with multiple historically valid spellings), Tier-1 (13 names with the only historically valid stress+length spelling), and Tier-2 (single-feature or unmarked forms).',
      link: '/tiers/',
    };
  }

  return null;
}

function buildConvertAnswer(target) {
  const { domainToASCII } = require('node:url');
  try {
    const punycode = domainToASCII(target);
    const isPunycode = punycode !== target.toLowerCase();
    return {
      type: 'convert',
      title: `IDNA conversion for “${target}”`,
      unicode: target,
      punycode,
      isPunycode,
      link: `/type/#${encodeURIComponent(target)}`,
    };
  } catch (_e) {
    return {
      type: 'convert',
      title: `Could not convert “${target}”`,
      error: 'Invalid Unicode domain form',
    };
  }
}

function buildAvailabilityAnswer(target) {
  const db = getDb();
  const like = `%${target.toLowerCase()}%`;
  const rows = db
    .prepare(
      `SELECT a.entry_id, a.domain, a.punycode, a.status,
              e.unicode, e.ascii, e.meaning, e.pantheon, e.tier
       FROM availability a
       JOIN entries e ON a.entry_id = e.id
       WHERE (LOWER(e.ascii) = ? OR LOWER(e.unicode) = ? OR LOWER(e.id) = ? OR e.search_key = ?
              OR LOWER(a.domain) LIKE ? OR LOWER(e.ascii) LIKE ? OR e.search_key LIKE ?)
       ORDER BY e.tier = 'dual' DESC, e.tier = '1' DESC
       LIMIT 3`
    )
    .all(
      target.toLowerCase(),
      target.toLowerCase(),
      target.toLowerCase(),
      toSearchKey(target),
      like,
      like,
      `%${toSearchKey(target)}%`
    );

  if (rows.length === 0) return null;

  return {
    type: 'availability',
    title: `Availability for “${target}”`,
    domains: rows.map((r) => ({
      entryId: r.entry_id,
      unicode: r.unicode,
      ascii: r.ascii,
      domain: r.domain,
      punycode: r.punycode,
      status: r.status,
      meaning: r.meaning,
      pantheon: r.pantheon,
      tier: r.tier,
      link: `/sites/${r.entry_id}/`,
    })),
  };
}

function searchDomains(q, { limit, offset, filters }) {
  const db = getDb();
  const query = q.toLowerCase();
  const searchKey = toSearchKey(q);
  const like = `%${query}%`;
  const keyLike = `%${searchKey}%`;
  const params = [query, query, query, searchKey, keyLike, like];
  let sql = `SELECT a.entry_id, a.domain, a.punycode, a.status, a.registrar_links,
                    e.unicode, e.ascii, e.meaning, e.pantheon, e.tier
             FROM availability a
             JOIN entries e ON a.entry_id = e.id
             WHERE (LOWER(e.ascii) = ? OR LOWER(e.unicode) = ? OR LOWER(e.id) = ? OR e.search_key = ?
                    OR e.search_key LIKE ? OR LOWER(e.unicode) LIKE ?)`;

  if (filters.pantheon) {
    sql += ' AND e.pantheon = ?';
    params.push(filters.pantheon);
  }
  if (filters.tier) {
    sql += ' AND e.tier = ?';
    params.push(filters.tier);
  }
  if (filters.hasSite) {
    sql += ` AND EXISTS (
      SELECT 1 FROM indexed_sites s
      WHERE s.lexicon_entry_id = e.id AND s.status = 'active'
    )`;
  }

  const countSql = sql.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(*) AS total FROM');
  const { total } = db.prepare(countSql).get(...params);

  sql += " ORDER BY e.tier = 'dual' DESC, e.tier = '1' DESC, e.unicode ASC LIMIT ? OFFSET ?";
  const rows = db.prepare(sql).all(...params, limit, offset);

  return {
    results: rows.map((r) => ({
      entryId: r.entry_id,
      unicode: r.unicode,
      ascii: r.ascii,
      domain: r.domain,
      punycode: r.punycode,
      status: r.status,
      meaning: r.meaning,
      pantheon: r.pantheon,
      tier: r.tier,
      registrarLinks: parseJson(r.registrar_links, {}),
      link: `/sites/${r.entry_id}/`,
    })),
    total,
    limit,
    offset,
  };
}

function searchLore(q, { limit, offset }) {
  const entries = Object.entries(LORE_CATALOG);
  const query = q.toLowerCase();
  const words = query.split(/\s+/).filter((w) => w.length > 1);

  const scored = entries
    .map(([id, lore]) => {
      let score = 0;
      const haystack = JSON.stringify(lore).toLowerCase();
      if (id.toLowerCase().includes(query)) score += 3;
      for (const w of words) {
        if (haystack.includes(w)) score += 1;
      }
      return { id, lore, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const total = scored.length;
  const slice = scored.slice(offset, offset + limit);

  return {
    results: slice.map((r) => ({
      entryId: r.id,
      pronunciation: r.lore.pronunciation,
      mythology: r.lore.mythology?.summary,
      symbols: r.lore.symbols,
      etymology: r.lore.etymology,
      archaeology: r.lore.archaeology,
      sources: r.lore.sources,
      link: `/sites/${r.id}/lore.html`,
    })),
    total,
    limit,
    offset,
  };
}

function searchApi(q, { limit, offset }) {
  const query = q.toLowerCase();
  const words = query.split(/\s+/).filter((w) => w.length > 0);
  const scored = API_ENDPOINTS.map((ep) => {
    let score = 0;
    const text = `${ep.method} ${ep.path} ${ep.description}`.toLowerCase();
    if (text.includes(query)) score += 2;
    for (const w of words) if (text.includes(w)) score += 0.5;
    return { ...ep, score };
  })
    .filter((ep) => ep.score > 0)
    .sort((a, b) => b.score - a.score);

  const total = scored.length;
  return {
    results: scored.slice(offset, offset + limit),
    total,
    limit,
    offset,
  };
}

function searchImages(q, { limit, offset, filters }) {
  const db = getDb();
  const like = `%${q.toLowerCase()}%`;
  const params = [like, like, like, like, like];
  let sql = `SELECT s.id, s.domain, s.punycode, s.title, s.og_image_path, s.favicon_path,
                    s.lexicon_entry_id, s.pantheon, s.tier, e.unicode, e.ascii
             FROM indexed_sites s
             LEFT JOIN entries e ON s.lexicon_entry_id = e.id
             WHERE s.status = 'active'
               AND (LOWER(s.domain) LIKE ? OR LOWER(s.title) LIKE ? OR LOWER(s.punycode) LIKE ?
                    OR LOWER(e.unicode) LIKE ? OR LOWER(e.ascii) LIKE ?)
               AND (s.og_image_path IS NOT NULL OR s.favicon_path IS NOT NULL)`;

  if (filters.pantheon) {
    sql += ' AND s.pantheon = ?';
    params.push(filters.pantheon);
  }
  if (filters.tier) {
    sql += ' AND s.tier = ?';
    params.push(filters.tier);
  }
  if (filters.unicodeOnly) {
    sql += " AND s.punycode LIKE 'xn--%'";
  }

  const countSql = sql.replace(/SELECT[\s\S]+?FROM/, 'SELECT COUNT(*) AS total FROM');
  const { total } = db.prepare(countSql).get(...params);

  sql += " ORDER BY s.is_flagship DESC, s.tier = 'dual' DESC, s.tier = '1' DESC LIMIT ? OFFSET ?";
  const rows = db.prepare(sql).all(...params, limit, offset);

  return {
    results: rows.map((r) => ({
      siteId: r.id,
      domain: r.domain,
      punycode: r.punycode,
      title: r.title,
      imageUrl: r.og_image_path
        ? `https://${r.punycode}/${r.og_image_path.replace(/^\//, '')}`
        : null,
      faviconUrl: r.favicon_path
        ? `https://${r.punycode}/${r.favicon_path.replace(/^\//, '')}`
        : null,
      entryId: r.lexicon_entry_id,
      unicode: r.unicode,
      ascii: r.ascii,
      pantheon: r.pantheon,
      tier: r.tier,
      link: `https://${r.punycode}`,
    })),
    total,
    limit,
    offset,
  };
}

function searchTenantAds(q, { limit, offset }) {
  const ads = tenantAds.findTenantAdsForQuery(q, { limit, offset });
  const allAds = tenantAds.findTenantAdsForQuery(q, { limit: 10000, offset: 0 });
  return {
    results: ads.map((ad) => ({
      type: 'tenant-ad',
      id: ad.id,
      entryId: ad.entryId,
      companyName: ad.companyName,
      websiteUrl: ad.websiteUrl,
      displayUrl: ad.displayUrl,
      headline: ad.headline,
      description: ad.description,
      sponsored: true,
      link: ad.websiteUrl,
      analyticsToken: ad.analyticsToken,
    })),
    total: allAds.length,
    limit,
    offset,
  };
}

function searchHistory(_token, q, { limit, offset }) {
  const db = getDb();
  const like = `%${q.toLowerCase()}%`;

  // Recent searches from this session / IP-hash cohort
  const queries = db
    .prepare(
      `SELECT id, query, timestamp, mode
       FROM search_queries
       WHERE LOWER(query) LIKE ?
       ORDER BY timestamp DESC
       LIMIT ? OFFSET ?`
    )
    .all(like, limit, offset);

  const total = queries.length; // approximate for history vertical
  return {
    results: queries.map((r) => ({
      type: 'query',
      query: r.query,
      mode: r.mode,
      timestamp: r.timestamp,
      link: `/search.html?q=${encodeURIComponent(r.query)}`,
    })),
    total,
    limit,
    offset,
  };
}

function applyPersonalization(resultSets, session, q) {
  if (!session) return [];
  const prefs = session.preferences || {};
  const penalties = getFeedbackPenalties(session.token, q);
  const applied = [];

  // Boost preferred pantheon in sites / images / domains
  if (prefs.preferredPantheon) {
    applied.push('preferredPantheon');
    for (const key of ['sites', 'images', 'domains']) {
      const set = resultSets[key];
      if (!set?.results) continue;
      set.results = set.results.map((r) => {
        const boost = r.pantheon === prefs.preferredPantheon ? 0.25 : 0;
        if (boost && r.rankScore != null) {
          return {
            ...r,
            rankScore: r.rankScore + boost,
            scoreBreakdown: { ...(r.scoreBreakdown || {}), personal: boost },
          };
        }
        return r;
      });
      if (set.results.some((r) => r.rankScore != null)) {
        set.results.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
      }
    }
  }

  // Apply feedback penalties
  if (penalties.size > 0 && resultSets.sites?.results) {
    applied.push('feedbackPenalties');
    resultSets.sites.results = resultSets.sites.results.map((r) => {
      const penalty = penalties.get(r.id) || 0;
      if (penalty && r.rankScore != null) {
        return { ...r, rankScore: Math.max(0, r.rankScore - penalty) };
      }
      return r;
    });
    resultSets.sites.results.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
  }

  return applied;
}

function getFeedbackPenalties(token, q) {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT site_id, COUNT(*) as cnt
         FROM search_feedback
         WHERE session_token = ? AND query = ? AND helpful = 0 AND site_id IS NOT NULL
         GROUP BY site_id`
      )
      .all(token, q);
    return new Map(rows.map((r) => [r.site_id, Math.min(r.cnt * 0.3, 1.0)]));
  } catch (_e) {
    return new Map();
  }
}

function recordFeedback(token, query, { siteId, entryId, helpful, reason }) {
  const db = getDb();
  migrateSearchV2();
  db.prepare(
    `INSERT INTO search_feedback (session_token, query, site_id, entry_id, helpful, reason)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(token, query, siteId || null, entryId || null, helpful ? 1 : 0, reason || null);
}

function updatePreferences(token, prefs) {
  const db = getDb();
  migrateSearchV2();
  const existing = db.prepare('SELECT preferences FROM search_sessions WHERE token = ?').get(token);
  const merged = { ...parseJson(existing?.preferences, {}), ...prefs };
  db.prepare('UPDATE search_sessions SET preferences = ? WHERE token = ?').run(
    JSON.stringify(merged),
    token
  );
  return merged;
}

module.exports = {
  searchV2,
  autocomplete,
  recordFeedback,
  updatePreferences,
  getSessionToken,
  getOrCreateSession,
  VALID_VERTICALS,
  VALID_SORTS,
  RANK_VARIANTS,
};
