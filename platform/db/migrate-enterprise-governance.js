/**
 * PUNYCODEX — Enterprise Governance & Compliance Migration Runner
 *
 * Idempotently applies platform/db/migrations/002_enterprise_governance.sql.
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { getDbPath } = require('./db.js');

const SQL_PATH = path.join(__dirname, 'migrations', '002_enterprise_governance.sql');

function migrateEnterpriseGovernance(options = {}) {
  const db = options.db || new Database(getDbPath());
  const shouldClose = !options.db;

  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  db.exec(sql);

  if (shouldClose) {
    db.close();
  }
}

if (require.main === module) {
  migrateEnterpriseGovernance();
  console.log('Enterprise governance migration applied.');
}

module.exports = { migrateEnterpriseGovernance };
