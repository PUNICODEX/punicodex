/**
 * PuniCodex — Analytics depth tests.
 *
 * Covers the v3 country pipeline (edge header → events → daily rollups →
 * reporting), the per-temple drill-down service and public endpoint, the
 * trending payload's viewsToday + countries additions, and the drill-down
 * page contract. Runs against an isolated copy of the database.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
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
const { migrate: migrateV1 } = require('../platform/db/migrate-site-analytics.js');
const { migrate: migrateV2 } = require('../platform/db/migrate-site-analytics-v2.js');
const { migrate } = require('../platform/db/migrate-site-analytics-v3.js');

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function main() {
  // The migration chain, mirroring the service's ensureMigration().
  const raw = new Database(testDb);
  migrateV1(raw);
  migrateV2(raw);
  migrate(raw);
  raw.close();

  const analytics = require('../platform/api/site-analytics.js');

  await test('v3 migration adds the country column and rollup table', () => {
    const db = new Database(testDb);
    const cols = db.prepare('PRAGMA table_info(site_analytics_events)').all().map((c) => c.name);
    assert.ok(cols.includes('country'), 'country column missing');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='site_analytics_countries_daily'")
      .all();
    assert.strictEqual(tables.length, 1);
    db.close();
  });

  await test('recordPageView stores country and rolls it up per day', async () => {
    await analytics.recordPageView({
      path: '/sites/hades/',
      referrer: 'https://google.com/search?q=hades',
      sessionId: 'sessUS1',
      ip: '203.0.113.1',
      userAgent: HUMAN_UA,
      country: 'US',
    });
    await analytics.recordPageView({
      path: '/sites/hades/',
      referrer: '',
      sessionId: 'sessUS2',
      ip: '203.0.113.2',
      userAgent: HUMAN_UA,
      country: 'US',
    });
    await analytics.recordPageView({
      path: '/sites/hades/gallery/',
      referrer: '',
      sessionId: 'sessGR1',
      ip: '203.0.113.3',
      userAgent: HUMAN_UA,
      country: 'GR',
    });
    // junk country input is dropped, not stored
    const junk = await analytics.recordPageView({
      path: '/sites/zeus/',
      referrer: '',
      sessionId: 'sessXX',
      ip: '203.0.113.4',
      userAgent: HUMAN_UA,
      country: 'XX99',
    });
    assert.ok(junk.recorded);
    const db = new Database(testDb);
    const rollups = db
      .prepare('SELECT country, human_views FROM site_analytics_countries_daily ORDER BY country')
      .all();
    assert.deepStrictEqual(
      rollups.map((r) => `${r.country}:${r.human_views}`),
      ['GR:1', 'US:2']
    );
    const junkRow = db
      .prepare("SELECT country FROM site_analytics_events WHERE path = '/sites/zeus/' ORDER BY id DESC LIMIT 1")
      .get();
    assert.strictEqual(junkRow.country, null);
    db.close();
  });

  await test('getCountryStats aggregates and sorts', async () => {
    const stats = await analytics.getCountryStats({ days: 7, limit: 10 });
    assert.strictEqual(stats.countries[0].country, 'US');
    assert.strictEqual(stats.countries[0].views, 2);
    assert.strictEqual(stats.countries[1].country, 'GR');
  });

  await test('getTempleAnalytics returns the full drill-down', async () => {
    await analytics.recordEngagement({
      path: '/sites/hades/',
      sessionId: 'sessUS1',
      visibleMs: 30000,
      scrollPct: 70,
      userAgent: HUMAN_UA,
    });
    await analytics.recordEngagement({
      path: '/sites/hades/',
      sessionId: 'sessGR1',
      visibleMs: 60000,
      scrollPct: 90,
      userAgent: HUMAN_UA,
    });
    // sister-temple journey: hades viewers also entered zeus
    await analytics.recordPageView({
      path: '/sites/zeus/',
      referrer: '',
      sessionId: 'sessUS1',
      ip: '203.0.113.1',
      userAgent: HUMAN_UA,
      country: 'US',
    });

    const data = await analytics.getTempleAnalytics('hades', { days: 7 });
    assert.strictEqual(data.templeId, 'hades');
    assert.ok(data.totals.views >= 3, `expected >= 3 views, got ${data.totals.views}`);
    assert.ok(data.totals.uniqueSessions >= 3, `expected >= 3 uniques, got ${data.totals.uniqueSessions}`);
    assert.strictEqual(data.totals.avgVisibleMs, 45000);
    assert.ok(data.byDay.length === 7);
    const today = data.byDay[data.byDay.length - 1];
    assert.ok(today.views >= 3);
    assert.strictEqual(today.avgVisibleMs, 45000);
    assert.ok(data.countries.some((c) => c.country === 'US' && c.views === 2));
    assert.ok(data.referrers.some((r) => r.referrer === 'google.com'));
    assert.ok(data.subPages.some((p) => p.path === '/sites/hades/gallery/'));
    assert.ok(data.devices.desktop >= 3);
    assert.ok(data.alsoVisited.some((a) => a.templeId === 'zeus' && a.sessions >= 1));
    // invalid temple id → null
    assert.strictEqual(await analytics.getTempleAnalytics('bad id!'), null);
  });

  await test('temple endpoint serves the public envelope and degrades safely', async () => {
    delete require.cache[require.resolve('../platform/api-handlers/analytics/temple/index.js')];
    const handler = require('../platform/api-handlers/analytics/temple/index.js');
    const invoke = (query) =>
      new Promise((resolve) => {
        const req = { method: 'GET', query, headers: {}, socket: {} };
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

    const good = await invoke({ temple: 'hades', days: '7' });
    assert.strictEqual(good.statusCode, 200);
    assert.strictEqual(good.payload.success, true);
    assert.strictEqual(good.payload.data.templeId, 'hades');
    assert.ok(good.payload.data.totals.views >= 3);
    // nothing per-visitor may leak: hashes are forbidden outright, and
    // referrer entries may only carry domains — never full URLs.
    const serialized = JSON.stringify(good.payload.data);
    for (const forbidden of ['session_hash', 'ip_hash', 'ua_hash', 'sessionId']) {
      assert.ok(!serialized.includes(forbidden), `public temple payload leaks ${forbidden}`);
    }
    for (const ref of good.payload.data.referrers || []) {
      assert.ok(!ref.referrer.includes('/'), `referrer is not a bare domain: ${ref.referrer}`);
    }

    const invalid = await invoke({ temple: 'not real!' });
    assert.strictEqual(invalid.statusCode, 200);
    assert.strictEqual(invalid.payload.data.templeId, null);
    assert.strictEqual(invalid.payload.data.totals.views, 0);
  });

  await test('trending payload carries viewsToday deltas and countries', async () => {
    const trending = await analytics.getTrending({ days: 7, limit: 10 });
    const hades = trending.temples.find((t) => t.templeId === 'hades');
    assert.ok(hades, 'hades missing from trending');
    assert.ok(hades.viewsToday >= 3, `expected viewsToday >= 3, got ${hades.viewsToday}`);
    assert.ok(Array.isArray(trending.countries));
    assert.ok(trending.countries.some((c) => c.country === 'US'));
  });

  await test('drill-down page contract: chrome, registry, noindex, engine', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'trending', 'temple', 'index.html'), 'utf8');
    for (const marker of [
      'PUNICODEX-ANALYTICS-START',
      'PUNICODEX-COOKIE-CONSENT-START',
      'punicodex-wordmark-ivory',
      'id="nav-toggle"',
      '<footer',
      'name="robots" content="noindex"',
      'TRENDING_REGISTRY',
      '/js/trending-temple.js?v=',
    ]) {
      assert.ok(html.includes(marker), `drill-down page missing ${marker}`);
    }
    const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'trending-temple.js'), 'utf8');
    assert.ok(js.includes('/api/analytics/temple/'), 'engine does not call the temple API');
    assert.ok(js.includes('URLSearchParams'), 'engine does not read the query string');
    assert.ok(js.includes('escapeHtml'), 'engine has no escaper');
  });

  await test('trending board rows link to the drill-down and render countries', () => {
    const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'trending.js'), 'utf8');
    assert.ok(js.includes('/trending/temple/?id='), 'board rows do not link to the drill-down');
    assert.ok(js.includes('viewsToday'), 'board does not render the today delta');
    assert.ok(js.includes('country-board'), 'board does not render countries');
    const html = fs.readFileSync(path.join(__dirname, '..', 'trending', 'index.html'), 'utf8');
    assert.ok(html.includes('id="country-board"'), 'trending page missing the country board');
  });

  console.log(`\nAnalytics Depth: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
