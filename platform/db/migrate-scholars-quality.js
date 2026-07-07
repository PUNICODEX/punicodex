/**
 * Migration: Edit quality gates for the Scholarly Edition
 *
 * Adds a quality_reason column to scholars_edits so every submitted edit
 * records why it received its quality score.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNYCODEX_TEST_DB_PATH || path.join(__dirname, 'punycodex.db');

const MIGRATION_SQL = `
  ALTER TABLE scholars_edits ADD COLUMN quality_reason TEXT;
  CREATE INDEX IF NOT EXISTS idx_scholars_edits_quality_reason ON scholars_edits(quality_reason);
`;

function migrate(db) {
  // better-sqlite3 does not support IF NOT EXISTS on ALTER TABLE,
  // so we guard against duplicate columns by inspecting the schema.
  const columns = db.prepare('PRAGMA table_info(scholars_edits)').all();
  const hasColumn = columns.some((col) => col.name === 'quality_reason');
  if (!hasColumn) {
    db.exec(MIGRATION_SQL);
  }
}

function runStandalone() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  db.close();
  console.log('Scholarly Edition quality migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, MIGRATION_SQL };
