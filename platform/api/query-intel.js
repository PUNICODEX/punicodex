/**
 * Query Intelligence Engine (Phase 6.5)
 * Spell correction, "Did you mean?", related searches, autocomplete.
 *
 * Now Unicode-aware: diacritic-stripped search keys, Greek-latinized fallback,
 * and SQL-backed fuzzy matching instead of loading the entire lexicon.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');
const { normalizeQuery, toSearchKey, confusableRisk } = require('./query-normalize');

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
 * Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance.
 */
function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / maxLen;
}

/**
 * Find candidate entries using the precomputed search_key column, FTS,
 * and a bounded SQL LIKE sweep. Much faster than loading all rows.
 */
function findEntryCandidates(q, limit = 20) {
  const db = getDb();
  const norm = normalizeQuery(q);
  const canonical = norm.canonical;
  const greekKey = norm.keys.find((k) => k !== canonical) || canonical;
  const like = `%${canonical}%`;
  const greekLike = `%${greekKey}%`;

  // 1. Exact search_key match (fast, indexed)
  const exact = db
    .prepare(
      `SELECT id, ascii, unicode, meaning, pantheon, tier
       FROM entries
       WHERE search_key = ?
       LIMIT ?`
    )
    .all(canonical, limit);

  // 2. Prefix match on search_key / ascii / unicode
  const prefix =
    canonical.length >= 2
      ? db
          .prepare(
            `SELECT id, ascii, unicode, meaning, pantheon, tier
         FROM entries
         WHERE search_key LIKE ? OR LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ?
         ORDER BY tier = 'dual' DESC, tier = '1' DESC, has_flagship DESC, ascii ASC
         LIMIT ?`
          )
          .all(`${canonical}%`, `${canonical}%`, `${canonical}%`, limit)
      : [];

  // 3. Substring / Greek-latinized fallback
  const fuzzy = db
    .prepare(
      `SELECT id, ascii, unicode, meaning, pantheon, tier
       FROM entries
       WHERE search_key LIKE ? OR LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ?
          OR search_key LIKE ? OR LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ?
       ORDER BY tier = 'dual' DESC, tier = '1' DESC, has_flagship DESC, ascii ASC
       LIMIT ?`
    )
    .all(like, like, like, greekLike, greekLike, greekLike, limit);

  // 4. FTS5 for meaning/domain/pantheon matches
  const ftsTokens = canonical
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .map((t) => `"${t.replace(/"/g, '""')}"*`)
    .join(' ');
  const fts = ftsTokens
    ? db
        .prepare(
          `SELECT e.id, e.ascii, e.unicode, e.meaning, e.pantheon, e.tier
         FROM entries e
         JOIN entries_fts fts ON e.rowid = fts.rowid
         WHERE entries_fts MATCH ?
         ORDER BY e.tier = 'dual' DESC, e.tier = '1' DESC, e.has_flagship DESC
         LIMIT ?`
        )
        .all(ftsTokens, limit)
    : [];

  // Deduplicate and preserve priority order
  const seen = new Set();
  const out = [];
  for (const row of [...exact, ...prefix, ...fuzzy, ...fts]) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out.slice(0, limit);
}

/**
 * Spell correction / "Did you mean?"
 * Uses bounded SQL candidates + lightweight Levenshtein scoring.
 */
function didYouMean(q, limit = 3) {
  const db = getDb();
  const query = q.trim().toLowerCase();
  if (!query || query.length < 2) return [];

  const candidates = [];

  // Lexicon candidates via SQL
  for (const e of findEntryCandidates(q, 20)) {
    const ascii = (e.ascii || '').toLowerCase();
    const unicode = (e.unicode || '').toLowerCase();
    const meaning = (e.meaning || '').toLowerCase();

    let score = 0;
    let matchedField = '';

    if (ascii === query || unicode === query) {
      score = 1;
      matchedField = unicode === query ? 'unicode' : 'ascii';
    } else {
      if (ascii.includes(query) || query.includes(ascii)) {
        score = Math.max(score, similarity(query, ascii) * 0.9);
        matchedField = 'ascii';
      }
      if (unicode.includes(query) || query.includes(unicode)) {
        score = Math.max(score, similarity(query, unicode) * 0.95);
        matchedField = 'unicode';
      }
      if (meaning.includes(query)) {
        score = Math.max(score, similarity(query, meaning) * 0.7);
        if (!matchedField) matchedField = 'meaning';
      }

      const levAscii = ascii.length > 0 ? similarity(query, ascii) : 0;
      const levUnicode = unicode.length > 0 ? similarity(query, unicode) : 0;
      if (levAscii > 0.55) score = Math.max(score, levAscii * 0.85);
      if (levUnicode > 0.55) score = Math.max(score, levUnicode * 0.9);
    }

    if (score > 0.3) {
      candidates.push({
        type: 'entry',
        id: e.id,
        text: e.unicode,
        ascii: e.ascii,
        pantheon: e.pantheon,
        tier: e.tier,
        score,
        matchedField,
      });
    }
  }

  // Site candidates (bounded SQL)
  const like = `%${query}%`;
  const sites = db
    .prepare(
      `SELECT domain, punycode, title
       FROM indexed_sites
       WHERE status = 'active'
         AND (LOWER(domain) LIKE ? OR LOWER(punycode) LIKE ? OR LOWER(title) LIKE ?)
       ORDER BY is_flagship DESC, quality_score DESC
       LIMIT ?`
    )
    .all(like, like, like, 20);

  for (const s of sites) {
    const domain = (s.domain || '').toLowerCase();
    const punycode = (s.punycode || '').toLowerCase();
    const title = (s.title || '').toLowerCase();

    let score = 0;
    if (domain === query || punycode === query) score = 0.95;
    if (domain.includes(query) || query.includes(domain))
      score = Math.max(score, similarity(query, domain) * 0.8);
    if (punycode.includes(query) || query.includes(punycode))
      score = Math.max(score, similarity(query, punycode) * 0.8);
    if (title.includes(query)) score = Math.max(score, similarity(query, title) * 0.75);

    const domainBase = domain.replace(/\.[^.]+$/, '');
    if (domainBase.length > 0 && domainBase !== query) {
      const levScore = similarity(query, domainBase);
      if (levScore > 0.55) score = Math.max(score, levScore * 0.8);
    }

    if (score > 0.3) {
      candidates.push({
        type: 'site',
        text: s.domain,
        punycode: s.punycode,
        title: s.title,
        score,
        matchedField: 'domain',
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const seen = new Set();
  const unique = [];
  for (const c of candidates) {
    const key = c.text.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(c);
      if (unique.length >= limit) break;
    }
  }

  return unique;
}

/**
 * Related searches for a given query.
 * Returns entries in the same pantheon, similar tier, or alphabetically nearby.
 */
function relatedSearches(q, limit = 6) {
  const db = getDb();
  const query = q.trim().toLowerCase();
  if (!query) return [];

  const bestEntry = db
    .prepare(
      `SELECT id, ascii, unicode, pantheon, tier, meaning
       FROM entries
       WHERE LOWER(ascii) = ? OR LOWER(unicode) = ? OR search_key = ?
       ORDER BY tier = 'dual' DESC, tier = '1' DESC, has_flagship DESC
       LIMIT 1`
    )
    .get(query, query, toSearchKey(query));

  if (!bestEntry) {
    const partial = db
      .prepare(
        `SELECT id, ascii, unicode, pantheon, tier, meaning
         FROM entries
         WHERE LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ? OR search_key LIKE ?
         ORDER BY tier = 'dual' DESC, tier = '1' DESC, has_flagship DESC
         LIMIT 1`
      )
      .get(`%${query}%`, `%${query}%`, `%${toSearchKey(query)}%`);
    if (!partial) {
      return db
        .prepare(
          `SELECT id, ascii, unicode, pantheon, meaning
           FROM entries
           WHERE ascii IS NOT NULL
           ORDER BY RANDOM()
           LIMIT ?`
        )
        .all(limit);
    }
  }

  const entry = bestEntry;
  const related = [];

  const samePantheon = db
    .prepare(
      `SELECT id, ascii, unicode, pantheon, meaning
       FROM entries
       WHERE pantheon = ? AND id != ?
       ORDER BY has_flagship DESC, tier = 'dual' DESC, tier = '1' DESC, RANDOM()
       LIMIT ?`
    )
    .all(entry.pantheon, entry.id, Math.ceil(limit / 2));
  related.push(...samePantheon);

  if (related.length < limit) {
    const sameTier = db
      .prepare(
        `SELECT id, ascii, unicode, pantheon, meaning
         FROM entries
         WHERE tier = ? AND pantheon != ? AND id != ?
         ORDER BY has_flagship DESC, RANDOM()
         LIMIT ?`
      )
      .all(entry.tier, entry.pantheon, entry.id, limit - related.length);
    related.push(...sameTier);
  }

  if (related.length < limit) {
    const existingIds = related.map((r) => r.id).concat([entry.id]);
    const placeholders = existingIds.map(() => '?').join(',');
    const random = db
      .prepare(
        `SELECT id, ascii, unicode, pantheon, meaning
         FROM entries
         WHERE id NOT IN (${placeholders})
         ORDER BY RANDOM()
         LIMIT ?`
      )
      .all(...existingIds, limit - related.length);
    related.push(...random);
  }

  return related.slice(0, limit);
}

/**
 * Autocomplete suggestions.
 * Returns prefix matches from lexicon + indexed sites, plus a small
 * set of fuzzy candidates when the prefix is short or has no prefix hits.
 */
function autocomplete(q, limit = 10) {
  const db = getDb();
  const prefix = q.trim().toLowerCase();
  if (!prefix || prefix.length < 1) return [];

  const searchKey = toSearchKey(prefix);
  const like = `${prefix}%`;
  const keyLike = `${searchKey}%`;

  // Lexicon prefix matches (Unicode-aware)
  const entries = db
    .prepare(
      `SELECT id, ascii, unicode, pantheon, tier
       FROM entries
       WHERE search_key LIKE ? OR LOWER(ascii) LIKE ? OR LOWER(unicode) LIKE ?
       ORDER BY tier = 'dual' DESC, tier = '1' DESC, has_flagship DESC, ascii ASC
       LIMIT ?`
    )
    .all(keyLike, like, like, limit);

  // Fuzzy fallback for short or misspelled prefixes
  let fuzzy = [];
  if (entries.length < limit && prefix.length >= 2) {
    const fuzzyLike = `%${searchKey}%`;
    fuzzy = db
      .prepare(
        `SELECT id, ascii, unicode, pantheon, tier
         FROM entries
         WHERE search_key LIKE ? AND search_key NOT LIKE ?
         ORDER BY tier = 'dual' DESC, tier = '1' DESC, has_flagship DESC, ascii ASC
         LIMIT ?`
      )
      .all(fuzzyLike, keyLike, limit - entries.length);
  }

  const siteLimit = limit - entries.length - fuzzy.length;
  const sites =
    siteLimit > 0
      ? db
          .prepare(
            `SELECT domain, punycode, title
             FROM indexed_sites
             WHERE status = 'active' AND (domain LIKE ? OR punycode LIKE ? OR title LIKE ?)
             ORDER BY is_flagship DESC, quality_score DESC
             LIMIT ?`
          )
          .all(like, like, like, siteLimit)
      : [];

  const results = [
    ...entries.map((e) => ({
      type: 'entry',
      text: e.unicode,
      ascii: e.ascii,
      pantheon: e.pantheon,
      tier: e.tier,
      url: `/type/#${e.id}`,
    })),
    ...fuzzy.map((e) => ({
      type: 'entry',
      text: e.unicode,
      ascii: e.ascii,
      pantheon: e.pantheon,
      tier: e.tier,
      url: `/type/#${e.id}`,
      fuzzy: true,
    })),
    ...sites.map((s) => ({
      type: 'site',
      text: s.domain,
      punycode: s.punycode,
      title: s.title,
      url: `https://${s.punycode}`,
    })),
  ];

  return results.slice(0, limit);
}

module.exports = {
  didYouMean,
  relatedSearches,
  autocomplete,
  levenshtein,
  similarity,
  findEntryCandidates,
  confusableRisk,
};
