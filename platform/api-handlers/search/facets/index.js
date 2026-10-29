/**
 * GET /api/search/facets
 * Return facet aggregations for the search index: pantheon, marks, hasSite.
 */

const Database = require('better-sqlite3');
const { getDbPath } = require('../../../db/db');

const DB_PATH = getDbPath();
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

module.exports = async function searchFacets(_req, res) {
  const db = getDb();

  // Pantheon facet
  const pantheons = db
    .prepare(`
      SELECT pantheon, COUNT(*) as count
      FROM entries
      WHERE pantheon IS NOT NULL
      GROUP BY pantheon
      ORDER BY count DESC
    `)
    .all();

  // Preservation facet — mechanical, from the displayed form
  const { preservedFeatures } = require('../../../../type/js/engine.js');
  const markRows = db.prepare('SELECT unicode FROM entries').all();
  const markedCount = markRows.filter(
    (r) => preservedFeatures(r.unicode || '').features.length > 0
  ).length;

  // Has site facet (active indexed site)
  const hasSite = db
    .prepare(`
      SELECT
        SUM(CASE WHEN s.id IS NOT NULL AND s.status = 'active' THEN 1 ELSE 0 END) as withSite,
        SUM(CASE WHEN s.id IS NULL OR s.status != 'active' THEN 1 ELSE 0 END) as withoutSite
      FROM entries e
      LEFT JOIN indexed_sites s ON e.id = s.lexicon_entry_id
    `)
    .get();

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).json({
    success: true,
    data: {
      pantheons: pantheons.map((p) => ({ id: p.pantheon, count: p.count })),
      marks: { marked: markedCount, plain: markRows.length - markedCount },
      hasSite: {
        with: hasSite.withSite || 0,
        without: hasSite.withoutSite || 0,
      },
    },
    meta: {
      requestId: `req_${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
    },
  });
};
