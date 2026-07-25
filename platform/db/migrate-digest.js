/**
 * Migration: Digest & alert email log
 *
 * One row per automated membership email (weekly sponsor/patron digests,
 * patron expiry reminders, traffic-spike admin alerts). Services check the
 * (kind, target, detail) triple before sending — that is the dedup key that
 * keeps re-runs and overlapping crons idempotent; sent_at records when the
 * email actually went out.
 *
 * Follows the migrate-patrons.js pattern (exported migrate(db) + standalone
 * runner) so Vercel serverless functions can run it idempotently on cold
 * start.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const DIGEST_SCHEMA = `
  CREATE TABLE IF NOT EXISTS digest_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    target TEXT NOT NULL,
    detail TEXT,
    sent_at TEXT NOT NULL,
    UNIQUE(kind, target, detail, sent_at)
  );
`;

function migrate(db) {
  db.exec(DIGEST_SCHEMA);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_digest_log_kind_sent ON digest_log(kind, sent_at);
  `);
}

function runStandalone() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  db.close();
  console.log('Digest log table ready.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, DIGEST_SCHEMA };
