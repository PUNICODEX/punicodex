/**
 * Daily Oracle Challenge — hidden name puzzle with clues.
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

function migrateChallenges() {
  const db = getDb();
  db.exec(`
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
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

function pickDailyEntry(entries, date) {
  const idx = hashString(date) % entries.length;
  return entries[idx];
}

function generateClues(entry) {
  const clues = [];
  if (entry.meaning) clues.push(`This name means “${entry.meaning}”.`);
  if (entry.pantheon) clues.push(`It belongs to the ${entry.pantheon} pantheon.`);
  if (entry.tier)
    clues.push(
      `It is classified as ${entry.tier === 'dual' ? 'Dual-Tier' : `Tier-${entry.tier}`}.`
    );
  if (entry.greek && entry.greek !== '—') clues.push(`In Greek it is written ${entry.greek}.`);
  if (clues.length < 3) clues.push(`Its ASCII spelling is “${entry.ascii}”.`);
  return clues;
}

function getOrCreateChallenge(entries) {
  migrateChallenges();
  const db = getDb();
  const date = getTodayDate();
  let row = db.prepare('SELECT * FROM daily_challenges WHERE challenge_date = ?').get(date);
  if (!row) {
    const entry = pickDailyEntry(entries, date);
    const clues = generateClues(entry);
    db.prepare(
      'INSERT INTO daily_challenges (challenge_date, entry_id, clues) VALUES (?, ?, ?)'
    ).run(date, entry.id, JSON.stringify(clues));
    row = db.prepare('SELECT * FROM daily_challenges WHERE challenge_date = ?').get(date);
  }
  return {
    date: row.challenge_date,
    entryId: row.entry_id,
    clues: JSON.parse(row.clues),
  };
}

function getChallengeForDate(date) {
  migrateChallenges();
  const db = getDb();
  const row = db.prepare('SELECT * FROM daily_challenges WHERE challenge_date = ?').get(date);
  if (!row) return null;
  return { date: row.challenge_date, entryId: row.entry_id, clues: JSON.parse(row.clues) };
}

function attemptSolution(sessionToken, date, guess, entries) {
  migrateChallenges();
  const db = getDb();
  const challenge = getChallengeForDate(date) || getOrCreateChallenge(entries);
  const entry = entries.find((e) => e.id === challenge.entryId);
  const normalizedGuess = guess.trim().toLowerCase();
  const correct =
    normalizedGuess === entry.id.toLowerCase() ||
    normalizedGuess === (entry.ascii || '').toLowerCase() ||
    normalizedGuess === (entry.unicode || '').toLowerCase();

  if (correct) {
    db.prepare(
      'INSERT OR IGNORE INTO challenge_attempts (session_token, challenge_date) VALUES (?, ?)'
    ).run(sessionToken, date);
  }

  return { correct, entryId: entry.id, unicode: entry.unicode, ascii: entry.ascii };
}

function getStreak(sessionToken) {
  migrateChallenges();
  const db = getDb();
  const attempts = db
    .prepare(
      'SELECT challenge_date FROM challenge_attempts WHERE session_token = ? ORDER BY challenge_date DESC'
    )
    .all(sessionToken)
    .map((r) => r.challenge_date);
  if (attempts.length === 0) return { current: 0, longest: 0 };
  let current = 0;
  const today = getTodayDate();
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  if (attempts[0] === today || attempts[0] === yesterday) {
    current = 1;
    for (let i = 1; i < attempts.length; i++) {
      const prev = new Date(new Date(attempts[i - 1]).getTime() - 86400000)
        .toISOString()
        .split('T')[0];
      if (attempts[i] === prev) current++;
      else break;
    }
  }
  return { current, longest: attempts.length };
}

module.exports = { getOrCreateChallenge, attemptSolution, getStreak, getChallengeForDate };
