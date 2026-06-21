/**
 * PUNYCODEX — Learning-to-Rank Service (Phase 6)
 *
 * Records search-result clicks and computes a lightweight LTR boost per
 * (query, site) pair. The boost is blended into the ranking score so results
 * that users actually click rise over time.
 *
 * This is intentionally simple: a click-through-rate-like signal with
 * position-aware discounting. It can be replaced by a trained model later.
 */

const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');
const { toSearchKey } = require('./query-normalize');

const DB_PATH = getDbPath();
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

const MIN_IMPRESSIONS = 3; // need at least this many distinct clickers to trust signal
const CLICK_DECAY_DAYS = 30;

/**
 * Record a click on a search result.
 */
function recordClick({ query, siteId, position = 0, source = 'search', sessionToken = null }) {
  const db = getDb();
  const queryKey = toSearchKey(query);
  db.prepare(
    `
    INSERT INTO search_result_clicks (query, site_id, position, source, session_token)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(queryKey, siteId, position, source, sessionToken);
}

/**
 * Get LTR boost for a list of (query, siteId) pairs.
 * Returns a Map keyed by siteId -> boost value (0 to ~0.5).
 */
function getLtrBoosts(query, siteIds) {
  const db = getDb();
  const queryKey = toSearchKey(query);
  if (!queryKey || siteIds.length === 0) return new Map();

  const placeholders = siteIds.map(() => '?').join(',');
  const rows = db
    .prepare(
      `
      SELECT
        site_id,
        COUNT(DISTINCT COALESCE(session_token, id)) as distinct_clickers,
        COUNT(*) as clicks,
        AVG(position) as avg_position,
        COUNT(DISTINCT DATE(created_at)) as days_with_clicks
      FROM search_result_clicks
      WHERE query = ?
        AND site_id IN (${placeholders})
        AND created_at >= datetime('now', '-${CLICK_DECAY_DAYS} days')
      GROUP BY site_id
    `
    )
    .all(queryKey, ...siteIds);

  const boosts = new Map();
  for (const row of rows) {
    if (row.distinct_clickers < MIN_IMPRESSIONS) continue;
    // Higher distinct clickers and lower average position = bigger boost.
    // Position discount: position 0 -> 1.0, position 9 -> 0.5
    const positionDiscount = 1 / (1 + (row.avg_position || 0) * 0.1);
    const freshnessBonus = Math.min(row.days_with_clicks / 7, 1.0);
    const boost = Math.min(0.5, (row.distinct_clickers / 10) * positionDiscount * freshnessBonus);
    boosts.set(row.site_id, Number(boost.toFixed(3)));
  }
  return boosts;
}

/**
 * Compute a global site quality score from clicks across all queries.
 */
function getSiteQualityScore(siteId) {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT
        COUNT(*) as clicks,
        AVG(position) as avg_position
      FROM search_result_clicks
      WHERE site_id = ?
        AND created_at >= datetime('now', '-${CLICK_DECAY_DAYS} days')
    `
    )
    .get(siteId);

  if (!row || row.clicks < MIN_IMPRESSIONS) return 0;
  const positionDiscount = 1 / (1 + (row.avg_position || 0) * 0.1);
  return Math.min(0.3, (row.clicks / 20) * positionDiscount);
}

module.exports = {
  recordClick,
  getLtrBoosts,
  getSiteQualityScore,
  MIN_IMPRESSIONS,
};
