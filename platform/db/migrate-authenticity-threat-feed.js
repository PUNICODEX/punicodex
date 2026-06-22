/**
 * PUNYCODEX — Authenticity Threat Feed Migration
 *
 * Idempotently creates the persistent backend for spoof discovery and human
 * review. Safe to run multiple times.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');

const MIGRATION_SQL = `
  CREATE TABLE IF NOT EXISTS discovered_spoofs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    input TEXT NOT NULL,
    input_type TEXT CHECK(input_type IN ('name','domain','url')) DEFAULT 'name',
    punycode TEXT,
    verdict TEXT NOT NULL,
    severity TEXT NOT NULL,
    canonical_entry_id TEXT,
    discovery_source TEXT,
    confidence REAL DEFAULT 0,
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    report_count INTEGER DEFAULT 0,
    reviewed_at DATETIME,
    reviewer_decision TEXT CHECK(reviewer_decision IN ('confirmed','false-positive','ignored')),
    UNIQUE(input, input_type)
  );

  CREATE TABLE IF NOT EXISTS spoof_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    discovered_spoof_id INTEGER,
    reporter_token TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(discovered_spoof_id) REFERENCES discovered_spoofs(id)
  );

  CREATE TABLE IF NOT EXISTS authenticity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    input TEXT NOT NULL,
    input_type TEXT,
    verdict TEXT,
    severity TEXT,
    canonical_entry_id TEXT,
    client_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_discovered_spoofs_input ON discovered_spoofs(input);
  CREATE INDEX IF NOT EXISTS idx_discovered_spoofs_verdict ON discovered_spoofs(verdict);
  CREATE INDEX IF NOT EXISTS idx_discovered_spoofs_canonical_entry_id ON discovered_spoofs(canonical_entry_id);
  CREATE INDEX IF NOT EXISTS idx_discovered_spoofs_discovery_source ON discovered_spoofs(discovery_source);
  CREATE INDEX IF NOT EXISTS idx_authenticity_log_input ON authenticity_log(input);
  CREATE INDEX IF NOT EXISTS idx_authenticity_log_created_at ON authenticity_log(created_at);
`;

function migrateAuthenticityThreatFeed(db) {
  db.exec(MIGRATION_SQL);
}

function runMigration() {
  const db = new Database(DB_PATH);
  try {
    migrateAuthenticityThreatFeed(db);
    console.log('Authenticity threat feed migration applied.');
  } finally {
    db.close();
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { migrateAuthenticityThreatFeed };
