/**
 * Migration: Discount codes for temple sponsorships (ad-slot bookings)
 *
 * Two tables plus a nullable bookings.discount_code column:
 *
 *   discount_codes       — the codes an admin mints in the portal's Leasing >
 *                          Discounts tab. `kind` drives the term math in
 *                          platform/api/discount-service.js. Codes apply to
 *                          one temple (applies_to = site_slug) or every temple
 *                          ('all'). This system NEVER touches patrons: codes
 *                          redeem only against sponsorship bookings.
 *   discount_redemptions — one row per applied code, written when an admin
 *                          approves a booking application that carries a code.
 *
 * Idempotent: safe to run on every serverless cold start. Follows the
 * migrate-patrons.js pattern (exported migrate(db) + lazy runMigration() +
 * standalone runner).
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const DISCOUNT_CODES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS discount_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE COLLATE NOCASE,
    kind TEXT NOT NULL CHECK(kind IN ('percent_off','fixed_off','free_months_then_price','free_months','trial_extension')),
    percent REAL,
    fixed_cents INTEGER,
    free_months INTEGER,
    then_price_cents INTEGER,
    applies_to TEXT NOT NULL DEFAULT 'all',
    max_uses INTEGER,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    note TEXT,
    created_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

const DISCOUNT_REDEMPTIONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS discount_redemptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_id INTEGER NOT NULL REFERENCES discount_codes(id),
    booking_id INTEGER NOT NULL,
    email TEXT,
    original_cents INTEGER,
    final_cents INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

function tableExists(db, table) {
  return Boolean(
    db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)
  );
}

function addColumnIfMissing(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const hasColumn = columns.some((col) => col.name === column);
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrate(db) {
  db.exec(DISCOUNT_CODES_SCHEMA);
  db.exec(DISCOUNT_REDEMPTIONS_SCHEMA);
  // Sponsors quote a code on their application; it lives on the booking until
  // admin approval re-validates and redeems it.
  if (tableExists(db, 'bookings')) {
    addColumnIfMissing(db, 'bookings', 'discount_code', 'discount_code TEXT');
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_discount_redemptions_code ON discount_redemptions(code_id);
    CREATE INDEX IF NOT EXISTS idx_discount_redemptions_booking ON discount_redemptions(booking_id);
  `);
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
  console.log('Discount codes tables ready.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = {
  migrate,
  runMigration,
  runStandalone,
  DISCOUNT_CODES_SCHEMA,
  DISCOUNT_REDEMPTIONS_SCHEMA,
};
