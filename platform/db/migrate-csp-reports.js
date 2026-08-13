/**
 * Migration: CSP violation reports for the Security tab
 *
 * One row per distinct violation signature (document path, directive, blocked
 * host, source-file host, line number); repeat reports increment `count` and
 * refresh `last_seen` (see platform/api/security-overview.js#recordCspReport).
 * Collector: /api/security/csp-report/ — every stored field is sanitized
 * there before it touches SQL; this table never holds raw report bodies.
 *
 * Idempotent: safe to run on every serverless cold start. Follows the
 * migrate-discount-codes.js pattern (exported migrate(db) + lazy
 * runMigration() + standalone runner).
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const CSP_REPORTS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS csp_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_path TEXT,
    directive TEXT,
    blocked_host TEXT,
    source_file_host TEXT,
    line_number INTEGER,
    count INTEGER DEFAULT 1,
    first_seen TEXT,
    last_seen TEXT,
    UNIQUE(document_path, directive, blocked_host, source_file_host, line_number)
  );

  CREATE INDEX IF NOT EXISTS idx_csp_reports_last_seen ON csp_reports(last_seen);
`;

function migrate(db) {
  db.exec(CSP_REPORTS_SCHEMA);
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
  console.log('CSP reports table ready.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, runMigration, runStandalone, CSP_REPORTS_SCHEMA };
