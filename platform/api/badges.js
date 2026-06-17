/**
 * Badge system — definitions, detection, and awards.
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

function migrateBadges() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      awarded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(session_token, badge_id)
    );
    CREATE INDEX IF NOT EXISTS idx_badges_session ON badges(session_token);
  `);
}

const BADGE_DEFINITIONS = [
  {
    id: 'first-search',
    title: 'First Query',
    description: 'Performed your first search.',
    icon: '🔍',
    condition: (stats) => stats.search >= 1,
  },
  {
    id: 'scribe',
    title: 'Scribe',
    description: 'Copied 10 Unicode names.',
    icon: '📜',
    condition: (stats) => stats.copy_unicode >= 10,
  },
  {
    id: 'pilgrim',
    title: 'Pilgrim',
    description: 'Visited 10 temple pages.',
    icon: '🏛',
    condition: (stats) => stats.temple_visit >= 10,
  },
  {
    id: 'oracle-seeker',
    title: 'Oracle Seeker',
    description: 'Asked the Oracle 5 questions.',
    icon: '🔮',
    condition: (stats) => stats.oracle_question >= 5,
  },
  {
    id: 'daily-devotee',
    title: 'Daily Devotee',
    description: 'Solved 3 daily challenges.',
    icon: '🌅',
    condition: (stats) => (stats.daily_solved || 0) >= 3,
  },
  {
    id: 'pantheon-scholar',
    title: 'Pantheon Scholar',
    description: 'Earned 1,000 Ink.',
    icon: '🎓',
    condition: (stats) => stats.totalXp >= 1000,
  },
];

function getEventCounts(sessionToken) {
  migrateBadges();
  const db = getDb();
  const counts = db
    .prepare(
      'SELECT event_type, COUNT(*) as c FROM ink_xp WHERE session_token = ? GROUP BY event_type'
    )
    .all(sessionToken);
  const stats = {};
  for (const row of counts) stats[row.event_type] = row.c;
  const totalXp = db
    .prepare('SELECT COALESCE(SUM(amount), 0) as total FROM ink_xp WHERE session_token = ?')
    .get(sessionToken).total;
  stats.totalXp = totalXp;
  return stats;
}

function getBadges(sessionToken) {
  migrateBadges();
  const db = getDb();
  return db
    .prepare('SELECT badge_id, awarded_at FROM badges WHERE session_token = ?')
    .all(sessionToken)
    .map((r) => ({
      id: r.badge_id,
      awardedAt: r.awarded_at,
    }));
}

function checkAndAward(sessionToken, extraStats = {}) {
  migrateBadges();
  const db = getDb();
  const stats = { ...getEventCounts(sessionToken), ...extraStats };
  const owned = new Set(getBadges(sessionToken).map((b) => b.id));
  const awarded = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (owned.has(badge.id)) continue;
    if (badge.condition(stats)) {
      db.prepare('INSERT OR IGNORE INTO badges (session_token, badge_id) VALUES (?, ?)').run(
        sessionToken,
        badge.id
      );
      awarded.push(badge);
    }
  }
  return awarded;
}

function getBadgeDefinitions() {
  return BADGE_DEFINITIONS;
}

module.exports = { getBadges, checkAndAward, getBadgeDefinitions, getEventCounts };
