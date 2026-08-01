/**
 * PuniCodex — Analytics end-to-end verification suite
 *
 * Drives the first-party analytics pipeline the way production uses it:
 *
 *   js/analytics-beacon.js  →  POST /api/analytics/collect/
 *     →  platform/api/site-analytics.js
 *     →  site_analytics_events (+ site_analytics_daily rollups)
 *     →  GET /api/analytics/overview/ (admin only)
 *
 * 1. The E2E payload shape matches what the beacon script actually sends.
 * 2. Beacon-shaped payloads ({ p, r, s } + User-Agent header) land in
 *    site_analytics_events with hashed IP/UA — never raw values.
 * 3. Views vs sessions: the same session id collapses into one session,
 *    distinct ids count separately, while every view is counted.
 * 4. Bot user agents are flagged and separated from human metrics.
 * 5. site_analytics_daily rollups match the raw event aggregation.
 * 6. The admin overview endpoint reflects every recorded dimension.
 * 7. The collect endpoint is rate-limited (public bucket: 10 req/min/IP).
 *
 * No network, no Redis: the in-memory rate limiter and SQLite storage paths
 * are exercised against an isolated copy of the database.
 *
 * Run: node test/analytics-e2e.test.js
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert');

// Force the SQLite + in-memory paths before any service module reads env.
delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;
process.env.ADMIN_PASSWORD = 'e2e-admin-password';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const { invoke, adminHeader, jsonBody } = require('./helpers/http.js');
const collectHandler = require('../api/analytics/collect');
const overviewHandler = require('../api/analytics/overview');
const adminLoginHandler = require('../platform/api-handlers/admin/login');
const { all, run, closeDb } = require('../platform/db/operational.js');
const { runMigration } = require('../platform/db/migrate-site-analytics.js');
const { resetLimiters } = require('../platform/api/api-rate-limiter.js');

const ROOT = path.join(__dirname, '..');
const TODAY = new Date().toISOString().slice(0, 10);

const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

// Session ids mirror the beacon: 24-char alphanumeric from crypto randomness.
const SID_A = 'e2eAlphaSession00000aa';
const SID_B = 'e2eBravoSession00000bb';
const SID_C = 'e2eCharlieSession0000cc';
const SID_D = 'e2eBotSession0000000dd';

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// POST a beacon exactly as js/analytics-beacon.js delivers it: a JSON string
// body ({ p, r, s }) with the user agent riding the HTTP header.
function postBeacon(payload, { ua = CHROME_DESKTOP, ip = '203.0.113.10' } = {}) {
  return invoke(collectHandler, 'POST', '/api/analytics/collect/', {
    headers: {
      'content-type': 'application/json',
      'user-agent': ua,
      'x-forwarded-for': ip,
    },
    body: JSON.stringify(payload),
  });
}

function eventCount(where = '', params = []) {
  return all(`SELECT COUNT(*) AS c FROM site_analytics_events ${where}`, params).then(
    (rows) => rows[0].c
  );
}

before(async () => {
  runMigration();
  // Defensive: start from empty analytics tables even if the golden DB
  // ever grows site-analytics rows.
  await run('DELETE FROM site_analytics_events');
  await run('DELETE FROM site_analytics_daily');
  resetLimiters();
});

beforeEach(() => {
  // Per-IP public limit is 10 req/min; reset so tests stay isolated.
  resetLimiters();
});

after(() => {
  closeDb();
});

// ─── 1. Payload shape guard ───

test('beacon script posts exactly the { p, r, s } payload shape used here', () => {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'analytics-beacon.js'), 'utf8');
  // v2: the pageview payload is built once in sendPageView — keys p, r, s.
  assert.ok(src.includes('p: path'), 'beacon sends p = path');
  assert.ok(src.includes('var path = location.pathname'), 'path is the pathname');
  assert.ok(src.includes('r: document.referrer'), 'beacon sends r = referrer');
  assert.ok(src.includes('s: sid'), 'beacon sends s = session id');
  assert.ok(src.includes("sessionStorage.getItem('px_sid')"), 'session id comes from px_sid');
  assert.ok(src.includes('/api/analytics/collect/'), 'beacon posts to the collect endpoint');
  // v2 additions must stay consent-gated and admin-silent.
  assert.ok(src.includes('punicodex.cookie-consent'), 'beacon reads the consent record');
  assert.ok(src.includes("t: 'eng'"), 'beacon carries the engagement event');
});

// ─── 2. Collect → raw events, privacy-preserving ───

test('collect stores beacon events with hashed IP/UA, never raw values', async () => {
  const ip = '203.0.113.10';
  const res = await postBeacon(
    { p: '/sites/zeus/', r: 'https://www.google.com/search?q=zeus', s: SID_A },
    { ip }
  );
  assert.strictEqual(res.status, 204);
  assert.strictEqual(res.headers['cache-control'], 'no-store');

  const rows = await all('SELECT * FROM site_analytics_events ORDER BY id');
  assert.strictEqual(rows.length, 1);
  const row = rows[0];
  assert.strictEqual(row.path, '/sites/zeus/');
  assert.strictEqual(row.temple_id, 'zeus');
  assert.strictEqual(row.referrer, 'https://www.google.com/search?q=zeus');
  assert.strictEqual(row.is_bot, 0);
  assert.strictEqual(row.bot_category, null);
  assert.strictEqual(row.device, 'desktop');

  // Identifiers are stored only as truncated sha256 hashes.
  assert.strictEqual(row.ip_hash, sha256(ip).substring(0, 16));
  assert.strictEqual(row.ua_hash, sha256(CHROME_DESKTOP).substring(0, 16));
  assert.strictEqual(row.session_hash, sha256(`${SID_A}:${TODAY}`).substring(0, 24));
  assert.ok(!Object.values(row).includes(ip), 'raw IP must never be stored');
  assert.ok(!Object.values(row).includes(CHROME_DESKTOP), 'raw UA must never be stored');
  assert.ok(!Object.values(row).includes(SID_A), 'raw session id must never be stored');
});

// ─── 3. Views vs sessions ───

test('same session id collapses to one session while every view counts', async () => {
  // Two page loads from one tab (same px_sid), plus one from another tab.
  for (const event of [
    { payload: { p: '/sites/nike/', r: '', s: SID_B }, ua: CHROME_DESKTOP, ip: '203.0.113.20' },
    {
      payload: { p: '/sites/nike/', r: 'https://google.com/search', s: SID_B },
      ua: SAFARI_IPHONE,
      ip: '203.0.113.20',
    },
    {
      payload: { p: '/sites/nike/', r: 'https://www.google.com/', s: SID_C },
      ua: CHROME_DESKTOP,
      ip: '203.0.113.21',
    },
  ]) {
    const res = await postBeacon(event.payload, { ua: event.ua, ip: event.ip });
    assert.strictEqual(res.status, 204);
  }

  assert.strictEqual(await eventCount("WHERE temple_id = 'nike'"), 3, 'three views recorded');
  const sessionRows = await all(
    "SELECT COUNT(DISTINCT session_hash) AS c FROM site_analytics_events WHERE temple_id = 'nike'"
  );
  assert.strictEqual(sessionRows[0].c, 2, 'SID_B views share one daily session hash');

  const bHash = sha256(`${SID_B}:${TODAY}`).substring(0, 24);
  const bRows = await all(
    'SELECT COUNT(*) AS c FROM site_analytics_events WHERE session_hash = $1',
    [bHash]
  );
  assert.strictEqual(bRows[0].c, 2, 'both repeat views land on the same session hash');
});

// ─── 4. Bot classification and separation ───

test('bot user agents are flagged as bots and excluded from human metrics', async () => {
  const res = await postBeacon(
    { p: '/sites/zeus/', r: 'https://bot-ref.example/crawl', s: SID_D },
    { ua: GOOGLEBOT, ip: '66.249.66.1' }
  );
  assert.strictEqual(res.status, 204);

  const rows = await all('SELECT * FROM site_analytics_events WHERE ua_hash = $1', [
    sha256(GOOGLEBOT).substring(0, 16),
  ]);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].is_bot, 1);
  assert.strictEqual(rows[0].bot_category, 'search-engine');

  // The daily rollup keeps bot views in their own column.
  const daily = await all(
    'SELECT human_views, bot_views FROM site_analytics_daily WHERE day = $1 AND temple_id = $2',
    [TODAY, 'zeus']
  );
  assert.deepStrictEqual(daily, [{ human_views: 1, bot_views: 1 }]);
});

// ─── 5. Daily rollup matches raw events ───

test('site_analytics_daily aggregation matches the raw event rows', async () => {
  const rawByTemple = new Map();
  const rawRows = await all(
    `
      SELECT temple_id,
             SUM(CASE WHEN is_bot = 0 THEN 1 ELSE 0 END) AS human,
             SUM(CASE WHEN is_bot = 1 THEN 1 ELSE 0 END) AS bot
        FROM site_analytics_events
       WHERE date(created_at) = $1
       GROUP BY temple_id
    `,
    [TODAY]
  );
  for (const row of rawRows) {
    rawByTemple.set(row.temple_id, { human: row.human, bot: row.bot });
  }

  const dailyRows = await all(
    'SELECT temple_id, human_views, bot_views FROM site_analytics_daily WHERE day = $1',
    [TODAY]
  );
  assert.strictEqual(dailyRows.length, rawByTemple.size, 'one rollup row per temple per day');
  for (const row of dailyRows) {
    assert.deepStrictEqual(
      { human: row.human_views, bot: row.bot_views },
      rawByTemple.get(row.temple_id),
      `rollup mismatch for temple "${row.temple_id}"`
    );
  }
  // Explicit expectations for the recorded dataset.
  assert.deepStrictEqual(rawByTemple.get('zeus'), { human: 1, bot: 1 });
  assert.deepStrictEqual(rawByTemple.get('nike'), { human: 3, bot: 0 });
});

// ─── 6. Admin overview endpoint ───

test('admin overview endpoint reflects the recorded traffic', async () => {
  // Unauthenticated callers are rejected.
  const denied = await invoke(overviewHandler, 'GET', '/api/analytics/overview/?days=30');
  assert.strictEqual(denied.status, 401);

  // Log in through the real admin login endpoint to obtain a session token.
  const login = await invoke(
    adminLoginHandler,
    'POST',
    '/api/admin/login/',
    jsonBody({ password: 'e2e-admin-password' })
  );
  assert.strictEqual(login.status, 200);
  assert.strictEqual(login.body.success, true);
  const token = login.body.token;
  assert.ok(token, 'login must return an admin session token');

  const res = await invoke(overviewHandler, 'GET', '/api/analytics/overview/?days=30', {
    headers: adminHeader(token),
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  const data = res.body.data;

  // Established semantics (shared by the Redis and SQLite backends): unique
  // sessions and device counts include bot traffic; human views, referrers,
  // and the bot split keep bots separated out.
  assert.deepStrictEqual(data.totals, {
    humanViews: 4,
    botViews: 1,
    uniqueSessions: 4,
    botPct: 20,
  });

  const today = data.byDay.find((row) => row.day === TODAY);
  assert.deepStrictEqual(today, { day: TODAY, human: 4, bot: 1 });

  assert.deepStrictEqual(data.topTemples, [
    { templeId: 'nike', human: 3, bot: 0, uniques: 2 },
    { templeId: 'zeus', human: 1, bot: 1, uniques: 2 },
  ]);

  assert.deepStrictEqual(data.topReferrers, [
    { referrer: 'google.com', count: 3 },
    { referrer: '(direct)', count: 1 },
  ]);
  assert.ok(
    !data.topReferrers.some((r) => r.referrer.includes('bot-ref.example')),
    'bot referrers must not leak into human referrer metrics'
  );

  assert.deepStrictEqual(data.devices, { mobile: 1, tablet: 0, desktop: 4 });
  assert.deepStrictEqual(data.botCategories, [{ category: 'search-engine', count: 1 }]);

  // Per-temple scoping (?temple=) isolates one temple's traffic.
  const scoped = await invoke(
    overviewHandler,
    'GET',
    '/api/analytics/overview/?days=30&temple=nike',
    { headers: adminHeader(token) }
  );
  assert.strictEqual(scoped.status, 200);
  assert.deepStrictEqual(scoped.body.data.totals, {
    humanViews: 3,
    botViews: 0,
    uniqueSessions: 2,
    botPct: 0,
  });
  assert.deepStrictEqual(scoped.body.data.topTemples, [
    { templeId: 'nike', human: 3, bot: 0, uniques: 2 },
  ]);
});

// ─── 7. Rate limiting ───

test('collect endpoint enforces the public rate limit (10 req/min per IP)', async () => {
  resetLimiters();
  const ip = '198.51.100.50';
  const rowsBefore = await eventCount();

  // 'not-a-path' fails path sanitization, so allowed requests still write
  // nothing — the limiter itself is what is under test here.
  for (let i = 0; i < 10; i++) {
    const res = await postBeacon({ p: 'not-a-path', r: '', s: '' }, { ip });
    assert.strictEqual(res.status, 204, `request ${i + 1} of 10 must be allowed`);
    assert.strictEqual(res.headers['x-ratelimit-limit'], '10');
    assert.strictEqual(res.headers['x-ratelimit-remaining'], String(10 - (i + 1)));
  }

  const blocked = await postBeacon({ p: 'not-a-path', r: '', s: '' }, { ip });
  assert.strictEqual(blocked.status, 429, '11th request in the window must be rejected');
  assert.ok(blocked.headers['retry-after'], '429 must carry a Retry-After header');
  assert.match(blocked.body.error, /too many requests/i);

  assert.strictEqual(await eventCount(), rowsBefore, 'rejected-path beacons wrote no rows');
});
