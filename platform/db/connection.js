const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

let db = null;

/**
 * Return a single shared better-sqlite3 connection.
 * The connection is opened lazily and reused for the process lifetime.
 * In long-running scripts you can call closeDb() at the end.
 */
function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, closeDb };
