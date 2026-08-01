const { awardXp, getXpSummary } = require('../../platform/api/ink-xp');
const { getBadges, checkAndAward, getBadgeDefinitions } = require('../../platform/api/badges');
const {
  getOrCreateChallenge,
  attemptSolution,
  getStreak,
} = require('../../platform/api/daily-challenge');
const { getLeaderboards } = require('../../platform/api/leaderboards');
const { getSessionToken, getOrCreateSession } = require('../../platform/api/search-v2');
const { checkPublicRateLimitByReq } = require('../../platform/api/public-rate-limiter');
const { handleError, setCors } = require('../_utils');

const ENTRIES = loadEntries();

function loadEntries() {
  try {
    const db = require('../../platform/db/db');
    const Database = require('better-sqlite3');
    const database = new Database(db.getDbPath());
    return database
      .prepare('SELECT id, ascii, unicode, pantheon, tier, meaning, greek FROM entries')
      .all();
  } catch (_e) {
    return [];
  }
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = getSessionToken(req);
    if (!token) return res.status(400).json({ error: 'Session token required' });
    const session = getOrCreateSession(token);
    if (!session) return res.status(400).json({ error: 'Invalid session' });

    if (req.method === 'GET') {
      const { type } = req.query;
      if (type === 'challenge') {
        const challenge = getOrCreateChallenge(ENTRIES);
        const { current, longest } = getStreak(session.token);
        return res.json({
          challenge,
          streak: { current, longest },
          solved: isSolved(session.token, challenge.date),
        });
      }
      if (type === 'leaderboards') {
        return res.json(getLeaderboards());
      }

      const summary = getXpSummary(session.token);
      const badges = getBadges(session.token);
      const definitions = getBadgeDefinitions();
      return res.json({ summary, badges, definitions });
    }

    if (req.method === 'POST') {
      if (!(await checkPublicRateLimitByReq(req, res, 'gamification-write'))) return;
      const { action } = req.body || {};

      if (action === 'xp') {
        const { eventType, payload } = req.body;
        const xp = awardXp(session.token, eventType, payload || {});
        const newBadges = checkAndAward(session.token);
        return res.json({ xp, newBadges });
      }

      if (action === 'challenge') {
        const { date, guess } = req.body;
        if (!date || !guess) return res.status(400).json({ error: 'date and guess required' });
        const result = attemptSolution(session.token, date, guess, ENTRIES);
        if (result.correct) {
          awardXp(session.token, 'daily_streak', { date });
          checkAndAward(session.token, { daily_solved: solvedCount(session.token) });
        }
        return res.json(result);
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};

function isSolved(sessionToken, date) {
  try {
    const Database = require('better-sqlite3');
    const { getDbPath } = require('../../platform/db/db');
    const database = new Database(getDbPath());
    const row = database
      .prepare('SELECT 1 FROM challenge_attempts WHERE session_token = ? AND challenge_date = ?')
      .get(sessionToken, date);
    return !!row;
  } catch (_e) {
    return false;
  }
}

function solvedCount(sessionToken) {
  try {
    const Database = require('better-sqlite3');
    const { getDbPath } = require('../../platform/db/db');
    const database = new Database(getDbPath());
    return database
      .prepare('SELECT COUNT(*) as c FROM challenge_attempts WHERE session_token = ?')
      .get(sessionToken).c;
  } catch (_e) {
    return 0;
  }
}
