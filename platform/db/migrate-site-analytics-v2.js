/**
 * Migration: site analytics v2 — engagement + path-level rollups
 *
 * Adds the schema for the v2 beacon (js/analytics-beacon.js): one anonymous
 * engagement ping per page visit (visible milliseconds + max scroll depth),
 * daily engagement rollups, and path-level daily view rollups so rankings
 * are not limited to temple pages. Handlers run `runMigration()` lazily on
 * cold start before their first SQLite write.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const SITE_ANALYTICS_V2_SCHEMA = `
  -- Raw engagement events (one per page visit; anonymous)
  CREATE TABLE IF NOT EXISTS site_analytics_engagement (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    temple_id TEXT,
    session_hash TEXT,
    visible_ms INTEGER NOT NULL DEFAULT 0,
    scroll_pct INTEGER NOT NULL DEFAULT 0,
    device TEXT,
    is_bot INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_site_analytics_eng_created ON site_analytics_engagement(created_at);
  CREATE INDEX IF NOT EXISTS idx_site_analytics_eng_temple_created ON site_analytics_engagement(temple_id, created_at);

  -- Per-day engagement rollups (temple_id '' = non-temple site pages)
  CREATE TABLE IF NOT EXISTS site_analytics_engagement_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    temple_id TEXT NOT NULL DEFAULT '',
    engagements INTEGER NOT NULL DEFAULT 0,
    total_visible_ms INTEGER NOT NULL DEFAULT 0,
    total_scroll_pct INTEGER NOT NULL DEFAULT 0,
    UNIQUE(day, temple_id)
  );

  -- Per-day path-level view rollups (every public path, not only temples)
  CREATE TABLE IF NOT EXISTS site_analytics_paths_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    path TEXT NOT NULL,
    human_views INTEGER NOT NULL DEFAULT 0,
    UNIQUE(day, path)
  );

  CREATE INDEX IF NOT EXISTS idx_site_analytics_paths_day ON site_analytics_paths_daily(day, human_views);
`;

function migrate(db) {
  db.exec(SITE_ANALYTICS_V2_SCHEMA);
}

function runMigration() {
  const { getDb } = require('./connection');
  migrate(getDb());
}

function runStandalone() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  db.close();
  console.log('Site analytics v2 migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, runMigration, SITE_ANALYTICS_V2_SCHEMA };
