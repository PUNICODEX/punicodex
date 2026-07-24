/**
 * Migration: domain arbitrage applications table
 *
 * Creates the SQLite table backing POST /api/arbitrage/apply/ — one row per
 * acquisition application. The handler runs `runMigration()` lazily on cold
 * start before its first write. IPs are stored as truncated SHA-256 hashes
 * only (abuse correlation without raw PII).
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const ARBITRAGE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS arbitrage_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    budget TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    ip_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_arbitrage_requests_status ON arbitrage_requests(status);
  CREATE INDEX IF NOT EXISTS idx_arbitrage_requests_created ON arbitrage_requests(created_at);
`;

function migrate(db) {
  db.exec(ARBITRAGE_SCHEMA);
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
  console.log('Arbitrage requests migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, runMigration, ARBITRAGE_SCHEMA };
