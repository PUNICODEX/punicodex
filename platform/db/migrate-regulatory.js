/**
 * PUNICODEX — Regulatory, Legal & Abuse-Handling Schema Migration (Phase 16)
 *
 * Idempotently applies platform/db/migrations/003_regulatory.sql.
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { getDbPath } = require('./db.js');

const SQL_PATH = path.join(__dirname, 'migrations', '003_regulatory.sql');

function migrateRegulatory(options = {}) {
  const db = options.db || new Database(getDbPath());
  const shouldClose = !options.db;

  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  db.exec(sql);

  if (shouldClose) {
    db.close();
  }
}

if (require.main === module) {
  migrateRegulatory();
  console.log('Regulatory migration applied.');
}

module.exports = { migrateRegulatory };
