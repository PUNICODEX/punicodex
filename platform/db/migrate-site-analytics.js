/**
 * Migration: first-party site analytics tables
 *
 * Creates the SQLite schema for the site analytics engine. Handlers run
 * `runMigration()` lazily on cold start before their first SQLite write.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNYCODEX_TEST_DB_PATH || path.join(__dirname, 'punycodex.db');

const SITE_ANALYTICS_SCHEMA = `
  -- Raw page-view events (privacy-preserving: hashed IP/UA, daily-rotating session hash)
  CREATE TABLE IF NOT EXISTS site_analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL,
    temple_id TEXT,
    referrer TEXT,
    session_hash TEXT,
    ip_hash TEXT,
    ua_hash TEXT,
    is_bot INTEGER NOT NULL DEFAULT 0,
    bot_category TEXT,
    device TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_site_analytics_events_created ON site_analytics_events(created_at);
  CREATE INDEX IF NOT EXISTS idx_site_analytics_events_temple_created ON site_analytics_events(temple_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_site_analytics_events_bot ON site_analytics_events(is_bot);

  -- Per-day rollups (temple_id '' = non-temple site pages)
  CREATE TABLE IF NOT EXISTS site_analytics_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    temple_id TEXT NOT NULL DEFAULT '',
    human_views INTEGER NOT NULL DEFAULT 0,
    bot_views INTEGER NOT NULL DEFAULT 0,
    UNIQUE(day, temple_id)
  );
`;

function migrate(db) {
  db.exec(SITE_ANALYTICS_SCHEMA);
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
  console.log('Site analytics migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, runMigration, SITE_ANALYTICS_SCHEMA };
