/**
 * PUNYCODEX — Threat Graph Schema Migration Runner
 *
 * Idempotently applies platform/db/threat-graph.sql.
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { getDbPath } = require('./db.js');

const SQL_PATH = path.join(__dirname, 'threat-graph.sql');

function migrateThreatGraph(options = {}) {
  const db = options.db || new Database(getDbPath());
  const shouldClose = !options.db;

  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  db.exec(sql);

  if (shouldClose) {
    db.close();
  }
}

if (require.main === module) {
  migrateThreatGraph();
  console.log('Threat graph migration applied.');
}

module.exports = { migrateThreatGraph };
