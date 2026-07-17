/**
 * Learning-to-rank (LTR) migration.
 *
 * Adds a table to record search-result clicks so we can learn ranking weights
 * from user behavior. Idempotent.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punicodex.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS search_result_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    site_id INTEGER NOT NULL,
    position INTEGER DEFAULT 0,
    source TEXT DEFAULT 'search',
    session_token TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_search_clicks_query ON search_result_clicks(query);
  CREATE INDEX IF NOT EXISTS idx_search_clicks_site ON search_result_clicks(site_id);
  CREATE INDEX IF NOT EXISTS idx_search_clicks_created ON search_result_clicks(created_at);
`);

console.log('LTR migration complete');
console.log('Clicks:', db.prepare('SELECT COUNT(*) as c FROM search_result_clicks').get().c);
