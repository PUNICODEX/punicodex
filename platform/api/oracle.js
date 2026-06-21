/**
 * Ask the Oracle — conversational RAG-style Q&A over the PUNYCODEX knowledge base.
 *
 * Phase 2.5: Deep, citation-rich answers using the full lore catalog,
 * etymology, variants, original scripts, live sites, and scholarly sources.
 * Optional LLM polish when ORACLE_LLM_API_KEY + ORACLE_LLM_MODEL are set.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');
const { searchKeywords } = require('./keyword-extractor');
const { getEntryContext } = require('./oracle-context');
const { embedText } = require('./embeddings');

let db;

function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

/**
 * Fast in-memory LRU cache for Oracle answers.
 * Keys are hashed queries; entries expire after 5 minutes.
 */
const ORACLE_CACHE = new Map();
const ORACLE_CACHE_MAX = 200;
const ORACLE_CACHE_TTL_MS = 5 * 60 * 1000;

function hashQuery(q, history = []) {
  const crypto = require('node:crypto');
  const payload = JSON.stringify({ q: q.toLowerCase().trim(), historyLen: history.length });
  return crypto.createHash('sha256').update(payload).digest('hex').substring(0, 32);
}

function getCachedOracle(key) {
  const hit = ORACLE_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > ORACLE_CACHE_TTL_MS) {
    ORACLE_CACHE.delete(key);
    return null;
  }
  return hit.value;
}

function setCachedOracle(key, value) {
  if (ORACLE_CACHE.size >= ORACLE_CACHE_MAX) {
    const oldest = ORACLE_CACHE.keys().next().value;
    ORACLE_CACHE.delete(oldest);
  }
  ORACLE_CACHE.set(key, { ts: Date.now(), value });
}

/**
 * Direct entry lookup — fastest path when the query is obviously a name.
 */
function lookupEntryDirectly(q) {
  const database = getDb();
  const normalized = normalizeQuery(q);
  const row = database
    .prepare(
      `SELECT * FROM entries
       WHERE LOWER(id) = ? OR LOWER(ascii) = ? OR LOWER(unicode) = ?
       LIMIT 1`
    )
    .get(normalized, normalized, normalized);
  return row || null;
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'shall',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'he',
  'she',
  'we',
  'they',
  'you',
  'i',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'our',
  'their',
  'his',
  'am',
  'so',
  'if',
  'out',
  'up',
  'down',
  'over',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'when',
  'where',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'than',
  'too',
  'very',
  'just',
  'now',
  'also',
  'get',
  'got',
  'go',
  'going',
  'came',
  'come',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'among',
  'until',
  'while',
  'because',
  'against',
  'off',
  'on',
  'onto',
  'upon',
  'within',
  'without',
  'per',
  'via',
  'like',
  'regarding',
  'concerning',
  'including',
  'of',
  'in',
  'to',
  'for',
  'with',
  'by',
  'from',
  'at',
  'as',
  'on',
  'what',
  'who',
  'which',
  'whom',
  'whose',
]);

const CONCEPT_BOOST = new Map([
  ['wisdom', ['wisdom', 'knowledge', 'counsel', 'strategy']],
  ['war', ['war', 'warfare', 'battle', 'warrior', 'combat', 'strategic warfare']],
  ['love', ['love', 'desire', 'beauty', 'fertility', 'erotic']],
  ['death', ['death', 'dead', 'underworld', 'afterlife', 'funerary']],
  ['sea', ['sea', 'ocean', 'water', 'maritime', 'sailor']],
  ['sky', ['sky', 'heaven', 'storm', 'thunder', 'lightning']],
  ['sun', ['sun', 'solar', 'light', 'day']],
  ['moon', ['moon', 'lunar', 'night']],
  ['earth', ['earth', 'land', 'ground', 'fertility', 'harvest']],
  ['crafts', ['craft', 'weaving', 'pottery', 'carpentry', 'artisan']],
  ['hunt', ['hunt', 'hunter', 'wild', 'archer']],
  ['fire', ['fire', 'forge', 'smith', 'volcano']],
  ['trickster', ['trickster', 'messenger', 'commerce', 'thieves']],
  ['fertility', ['fertility', 'grain', 'harvest', 'agriculture']],
  ['justice', ['justice', 'law', 'order', 'oath']],
  ['magic', ['magic', 'sorcery', 'witchcraft', 'hekate']],
]);

function normalizeQuery(q) {
  return String(q)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function _tokenize(q) {
  return normalizeQuery(q)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:!?])/g, '$1')
    .trim();
}

function safeJsonParse(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch (_e) {
    return null;
  }
}

function detectIntent(q) {
  const lower = normalizeQuery(q);

  if (/\b(who is|who was|who are|whom is|whom was|tell me about)\b/.test(lower)) return 'who';
  if (/\b(what is the etymology of|what was the etymology of|etymology of)\b/.test(lower))
    return 'etymology';
  if (/\b(what does|meaning of|what do|mean|stands for)\b/.test(lower)) return 'meaning';
  if (
    /\b(goddess of|god of|deity of|presides? over|rules? over|patron of|associated with)\b/.test(
      lower
    )
  )
    return 'attribute';
  if (/\b(how (is|was|do|does)|related to|connection between|compare)\b/.test(lower))
    return 'relation';
  if (/\b(etymology|origin|root|comes from|derived from|cognates?)\b/.test(lower))
    return 'etymology';
  if (/\b(pronunciation|pronounce|how do you say|how is .* pronounced|phonetics?)\b/.test(lower))
    return 'pronunciation';
  if (/\b(myth|mythology|story|legend|tale|epic|saga|born|birth|killed|defeated)\b/.test(lower))
    return 'mythology';
  if (/\b(symbol|icon|attribute|sacred animal|sacred bird|weapon|staff|object)\b/.test(lower))
    return 'symbols';
  if (/\b(variant|spelling|alternate|other form|different spelling|diacritics?)\b/.test(lower))
    return 'variants';
  if (/\b(original script|writing|glyph|hieroglyph|devanagari|cuneiform|rune|script)\b/.test(lower))
    return 'script';
  if (
    /\b(business(es)?|company|companies|tenant|lease|leasing|advertiser|shop|store)\b/.test(lower)
  )
    return 'tenant';
  if (/\b(where|buy|purchase|find|acquire|get this name)\b/.test(lower)) return 'commercial';
  if (/\b(claim|buy this domain|how much|price|cost|pricing)\b/.test(lower)) return 'acquisition';
  if (/\b(archaeology|archaeological|site|temple|shrine|worshipped|cult)\b/.test(lower))
    return 'archaeology';
  if (/\b(legacy|today|modern|influence|cultural|civilization)\b/.test(lower)) return 'legacy';
  if (/\b(tell me more|more about|explain|describe|overview)\b/.test(lower)) return 'explore';

  return 'general';
}

function formatProtoLanguage(lang) {
  if (!lang) return '';
  const map = {
    'proto-indo-european': 'Proto-Indo-European',
    'proto-germanic': 'Proto-Germanic',
    'proto-semitic': 'Proto-Semitic',
    'proto-celtic': 'Proto-Celtic',
    'proto-slavic': 'Proto-Slavic',
    'proto-uralic': 'Proto-Uralic',
    'proto-dravidian': 'Proto-Dravidian',
    'proto-sino-tibetan': 'Proto-Sino-Tibetan',
  };
  return map[lang.toLowerCase()] || lang.replace(/^proto-/, 'Proto-');
}

function etymologySummary(etymology) {
  const parsed =
    typeof etymology === 'object' && etymology !== null ? etymology : safeJsonParse(etymology);
  if (!parsed) return typeof etymology === 'string' ? etymology : '';
  const parts = [];
  if (parsed.protoForm && parsed.protoLanguage) {
    const form = parsed.protoForm.startsWith('*') ? parsed.protoForm : `*${parsed.protoForm}`;
    parts.push(`From ${formatProtoLanguage(parsed.protoLanguage)} ${form}`);
    if (parsed.protoGloss) parts.push(`(“${parsed.protoGloss}”)`);
  }
  if (parsed.derivation) parts.push(parsed.derivation);
  if (parsed.cognates?.length) {
    const cognates = parsed.cognates
      .slice(0, 3)
      .map((c) => `${c.form} (${c.language})`)
      .join(', ');
    parts.push(`Cognates include ${cognates}.`);
  }
  return parts.join(' ');
}

function resolveAnaphora(q, history) {
  const lower = q.toLowerCase();
  const anaphoric = /\b(he|she|it|they|them|their|this|that|these|those|the name|this name)\b/.test(
    lower
  );
  if (!anaphoric) return q;

  for (let i = history.length - 1; i >= 0; i--) {
    const turn = history[i];
    if (turn.role === 'oracle' && turn.primaryId) {
      const database = getDb();
      const entry = database
        .prepare('SELECT unicode, ascii FROM entries WHERE id = ?')
        .get(turn.primaryId);
      if (entry) {
        const name = entry.unicode || entry.ascii;
        return lower
          .replace(/\b(he|she|it|they|them)\b/gi, name)
          .replace(/\b(this|that|these|those)\b/gi, name)
          .replace(/\b(the name|this name)\b/gi, name);
      }
    }
  }
  return q;
}

function _extractNamedEntities(q) {
  const database = getDb();
  const normalized = normalizeQuery(q);
  const tokens = normalized.split(/\s+/).filter(Boolean);

  const direct = database
    .prepare(
      `
      SELECT id, unicode, ascii FROM entries
      WHERE LOWER(ascii) = ? OR LOWER(unicode) = ? OR LOWER(id) = ?
      `
    )
    .all(normalized, normalized, normalized);

  if (direct.length) return direct;

  if (tokens.length) {
    const conditions = tokens
      .map(() => 'LOWER(unicode) LIKE ? OR LOWER(ascii) LIKE ? OR LOWER(id) LIKE ?')
      .join(' OR ');
    const params = [];
    for (const t of tokens) {
      const like = `%${t}%`;
      params.push(like, like, like);
    }
    const fuzzy = database
      .prepare(`SELECT id, unicode, ascii FROM entries WHERE ${conditions} LIMIT 5`)
      .all(...params);
    if (fuzzy.length) return fuzzy;
  }

  return [];
}

function retrieveEntriesByToken(q, limit = 5) {
  const database = getDb();
  const normalized = normalizeQuery(q)
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim();
  const tokens = normalized.split(/\s+/).filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
  const results = [];
  const seen = new Set();
  const stmt = database.prepare(
    'SELECT * FROM entries WHERE LOWER(id) = ? OR LOWER(ascii) = ? OR LOWER(unicode) = ? LIMIT 1'
  );
  for (const token of tokens) {
    const cleanToken = normalizeQuery(token);
    const row = stmt.get(cleanToken, cleanToken, cleanToken);
    if (row && !seen.has(row.id)) {
      seen.add(row.id);
      results.push(row);
      if (results.length >= limit) break;
    }
  }
  return results;
}

function retrieveEntriesFTS(q, limit = 10) {
  const database = getDb();
  const normalized = normalizeQuery(q);

  const exact = database
    .prepare(
      `
      SELECT e.* FROM entries e
      WHERE LOWER(e.ascii) = ? OR LOWER(e.unicode) = ? OR LOWER(e.id) = ?
      LIMIT ?
    `
    )
    .all(normalized, normalized, normalized, limit);

  if (exact.length) return exact;

  const ftsQuery = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => `${t}*`)
    .join(' ');

  if (!ftsQuery) return [];

  return database
    .prepare(
      `
      SELECT e.* FROM entries e
      JOIN entries_fts fts ON e.rowid = fts.rowid
      WHERE entries_fts MATCH ?
      ORDER BY e.tier = 'dual' DESC, e.tier = '1' DESC, e.confidence_score DESC, e.has_flagship DESC
      LIMIT ?
    `
    )
    .all(ftsQuery, limit);
}

function retrieveEntriesByConcept(q, limit = 5) {
  const database = getDb();
  const tokens = _tokenize(q);
  const conceptTerms = new Set(tokens);

  // Expand with synonym map
  for (const term of Array.from(conceptTerms)) {
    for (const [concept, synonyms] of CONCEPT_BOOST) {
      if (term === concept || synonyms.includes(term)) {
        conceptTerms.add(concept);
        synonyms.forEach((s) => conceptTerms.add(s));
      }
    }
  }

  if (conceptTerms.size === 0) return [];

  const likes = Array.from(conceptTerms).map((t) => `%${t}%`);
  const domainConditions = likes.map(() => 'LOWER(e.domain) LIKE ?').join(' OR ');
  const meaningConditions = likes.map(() => 'LOWER(e.meaning) LIKE ?').join(' OR ');

  const rows = database
    .prepare(
      `
      SELECT e.*, 1 as concept_match FROM entries e
      WHERE (${domainConditions}) OR (${meaningConditions})
      ORDER BY e.tier = 'dual' DESC, e.tier = '1' DESC, e.confidence_score DESC, e.has_flagship DESC
      LIMIT ?
    `
    )
    .all(...likes, ...likes, limit);

  return rows;
}

async function retrieveEntriesSemantic(q, limit = 10) {
  try {
    const database = getDb();
    const queryVec = await embedText(q);
    if (!queryVec) return [];

    const rows = database
      .prepare(
        `
        SELECT s.id as site_id, s.lexicon_entry_id, s.domain, e.embedding
        FROM indexed_sites s
        JOIN embeddings e ON s.id = e.site_id
        WHERE s.status = 'active' AND s.lexicon_entry_id IS NOT NULL
      `
      )
      .all();

    const scored = rows
      .map((row) => {
        const vec = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, 384);
        let dot = 0;
        for (let i = 0; i < 384; i++) dot += queryVec[i] * vec[i];
        return { entryId: row.lexicon_entry_id, score: dot };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit * 2);

    const seen = new Set();
    const entries = [];
    for (const item of scored) {
      if (seen.has(item.entryId)) continue;
      seen.add(item.entryId);
      const entry = database.prepare('SELECT * FROM entries WHERE id = ?').get(item.entryId);
      if (entry) entries.push(entry);
      if (entries.length >= limit) break;
    }
    return entries;
  } catch (_e) {
    return [];
  }
}

async function retrieveEntries(q, limit = 5, quick = false) {
  const byToken = retrieveEntriesByToken(q, limit);
  const byConcept = retrieveEntriesByConcept(q, limit);
  const fts = retrieveEntriesFTS(q, limit);
  const semantic = quick ? [] : await retrieveEntriesSemantic(q, limit);

  const seen = new Set();
  const combined = [];
  const tokenIds = new Set(byToken.map((e) => e.id));

  for (const source of [byToken, byConcept, fts, semantic]) {
    for (const e of source) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        combined.push(e);
      }
    }
  }

  const normalized = normalizeQuery(q).replace(/[^a-z0-9]/g, '');
  combined.sort((a, b) => {
    const aToken = tokenIds.has(a.id);
    const bToken = tokenIds.has(b.id);
    if (aToken && !bToken) return -1;
    if (bToken && !aToken) return 1;

    const aNormAscii = normalizeQuery(a.ascii);
    const aNormUnicode = normalizeQuery(a.unicode);
    const bNormAscii = normalizeQuery(b.ascii);
    const bNormUnicode = normalizeQuery(b.unicode);

    const aExact =
      normalized === aNormAscii ||
      normalized === aNormUnicode ||
      normalized === a.id ||
      normalized.includes(aNormAscii) ||
      normalized.includes(aNormUnicode) ||
      normalized.includes(a.id);
    const bExact =
      normalized === bNormAscii ||
      normalized === bNormUnicode ||
      normalized === b.id ||
      normalized.includes(bNormAscii) ||
      normalized.includes(bNormUnicode) ||
      normalized.includes(b.id);

    if (aExact && !bExact) return -1;
    if (bExact && !aExact) return 1;

    const aTier = a.tier === 'dual' ? 3 : a.tier === '1' ? 2 : 1;
    const bTier = b.tier === 'dual' ? 3 : b.tier === '1' ? 2 : 1;
    if (aTier !== bTier) return bTier - aTier;

    return (b.confidence_score || 0) - (a.confidence_score || 0);
  });

  return combined.slice(0, limit);
}

function retrieveSitesFTS(q, limit = 5) {
  const database = getDb();
  const normalized = normalizeQuery(q);

  const ftsQuery = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => `${t}*`)
    .join(' ');

  if (ftsQuery) {
    const rows = database
      .prepare(
        `
        SELECT s.*, e.unicode as entry_unicode
        FROM indexed_sites s
        LEFT JOIN entries e ON s.lexicon_entry_id = e.id
        JOIN indexed_sites_fts fts ON s.id = fts.rowid
        WHERE s.status = 'active' AND indexed_sites_fts MATCH ?
        ORDER BY s.is_flagship DESC, s.quality_score DESC, s.authority_score DESC
        LIMIT ?
      `
      )
      .all(ftsQuery, limit);
    if (rows.length) return rows;
  }

  return database
    .prepare(
      `
      SELECT s.*, e.unicode as entry_unicode
      FROM indexed_sites s
      LEFT JOIN entries e ON s.lexicon_entry_id = e.id
      WHERE s.status = 'active'
        AND (s.title LIKE ? OR s.description LIKE ? OR s.content_snippet LIKE ? OR s.h1 LIKE ?
             OR s.tenant_name LIKE ? OR s.tenant_category LIKE ? OR e.unicode LIKE ? OR e.ascii LIKE ?)
      ORDER BY s.is_flagship DESC, s.quality_score DESC, s.authority_score DESC
      LIMIT ?
    `
    )
    .all(
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      `%${normalized}%`,
      limit
    );
}

async function retrieveSites(q, limit = 5) {
  const fts = retrieveSitesFTS(q, limit);
  if (fts.length) return fts;

  const keywords = searchKeywords(q, limit);
  const seen = new Set(fts.map((r) => r.id));
  for (const k of keywords) {
    if (!seen.has(k.id)) {
      seen.add(k.id);
      fts.push(k);
      if (fts.length >= limit) break;
    }
  }
  return fts;
}

function retrieveRelated(entry, limit = 3) {
  if (!entry) return [];
  const database = getDb();
  return database
    .prepare(
      `
      SELECT e.id, e.unicode, e.ascii, e.meaning, e.pantheon, COUNT(*) as co_count
      FROM entity_mentions em1
      JOIN entity_mentions em2 ON em1.site_id = em2.site_id
      JOIN entries e ON em2.entry_id = e.id
      WHERE em1.entry_id = ? AND em2.entry_id != ?
      GROUP BY e.id
      ORDER BY co_count DESC
      LIMIT ?
    `
    )
    .all(entry.id, entry.id, limit);
}

function retrievePantheonSiblings(entry, limit = 3) {
  if (!entry) return [];
  const database = getDb();
  return database
    .prepare(
      `
      SELECT id, unicode, ascii, meaning, tier, has_flagship FROM entries
      WHERE pantheon = ? AND id != ?
      ORDER BY has_flagship DESC, tier = 'dual' DESC, tier = '1' DESC, confidence_score DESC
      LIMIT ?
    `
    )
    .all(entry.pantheon, entry.id, limit);
}

function formatLoreSources(sources) {
  if (!Array.isArray(sources) || !sources.length) return '';
  return `<div class="oracle-section"><h4>Sources</h4><ul>${sources
    .map((s) => {
      if (typeof s === 'string') return `<li>${s}</li>`;
      const label = [s.author, s.title, s.year].filter(Boolean).join(', ');
      const note = s.note ? ` — ${s.note}` : '';
      return `<li>${label || s.id || 'Source'}${note}</li>`;
    })
    .join('')}</ul></div>`;
}

function formatLexiconSources(sources) {
  if (!Array.isArray(sources) || !sources.length) return '';
  return `<span class="oracle-source-list">${sources.join(', ')}</span>`;
}

function formatSymbols(symbols) {
  if (!Array.isArray(symbols) || !symbols.length) return '';
  return `<div class="oracle-section"><h4>Symbols & attributes</h4><ul>${symbols
    .map((s) => `<li><strong>${s.name}</strong>${s.meaning ? `: ${s.meaning}` : ''}</li>`)
    .join('')}</ul></div>`;
}

function formatMyths(mythology) {
  if (!mythology?.myths?.length) return '';
  const lead = mythology.lead ? `<p>${stripHtml(mythology.lead)}</p>` : '';
  const myths = mythology.myths
    .slice(0, 4)
    .map((m) => {
      const title = m.title || m.tag;
      return `<li><strong>${title}</strong>${m.text ? `: ${stripHtml(m.text)}` : ''}</li>`;
    })
    .join('');
  return `<div class="oracle-section"><h4>Mythology</h4>${lead}<ul>${myths}</ul></div>`;
}

function formatDomains(domains, name) {
  if (!domains) return '';
  const lead = domains.lead ? `<p>${stripHtml(domains.lead)}</p>` : '';
  const cards = Array.isArray(domains.cards)
    ? domains.cards
        .map((c) => `<li><strong>${c.name}</strong>${c.desc ? `: ${c.desc}` : ''}</li>`)
        .join('')
    : '';
  return `<div class="oracle-section"><h4>What ${name} presides over</h4>${lead}${
    cards ? `<ul>${cards}</ul>` : ''
  }</div>`;
}

function formatPronunciation(pronunciation) {
  if (!pronunciation) return '';
  const ipa = pronunciation.ipa
    ? `<p><strong>IPA:</strong> ${pronunciation.ipa}${pronunciation.ipaLabel ? ` (${pronunciation.ipaLabel})` : ''}</p>`
    : '';
  const approx = pronunciation.approximation ? `<p>${pronunciation.approximation}</p>` : '';
  const note = pronunciation.note ? `<p class="oracle-note">${pronunciation.note}</p>` : '';
  return `<div class="oracle-section"><h4>Pronunciation</h4>${ipa}${approx}${note}</div>`;
}

function formatEtymology(etymology, lore) {
  const lex = etymologySummary(etymology);
  const loreEtym = lore?.etymology?.narrative || lore?.etymology?.summary || '';
  if (!lex && !loreEtym) return '';
  return `<div class="oracle-section"><h4>Etymology</h4>${
    loreEtym ? `<p>${stripHtml(loreEtym)}</p>` : ''
  }${lex ? `<p>${lex}</p>` : ''}</div>`;
}

function formatOriginalScript(ctx) {
  const script = ctx.originalScript;
  if (!script || script === '—') return '';
  const greek =
    ctx.greek && ctx.greek !== '-' && ctx.greek !== script
      ? `<p><strong>Greek:</strong> ${ctx.greek}</p>`
      : '';
  return `<div class="oracle-section"><h4>Original script</h4>${greek}<p>${script}</p></div>`;
}

function formatVariants(variants) {
  if (!Array.isArray(variants) || !variants.length) return '';
  const items = variants
    .filter((v) => ['owned', 'ideal', 'macron-only', 'ascii'].includes(v.type) || v.sources?.length)
    .map(
      (v) =>
        `<li><strong>${v.unicode || v.text}</strong> — ${v.type}${v.note ? ` (${v.note})` : ''}</li>`
    )
    .join('');
  if (!items) return '';
  return `<div class="oracle-section"><h4>Name variations</h4><ul>${items}</ul></div>`;
}

function formatCulturalLegacy(legacy) {
  if (!legacy) return '';
  const text = typeof legacy === 'string' ? legacy : legacy.text || legacy.overview || '';
  if (!text) return '';
  return `<div class="oracle-section"><h4>Cultural legacy</h4><p>${stripHtml(text)}</p></div>`;
}

function formatSyncretism(syncretism) {
  if (!syncretism) return '';
  const text =
    typeof syncretism === 'string' ? syncretism : syncretism.text || syncretism.summary || '';
  if (!text) return '';
  return `<div class="oracle-section"><h4>Syncretism</h4><p>${stripHtml(text)}</p></div>`;
}

function formatArchaeology(archaeology) {
  if (!archaeology) return '';
  const text =
    typeof archaeology === 'string' ? archaeology : archaeology.text || archaeology.summary || '';
  if (!text) return '';
  return `<div class="oracle-section"><h4>Archaeology & worship</h4><p>${stripHtml(text)}</p></div>`;
}

function formatSites(name, sites, availability) {
  const activeSites = (sites || []).filter((s) => s.status === 'active' || s.is_flagship);
  if (activeSites.length) {
    const list = activeSites
      .slice(0, 3)
      .map((s) => {
        const domain = s.punycode || s.domain;
        const title = s.tenant_name || s.title || domain;
        const url = `https://${domain}`;
        return `<li><a href="${url}" target="_blank" rel="noopener"><strong>${title}</strong></a>${
          s.description ? ` — ${stripHtml(s.description).slice(0, 120)}` : ''
        }</li>`;
      })
      .join('');
    return `<div class="oracle-section"><h4>On the Unicode web</h4><ul>${list}</ul></div>`;
  }
  if (availability?.status === 'available') {
    return `<div class="oracle-section"><h4>On the Unicode web</h4><p><strong>${name}</strong> is available for registration as a Unicode domain. Claim it through a registrar or lease ad space on its temple page.</p></div>`;
  }
  return '';
}

function buildCitations(entries, sites, loreSources = []) {
  const citations = [];
  for (const e of entries.slice(0, 3)) {
    citations.push({
      type: 'entry',
      label: e.unicode || e.ascii,
      url: `/sites/${e.id}/`,
      snippet: e.meaning,
    });
  }
  for (const s of sites.slice(0, 3)) {
    const domain = s.punycode || s.domain;
    citations.push({
      type: 'site',
      label: s.tenant_name || s.title || domain,
      url: `https://${domain}`,
      snippet: s.description || s.content_snippet,
    });
  }
  for (const src of loreSources.slice(0, 4)) {
    const label =
      typeof src === 'string' ? src : [src.author, src.title].filter(Boolean).join(', ');
    if (label && !citations.some((c) => c.label === label)) {
      citations.push({
        type: 'source',
        label,
        url: `/sites/${entries[0]?.id}/lore.html`,
        snippet: '',
      });
    }
  }
  return citations;
}

function generateFollowUps(intent, primary, related = [], sites = []) {
  const followUps = [];
  if (!primary) {
    followUps.push('Who is the most important Greek deity?');
    followUps.push('What realms are in the Norse pantheon?');
    followUps.push('Which names are available to lease?');
    return followUps;
  }

  const name = primary.unicode || primary.ascii;

  if (intent === 'who' || intent === 'general' || intent === 'explore' || intent === 'attribute') {
    followUps.push(`What is the etymology of ${name}?`);
    followUps.push(`What are the symbols of ${name}?`);
  }
  if (intent === 'meaning' || intent === 'etymology') {
    followUps.push(`Who is ${name}?`);
    followUps.push(`What are the myths of ${name}?`);
  }
  if (intent === 'mythology') {
    followUps.push(`What does ${name} preside over?`);
    followUps.push(`How is ${name} pronounced?`);
  }
  if (intent === 'symbols') {
    followUps.push(`What are the myths of ${name}?`);
    followUps.push(`What does ${name} mean?`);
  }
  if (intent === 'pronunciation') {
    followUps.push(`What does ${name} mean?`);
    followUps.push(`Who is ${name}?`);
  }
  if (intent === 'tenant' || intent === 'commercial' || sites.length) {
    followUps.push(`Which businesses are on ${name}?`);
    followUps.push(`How do I lease ${name}?`);
  }
  if (intent === 'acquisition') {
    followUps.push(`Is ${name} available?`);
    followUps.push(`How much does ${name} cost?`);
  }
  if (related.length) {
    followUps.push(`How is ${name} related to ${related[0].unicode || related[0].ascii}?`);
  }
  if (!followUps.some((f) => f.includes('lease')) && (primary.has_flagship || primary.tier)) {
    followUps.push(`How do I lease ${name}?`);
  }

  return followUps.slice(0, 3);
}

function synthesizeAnswer(q, entries, sites, related, intent, _history = []) {
  const primary = entries[0];
  const context = {
    query: q,
    intent,
    entry: primary,
    entries: entries.slice(0, 3),
    sites: sites.slice(0, 3),
    related: related.slice(0, 3),
  };

  let answer = '';

  if (!primary) {
    const citations = buildCitations(entries, sites);
    if (sites.length) {
      answer = `<p>We found these indexed sites related to “${q}”:</p><ul>${sites
        .map((s) => `<li><strong>${s.tenant_name || s.title || s.domain}</strong></li>`)
        .join('')}</ul>`;
    } else {
      answer = `<p>The PUNYCODEX knowledge base does not yet cover “${q}” with confidence. Try a deity, realm, myth, or Unicode domain name.</p>`;
    }

    return {
      answer,
      citations,
      context,
      followUps: generateFollowUps('general', null),
      primaryId: null,
    };
  }

  const ctx = getEntryContext(primary.id);
  const name = primary.unicode || primary.ascii;
  const asciiName = primary.ascii || name;
  const tierLabel =
    primary.tier === 'dual' ? 'Dual-Tier' : primary.tier === '1' ? 'Tier-1' : 'Tier-2';
  const lore = ctx?.lore || {};

  // Identity lead
  answer += `<div class="oracle-lead">`;
  answer += `<p><strong>${name}</strong> is a <strong>${tierLabel}</strong> Unicode restoration of the ${primary.pantheon} name <strong>${asciiName}</strong>`;
  if (primary.greek && primary.greek !== '-') answer += ` (Greek <em>${primary.greek.trim()}</em>)`;
  answer += `. `;

  const domainText = (primary.domain || lore.domains?.subtitle || '').trim();
  if (intent === 'attribute' || intent === 'who' || intent === 'general' || intent === 'explore') {
    if (domainText) {
      answer += `In the classical sources, ${name} is the deity of <strong>${domainText}</strong>. `;
    } else if (ctx?.meaning) {
      answer += `The name means “${ctx.meaning}.” `;
    }
  }
  answer += `</p></div>`;

  // Sections based on intent, but always include core context
  if (intent === 'attribute' || intent === 'who' || intent === 'general' || intent === 'explore') {
    answer += formatDomains(lore.domains, name);
    answer += formatSymbols(lore.symbols);
    answer += formatMyths(lore.mythology);
  }

  if (intent === 'mythology') {
    answer += formatMyths(lore.mythology);
    answer += formatDomains(lore.domains, name);
    answer += formatSymbols(lore.symbols);
  }

  if (intent === 'symbols') {
    answer += formatSymbols(lore.symbols);
    answer += formatMyths(lore.mythology);
  }

  if (intent === 'etymology' || intent === 'meaning') {
    answer += formatEtymology(ctx?.etymology, lore);
    answer += formatPronunciation(lore.pronunciation);
    answer += formatVariants(ctx?.variants);
  }

  if (intent === 'pronunciation') {
    answer += formatPronunciation(lore.pronunciation);
    answer += formatEtymology(ctx?.etymology, lore);
  }

  if (intent === 'script') {
    answer += formatOriginalScript(ctx);
    answer += formatVariants(ctx?.variants);
  }

  if (intent === 'variants') {
    answer += formatVariants(ctx?.variants);
    answer += formatOriginalScript(ctx);
  }

  if (intent === 'archaeology') {
    answer += formatArchaeology(lore.archaeology);
    answer += formatCulturalLegacy(lore.culturalLegacy);
  }

  if (intent === 'legacy') {
    answer += formatCulturalLegacy(lore.culturalLegacy);
    answer += formatSyncretism(lore.syncretism);
  }

  if (intent === 'relation') {
    if (related.length) {
      answer += `<div class="oracle-section"><h4>Related figures</h4><p>${name} is often mentioned alongside ${related
        .map((r) => `<strong>${r.unicode || r.ascii}</strong>`)
        .join(', ')} across the indexed Unicode web and classical sources.</p></div>`;
    }
    const siblings = retrievePantheonSiblings(primary, 4);
    if (siblings.length) {
      answer += `<div class="oracle-section"><h4>Other ${primary.pantheon} names</h4><ul>${siblings
        .map(
          (s) =>
            `<li><strong>${s.unicode || s.ascii}</strong>${s.meaning ? ` — ${s.meaning}` : ''}</li>`
        )
        .join('')}</ul></div>`;
    }
  }

  if (intent === 'tenant' || intent === 'commercial' || intent === 'acquisition') {
    answer += formatSites(name, sites, ctx?.availability);
  }

  // Default enrichments for every answer
  if (!['etymology', 'meaning', 'pronunciation', 'script', 'variants'].includes(intent)) {
    answer += formatEtymology(ctx?.etymology, lore);
    answer += formatPronunciation(lore.pronunciation);
  }

  if (!['tenant', 'commercial', 'acquisition'].includes(intent)) {
    answer += formatSites(name, sites, ctx?.availability);
  }

  answer += formatOriginalScript(ctx);
  answer += formatVariants(ctx?.variants);
  answer += formatCulturalLegacy(lore.culturalLegacy);
  answer += formatSyncretism(lore.syncretism);
  answer += formatArchaeology(lore.archaeology);
  answer += formatLoreSources(lore.sources);

  if (ctx?.sources?.length) {
    answer += `<div class="oracle-section"><h4>Lexicon authorities</h4><p>${formatLexiconSources(ctx.sources)}</p></div>`;
  }

  const citations = buildCitations(entries, sites, lore.sources);
  const followUps = generateFollowUps(intent, primary, related, sites);

  return { answer, citations, context, followUps, primaryId: primary.id };
}

async function callLlmIfConfigured(prompt) {
  const apiKey = process.env.ORACLE_LLM_API_KEY;
  const model = process.env.ORACLE_LLM_MODEL;
  if (!apiKey || !model) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are the PUNYCODEX Oracle. Synthesize the provided context into a scholarly, dense, citation-aware paragraph. Do not add facts absent from the context. Use HTML: <strong> for emphasis, <p> for paragraphs. Keep under 250 words.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (_e) {
    return null;
  }
}

function buildLlmPrompt(q, contexts, intent) {
  const _primary = contexts[0];
  const promptParts = [`User question: ${q}`, `Intent: ${intent}`, '', 'Context:'];

  for (const ctx of contexts.slice(0, 2)) {
    promptParts.push(
      `- ${ctx.unicode || ctx.ascii} (${ctx.pantheon}, ${ctx.tierLabel || ctx.tier})`
    );
    if (ctx.meaning) promptParts.push(`  Meaning: ${ctx.meaning}`);
    if (ctx.lore?.overview || ctx.lore?.domains?.lead) {
      promptParts.push(`  Overview: ${stripHtml(ctx.lore.overview || ctx.lore.domains.lead)}`);
    }
    if (ctx.lore?.mythology?.lead)
      promptParts.push(`  Mythology: ${stripHtml(ctx.lore.mythology.lead)}`);
    if (ctx.etymology) promptParts.push(`  Etymology: ${etymologySummary(ctx.etymology)}`);
    if (ctx.site) promptParts.push(`  Live site: ${ctx.site.domain} — ${ctx.site.title}`);
  }

  promptParts.push('', 'Answer the question using only the context above.');
  return promptParts.join('\n');
}

function synthesizeQuickAnswer(entry, intent) {
  const name = entry.unicode || entry.ascii;
  const asciiName = entry.ascii || name;
  const tierLabel = entry.tier === 'dual' ? 'Dual-Tier' : entry.tier === '1' ? 'Tier-1' : 'Tier-2';
  const ctx = getEntryContext(entry.id);
  const lore = ctx?.lore || {};

  let answer = `<div class="oracle-lead"><p><strong>${name}</strong> is a <strong>${tierLabel}</strong> Unicode restoration of the ${entry.pantheon} name <strong>${asciiName}</strong>`;
  if (entry.greek && entry.greek !== '-') answer += ` (Greek <em>${entry.greek.trim()}</em>)`;
  answer += `. `;

  const domainText = (entry.domain || lore.domains?.subtitle || '').trim();
  if (domainText) {
    answer += `In the classical sources, ${name} is the deity of <strong>${domainText}</strong>. `;
  } else if (ctx?.meaning) {
    answer += `The name means “${ctx.meaning}.” `;
  }
  answer += `</p></div>`;

  if (intent === 'etymology' || intent === 'meaning') {
    answer += formatEtymology(ctx?.etymology, lore);
  }
  if (intent === 'mythology') {
    answer += formatMyths(lore.mythology);
  }
  if (intent === 'symbols') {
    answer += formatSymbols(lore.symbols);
  }
  if (intent === 'pronunciation') {
    answer += formatPronunciation(lore.pronunciation);
  }

  // Always add the most useful single-sentence enrichments
  if (lore.mythology?.lead && intent !== 'mythology') {
    answer += `<div class="oracle-section"><h4>Mythology</h4><p>${stripHtml(lore.mythology.lead)}</p></div>`;
  }
  if (ctx?.etymology && intent !== 'etymology' && intent !== 'meaning') {
    answer += formatEtymology(ctx.etymology, lore);
  }
  if (ctx?.originalScript && ctx.originalScript !== '—') {
    answer += formatOriginalScript(ctx);
  }

  const citations = buildCitations([entry], []);
  const followUps = generateFollowUps(intent, entry);

  return {
    answer,
    citations,
    context: { entries: [entry], sites: [], related: [], intent },
    followUps,
    primaryId: entry.id,
    quick: true,
  };
}

async function askOracle(q, history = [], { quick = false } = {}) {
  if (!q?.trim()) {
    return {
      answer: '<p>Ask me about a deity, realm, symbol, or business on PUNYCODEX.</p>',
      citations: [],
      context: {},
      followUps: generateFollowUps('general', null),
      primaryId: null,
    };
  }

  const resolvedQ = resolveAnaphora(q, history);
  const cacheKey = hashQuery(resolvedQ, history);
  const cached = getCachedOracle(cacheKey);
  if (cached && !quick) return cached;

  const intent = detectIntent(resolvedQ);

  // Fast path: direct name match → skip expensive retrieval
  const direct = lookupEntryDirectly(resolvedQ);
  if (direct) {
    const result = quick
      ? synthesizeQuickAnswer(direct, intent)
      : synthesizeAnswer(resolvedQ, [direct], [], [], intent, history);
    if (!quick) setCachedOracle(cacheKey, result);
    return result;
  }

  let entries = await retrieveEntries(resolvedQ, 5, quick);

  if (!entries.length && resolvedQ !== q && history.length) {
    for (let i = history.length - 1; i >= 0; i--) {
      const turn = history[i];
      if (turn.role === 'oracle' && turn.primaryId) {
        const database = getDb();
        const fallback = database.prepare('SELECT * FROM entries WHERE id = ?').get(turn.primaryId);
        if (fallback) {
          entries = [fallback];
          break;
        }
      }
    }
  }

  const primary = entries[0];
  const sites = await retrieveSites(resolvedQ);
  const related = primary ? retrieveRelated(primary) : [];

  const result = synthesizeAnswer(resolvedQ, entries, sites, related, intent, history);

  // Optional LLM polish with grounded prompt
  const contexts = entries
    .slice(0, 2)
    .map((e) => getEntryContext(e.id))
    .filter(Boolean);
  if (contexts.length && process.env.ORACLE_LLM_API_KEY) {
    const prompt = buildLlmPrompt(resolvedQ, contexts, intent);
    const llmAnswer = await callLlmIfConfigured(prompt);
    if (llmAnswer) {
      // Prepend LLM summary, keep our structured sections below for depth
      result.answer = `<div class="oracle-llm-summary">${llmAnswer}</div>${result.answer}`;
    }
  }

  setCachedOracle(cacheKey, result);
  return result;
}

askOracle.cacheStats = () => ({ size: ORACLE_CACHE.size, max: ORACLE_CACHE_MAX });

module.exports = {
  askOracle,
  detectIntent,
  retrieveEntries,
  retrieveSites,
  retrieveRelated,
  etymologySummary,
};
