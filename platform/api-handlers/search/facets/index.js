/**
 * GET /api/search/facets
 * Return facet aggregations for the search index: pantheon, tier, hasSite.
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

  // Tier facet
  const tiers = db
    .prepare(`
      SELECT tier, COUNT(*) as count
      FROM entries
      GROUP BY tier
      ORDER BY CASE tier WHEN 'dual' THEN 1 WHEN '1' THEN 2 WHEN '2' THEN 3 ELSE 4 END
    `)
    .all();

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
      tiers: tiers.map((t) => ({ id: t.tier, count: t.count })),
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
