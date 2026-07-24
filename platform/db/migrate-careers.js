/**
 * Migration: careers portal applications
 *
 * Creates the SQLite schema for the careers portal. Handlers run
 * `runMigration()` lazily on cold start before their first SQLite write.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const CAREERS_SCHEMA = `
  -- Applications from /careers/ (privacy-preserving: hashed IP, no raw IP)
  CREATE TABLE IF NOT EXISTS career_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    links TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    ip_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_career_applications_status ON career_applications(status);
  CREATE INDEX IF NOT EXISTS idx_career_applications_created ON career_applications(created_at);
`;

function migrate(db) {
  db.exec(CAREERS_SCHEMA);
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
  console.log('Careers migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, runMigration, CAREERS_SCHEMA };
