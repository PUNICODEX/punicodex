/**
 * PuniCodex — Site Analytics v2 tests.
 *
 * Covers the v2 pipeline end to end: engagement migration + recording
 * (caps, bot drop), path-level rollups, engagement/session-depth reporting,
 * the public trending aggregates, and the collect endpoint's pv/eng routing.
 */

const assert = require('node:assert');
const _fs = require('node:fs');
const _path = require('node:path');
const { prepareTestDb } = require('./helpers/test-db.js');

const testDb = prepareTestDb(__filename);
process.env.PUNICODEX_TEST_DB_PATH = testDb;

let passed = 0;
let failed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

const Database = require('better-sqlite3');
const { migrate } = require('../platform/db/migrate-site-analytics-v2.js');

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

async function main() {
  // Fresh schema on the copied golden DB.
  const raw = new Database(testDb);
  migrate(raw);
  raw.close();

  const analytics = require('../platform/api/site-analytics.js');

  await test('v2 migration creates the engagement and path tables', () => {
    const db = new Database(testDb);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'site_analytics%'")
      .all()
      .map((r) => r.name);
    for (const t of [
      'site_analytics_engagement',
      'site_analytics_engagement_daily',
      'site_analytics_paths_daily',
    ]) {
      assert.ok(tables.includes(t), `missing table ${t}`);
    }
    db.close();
  });

  await test('recordEngagement rejects out-of-range values', async () => {
    assert.strictEqual(await analytics.recordEngagement({ path: '/x', visibleMs: 100 }), null);
    assert.strictEqual(
      await analytics.recordEngagement({ path: '/x', visibleMs: 31 * 60 * 1000 }),
      null
    );
    assert.strictEqual(
      await analytics.recordEngagement({ path: 'not-a-path', visibleMs: 5000 }),
      null
    );
    assert.strictEqual(await analytics.recordEngagement({ path: '/x', visibleMs: 'NaN' }), null);
  });

  await test('recordEngagement drops bot user agents entirely', async () => {
    const before = new Database(testDb)
      .prepare('SELECT COUNT(*) AS n FROM site_analytics_engagement')
      .get().n;
    const result = await analytics.recordEngagement({
      path: '/sites/zeus/',
      visibleMs: 5000,
      scrollPct: 50,
      userAgent: BOT_UA,
    });
    assert.strictEqual(result, null);
    const after = new Database(testDb)
      .prepare('SELECT COUNT(*) AS n FROM site_analytics_engagement')
      .get().n;
    assert.strictEqual(after, before);
  });

  await test('recordEngagement stores the event and upserts the daily rollup', async () => {
    const r1 = await analytics.recordEngagement({
      path: '/sites/nike/',
      sessionId: 'sessA',
      visibleMs: 12000,
      scrollPct: 80,
      userAgent: HUMAN_UA,
    });
    const r2 = await analytics.recordEngagement({
      path: '/sites/nike/gallery/',
      sessionId: 'sessB',
      visibleMs: 6000,
      scrollPct: 40,
      userAgent: HUMAN_UA,
    });
    assert.deepStrictEqual(r1, { recorded: true, templeId: 'nike' });
    assert.deepStrictEqual(r2, { recorded: true, templeId: 'nike' });
    const db = new Database(testDb);
    const events = db
      .prepare("SELECT * FROM site_analytics_engagement WHERE temple_id = 'nike'")
      .all();
    assert.strictEqual(events.length, 2);
    assert.ok(events.every((e) => e.is_bot === 0));
    const rollup = db
      .prepare("SELECT * FROM site_analytics_engagement_daily WHERE temple_id = 'nike'")
      .get();
    assert.strictEqual(rollup.engagements, 2);
    assert.strictEqual(rollup.total_visible_ms, 18000);
    assert.strictEqual(rollup.total_scroll_pct, 120);
    db.close();
  });

  await test('recordPageView maintains the path-level daily rollup', async () => {
    await analytics.recordPageView({
      path: '/sites/athena/',
      referrer: '',
      sessionId: 'sessC',
      ip: '203.0.113.10',
      userAgent: HUMAN_UA,
    });
    await analytics.recordPageView({
      path: '/sites/athena/',
      referrer: '',
      sessionId: 'sessD',
      ip: '203.0.113.11',
      userAgent: HUMAN_UA,
    });
    const db = new Database(testDb);
    const row = db
      .prepare("SELECT human_views FROM site_analytics_paths_daily WHERE path = '/sites/athena/'")
      .get();
    assert.ok(row && row.human_views >= 2, `expected >= 2 path views, got ${row?.human_views}`);
    db.close();
  });

  await test('getEngagementStats aggregates averages and temple leaders', async () => {
    const stats = await analytics.getEngagementStats({ days: 7 });
    assert.ok(stats.engagements >= 2);
    const nike = stats.topEngaged.find((t) => t.templeId === 'nike');
    assert.ok(nike, 'nike missing from topEngaged');
    assert.strictEqual(nike.avgVisibleMs, 9000);
    assert.ok(stats.avgScrollPct > 0);
  });

  await test('getSessionDepth reports pages per session and bounce share', async () => {
    const depth = await analytics.getSessionDepth({ days: 30 });
    assert.ok(depth === null || typeof depth.pagesPerSession === 'number');
    if (depth) {
      assert.ok(depth.pagesPerSession >= 1);
      assert.ok(depth.bouncePct >= 0 && depth.bouncePct <= 100);
    }
  });

  await test('getTrending returns sorted aggregates with the minimum threshold', async () => {
    // athena has 2 path views so far — below the public threshold of 3,
    // so it must be hidden until a third view lands.
    const before = await analytics.getTrending({ days: 7, limit: 10 });
    assert.ok(
      !before.pages.some((p) => p.path === '/sites/athena/'),
      'below-threshold path leaked into trending'
    );
    await analytics.recordPageView({
      path: '/sites/athena/',
      referrer: '',
      sessionId: 'sessF',
      ip: '203.0.113.12',
      userAgent: HUMAN_UA,
    });
    const trending = await analytics.getTrending({ days: 7, limit: 9 });
    assert.ok(Array.isArray(trending.temples) && Array.isArray(trending.pages));
    for (let i = 1; i < trending.temples.length; i++) {
      assert.ok(trending.temples[i - 1].views >= trending.temples[i].views, 'temples not sorted');
    }
    const athena = trending.pages.find((p) => p.path === '/sites/athena/');
    assert.ok(athena && athena.views >= 3, 'athena path missing after crossing the threshold');
    // second call hits the in-process cache and returns the same shape
    const again = await analytics.getTrending({ days: 7, limit: 9 });
    assert.strictEqual(again.periodDays, trending.periodDays);
  });

  await test('collect endpoint routes pv and eng payloads correctly', async () => {
    delete require.cache[require.resolve('../platform/api-handlers/analytics/collect/index.js')];
    const handler = require('../platform/api-handlers/analytics/collect/index.js');
    const invoke = (body) =>
      new Promise((resolve) => {
        const req = {
          method: 'POST',
          body: JSON.stringify(body),
          headers: { 'user-agent': HUMAN_UA, 'x-forwarded-for': '198.51.100.7' },
          query: {},
        };
        const res = {
          statusCode: 200,
          headers: {},
          setHeader(k, v) {
            this.headers[k] = v;
          },
          status(code) {
            this.statusCode = code;
            return this;
          },
          json(payload) {
            this.payload = payload;
            resolve(this);
          },
          end() {
            resolve(this);
          },
        };
        handler(req, res);
      });

    const pv = await invoke({ p: '/sites/hera/', r: '', s: 'sessE' });
    assert.strictEqual(pv.statusCode, 204);
    const eng = await invoke({ t: 'eng', p: '/sites/hera/', s: 'sessE', ms: 9000, sc: 65 });
    assert.strictEqual(eng.statusCode, 204);
    const db = new Database(testDb);
    const engRow = db
      .prepare("SELECT * FROM site_analytics_engagement WHERE temple_id = 'hera'")
      .get();
    assert.ok(engRow, 'engagement event not stored via endpoint');
    assert.strictEqual(engRow.visible_ms, 9000);
    assert.strictEqual(engRow.scroll_pct, 65);
    db.close();
  });

  await test('trending endpoint serves the public aggregate envelope', async () => {
    delete require.cache[require.resolve('../platform/api-handlers/analytics/trending/index.js')];
    const handler = require('../platform/api-handlers/analytics/trending/index.js');
    const res = await new Promise((resolve) => {
      const req = { method: 'GET', query: { days: '7', limit: '5' }, headers: {}, socket: {} };
      const out = {
        statusCode: 200,
        headers: {},
        setHeader(k, v) {
          this.headers[k] = v;
        },
        status(code) {
          this.statusCode = code;
          return this;
        },
        json(payload) {
          this.payload = payload;
          resolve(this);
        },
        end() {
          resolve(this);
        },
      };
      handler(req, out);
    });
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.payload.success, true);
    assert.ok(res.payload.data.periodDays >= 1);
    assert.ok(Array.isArray(res.payload.data.temples));
    // nothing per-visitor may leak into the public envelope
    const serialized = JSON.stringify(res.payload.data);
    for (const forbidden of ['session', 'referrer', 'ip', 'ua', 'hash']) {
      assert.ok(!serialized.includes(forbidden), `public trending leaks ${forbidden}`);
    }
  });

  console.log(`\nSite Analytics v2: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
