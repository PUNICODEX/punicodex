/**
 * Ensure the site-analytics v2 (v5) tables exist before any deep analytics
 * engine (funnels, cohorts, LTV, realtime, rollups) runs a query.
 *
 * The engine modules query the database directly and previously assumed the
 * tables already existed — true on local SQLite (migrations run at generate /
 * first recordToSqlite call), false on production Postgres, where every deep
 * mode 500'd with "relation site_analytics_events_v2 does not exist".
 *
 * Idempotent and process-cached; a no-op off the Postgres path (SQLite
 * migrations are owned by platform/api/site-analytics.js).
 */

const { isPostgres } = require('./operational');
const { runMigration } = require('./migrate-site-analytics-v5-pg');

let ran = false;

async function ensureAnalyticsV5Pg() {
  if (ran || !isPostgres()) return;
  await runMigration();
  ran = true;
}

module.exports = { ensureAnalyticsV5Pg };
