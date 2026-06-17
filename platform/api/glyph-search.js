/**
 * Glyph Search — find lexicon entries by visual/shape similarity.
 * Phase 1: character-based matching using Unicode names and decomposition.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

let db;
function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function normalizeGlyph(glyph) {
  return glyph.normalize('NFC').trim();
}

function searchByGlyph(glyph, limit = 10) {
  const db = getDb();
  const normalized = normalizeGlyph(glyph);
  const _codePoint = normalized.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0');

  // Match entries whose Unicode or Greek contains the glyph
  const like = `%${normalized}%`;
  const rows = db
    .prepare(
      `SELECT id, ascii, unicode, greek, original_script, pantheon, meaning
       FROM entries
       WHERE unicode LIKE ? OR greek LIKE ? OR original_script LIKE ?
       ORDER BY tier = 'dual' DESC, tier = '1' DESC
       LIMIT ?`
    )
    .all(like, like, like, limit);

  return rows.map((r) => ({ ...r, matchType: 'character' }));
}

function describeGlyph(glyph) {
  const normalized = normalizeGlyph(glyph);
  const cp = normalized.codePointAt(0);
  return {
    glyph: normalized,
    codePoint: `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`,
    name: '', // Would require unicode-name package; left empty to avoid heavy dep
  };
}

module.exports = { searchByGlyph, describeGlyph };
