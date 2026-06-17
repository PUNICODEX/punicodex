/**
 * Ink XP economy — award and aggregate experience points.
 */
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

const DB_PATH = getDbPath();
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function migrateInk() {
  const db = getDb();
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
  `);
}

const XP_TABLE = {
  search: 10,
  convert: 15,
  temple_visit: 20,
  copy_unicode: 5,
  oracle_question: 25,
  daily_streak: 50,
  collection_progress: 30,
  feedback: 10,
};

function awardXp(sessionToken, eventType, payload = {}) {
  migrateInk();
  const amount = XP_TABLE[eventType] || 5;
  const db = getDb();
  db.prepare(
    'INSERT INTO ink_xp (session_token, event_type, amount, payload) VALUES (?, ?, ?, ?)'
  ).run(sessionToken, eventType, amount, JSON.stringify(payload));
  return { eventType, amount };
}

function getXpSummary(sessionToken) {
  migrateInk();
  const db = getDb();
  const total = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM ink_xp WHERE session_token = ?')
    .get(sessionToken).total;
  const byEvent = db
    .prepare(
      'SELECT event_type, SUM(amount) as amount FROM ink_xp WHERE session_token = ? GROUP BY event_type'
    )
    .all(sessionToken);
  const recent = db
    .prepare(
      'SELECT event_type, amount, created_at FROM ink_xp WHERE session_token = ? ORDER BY created_at DESC LIMIT 10'
    )
    .all(sessionToken);
  return { total, byEvent, recent };
}

function getLeaderboard(limit = 20) {
  migrateInk();
  const db = getDb();
  return db
    .prepare(
      `SELECT session_token, SUM(amount) as total
       FROM ink_xp
       GROUP BY session_token
       ORDER BY total DESC
       LIMIT ?`
    )
    .all(limit)
    .map((r, i) => ({
      rank: i + 1,
      sessionToken: `${r.session_token.substring(0, 8)}…`,
      total: r.total,
    }));
}

module.exports = { awardXp, getXpSummary, getLeaderboard, XP_TABLE };
