/**
 * Leaderboards — anonymized aggregations across Ink XP, temples, pantheons, streaks.
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

function getLeaderboards(limit = 20) {
  const db = getDb();
  const ink = db
    .prepare(
      `SELECT session_token, SUM(amount) as score
       FROM ink_xp
       GROUP BY session_token
       ORDER BY score DESC
       LIMIT ?`
    )
    .all(limit)
    .map(mask);

  const temples = db
    .prepare(
      `SELECT session_token, COUNT(DISTINCT payload) as score
       FROM ink_xp
       WHERE event_type = 'temple_visit'
       GROUP BY session_token
       ORDER BY score DESC
       LIMIT ?`
    )
    .all(limit)
    .map(mask);

  const pantheons = db
    .prepare(
      `SELECT session_token, COUNT(DISTINCT json_extract(payload, '$.pantheon')) as score
       FROM ink_xp
       WHERE event_type = 'temple_visit' AND json_valid(payload)
       GROUP BY session_token
       ORDER BY score DESC
       LIMIT ?`
    )
    .all(limit)
    .map(mask);

  const streaks = db
    .prepare(
      `SELECT session_token, COUNT(*) as score
       FROM challenge_attempts
       GROUP BY session_token
       ORDER BY score DESC
       LIMIT ?`
    )
    .all(limit)
    .map(mask);

  return { ink, temples, pantheons, streaks };
}

function mask(row, index) {
  return {
    rank: index + 1,
    user: `${row.session_token.substring(0, 8)}…`,
    score: row.score,
  };
}

module.exports = { getLeaderboards };
