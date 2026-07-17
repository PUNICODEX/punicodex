/**
 * PUNICODEX — MLOps & Continuous Learning Migration Runner (Phase 14)
 *
 * Idempotently applies platform/db/migrations/003_mlops.sql.
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { getDbPath } = require('./db.js');

const SQL_PATH = path.join(__dirname, 'migrations', '003_mlops.sql');

function migrateMLOps(options = {}) {
  const db = options.db || new Database(getDbPath());
  const shouldClose = !options.db;

  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  db.exec(sql);

  if (shouldClose) {
    db.close();
  }
}

if (require.main === module) {
  migrateMLOps();
  console.log('MLOps & continuous learning migration applied.');
}

module.exports = { migrateMLOps };
