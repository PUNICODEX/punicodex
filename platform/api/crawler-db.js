const Database = require('better-sqlite3');
const _path = require('node:path');
const { embedText, searchAllVectors } = require('./semantic-search');
const { getDbPath } = require('../db/db');
const { searchKeywords, tokenize } = require('./keyword-extractor');
const { listVariants } = require('./ranker');
const { toSearchKey } = require('./query-normalize');
const { classifyDomain, classifyTerm } = require('./homograph-service');
const { getLtrBoosts } = require('./ltr-service');

// Load clean flagship lore catalog (generated from scripts/lore-catalog.json)
let LORE_CATALOG = {};
try {
  LORE_CATALOG = require('../browser/renderer/lore-catalog.json');
} catch (_e) {
  // Catalog may be absent during initial setup.
}

const DB_PATH = getDbPath();
let db;

// Eagerly warm the DB connection in production/runtime environments so the first
// request does not pay the SQLite open cost. Skipped during unit tests to avoid
// opening the DB when it may not exist.
if (process.env.NODE_ENV !== 'test' && require('node:fs').existsSync(DB_PATH)) {
  try {
    getDb();
  } catch (_e) {
    // Lazy fallback on first real request
  }
}

// Hot-query LRU cache: exact normalized query -> { results, total, timing, ts }
const QUERY_CACHE = new Map();
const QUERY_CACHE_MAX = 200;
const QUERY_CACHE_TTL_MS = 60_000;
const QUERY_CACHE_WARM_ONLY = true; // skip cache on first cold module load
const moduleLoadedAt = Date.now();

function cacheKey(q, options) {
  return JSON.stringify({
    q: String(q).toLowerCase().trim(),
    limit: options.limit,
    offset: options.offset,
    mode: options.mode,
    type: options.type,
    pantheon: options.pantheon,
    tier: options.tier,
    sort: options.sort,
    unicodeOnly: options.unicodeOnly,
    concept: options.concept,
    trust: options.trust,
  });
}

function getCachedSearch(key) {
  const hit = QUERY_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > QUERY_CACHE_TTL_MS) {
    QUERY_CACHE.delete(key);
    return null;
  }
  // Avoid returning stale cache during the first few seconds after module load
  // while the DB connection is still warming; warm callers already paid the cost.
  if (QUERY_CACHE_WARM_ONLY && Date.now() - moduleLoadedAt < 5000) {
    return null;
  }
  return hit.value;
}

function setCachedSearch(key, value) {
  if (QUERY_CACHE.size >= QUERY_CACHE_MAX) {
    const oldest = QUERY_CACHE.keys().next().value;
    QUERY_CACHE.delete(oldest);
  }
  QUERY_CACHE.set(key, { ts: Date.now(), value });
}

function applyVariantRanking(results, variant) {
  return results
    .map((r) => {
      let boost = 0;
      const breakdown = { ...r.scoreBreakdown };
      switch (variant) {
        case 'freshness':
          boost = (r.freshnessScore || 0.5) * 0.3 - ((r.pagerank || 0) / 100) * 0.1;
          breakdown.freshness = parseFloat((boost + (breakdown.freshness || 0)).toFixed(4));
          break;
        case 'authority':
          boost = ((r.pagerank || 0) / 100) * 0.2 + ((r.authorityScore || 0) / 100) * 0.2;
          breakdown.authority = parseFloat((boost + (breakdown.authority || 0)).toFixed(4));
          break;
        case 'keyword':
          if (r.matchedTerms && r.matchedTerms.length > 0) {
            boost = 0.5;
            breakdown.keyword = boost;
          }
          break;
      }
      const rankScore = (r.rankScore || 0) + boost;
      return {
        ...r,
        rankScore: parseFloat(rankScore.toFixed(4)),
        scoreBreakdown: {
          ...breakdown,
          variant: parseFloat(boost.toFixed(4)),
          total: parseFloat(rankScore.toFixed(4)),
        },
      };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

/**
 * Escape a token for FTS5 and optionally wrap it in quotes for phrase search.
 * FTS5 treats double quotes, asterisks, parentheses, and boolean operators specially.
 */
function escapeFtsToken(token) {
  // Replace internal double quotes with two double quotes (FTS5 escaping).
  let t = token.replace(/"/g, '""');
  // Escape leading special chars that FTS5 interprets as operators.
  if (/^[*\-^]/.test(t)) t = `"${t}"`;
  return t;
}

/**
 * Parse a user query into a safe FTS5 MATCH expression.
 * Multi-word queries become phrase searches by default for precision.
 * Falls back to prefix/NEAR on zero results.
 */
function parseFtsQuery(q) {
  const raw = q.trim();
  if (!raw) return '';

  // Split on whitespace, keep quoted phrases intact.
  const tokens = [];
  const re = /"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    tokens.push(m[1] !== undefined ? m[1] : m[2]);
  }

  const cleaned = tokens
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((t) => `"${escapeFtsToken(t)}"`);

  if (cleaned.length === 0) return '';
  return cleaned.join(' ');
}

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function getSites({ status, pantheon, entryId, trust = 'all', limit = 50, offset = 0 }) {
  const db = getDb();
  let sql = 'SELECT * FROM indexed_sites WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM indexed_sites WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    countSql += ' AND status = ?';
    params.push(status);
  }
  if (pantheon) {
    sql += ' AND pantheon = ?';
    countSql += ' AND pantheon = ?';
    params.push(pantheon);
  }
  if (entryId) {
    sql += ' AND lexicon_entry_id = ?';
    countSql += ' AND lexicon_entry_id = ?';
    params.push(entryId);
  }

  const allowedTrust = ['safe', 'canonical', 'styled', 'all'];
  const trustMode = allowedTrust.includes(trust) ? trust : 'all';
  if (trustMode === 'safe') {
    sql +=
      " AND (trust_tier IS NULL OR trust_tier IN ('canonical', 'ascii-fallback', 'styled', 'unknown'))";
    countSql +=
      " AND (trust_tier IS NULL OR trust_tier IN ('canonical', 'ascii-fallback', 'styled', 'unknown'))";
  } else if (trustMode === 'canonical') {
    sql += " AND trust_tier = 'canonical'";
    countSql += " AND trust_tier = 'canonical'";
  } else if (trustMode === 'styled') {
    sql += " AND trust_tier IN ('canonical', 'ascii-fallback', 'styled')";
    countSql += " AND trust_tier IN ('canonical', 'ascii-fallback', 'styled')";
  }

  sql +=
    " ORDER BY is_flagship DESC, status = 'active' DESC, tier = 'dual' DESC, tier = '1' DESC, domain ASC";
  sql += ' LIMIT ? OFFSET ?';

  const sites = db.prepare(sql).all(...params, limit, offset);
  const { total } = db.prepare(countSql).get(...params);

  return { sites, total, limit, offset };
}

function getSiteByPunycode(punycode) {
  const db = getDb();
  return db.prepare('SELECT * FROM indexed_sites WHERE punycode = ?').get(punycode);
}

function searchSites(q, limit = 20) {
  const db = getDb();
  const like = `%${q}%`;
  return db
    .prepare(`
    SELECT s.*, e.unicode as entry_unicode, e.ascii as entry_ascii, e.meaning as entry_meaning
    FROM indexed_sites s
    LEFT JOIN entries e ON s.lexicon_entry_id = e.id
    WHERE s.domain LIKE ? OR s.title LIKE ? OR s.punycode LIKE ?
      OR e.unicode LIKE ? OR e.ascii LIKE ? OR e.meaning LIKE ?
    ORDER BY s.is_flagship DESC, s.status = 'active' DESC
    LIMIT ?
  `)
    .all(like, like, like, like, like, like, limit);
}

/**
 * Web search: FTS5-powered content search with composite relevance scoring.
 *
 * SCORING FORMULA (Phase 3 — Content Quality):
 *   composite_score = bm25(fts) * multiplier
 *   multiplier = 1.0 + tier_bonus + flagship_bonus + archetype_bonus + freshness_bonus + quality_bonus
 *
 * Where:
 *   - bm25: SQLite FTS5 BM25 score (negative, lower = better match)
 *   - tier_bonus: dual=0.5, tier-1=0.3, tier-2=0.1
 *   - flagship_bonus: 0.2 if is_flagship
 *   - archetype_bonus: 0.0-1.0 from indexed_sites.archetype_score
 *   - freshness_bonus: 0.0-0.15 from freshness_score (0-1 scale)
 *   - quality_bonus: 0.0-0.15 from quality_score (0-100 scale, normalized)
 *
 * This additive structure makes it trivial to add new ranking dimensions
 * without rewriting the ORDER BY clause.
 *
 * Returns SERP-style results with highlighted snippets.
 */
async function searchWeb(q, options = {}) {
  const {
    limit = 20,
    offset = 0,
    mode = 'all',
    type = 'all',
    pantheon,
    tier,
    sort = 'relevance',
    variant = 'default',
    unicodeOnly = false,
    concept,
    trust = 'safe',
  } = options;
  const db = getDb();
  if (!q?.trim()) {
    return { results: [], total: 0, query: q, timing: 0 };
  }

  const startTime = Date.now();

  // Hot-query cache: identical queries reuse the last result set for sub-millisecond responses.
  const qCacheKey = cacheKey(q, options);
  const cached = getCachedSearch(qCacheKey);
  if (cached) {
    return { ...cached, timing: Date.now() - startTime };
  }
  const ftsQuery = parseFtsQuery(q);
  const queryNormalized = ftsQuery;
  const searchKey = toSearchKey(q);
  const limitNum = Math.min(Math.max(1, parseInt(limit, 10) || 20), 100);
  const offsetNum = Math.max(0, parseInt(offset, 10) || 0);

  const filters = [];
  const params = [ftsQuery];

  if (mode === 'network') {
    filters.push('AND (s.is_flagship = 1 OR s.tenant_name IS NOT NULL)');
  }

  if (type === 'businesses') {
    filters.push(
      'AND (s.is_flagship = 1 OR s.tenant_name IS NOT NULL OR s.tenant_front_url IS NOT NULL)'
    );
  } else if (type === 'gods') {
    filters.push("AND COALESCE(e.pantheon, s.pantheon) != 'greek-location'");
  } else if (type === 'locations') {
    filters.push("AND COALESCE(e.pantheon, s.pantheon) = 'greek-location'");
  }

  // The indexed_sites.pantheon/tier columns use the archetype taxonomy
  // (olympian, chthonic, titan, …) which does not match the lexicon pantheon
  // list the UI filters by. Prefer the canonical entry classification.
  if (pantheon) {
    filters.push('AND COALESCE(e.pantheon, s.pantheon) = ?');
    params.push(pantheon);
  }

  if (tier) {
    filters.push('AND COALESCE(e.tier, s.tier) = ?');
    params.push(tier);
  }

  if (unicodeOnly) {
    filters.push("AND s.punycode LIKE 'xn--%'");
  }

  if (concept) {
    const conceptLike = `%${concept.toLowerCase()}%`;
    filters.push(
      'AND (LOWER(s.archetype_signals) LIKE ? OR LOWER(s.tenant_category) LIKE ? OR LOWER(s.meta_keywords) LIKE ? OR LOWER(e.meaning) LIKE ? OR LOWER(e.domain) LIKE ? OR LOWER(s.title) LIKE ? OR LOWER(s.description) LIKE ?)'
    );
    params.push(conceptLike, conceptLike, conceptLike, conceptLike, conceptLike, conceptLike, conceptLike);
  }

  // Trust-tier filtering. Default 'safe' excludes unsafe + suspicious.
  const allowedTrust = ['safe', 'canonical', 'styled', 'all'];
  const trustMode = allowedTrust.includes(trust) ? trust : 'safe';
  if (trustMode === 'safe') {
    filters.push(
      "AND (s.trust_tier IS NULL OR s.trust_tier IN ('canonical', 'ascii-fallback', 'styled', 'unknown'))"
    );
  } else if (trustMode === 'canonical') {
    filters.push("AND s.trust_tier = 'canonical'");
  } else if (trustMode === 'styled') {
    filters.push("AND s.trust_tier IN ('canonical', 'ascii-fallback', 'styled')");
  }
  // trustMode === 'all' adds no filter

  const allowedSorts = {
    relevance: 'rank_score DESC',
    alphabetical: 's.title ASC',
    tier: "s.tier = 'dual' DESC, s.tier = '1' DESC, s.tier = '2' DESC",
    recently_crawled: 's.last_crawled DESC',
    quality: 's.quality_score DESC',
  };
  const orderBy = allowedSorts[sort] || allowedSorts.relevance;

  // Total matching count (for pagination)
  let totalMain = 0;
  try {
    const countRow = db
      .prepare(`
      SELECT COUNT(*) AS total
      FROM indexed_sites_fts
      JOIN indexed_sites s ON indexed_sites_fts.rowid = s.id
      WHERE indexed_sites_fts MATCH ?
        AND s.status != 'spam'
        AND (s.is_flagship = 1 OR s.quality_score >= 0.3 OR s.tenant_name IS NOT NULL)
        ${filters.join(' ')}
    `)
      .get(...params);
    totalMain = countRow?.total || 0;
  } catch (_e) {
    // Count failure is non-fatal
  }

  const selectParams = [
    q,
    q,
    searchKey,
    `%${q.toLowerCase()}%`,
    `%${q.toLowerCase()}%`,
    `%${searchKey}%`,
    ...params,
  ];

  // When an A/B rank variant is active, fetch a larger candidate pool so the
  // variant re-ranking can surface results that the default formula buried.
  const useVariant = variant && variant !== 'default' && variant !== 'control';
  const candidateLimit = useVariant ? Math.min(limitNum + 50, 100) : limitNum;

  // Primary: FTS5 with BM25 scoring + ranking boosts
  let results = [];
  try {
    const rows = db
      .prepare(`
      SELECT 
        s.*,
        -bm25(indexed_sites_fts) AS bm25_score,
        (
          /* BM25 text relevance (inverted so higher = better) */
          -bm25(indexed_sites_fts) * 1.0
          /* Tier signal */
          + CASE 
              WHEN s.tier = 'dual' THEN 0.60
              WHEN s.tier = '1' THEN 0.35
              WHEN s.tier = '2' THEN 0.15
              ELSE 0.0
            END
          /* Flagship curated domain */
          + CASE WHEN s.is_flagship = 1 THEN 1.50 ELSE 0.0 END
          /* Active tenant */
          + CASE WHEN s.tenant_name IS NOT NULL THEN 0.75 ELSE 0.0 END
          /* Archetype alignment */
          + COALESCE(s.archetype_score, 0.0) * 1.0
          /* Content freshness */
          + COALESCE(s.freshness_score, 0.5) * 0.20
          /* Quality score (0-100 scale) */
          + COALESCE(s.quality_score, 0.0) / 100.0 * 0.25
          /* PageRank / authority */
          + COALESCE(s.pagerank, 0.0) / 100.0 * 0.35
          + COALESCE(s.authority_score, 0.0) / 100.0 * 0.25
          /* Unicode domain bonus */
          + CASE WHEN s.punycode LIKE 'xn--%' THEN 0.40 ELSE 0.0 END
          /* Exact transliteration match bonus */
          + CASE
              WHEN LOWER(e.unicode) = LOWER(?) OR LOWER(e.ascii) = LOWER(?) OR e.search_key = ? THEN 2.00
              WHEN LOWER(e.unicode) LIKE ? OR LOWER(e.ascii) LIKE ? OR e.search_key LIKE ? THEN 0.60
              ELSE 0.0
            END
        ) AS rank_score,
        snippet(indexed_sites_fts, 2, '<mark>', '</mark>', '...', 25) AS title_snippet,
        snippet(indexed_sites_fts, 3, '<mark>', '</mark>', '...', 25) AS desc_snippet,
        snippet(indexed_sites_fts, 6, '<mark>', '</mark>', '...', 25) AS snippet_highlight,
        snippet(indexed_sites_fts, 7, '<mark>', '</mark>', '...', 25) AS og_snippet,
        snippet(indexed_sites_fts, 8, '<mark>', '</mark>', '...', 25) AS og_desc_snippet
      FROM indexed_sites_fts
      JOIN indexed_sites s ON indexed_sites_fts.rowid = s.id
      LEFT JOIN entries e ON s.lexicon_entry_id = e.id
      WHERE indexed_sites_fts MATCH ?
        AND s.status != 'spam'
        AND (s.is_flagship = 1 OR s.quality_score >= 0.3 OR s.tenant_name IS NOT NULL)
        ${filters.join(' ')}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `)
      .all(...selectParams, candidateLimit, offsetNum);

    results = rows.map((row) => {
      // Best snippet hierarchy: OG desc > Twitter desc > meta desc > FTS snippet > h1 > first_p > content_snippet
      const bestSnippet =
        row.og_desc_snippet ||
        row.og_snippet ||
        row.snippet_highlight ||
        row.desc_snippet ||
        row.title_snippet ||
        row.og_description ||
        row.twitter_description ||
        row.h1 ||
        row.first_p ||
        row.description ||
        row.content_snippet ||
        '';

      // Best title hierarchy: OG title > Twitter title > meta title
      const bestTitle = row.og_title || row.twitter_title || row.title || row.domain;

      // Classify on-demand if the DB trust_tier is missing (e.g. legacy crawls).
      const fullClassification = classifyDomain(row.domain || row.punycode);
      const domainTrust = row.trust_tier
        ? { tier: row.trust_tier, reason: 'indexed', ...fullClassification }
        : fullClassification;

      return {
        id: row.id,
        domain: row.domain,
        punycode: row.punycode,
        title: bestTitle,
        snippet: bestSnippet,
        description: row.og_description || row.twitter_description || row.description || '',
        url: `https://${row.punycode}`,
        lexiconEntryId: row.lexicon_entry_id,
        pantheon: row.pantheon,
        tier: row.tier,
        tierLabel: row.tier_label,
        status: row.status,
        lastCrawled: row.last_crawled,
        publishedDate: row.published_date,
        faviconPath: row.favicon_path,
        ogImagePath: row.og_image_path,
        lang: row.lang,
        wordCount: row.word_count,
        responseTimeMs: row.response_time_ms,
        rankScore: row.rank_score,
        scoreBreakdown: {
          bm25: parseFloat(row.bm25_score.toFixed(4)),
          tier: row.tier === 'dual' ? 0.6 : row.tier === '1' ? 0.35 : row.tier === '2' ? 0.15 : 0,
          flagship: row.is_flagship === 1 ? 1.5 : 0,
          tenant: row.tenant_name ? 0.75 : 0,
          archetype: parseFloat((row.archetype_score || 0).toFixed(4)),
          freshness: parseFloat(((row.freshness_score || 0.5) * 0.2).toFixed(4)),
          quality: parseFloat((((row.quality_score || 0) / 100) * 0.25).toFixed(4)),
          pagerank: parseFloat((((row.pagerank || 0) / 100) * 0.35).toFixed(4)),
          authority: parseFloat((((row.authority_score || 0) / 100) * 0.25).toFixed(4)),
          punycode: row.punycode?.startsWith('xn--') ? 0.4 : 0,
          total: parseFloat(row.rank_score.toFixed(4)),
        },
        leaseStatus: row.lease_status,
        isFlagship: row.is_flagship === 1,
        freshnessScore: row.freshness_score,
        qualityScore: row.quality_score,
        readabilityScore: row.readability_score,
        tenant: row.tenant_name
          ? {
              name: row.tenant_name,
              category: row.tenant_category,
              frontUrl: row.tenant_front_url,
            }
          : null,
        sitemapEntries: row.sitemap_entries,
        anchorTexts: row.anchor_texts ? JSON.parse(row.anchor_texts) : null,
        ogVideo: row.og_video,
        ogVideoType: row.og_video_type,
        ratingValue: row.rating_value,
        ratingCount: row.rating_count,
        isPunycode: row.punycode?.startsWith('xn--'),
        matchedTerms: extractMatchedTerms(bestSnippet),
        trustTier: domainTrust.tier,
        trustReason: domainTrust.reason,
        verdict: domainTrust.verdict,
        severity: domainTrust.severity,
        lookalikeScore: domainTrust.lookalikeScore,
      };
    });

    if (useVariant) {
      results = applyVariantRanking(results, variant).slice(0, limitNum);
    }
  } catch (e) {
    console.error('FTS5 error:', e.message);
  }

  // ====== KEYWORD INDEX FALLBACK ======
  // Tenants can provide a front URL; we crawl it and extract their existing
  // SEO keywords rather than forcing them to type keywords into a dashboard.
  // Surface those sites when the query matches their extracted keyword set.
  let keywordTotal = 0;
  try {
    // Count total keyword matches so pagination is accurate on the first page.
    const words = tokenize(q);
    if (words.length > 0) {
      const conditions = words.map(() => `sk.keyword LIKE ?`).join(' OR ');
      const params = words.map((w) => `%${w}%`);
      const unicodeFilter = unicodeOnly ? "AND s.punycode LIKE 'xn--%'" : '';
      const countRow = db
        .prepare(
          `SELECT COUNT(DISTINCT s.id) AS total
           FROM site_keywords sk
           JOIN indexed_sites s ON sk.site_id = s.id
           WHERE s.status = 'active'
             AND (${conditions})
             ${unicodeFilter}`
        )
        .get(...params);
      keywordTotal = countRow?.total || 0;
    }

    const needFallback = limitNum - results.length;
    const fallbackOffset = Math.max(0, offsetNum - totalMain);
    if (needFallback > 0 || fallbackOffset > 0) {
      const fetchLimit = needFallback + fallbackOffset + 20;
      const keywordMatches = searchKeywords(q, fetchLimit);

      const existingIds = new Set(results.map((r) => r.id));
      let skipped = 0;
      for (const row of keywordMatches) {
        if (unicodeOnly && !row.punycode?.startsWith('xn--')) continue;
        if (existingIds.has(row.id)) continue;
        existingIds.add(row.id);
        if (skipped < fallbackOffset) {
          skipped++;
          continue;
        }
        if (results.length >= limitNum) break;
        const rawSnippet =
          row.og_description ||
          row.twitter_description ||
          row.h1 ||
          row.first_p ||
          row.description ||
          row.content_snippet ||
          '';
        results.push({
          id: row.id,
          domain: row.domain,
          punycode: row.punycode,
          title: row.og_title || row.twitter_title || row.title || row.domain,
          snippet: highlightTerms(rawSnippet, q),
          description: row.og_description || row.twitter_description || row.description || '',
          url: `https://${row.punycode}`,
          lexiconEntryId: row.lexicon_entry_id,
          pantheon: row.pantheon,
          tier: row.tier,
          tierLabel: row.tier_label,
          isFlagship: row.is_flagship === 1,
          status: row.status,
          lastCrawled: row.last_crawled,
          publishedDate: row.published_date,
          faviconPath: row.favicon_path,
          ogImagePath: row.og_image_path,
          lang: row.lang,
          rankScore: null,
          matchedTerms: [row.keyword],
          isKeywordMatch: true,
          keywordSource: row.keyword_source,
        });
      }
    }
  } catch (e) {
    console.error('Keyword fallback error:', e.message);
  }

  // Fallback 1: Semantic vector search if FTS returned nothing
  let isSemanticFallback = false;
  let semanticTotal = 0;
  if (results.length === 0) {
    try {
      const queryEmbedding = await embedText(q);
      if (queryEmbedding) {
        const vectorMatches = searchAllVectors(queryEmbedding, db, limitNum + offsetNum + 20);
        const filteredMatches = vectorMatches.filter((_m) => {
          if (!unicodeOnly) return true;
          // siteId -> punycode unknown here; filter after rows loaded
          return true;
        });
        if (filteredMatches.length > 0) {
          const siteIds = filteredMatches.map((m) => m.siteId);
          const placeholders = siteIds.map(() => '?').join(',');
          const fallbackRows = db
            .prepare(`
            SELECT s.* FROM indexed_sites s WHERE s.id IN (${placeholders})
          `)
            .all(...siteIds);

          // Preserve vector match order
          const rowMap = new Map(fallbackRows.map((r) => [r.id, r]));
          const mapped = filteredMatches
            .map((m) => {
              const row = rowMap.get(m.siteId);
              if (!row) return null;
              if (unicodeOnly && !row.punycode?.startsWith('xn--')) return null;
              const rawSnippet =
                row.og_description ||
                row.twitter_description ||
                row.h1 ||
                row.first_p ||
                row.description ||
                row.content_snippet ||
                '';
              return {
                id: row.id,
                domain: row.domain,
                punycode: row.punycode,
                title: row.og_title || row.twitter_title || row.title || row.domain,
                snippet: highlightTerms(rawSnippet, q),
                description: row.og_description || row.twitter_description || row.description || '',
                url: `https://${row.punycode}`,
                lexiconEntryId: row.lexicon_entry_id,
                pantheon: row.pantheon,
                tier: row.tier,
                tierLabel: row.tier_label,
                isFlagship: row.is_flagship === 1,
                status: row.status,
                lastCrawled: row.last_crawled,
                publishedDate: row.published_date,
                faviconPath: row.favicon_path,
                ogImagePath: row.og_image_path,
                lang: row.lang,
                rankScore: null,
                matchedTerms: q
                  .trim()
                  .split(/\s+/)
                  .filter((w) => w.length > 0),
                semanticScore: m.similarity,
                isSemanticFallback: true,
              };
            })
            .filter(Boolean);
          semanticTotal = mapped.length;
          results = mapped.slice(offsetNum, offsetNum + limitNum);
          isSemanticFallback = true;
        }
      }
    } catch (_e) {
      // Vector fallback is optional
    }
  }

  // Fallback 2: LIKE search if both FTS and vector returned nothing
  let likeTotal = 0;
  if (results.length === 0) {
    const like = `%${q}%`;
    const likeParams = [
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
      like,
    ];
    const unicodeFilter = unicodeOnly ? "AND s.punycode LIKE 'xn--%'" : '';

    try {
      const countRow = db
        .prepare(`
        SELECT COUNT(*) AS total
        FROM indexed_sites s
        LEFT JOIN entries e ON s.lexicon_entry_id = e.id
        WHERE s.status = 'active'
          AND (s.title LIKE ? OR s.description LIKE ? OR s.content_snippet LIKE ?
            OR s.h1 LIKE ? OR s.first_p LIKE ? OR s.domain LIKE ? OR s.punycode LIKE ?
            OR s.og_title LIKE ? OR s.og_description LIKE ?
            OR s.twitter_title LIKE ? OR s.twitter_description LIKE ?
            OR e.unicode LIKE ? OR e.ascii LIKE ?)
          ${unicodeFilter}
      `)
        .get(...likeParams);
      likeTotal = countRow?.total || 0;
    } catch (_e) {
      // Count optional
    }

    const fallbackRows = db
      .prepare(`
      SELECT s.*, e.unicode as entry_unicode
      FROM indexed_sites s
      LEFT JOIN entries e ON s.lexicon_entry_id = e.id
      WHERE s.status = 'active'
        AND (s.title LIKE ? OR s.description LIKE ? OR s.content_snippet LIKE ?
          OR s.h1 LIKE ? OR s.first_p LIKE ? OR s.domain LIKE ? OR s.punycode LIKE ?
          OR s.og_title LIKE ? OR s.og_description LIKE ?
          OR s.twitter_title LIKE ? OR s.twitter_description LIKE ?
          OR e.unicode LIKE ? OR e.ascii LIKE ?)
        ${unicodeFilter}
      ORDER BY s.is_flagship DESC, COALESCE(s.authority_score, 0) DESC, s.tier = 'dual' DESC, s.tier = '1' DESC
      LIMIT ? OFFSET ?
    `)
      .all(...likeParams, limitNum, offsetNum);

    results = fallbackRows.map((row) => {
      const rawSnippet =
        row.og_description ||
        row.twitter_description ||
        row.h1 ||
        row.first_p ||
        row.description ||
        row.content_snippet ||
        '';
      return {
        id: row.id,
        domain: row.domain,
        punycode: row.punycode,
        title: row.og_title || row.twitter_title || row.title || row.domain,
        snippet: highlightTerms(rawSnippet, q),
        description: row.og_description || row.twitter_description || row.description || '',
        url: `https://${row.punycode}`,
        lexiconEntryId: row.lexicon_entry_id,
        pantheon: row.pantheon,
        tier: row.tier,
        tierLabel: row.tier_label,
        isFlagship: row.is_flagship === 1,
        status: row.status,
        lastCrawled: row.last_crawled,
        publishedDate: row.published_date,
        faviconPath: row.favicon_path,
        ogImagePath: row.og_image_path,
        lang: row.lang,
        rankScore: null,
        matchedTerms: q
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0),
        isFallback: true,
      };
    });
  }

  // ====== PHASE 7: ENTITY RANKING BOOST ======
  // Find best-matching lexicon entry and boost sites that mention it
  let entityBonusApplied = false;
  let matchedEntryId = null;
  try {
    const query = q.trim().toLowerCase();
    const entry = db
      .prepare(`
      SELECT id, pantheon FROM entries
      WHERE LOWER(ascii) = ? OR LOWER(unicode) = ? OR LOWER(id) = ?
      LIMIT 1
    `)
      .get(query, query, query);

    if (!entry) {
      // Try partial match
      const partial = db
        .prepare(`
        SELECT id, pantheon FROM entries
        WHERE LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ?
        ORDER BY tier = 'dual' DESC, tier = '1' DESC
        LIMIT 1
      `)
        .get(`%${query}%`, `%${query}%`);
      if (partial) matchedEntryId = partial.id;
    } else {
      matchedEntryId = entry.id;
    }

    if (matchedEntryId && results.length > 0) {
      // Get sites that mention this entry
      const mentionRows = db
        .prepare(`
        SELECT site_id, mention_count FROM entity_mentions WHERE entry_id = ?
      `)
        .all(matchedEntryId);
      const mentionMap = new Map(mentionRows.map((r) => [r.site_id, r.mention_count]));

      // Also get same-pantheon mentions for broader semantic boost
      const pantheon = entry?.pantheon;
      let pantheonBonusMap = new Map();
      if (pantheon) {
        const pantheonRows = db
          .prepare(`
          SELECT site_id, SUM(mention_count) as total FROM entity_mentions
          WHERE pantheon = ? AND entry_id != ?
          GROUP BY site_id
        `)
          .all(pantheon, matchedEntryId);
        pantheonBonusMap = new Map(pantheonRows.map((r) => [r.site_id, Math.min(r.total, 5)]));
      }

      results = results.map((r) => {
        const directMentions = mentionMap.get(r.id) || 0;
        const pantheonMentions = pantheonBonusMap.get(r.id) || 0;
        const entityBonus =
          Math.min(directMentions * 0.05, 0.15) + Math.min(pantheonMentions * 0.02, 0.05);

        if (entityBonus > 0) {
          return {
            ...r,
            rankScore: (r.rankScore || 0) + entityBonus,
            scoreBreakdown: {
              ...r.scoreBreakdown,
              entity: parseFloat(entityBonus.toFixed(4)),
              total: parseFloat(((r.rankScore || 0) + entityBonus).toFixed(4)),
            },
          };
        }
        return r;
      });

      // Re-sort after entity bonus
      results.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
      entityBonusApplied = true;
    }
  } catch (_e) {
    // Entity ranking is optional — don't break search if it fails
  }

  // ====== PHASE 8: LEARNING-TO-RANK BOOST ======
  // Boost sites that users have actually clicked for this query. The LTR service
  // uses position-aware, freshness-discounted click signals from search_result_clicks.
  let clickBoostApplied = false;
  try {
    if (results.length > 0) {
      const siteIds = results.map((r) => r.id);
      const ltrBoosts = getLtrBoosts(q, siteIds);

      results = results.map((r) => {
        const boost = ltrBoosts.get(r.id) || 0;
        if (boost > 0) {
          return {
            ...r,
            rankScore: (r.rankScore || 0) + boost,
            scoreBreakdown: {
              ...r.scoreBreakdown,
              ltr: parseFloat(boost.toFixed(4)),
              total: parseFloat(((r.rankScore || 0) + boost).toFixed(4)),
            },
          };
        }
        return r;
      });

      // Re-sort after LTR boost
      results.sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0));
      clickBoostApplied = true;
    }
  } catch (_e) {
    // LTR boost is optional
  }

  // ====== PHASE 9: SEMANTIC RE-RANKING ======
  // Disabled on the default hot path: loading the transformer model on every
  // cold start costs 200-300 ms and rarely changes the top result when FTS +
  // transliteration signals already identify the canonical match. Semantic
  // fallback still handles zero-result conceptual queries via precomputed
  // site embeddings.

  // Attach top sub-pages to final result set
  if (results.length > 0) {
    const siteIds = results.map((r) => r.id);
    const placeholders = siteIds.map(() => '?').join(',');
    const subPages = db
      .prepare(`
      SELECT site_id, url, title, description, h1, word_count, content_hash
      FROM site_pages
      WHERE site_id IN (${placeholders})
      ORDER BY word_count DESC
    `)
      .all(...siteIds);

    const pagesBySite = {};
    const seenHashes = {};
    for (const p of subPages) {
      if (!pagesBySite[p.site_id]) {
        pagesBySite[p.site_id] = [];
        seenHashes[p.site_id] = new Set();
      }
      try {
        const u = new URL(p.url);
        if (u.pathname === '/' || u.pathname === '/index.html') continue;
      } catch {
        continue;
      }
      if (seenHashes[p.site_id].has(p.content_hash)) continue;
      seenHashes[p.site_id].add(p.content_hash);
      pagesBySite[p.site_id].push(p);
    }

    results = results.map((r) => ({
      ...r,
      subPages: (pagesBySite[r.id] || []).slice(0, 4),
    }));
  }

  // ====== AVAILABILITY LAYER ======
  // Find lexicon entries matching the query that are available for lease
  const availability = [];
  try {
    if (mode !== 'network') {
      const query = q.trim().toLowerCase();
      const availRows = db
        .prepare(`
        SELECT a.entry_id, a.domain, a.punycode, a.status, a.registrar_links,
               e.unicode, e.ascii, e.meaning, e.tier, e.pantheon
        FROM availability a
        JOIN entries e ON a.entry_id = e.id
        WHERE (LOWER(e.ascii) = ? OR LOWER(e.unicode) = ? OR LOWER(e.id) = ?
               OR LOWER(e.ascii) LIKE ? OR LOWER(e.unicode) LIKE ?)
          AND a.status = 'available'
        ORDER BY e.tier = 'dual' DESC, e.tier = '1' DESC
        LIMIT 5
      `)
        .all(query, query, query, `%${query}%`, `%${query}%`);

      for (const row of availRows) {
        availability.push({
          entryId: row.entry_id,
          domain: row.domain,
          punycode: row.punycode,
          unicode: row.unicode,
          ascii: row.ascii,
          meaning: row.meaning,
          tier: row.tier,
          pantheon: row.pantheon,
          registrarLinks: row.registrar_links ? JSON.parse(row.registrar_links) : {},
        });
      }
    }
  } catch (_e) {
    // Availability is optional
  }

  const timing = ((Date.now() - startTime) / 1000).toFixed(3);
  const queryTrust = classifyTerm(q);

  const response = {
    results,
    total: 0,
    hasMore: false,
    offset: offsetNum,
    limit: limitNum,
    query: q,
    queryNormalized,
    queryTrust: {
      tier: queryTrust.tier,
      verdict: queryTrust.verdict,
      severity: queryTrust.severity,
      label: queryTrust.label,
      reason: queryTrust.reason,
      lookalikeScore: queryTrust.lookalikeScore,
      visualDeviation: queryTrust.visualDeviation,
      canonicalMatch: queryTrust.canonicalMatch,
    },
    timing,
    mode,
    entityBonusApplied,
    matchedEntryId,
    clickBoostApplied,
    semanticReranked: false,
    isSemanticFallback,
    availability,
    variant: variant || 'default',
    rankVariant: variant || 'default',
    variants: listVariants(),
  };

  let total = totalMain;
  if (keywordTotal > 0) {
    total = totalMain + keywordTotal;
  } else if (isSemanticFallback) {
    total = semanticTotal;
  } else if (likeTotal > 0) {
    total = likeTotal;
  }
  response.total = total;
  response.hasMore = total > offsetNum + results.length;

  setCachedSearch(qCacheKey, response);
  return response;
}

function extractMatchedTerms(snippet) {
  const terms = [];
  const re = /<mark>([^<]+)<\/mark>/gi;
  let m;
  while ((m = re.exec(snippet)) !== null) {
    const term = m[1].toLowerCase();
    if (!terms.includes(term)) terms.push(term);
  }
  return terms;
}

function highlightTerms(text, query) {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  let result = text;
  for (const word of words) {
    const re = new RegExp(`(${escapeRegExp(word)})`, 'gi');
    result = result.replace(re, '<mark>$1</mark>');
  }
  return result;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getAvailability(entryId) {
  const db = getDb();
  const avail = db.prepare('SELECT * FROM availability WHERE entry_id = ?').get(entryId);
  if (avail) return { ...avail, registrar_links: JSON.parse(avail.registrar_links || '{}') };
  return null;
}

function setAvailability(entryId, domain, punycode, status = 'available') {
  const db = getDb();
  const links = JSON.stringify(generateRegistrarLinks(domain));
  db.prepare(`
    INSERT INTO availability (entry_id, domain, punycode, status, registrar_links)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(entry_id) DO UPDATE SET
      domain = excluded.domain,
      punycode = excluded.punycode,
      status = excluded.status,
      registrar_links = excluded.registrar_links,
      last_checked = datetime('now')
  `).run(entryId, domain, punycode, status, links);
}

function generateRegistrarLinks(domain) {
  const clean = domain.replace(/^www\./, '');
  return {
    godaddy: `https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(clean)}`,
    namecheap: `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(clean)}`,
    porkbun: `https://porkbun.com/checkout/search?q=${encodeURIComponent(clean)}`,
    dynadot: `https://www.dynadot.com/domain/search.html?domain=${encodeURIComponent(clean)}`,
    spaceship: `https://spaceship.com/domains/?query=${encodeURIComponent(clean)}`,
  };
}

function getCrawlerStats() {
  const db = getDb();
  return {
    total_sites: db.prepare('SELECT COUNT(*) as c FROM indexed_sites').get().c,
    active_sites: db
      .prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active'")
      .get().c,
    pending_sites: db
      .prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'pending'")
      .get().c,
    error_sites: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'error'").get()
      .c,
    flagged_sites: db.prepare("SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'spam'").get()
      .c,
    available_entries: db.prepare('SELECT COUNT(*) as c FROM availability').get().c,
    by_pantheon: db
      .prepare(`
      SELECT pantheon, COUNT(*) as count FROM indexed_sites WHERE status = 'active' GROUP BY pantheon
    `)
      .all(),
    last_crawled: db
      .prepare(`
      SELECT MAX(last_crawled) as last_crawled FROM indexed_sites
    `)
      .get().last_crawled,
    queue: {
      pending: db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'pending'").get().c,
      crawling: db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'crawling'").get()
        .c,
      crawled: db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'crawled'").get().c,
      error: db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'error'").get().c,
      spam: db.prepare("SELECT COUNT(*) as c FROM crawl_queue WHERE status = 'spam'").get().c,
      total_discovered: db.prepare('SELECT COUNT(*) as c FROM discovered_domains').get().c,
    },
    punycode: {
      unicode: db
        .prepare(
          "SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active' AND punycode LIKE 'xn--%'"
        )
        .get().c,
      ascii: db
        .prepare(
          "SELECT COUNT(*) as c FROM indexed_sites WHERE status = 'active' AND punycode NOT LIKE 'xn--%'"
        )
        .get().c,
    },
    entities: {
      mentions: db.prepare('SELECT COUNT(*) as c FROM entity_mentions').get().c,
      sites: db.prepare('SELECT COUNT(DISTINCT site_id) as c FROM entity_mentions').get().c,
    },
  };
}

function getQueue({ status, limit = 50, offset = 0 }) {
  const db = getDb();
  let sql = 'SELECT * FROM crawl_queue WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM crawl_queue WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    countSql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY priority DESC, discovery_date ASC';
  sql += ' LIMIT ? OFFSET ?';

  const items = db.prepare(sql).all(...params, limit, offset);
  const { total } = db.prepare(countSql).get(...params);

  return { items, total, limit, offset };
}

function addToQueue(domain, punycode, source = 'manual', priority = 0) {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO crawl_queue (domain, punycode, source, status, priority)
    VALUES (?, ?, ?, 'pending', ?)
  `).run(domain, punycode, source, priority);
}

function getDiscoveredDomains({ source, limit = 50, offset = 0 }) {
  const db = getDb();
  let sql = 'SELECT * FROM discovered_domains WHERE 1=1';
  let countSql = 'SELECT COUNT(*) as total FROM discovered_domains WHERE 1=1';
  const params = [];

  if (source) {
    sql += ' AND source = ?';
    countSql += ' AND source = ?';
    params.push(source);
  }

  sql += ' ORDER BY last_seen DESC';
  sql += ' LIMIT ? OFFSET ?';

  const items = db.prepare(sql).all(...params, limit, offset);
  const { total } = db.prepare(countSql).get(...params);

  return { items, total, limit, offset };
}

/**
 * Find near-duplicate content clusters using simhash Hamming distance.
 * Returns groups of sites with similar content (distance <= threshold).
 */
function findDuplicateClusters(threshold = 3, minClusterSize = 2, limit = 100) {
  const db = getDb();
  const { hammingDistance } = require('../scripts/content-quality');

  // Fetch active sites with simhash
  const sites = db
    .prepare(`
    SELECT id, domain, punycode, title, simhash, content_length, lexicon_entry_id
    FROM indexed_sites
    WHERE status = 'active' AND simhash IS NOT NULL AND simhash != ''
    ORDER BY id
    LIMIT ?
  `)
    .all(limit * 5);

  const clusters = [];
  const visited = new Set();

  for (let i = 0; i < sites.length; i++) {
    if (visited.has(sites[i].id)) continue;

    const cluster = [sites[i]];
    visited.add(sites[i].id);

    for (let j = i + 1; j < sites.length; j++) {
      if (visited.has(sites[j].id)) continue;
      if (!sites[j].simhash) continue;

      try {
        const dist = hammingDistance(sites[i].simhash, sites[j].simhash);
        if (dist <= threshold) {
          cluster.push(sites[j]);
          visited.add(sites[j].id);
        }
      } catch (_e) {
        // Invalid hash format, skip
      }
    }

    if (cluster.length >= minClusterSize) {
      clusters.push({
        representative: cluster[0],
        count: cluster.length,
        sites: cluster.map((s) => ({
          id: s.id,
          domain: s.domain,
          punycode: s.punycode,
          title: s.title,
        })),
      });
    }
  }

  return clusters;
}

/**
 * Get knowledge panel data for a query.
 * Returns the best matching lexicon entry + live sites + related entries.
 */
function getKnowledgePanelData(q) {
  const db = getDb();
  if (!q?.trim()) return null;

  const query = q.trim().toLowerCase();

  // Try exact match first
  let entry = db
    .prepare(`
    SELECT * FROM entries
    WHERE LOWER(ascii) = ? OR LOWER(unicode) = ? OR LOWER(id) = ?
    LIMIT 1
  `)
    .get(query, query, query);

  // Try LIKE match
  if (!entry) {
    entry = db
      .prepare(`
      SELECT * FROM entries
      WHERE LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ? OR LOWER(meaning) LIKE ?
      ORDER BY tier = 'dual' DESC, tier = '1' DESC
      LIMIT 1
    `)
      .get(`%${query}%`, `%${query}%`, `%${query}%`);
  }

  if (!entry) return null;

  // Get live sites for this entry
  const sites = db
    .prepare(`
    SELECT domain, punycode, title, description, favicon_path, og_image_path, tier, pantheon,
           tenant_name, tenant_category, tenant_front_url, is_flagship
    FROM indexed_sites
    WHERE lexicon_entry_id = ? AND status = 'active'
    ORDER BY is_flagship DESC, tier = 'dual' DESC, tier = '1' DESC
    LIMIT 5
  `)
    .all(entry.id);

  // Prominent tenant for the knowledge panel (flagship tenant first)
  const tenantSite = sites.find((s) => s.tenant_name || s.is_flagship) || null;
  const tenant = tenantSite
    ? {
        name: tenantSite.tenant_name || 'PUNICODEX Flagship',
        category: tenantSite.tenant_category,
        frontUrl: tenantSite.tenant_front_url,
        punycode: tenantSite.punycode,
        isFlagship: tenantSite.is_flagship === 1,
      }
    : null;

  // Get related entries (same pantheon, different id)
  const related = db
    .prepare(`
    SELECT id, unicode, ascii, greek, meaning, tier, pantheon
    FROM entries
    WHERE pantheon = ? AND id != ?
    ORDER BY RANDOM()
    LIMIT 6
  `)
    .all(entry.pantheon, entry.id);

  return {
    entry: {
      id: entry.id,
      unicode: entry.unicode,
      ascii: entry.ascii,
      greek: entry.greek,
      meaning: entry.meaning,
      tier: entry.tier,
      pantheon: entry.pantheon,
      etymology: entry.etymology,
      notes: entry.notes,
    },
    lore: LORE_CATALOG[entry.id] || null,
    sites,
    related,
    tenant,
  };
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function sentenceJoin(parts, maxLen = 280) {
  const out = [];
  let len = 0;
  for (const p of parts) {
    if (!p) continue;
    const addLen = out.length ? p.length + 1 : p.length;
    if (len + addLen > maxLen && out.length) break;
    out.push(p);
    len += addLen;
  }
  return out.join(' ');
}

function formatSources(sources) {
  if (!Array.isArray(sources) || !sources.length) return '';
  const labels = sources
    .slice(0, 3)
    .map((s) => (typeof s === 'string' ? s : s.author || s.title || s.id || 'Source'))
    .filter(Boolean);
  return labels.length ? `Sources: ${labels.join('; ')}.` : '';
}

/**
 * Generate a richer "People Also Ask" list for a query.
 * Answers draw from the lexicon, the curated lore catalog, etymology,
 * variant spellings, flagship/tenant data, and the semantic graph.
 */
function generatePeopleAlsoAsk(q, limit = 4) {
  const db = getDb();
  if (!q?.trim()) return [];

  const raw = q.trim();
  const query = raw.toLowerCase();

  // Find best matching lexicon entry (with search_key fallback)
  let entry = db
    .prepare(`
    SELECT id, unicode, ascii, greek, original_script, meaning, pantheon, tier, tier_label, domain, etymology, variants, has_flagship
    FROM entries
    WHERE LOWER(ascii) = ? OR LOWER(unicode) = ? OR LOWER(id) = ? OR search_key = ?
    LIMIT 1
  `)
    .get(query, query, query, toSearchKey(raw));

  if (!entry) {
    entry = db
      .prepare(`
      SELECT id, unicode, ascii, greek, original_script, meaning, pantheon, tier, tier_label, domain, etymology, variants, has_flagship
      FROM entries
      WHERE LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ? OR LOWER(meaning) LIKE ? OR LOWER(domain) LIKE ? OR search_key LIKE ?
      ORDER BY tier = 'dual' DESC, tier = '1' DESC, has_flagship DESC, ascii ASC
      LIMIT 1
    `)
      .get(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${toSearchKey(raw)}%`);
  }

  const questions = [];
  const seen = new Set();

  function add(question, answer, source = 'lexicon') {
    if (!question || !answer) return;
    const key = question.toLowerCase().trim();
    if (seen.has(key)) return;
    seen.add(key);
    questions.push({ question, answer: String(answer).trim(), source });
  }

  const lore = entry ? LORE_CATALOG[entry.id] || null : null;

  if (entry) {
    const name = entry.unicode || entry.ascii;

    // Meaning — combine lexicon meaning with lore overview and etymology
    if (entry.meaning || lore?.domains?.subtitle) {
      const meaningParts = [];
      if (entry.meaning) meaningParts.push(`${name} means “${entry.meaning}”.`);
      if (lore?.domains?.subtitle) {
        meaningParts.push(
          `In the sources, ${name} presides over ${stripHtml(lore.domains.subtitle).toLowerCase()}.`
        );
      }
      if (lore?.pronunciation?.note) {
        const note = stripHtml(lore.pronunciation.note);
        if (note && !meaningParts.some((p) => p.includes(note.slice(0, 40)))) {
          meaningParts.push(note);
        }
      }
      add(`What does ${name} mean?`, sentenceJoin(meaningParts));
    }

    // Pronunciation
    if (lore?.pronunciation) {
      const p = lore.pronunciation;
      const parts = [];
      if (p.ipa) parts.push(`Reconstructed IPA: ${p.ipa}${p.ipaLabel ? ` (${p.ipaLabel})` : ''}.`);
      if (p.approximation) parts.push(stripHtml(p.approximation));
      if (parts.length) {
        add(`How do you pronounce ${name}?`, sentenceJoin(parts));
      }
    }

    // Original script form
    const original = entry.original_script || entry.greek;
    if (original && original !== '-' && original !== '—') {
      const scriptName =
        entry.pantheon === 'greek' || entry.pantheon === 'greek-location'
          ? 'Greek'
          : entry.pantheon === 'egyptian'
            ? 'hieroglyphs'
            : entry.pantheon === 'mesopotamian'
              ? 'cuneiform'
              : entry.pantheon === 'norse'
                ? 'runes'
                : entry.pantheon === 'sanskrit'
                  ? 'Devanagari'
                  : 'the original script';
      add(
        `What is the original script of ${name}?`,
        `${name} is written ${original} in ${scriptName}.`
      );
    }

    // Domain / powers — use lore lead + cards when available
    if (lore?.domains) {
      const parts = [];
      if (lore.domains.lead) parts.push(stripHtml(lore.domains.lead));
      if (Array.isArray(lore.domains.cards) && lore.domains.cards.length) {
        const cards = lore.domains.cards
          .map((c) => `${c.name}${c.desc ? ` (${c.desc})` : ''}`)
          .join('; ');
        parts.push(`Primary domains include ${cards}.`);
      }
      add(`What is ${name} the god or symbol of?`, sentenceJoin(parts));
      add(`What domain does ${name} rule?`, sentenceJoin(parts));
    } else if (entry.domain) {
      add(`What is ${name} the god or symbol of?`, entry.domain);
      add(`What domain does ${name} rule?`, entry.domain);
    }

    // Symbols
    if (Array.isArray(lore?.symbols) && lore.symbols.length) {
      const symbols = lore.symbols
        .map((s) => `${s.name}${s.meaning ? ` — ${s.meaning}` : ''}`)
        .join('; ');
      add(`What are the symbols of ${name}?`, `Key attributes include ${symbols}.`);
    }

    // Mythology
    if (lore?.mythology) {
      const parts = [];
      if (lore.mythology.lead) parts.push(stripHtml(lore.mythology.lead));
      if (Array.isArray(lore.mythology.myths) && lore.mythology.myths.length) {
        const myth = lore.mythology.myths[0];
        parts.push(`${myth.title || myth.tag}: ${stripHtml(myth.text)}`);
      }
      add(`What is the mythology of ${name}?`, sentenceJoin(parts));
    }

    // Pantheon
    if (entry.pantheon) {
      const pantheonTitle = entry.pantheon.charAt(0).toUpperCase() + entry.pantheon.slice(1);
      add(
        `Which pantheon does ${name} belong to?`,
        `${name} belongs to the ${pantheonTitle} pantheon.`
      );
    }

    // Unicode tier
    if (entry.tier) {
      const tierLabel =
        entry.tier_label || (entry.tier === 'dual' ? 'Dual-Tier' : `Tier ${entry.tier}`);
      let tierExplanation = '';
      if (entry.tier === 'dual')
        tierExplanation = 'it has multiple historically valid Unicode spellings.';
      else if (entry.tier === '1')
        tierExplanation =
          'it contains both stress and long vowels with a single valid restoration.';
      else tierExplanation = 'it preserves one scholarly feature (stress or length).';
      add(
        `What is the Unicode tier of ${name}?`,
        `${name} is classified as ${tierLabel} — ${tierExplanation}`
      );
    }

    // Variant spellings
    if (entry.variants) {
      try {
        const variants = JSON.parse(entry.variants);
        if (Array.isArray(variants) && variants.length > 0) {
          const variantText = variants
            .map((v) => v.unicode || v.ascii || v)
            .filter(Boolean)
            .join(', ');
          if (variantText) {
            add(
              `What are the alternate Unicode spellings of ${name}?`,
              `Attested variants include ${variantText}.`
            );
          }
        }
      } catch (_e) {
        /* ignore malformed JSON */
      }
    }

    // Etymology — prioritize lore narrative, fall back to lexicon etymology
    const etyParts = [];
    if (lore?.etymology?.narrative) {
      etyParts.push(stripHtml(lore.etymology.narrative));
    } else if (lore?.etymology?.summary) {
      etyParts.push(stripHtml(lore.etymology.summary));
    }
    if (entry.etymology) {
      try {
        const ety = JSON.parse(entry.etymology);
        if (ety.protoForm && ety.protoLanguage)
          etyParts.push(`From Proto-${ety.protoLanguage} *${ety.protoForm}*.`);
        if (ety.derivation) etyParts.push(ety.derivation);
        if (ety.cognates?.length) {
          const cognates = ety.cognates.map((c) => `${c.form} (${c.language})`).join(', ');
          etyParts.push(`Cognates include ${cognates}.`);
        }
      } catch (_e) {
        etyParts.push(entry.etymology);
      }
    }
    if (etyParts.length) {
      const sources = formatSources(lore?.etymology?.sources || lore?.sources);
      add(
        `What is the etymology of ${name}?`,
        sentenceJoin(etyParts) + (sources ? ` ${sources}` : '')
      );
    }

    // Cultural legacy
    if (lore?.culturalLegacy) {
      add(
        `What is the cultural legacy of ${name}?`,
        sentenceJoin([stripHtml(lore.culturalLegacy)])
      );
    }

    // Flagship / tenant sites on this entry
    if (entry.has_flagship) {
      const sites = db
        .prepare(`
        SELECT domain, punycode, title, tenant_name, tenant_category
        FROM indexed_sites
        WHERE lexicon_entry_id = ? AND status = 'active'
        ORDER BY is_flagship DESC, quality_score DESC
        LIMIT 3
      `)
        .all(entry.id);
      if (sites.length) {
        const siteList = sites.map((s) => s.domain || s.punycode).join(', ');
        add(
          `What is the flagship domain for ${name}?`,
          `The PUNICODEX flagship is ${siteList}.`,
          'tenants'
        );
        for (const s of sites) {
          if (s.tenant_name) {
            add(
              `What business operates on ${name}?`,
              `${s.tenant_name}${s.tenant_category ? ` (${s.tenant_category})` : ''} — ${s.domain || s.punycode}.`,
              'tenants'
            );
          }
        }
      }
    }

    // Co-mentioned entities from the semantic graph
    const coEntities = db
      .prepare(`
      SELECT e.id, e.unicode, e.ascii, e.meaning, COUNT(*) as co_count
      FROM entity_mentions em1
      JOIN entity_mentions em2 ON em1.site_id = em2.site_id
      JOIN entries e ON em2.entry_id = e.id
      WHERE em1.entry_id = ? AND em2.entry_id != ?
      GROUP BY e.id
      ORDER BY co_count DESC
      LIMIT 6
    `)
      .all(entry.id, entry.id);

    for (const ce of coEntities.slice(0, 2)) {
      add(
        `How is ${name} related to ${ce.unicode}?`,
        `Both ${name} and ${ce.unicode} appear together in ${ce.co_count} indexed page${ce.co_count > 1 ? 's' : ''} across the Unicode web.${ce.meaning ? ` ${ce.unicode} means "${ce.meaning}".` : ''}`,
        'semantic_graph'
      );
    }
  }

  // Tenant / commercial questions for any query with matching active sites
  const tenantSites = db
    .prepare(`
    SELECT domain, punycode, title, description, first_p, tenant_name, tenant_category, tenant_front_url, meta_keywords
    FROM indexed_sites
    WHERE status = 'active' AND (
      LOWER(title) LIKE ? OR
      LOWER(description) LIKE ? OR
      LOWER(first_p) LIKE ? OR
      LOWER(meta_keywords) LIKE ? OR
      LOWER(tenant_category) LIKE ?
    )
    ORDER BY is_flagship DESC, quality_score DESC, authority_score DESC
    LIMIT 5
  `)
    .all(`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`);

  if (tenantSites.length) {
    const names = tenantSites
      .slice(0, 3)
      .map((s) => s.tenant_name || s.title || s.domain)
      .join(', ');
    add(`Who offers ${raw} on PUNICODEX?`, `Indexed tenants include ${names}.`, 'tenants');
    const first = tenantSites[0];
    if (first.tenant_category) {
      add(
        `What kind of business is ${first.tenant_name || first.title}?`,
        `${first.tenant_name || first.title} is listed under ${first.tenant_category}.`,
        'tenants'
      );
    }
    if (first.tenant_front_url || first.domain) {
      add(
        `Where can I learn more about ${first.tenant_name || first.title}?`,
        `Visit ${first.tenant_front_url || first.domain}.`,
        'tenants'
      );
    }
  } else if (!entry) {
    add(
      `What is ${raw}?`,
      `We don’t have a PUNICODEX entry for “${raw}” yet, but you can search for Unicode-restored names or browse the lexicon.`,
      'lexicon'
    );
  }

  return questions.slice(0, limit);
}

/**
 * Submit a domain for indexing (webmaster flow).
 */
function submitDomain(domain, source = 'webmaster') {
  const db = getDb();
  try {
    const punycode = require('node:url').domainToASCII(domain);
    if (!punycode) return { success: false, error: 'Invalid domain' };

    // Check if already indexed
    const existing = db
      .prepare('SELECT status FROM indexed_sites WHERE punycode = ?')
      .get(punycode);
    if (existing) {
      return { success: true, alreadyIndexed: true, status: existing.status, punycode };
    }

    // Add to queue
    db.prepare(`
      INSERT OR IGNORE INTO crawl_queue (domain, punycode, source, status, priority)
      VALUES (?, ?, ?, 'pending', 10)
    `).run(domain, punycode, source);

    // Also add to discovered_domains
    db.prepare(`
      INSERT OR IGNORE INTO discovered_domains (domain, punycode, source)
      VALUES (?, ?, ?)
    `).run(domain, punycode, source);

    return { success: true, punycode, queued: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function markSiteSpam(punycode) {
  const db = getDb();
  db.prepare(`UPDATE indexed_sites SET status = 'spam' WHERE punycode = ?`).run(punycode);
}

module.exports = {
  getSites,
  getSiteByPunycode,
  searchSites,
  searchWeb,
  getAvailability,
  setAvailability,
  getCrawlerStats,
  markSiteSpam,
  getQueue,
  addToQueue,
  getDiscoveredDomains,
  findDuplicateClusters,
  getKnowledgePanelData,
  generatePeopleAlsoAsk,
  submitDomain,
};
