/**
 * Migration: Pantheon Game Layer schema.
 * Adds Ink XP, badges, collections, daily challenges, and leaderboards.
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS ink_xp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT NOT NULL,
    event_type TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_ink_xp_session ON ink_xp(session_token);
  CREATE INDEX IF NOT EXISTS idx_ink_xp_event ON ink_xp(event_type);

  CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT NOT NULL,
    badge_id TEXT NOT NULL,
    awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_token, badge_id)
  );

  CREATE INDEX IF NOT EXISTS idx_badges_session ON badges(session_token);

  CREATE TABLE IF NOT EXISTS collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT NOT NULL,
    collection_id TEXT NOT NULL,
    entry_id TEXT NOT NULL,
    collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_token, collection_id, entry_id)
  );

  CREATE INDEX IF NOT EXISTS idx_collections_session ON collections(session_token);

  CREATE TABLE IF NOT EXISTS daily_challenges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    challenge_date TEXT UNIQUE NOT NULL,
    entry_id TEXT NOT NULL,
    clues TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(challenge_date);

  CREATE TABLE IF NOT EXISTS challenge_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT NOT NULL,
    challenge_date TEXT NOT NULL,
    solved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_token, challenge_date)
  );

  CREATE INDEX IF NOT EXISTS idx_challenge_attempts ON challenge_attempts(session_token, challenge_date);
`);

console.log('Gamification schema migrated.');
db.close();
