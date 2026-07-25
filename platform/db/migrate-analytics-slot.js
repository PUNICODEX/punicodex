/**
 * Migration: analytics slot dimension (placement-level granularity)
 *
 * Adds `slot_slug` to analytics_events so a single booking's events can be
 * attributed to the individual placement that emitted them. This matters for
 * bundle/takeover bookings: every member placement on the temple shares the
 * booking's tracking token, so the slot slug is the only way to split
 * impressions/viewability/clicks per member placement. Events recorded
 * before this dimension existed (and whole-slot renders) keep slot_slug NULL
 * and are reported as the booking's whole-slot bucket.
 *
 * Idempotent: safe to run on every serverless cold start. Follows the
 * migrate-site-analytics-v2.js pattern (exported migrate(db) + lazy
 * runMigration() + standalone runner).
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

function tableExists(db, table) {
  return Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
  );
}

function addColumnIfMissing(db, table, column, ddl) {
  const cols = db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .map((c) => c.name);
  if (cols.includes(column)) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  return true;
}

function migrate(db) {
  if (!tableExists(db, 'analytics_events')) return;
  addColumnIfMissing(db, 'analytics_events', 'slot_slug', 'slot_slug TEXT');
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_analytics_events_booking_slot
       ON analytics_events(booking_id, slot_slug)`
  );
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
  console.log('Analytics slot migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, runMigration, runStandalone, addColumnIfMissing };
