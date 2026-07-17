/**
 * Migration: Search Engine Kernel v2 schema.
 * Adds personalization, A/B assignment, feedback, and trending tables.
 */
const Database = require('better-sqlite3');
const path = require('node:path');
const { toSearchKey } = require(path.join(__dirname, '..', 'api', 'query-normalize.js'));

const DB_PATH = path.join(__dirname, 'punicodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS search_sessions (
    token TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    preferences TEXT DEFAULT '{}',
    ab_variant TEXT DEFAULT 'control'
  );

  CREATE TABLE IF NOT EXISTS search_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT,
    query TEXT NOT NULL,
    site_id INTEGER,
    entry_id TEXT,
    helpful INTEGER DEFAULT 0,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_feedback_session ON search_feedback(session_token);
  CREATE INDEX IF NOT EXISTS idx_feedback_query ON search_feedback(query);
  CREATE INDEX IF NOT EXISTS idx_feedback_site ON search_feedback(site_id);

  CREATE TABLE IF NOT EXISTS ab_assignments (
    session_token TEXT PRIMARY KEY,
    variant TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trending_searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    vertical TEXT DEFAULT 'all',
    count INTEGER DEFAULT 1,
    last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(query, vertical)
  );

  CREATE INDEX IF NOT EXISTS idx_trending_query ON trending_searches(query);
  CREATE INDEX IF NOT EXISTS idx_trending_last ON trending_searches(last_seen_at);
`);

// Backfill search_key for Unicode-aware lookup
const hasSearchKey = db
  .prepare('PRAGMA table_info(entries)')
  .all()
  .some((c) => c.name === 'search_key');
if (hasSearchKey) {
  const needsBackfill = db
    .prepare('SELECT COUNT(*) AS n FROM entries WHERE search_key IS NULL')
    .get().n;
  if (needsBackfill > 0) {
    const update = db.prepare('UPDATE entries SET search_key = ? WHERE id = ?');
    const rows = db.prepare('SELECT id, unicode FROM entries WHERE search_key IS NULL').all();
    const txn = db.transaction((rows) => {
      for (const row of rows) {
        update.run(toSearchKey(row.unicode), row.id);
      }
    });
    txn(rows);
    console.log(`Backfilled search_key for ${rows.length} entries.`);
  }
  db.exec('CREATE INDEX IF NOT EXISTS idx_entries_search_key ON entries(search_key)');
}

console.log('Search v2 schema migrated.');
db.close();
