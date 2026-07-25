/**
 * Migration: site analytics v3 — country rollups
 *
 * Adds a `country` column (ISO 3166-1 alpha-2, from Vercel's edge-injected
 * x-vercel-ip-country header) to the raw events table and a per-day country
 * rollup. Coarse-grained by design: country codes only, never IPs, regions,
 * or cities.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const SITE_ANALYTICS_V3_SCHEMA = `
  CREATE TABLE IF NOT EXISTS site_analytics_countries_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    country TEXT NOT NULL,
    human_views INTEGER NOT NULL DEFAULT 0,
    UNIQUE(day, country)
  );

  CREATE INDEX IF NOT EXISTS idx_site_analytics_countries_day ON site_analytics_countries_daily(day, human_views);
`;

const ALTERATIONS = [{ table: 'site_analytics_events', column: 'country', definition: 'TEXT' }];

function addColumnIfMissing(db, table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrate(db) {
  db.exec(SITE_ANALYTICS_V3_SCHEMA);
  for (const { table, column, definition } of ALTERATIONS) {
    addColumnIfMissing(db, table, column, definition);
  }
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
  console.log('Site analytics v3 migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, runMigration, SITE_ANALYTICS_V3_SCHEMA };
