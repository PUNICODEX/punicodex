/**
 * Migration: Search Engine Kernel v2 schema.
 * Adds personalization, A/B assignment, feedback, and trending tables.
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
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

console.log('Search v2 schema migrated.');
db.close();
