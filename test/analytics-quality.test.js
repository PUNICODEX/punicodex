'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

const testDb = prepareTestDb(__filename);
process.env.PUNICODEX_TEST_DB_PATH = testDb;

const { runMigration } = require('../platform/db/migrate-site-analytics-v5.js');
runMigration();

const { closeDb } = require('../platform/db/connection.js');
const { run } = require('../platform/db/operational.js');
const {
  scoreEventQuality,
  checkSessionVelocity,
  checkIpVelocity,
  isImplausibleEngagement,
} = require('../platform/api/analytics-quality.js');

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const HEADLESS_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36';
const PLAYWRIGHT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Playwright';

test('human page view scores 1.0 with no flags', async () => {
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's1', path: '/zeus/' },
    { userAgent: HUMAN_UA, ipHash: 'ip1', recentSessionEvents: [] }
  );
  assert.strictEqual(result.qualityScore, 1.0);
  assert.deepStrictEqual(result.flags, []);
});

test('bot user agent scores 0.0 and is flagged', async () => {
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's2', path: '/zeus/' },
    { userAgent: BOT_UA, ipHash: 'ip2', recentSessionEvents: [] }
  );
  assert.strictEqual(result.qualityScore, 0.0);
  assert.deepStrictEqual(result.flags, ['bot-ua']);
});

test('headless Chrome scores below the bot threshold', async () => {
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's3', path: '/zeus/' },
    { userAgent: HEADLESS_UA, ipHash: 'ip3', recentSessionEvents: [] }
  );
  assert.ok(result.qualityScore < 0.3, `expected < 0.3, got ${result.qualityScore}`);
  assert.ok(result.flags.includes('headless'));
});

test('Playwright user agent is flagged as headless', async () => {
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's4', path: '/zeus/' },
    { userAgent: PLAYWRIGHT_UA, ipHash: 'ip4', recentSessionEvents: [] }
  );
  assert.ok(result.flags.includes('headless'));
});

test('session velocity is flagged when event count exceeds the limit', async () => {
  const events = Array.from({ length: 62 }, () => ({ created_at: new Date().toISOString() }));
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's5', path: '/zeus/' },
    { userAgent: HUMAN_UA, ipHash: 'ip5', recentSessionEvents: events }
  );
  assert.ok(result.flags.includes('session-velocity'));
  assert.ok(result.qualityScore < 1.0);
});

test('session velocity is not flagged within the limit', async () => {
  const events = Array.from({ length: 60 }, () => ({ created_at: new Date().toISOString() }));
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's6', path: '/zeus/' },
    { userAgent: HUMAN_UA, ipHash: 'ip6', recentSessionEvents: events }
  );
  assert.ok(!result.flags.includes('session-velocity'));
  assert.strictEqual(result.qualityScore, 1.0);
});

test('session velocity ignores events outside the window', async () => {
  const old = new Date(Date.now() - 2 * 60 * 1000).toISOString();
  const events = Array.from({ length: 100 }, () => ({ created_at: old }));
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's7', path: '/zeus/' },
    { userAgent: HUMAN_UA, ipHash: 'ip7', recentSessionEvents: events }
  );
  assert.ok(!result.flags.includes('session-velocity'));
});

test('checkSessionVelocity returns false for missing session hash', () => {
  assert.strictEqual(checkSessionVelocity('', [{ created_at: new Date().toISOString() }]), false);
});

test('checkSessionVelocity returns false for non-array events', () => {
  assert.strictEqual(checkSessionVelocity('s', null), false);
});

test('checkSessionVelocity respects custom window and limit', () => {
  const now = Date.now();
  const events = [{ created_at: now - 500 }, { created_at: now - 400 }, { created_at: now - 300 }];
  assert.strictEqual(checkSessionVelocity('s', events, 1000, 2), true);
  assert.strictEqual(checkSessionVelocity('s', events, 1000, 3), false);
});

test('ip velocity is flagged when many distinct sessions share an IP', async () => {
  const ipHash = 'heavy-ip';
  for (let i = 0; i < 102; i++) {
    await run(
      `
        INSERT INTO site_analytics_events_v2
          (event_name, session_hash, ip_hash, created_at)
        VALUES ('page_view', $1, $2, datetime('now'))
      `,
      [`session-${i}`, ipHash]
    );
  }
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's-new', path: '/zeus/' },
    { userAgent: HUMAN_UA, ipHash, recentSessionEvents: [] }
  );
  assert.ok(result.flags.includes('ip-velocity'));
});

test('ip velocity is not flagged under the session limit', async () => {
  const ipHash = 'light-ip';
  for (let i = 0; i < 3; i++) {
    await run(
      `
        INSERT INTO site_analytics_events_v2
          (event_name, session_hash, ip_hash, created_at)
        VALUES ('page_view', $1, $2, datetime('now'))
      `,
      [`light-session-${i}`, ipHash]
    );
  }
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's-new', path: '/zeus/' },
    { userAgent: HUMAN_UA, ipHash, recentSessionEvents: [] }
  );
  assert.ok(!result.flags.includes('ip-velocity'));
});

test('checkIpVelocity returns false for missing ip hash', async () => {
  assert.strictEqual(await checkIpVelocity(''), false);
});

test('checkIpVelocity ignores events outside the window', async () => {
  const ipHash = 'old-ip';
  for (let i = 0; i < 150; i++) {
    await run(
      `
        INSERT INTO site_analytics_events_v2
          (event_name, session_hash, ip_hash, created_at)
        VALUES ('page_view', $1, $2, datetime('now', '-2 hours'))
      `,
      [`old-session-${i}`, ipHash]
    );
  }
  assert.strictEqual(await checkIpVelocity(ipHash), false);
});

test('implausible engagement is flagged for very short visible time', async () => {
  const result = await scoreEventQuality(
    {
      event_name: 'engagement',
      session_hash: 's8',
      path: '/zeus/',
      visible_ms: 100,
      scroll_pct: 50,
    },
    { userAgent: HUMAN_UA, ipHash: 'ip8', recentSessionEvents: [] }
  );
  assert.ok(result.flags.includes('implausible-engagement'));
});

test('implausible engagement is flagged for very long visible time', async () => {
  const result = await scoreEventQuality(
    {
      event_name: 'engagement',
      session_hash: 's9',
      path: '/zeus/',
      visible_ms: 31 * 60 * 1000,
      scroll_pct: 50,
    },
    { userAgent: HUMAN_UA, ipHash: 'ip9', recentSessionEvents: [] }
  );
  assert.ok(result.flags.includes('implausible-engagement'));
});

test('implausible engagement is flagged for scroll percent above 100', async () => {
  const result = await scoreEventQuality(
    {
      event_name: 'engagement',
      session_hash: 's10',
      path: '/zeus/',
      visible_ms: 5000,
      scroll_pct: 150,
    },
    { userAgent: HUMAN_UA, ipHash: 'ip10', recentSessionEvents: [] }
  );
  assert.ok(result.flags.includes('implausible-engagement'));
});

test('isImplausibleEngagement returns false for normal engagement', () => {
  assert.strictEqual(isImplausibleEngagement(5000, 75), false);
});

test('isImplausibleEngagement returns true for non-finite input', () => {
  assert.strictEqual(isImplausibleEngagement(NaN, 50), true);
  assert.strictEqual(isImplausibleEngagement(5000, NaN), true);
});

test('multiple flags reduce the quality score', async () => {
  const events = Array.from({ length: 70 }, () => ({ created_at: new Date().toISOString() }));
  const result = await scoreEventQuality(
    {
      event_name: 'engagement',
      session_hash: 's11',
      path: '/zeus/',
      visible_ms: 100,
      scroll_pct: 50,
    },
    { userAgent: HEADLESS_UA, ipHash: 'ip11', recentSessionEvents: events }
  );
  assert.ok(result.flags.includes('headless'));
  assert.ok(result.flags.includes('session-velocity'));
  assert.ok(result.flags.includes('implausible-engagement'));
  assert.ok(result.qualityScore < 0.3);
});

test('empty user agent is treated as a bot', async () => {
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's12', path: '/zeus/' },
    { userAgent: '', ipHash: 'ip12', recentSessionEvents: [] }
  );
  assert.ok(result.flags.includes('bot-ua'));
  assert.strictEqual(result.qualityScore, 0.0);
});

test('qualityFlags is a comma-separated copy of flags', async () => {
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's13', path: '/zeus/' },
    { userAgent: BOT_UA, ipHash: 'ip13', recentSessionEvents: [] }
  );
  assert.strictEqual(result.qualityFlags, 'bot-ua');
});

test('scoreEventQuality tolerates missing context', async () => {
  const result = await scoreEventQuality({
    event_name: 'page_view',
    session_hash: 's14',
    path: '/zeus/',
  });
  assert.strictEqual(result.qualityScore, 0.0);
  assert.ok(result.flags.includes('bot-ua'));
});

test('close test database', () => {
  closeDb();
  assert.ok(true);
});
