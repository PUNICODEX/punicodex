/**
 * PuniCodex — Gamification tests
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const { awardXp, getXpSummary, getLeaderboard } = require('../platform/api/ink-xp');
const { getBadges, checkAndAward } = require('../platform/api/badges');
const {
  getOrCreateChallenge,
  attemptSolution,
  getStreak,
} = require('../platform/api/daily-challenge');
const Database = require('better-sqlite3');
const { getDbPath } = require('../platform/db/db');

function unique(prefix) {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}`;
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err.message);
    process.exitCode = 1;
  }
}

console.log('Gamification Tests');

test('award XP and summarize', () => {
  const token = unique('session-g1');
  awardXp(token, 'search', { query: 'zeus' });
  awardXp(token, 'temple_visit', { entryId: 'zeus' });
  const summary = getXpSummary(token);
  assert.ok(summary.total >= 30);
  assert.ok(summary.byEvent.some((e) => e.event_type === 'search'));
});

test('leaderboard aggregates XP', () => {
  const token = unique('session-g2');
  awardXp(token, 'search', {});
  awardXp(token, 'search', {});
  const board = getLeaderboard(10);
  assert.ok(board.some((r) => r.sessionToken.includes(token.substring(0, 8))));
});

test('badges are awarded based on stats', () => {
  const token = unique('session-g3');
  awardXp(token, 'search', {});
  const awarded = checkAndAward(token);
  assert.ok(awarded.some((b) => b.id === 'first-search'));
  const badges = getBadges(token);
  assert.ok(badges.some((b) => b.id === 'first-search'));
});

test('daily challenge generates clues and accepts correct guess', () => {
  const db = new Database(getDbPath());
  const entries = db
    .prepare('SELECT id, ascii, unicode, pantheon, tier, meaning, greek FROM entries')
    .all();
  const challenge = getOrCreateChallenge(entries);
  assert.ok(challenge.entryId);
  assert.ok(challenge.clues.length > 0);
  const entry = entries.find((e) => e.id === challenge.entryId);
  const result = attemptSolution(unique('session-g4'), challenge.date, entry.ascii, entries);
  assert.strictEqual(result.correct, true);
  assert.strictEqual(result.entryId, entry.id);
});

test('daily streak tracks solved days', () => {
  const db = new Database(getDbPath());
  const entries = db
    .prepare('SELECT id, ascii, unicode, pantheon, tier, meaning, greek FROM entries')
    .all();
  const challenge = getOrCreateChallenge(entries);
  const token = unique('session-g5');
  attemptSolution(token, challenge.date, 'wrongguess', entries);
  const { current } = getStreak(token);
  assert.strictEqual(current, 0);
});

if (!process.exitCode) {
  console.log('\n✓ All Gamification tests passed');
} else {
  console.log('\n✗ Some Gamification tests failed');
  process.exit(1);
}
