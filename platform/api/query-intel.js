/**
 * Query Intelligence Engine (Phase 6)
 * Spell correction, "Did you mean?", related searches, autocomplete.
 */
const Database = require('better-sqlite3');
const path = require('path');
const { getDbPath } = require('../db/db');

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
      matrix[i][j] = b[i - 1] === a[j - 1]
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
 * Spell correction / "Did you mean?"
 * Finds the closest matching entry or site for a given query.
 */
function didYouMean(q, limit = 3) {
  const db = getDb();
  const query = q.trim().toLowerCase();
  if (!query || query.length < 2) return [];

  // Get candidates from lexicon
  const entries = db.prepare(`
    SELECT id, ascii, unicode, meaning, pantheon, tier
    FROM entries
    WHERE ascii IS NOT NULL
  `).all();

  // Get candidates from indexed sites
  const sites = db.prepare(`
    SELECT domain, punycode, title
    FROM indexed_sites
    WHERE status = 'active'
  `).all();

  const candidates = [];

  for (const e of entries) {
    const ascii = (e.ascii || '').toLowerCase();
    const unicode = (e.unicode || '').toLowerCase();
    const meaning = (e.meaning || '').toLowerCase();

    let score = 0;
    let matchedField = '';

    // Exact substring match gets high score
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
      matchedField = 'meaning';
    }

    // Also check Levenshtein for typos
    if (ascii.length > 0 && ascii !== query) {
      const levScore = similarity(query, ascii);
      if (levScore > 0.5) {
        score = Math.max(score, levScore * 0.85);
        if (!matchedField) matchedField = 'ascii';
      }
    }
    if (unicode.length > 0 && unicode !== query) {
      const levScore = similarity(query, unicode);
      if (levScore > 0.5) {
        score = Math.max(score, levScore * 0.9);
        if (!matchedField) matchedField = 'unicode';
      }
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
        matchedField
      });
    }
  }

  for (const s of sites) {
    const domain = (s.domain || '').toLowerCase();
    const punycode = (s.punycode || '').toLowerCase();
    const title = (s.title || '').toLowerCase();

    let score = 0;
    if (domain.includes(query) || query.includes(domain)) {
      score = Math.max(score, similarity(query, domain) * 0.8);
    }
    if (punycode.includes(query) || query.includes(punycode)) {
      score = Math.max(score, similarity(query, punycode) * 0.8);
    }
    if (title.includes(query)) {
      score = Math.max(score, similarity(query, title) * 0.75);
    }

    // Levenshtein for typos
    const domainBase = domain.replace(/\.[^.]+$/, '');
    if (domainBase.length > 0 && domainBase !== query) {
      const levScore = similarity(query, domainBase);
      if (levScore > 0.5) {
        score = Math.max(score, levScore * 0.8);
      }
    }

    if (score > 0.3) {
      candidates.push({
        type: 'site',
        text: s.domain,
        punycode: s.punycode,
        title: s.title,
        score,
        matchedField: 'domain'
      });
    }
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  // Deduplicate by text
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

  // Find the best matching entry
  const entries = db.prepare(`
    SELECT id, ascii, unicode, pantheon, tier, meaning
    FROM entries
    WHERE ascii IS NOT NULL
  `).all();

  let bestEntry = null;
  let bestScore = 0;

  for (const e of entries) {
    const ascii = (e.ascii || '').toLowerCase();
    const unicode = (e.unicode || '').toLowerCase();
    let score = 0;
    if (ascii === query || query.includes(ascii) || ascii.includes(query)) score = 1;
    if (unicode === query || query.includes(unicode) || unicode.includes(query)) score = 1;
    if (score > bestScore) {
      bestScore = score;
      bestEntry = e;
    }
  }

  if (!bestEntry) {
    // Fallback: return random diverse entries
    return db.prepare(`
      SELECT id, ascii, unicode, pantheon, meaning
      FROM entries
      WHERE ascii IS NOT NULL
      ORDER BY RANDOM()
      LIMIT ?
    `).all(limit);
  }

  const related = [];

  // Same pantheon
  const samePantheon = db.prepare(`
    SELECT id, ascii, unicode, pantheon, meaning
    FROM entries
    WHERE pantheon = ? AND id != ?
    ORDER BY RANDOM()
    LIMIT ?
  `).all(bestEntry.pantheon, bestEntry.id, Math.ceil(limit / 2));
  related.push(...samePantheon);

  // Same tier, different pantheon
  if (related.length < limit) {
    const sameTier = db.prepare(`
      SELECT id, ascii, unicode, pantheon, meaning
      FROM entries
      WHERE tier = ? AND pantheon != ? AND id != ?
      ORDER BY RANDOM()
      LIMIT ?
    `).all(bestEntry.tier, bestEntry.pantheon, bestEntry.id, limit - related.length);
    related.push(...sameTier);
  }

  // Fill with random if still short
  if (related.length < limit) {
    const existingIds = related.map(r => r.id).concat([bestEntry.id]);
    const placeholders = existingIds.map(() => '?').join(',');
    const random = db.prepare(`
      SELECT id, ascii, unicode, pantheon, meaning
      FROM entries
      WHERE id NOT IN (${placeholders})
      ORDER BY RANDOM()
      LIMIT ?
    `).all(...existingIds, limit - related.length);
    related.push(...random);
  }

  return related.slice(0, limit);
}

/**
 * Autocomplete suggestions.
 * Returns prefix matches from lexicon + indexed sites.
 */
function autocomplete(q, limit = 10) {
  const db = getDb();
  const prefix = q.trim().toLowerCase();
  if (!prefix || prefix.length < 1) return [];

  const like = `${prefix}%`;

  // Lexicon matches
  const entries = db.prepare(`
    SELECT id, ascii, unicode, pantheon, tier
    FROM entries
    WHERE ascii LIKE ? OR unicode LIKE ?
    ORDER BY tier = 'dual' DESC, tier = '1' DESC, ascii ASC
    LIMIT ?
  `).all(like, like, limit);

  // Site matches (if we have room)
  const sites = entries.length < limit
    ? db.prepare(`
        SELECT domain, punycode, title
        FROM indexed_sites
        WHERE status = 'active' AND (domain LIKE ? OR punycode LIKE ? OR title LIKE ?)
        ORDER BY is_flagship DESC, word_count DESC
        LIMIT ?
      `).all(like, like, like, limit - entries.length)
    : [];

  const results = [
    ...entries.map(e => ({
      type: 'entry',
      text: e.unicode,
      ascii: e.ascii,
      pantheon: e.pantheon,
      tier: e.tier,
      url: `/type/#${e.id}`
    })),
    ...sites.map(s => ({
      type: 'site',
      text: s.domain,
      punycode: s.punycode,
      title: s.title,
      url: `https://${s.punycode}`
    }))
  ];

  return results.slice(0, limit);
}

module.exports = {
  didYouMean,
  relatedSearches,
  autocomplete,
  levenshtein,
  similarity
};
