/**
 * Admin Analytics Authority Tests
 *
 * Proves the admin analytics dashboards are AUTHORITATIVE — every number a
 * dashboard shows is an exact aggregate over real stored rows, never a
 * sample, estimate, or fabrication:
 *
 *   seed known events through the real write path
 *     → dashboards return the exact expected counts
 *
 * Covered surfaces:
 *   - GET /api/analytics/overview/        (site traffic: beacon rollups)
 *   - GET /api/admin/portal/dashboard/    (portal traffic widget: api_request_log)
 *   - GET /api/admin/observability/       (legacy ops metrics: api_request_log)
 *   - the remaining portal dashboard widgets, cross-checked field-by-field
 *     against direct database aggregates run inside the test
 *
 * Runs fully offline against an isolated copy of the database (SQLite
 * storage path, no Redis).
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-authority-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';
// Force the SQLite + in-memory paths before any service module reads env.
delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock the Stripe SDK before any service loads it (the portal service pulls
// in the booking layer).
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_authority',
          url: 'https://checkout.stripe.com/authority-mock',
          mode: config.mode || 'payment',
        }),
      },
    },
    webhooks: {
      constructEvent: (payload) => JSON.parse(payload),
    },
  }),
};

const { invoke, adminHeader } = require('./helpers/http.js');
const { get, run } = require('../platform/db/operational.js');
const { recordPageView } = require('../platform/api/site-analytics.js');
const { runMigration } = require('../platform/db/migrate-site-analytics.js');

const loginHandler = require('../api/admin/portal/login/index.js');
const dashboardHandler = require('../api/admin/portal/dashboard/index.js');
const overviewHandler = require('../api/analytics/overview/index.js');
const observabilityHandler = require('../api/admin/observability/index.js');

const TODAY = new Date().toISOString().slice(0, 10);
const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

let portalToken;

test('setup: clean slate, seed known analytics events and API request rows', async () => {
  runMigration();
  await run('DELETE FROM site_analytics_events');
  await run('DELETE FROM site_analytics_daily');
  await run('DELETE FROM api_request_log');

  // Page views through the real recording path (same module the collect
  // endpoint uses): 4 human views across 3 sessions on 2 temples, 1 bot view.
  const views = [
    {
      path: '/sites/nike/',
      referrer: 'https://www.google.com/search?q=nike',
      sessionId: 'authSessA',
      ip: '203.0.113.1',
      userAgent: CHROME_DESKTOP,
    },
    {
      path: '/sites/nike/',
      referrer: '',
      sessionId: 'authSessA',
      ip: '203.0.113.1',
      userAgent: CHROME_DESKTOP,
    },
    {
      path: '/sites/nike/',
      referrer: '',
      sessionId: 'authSessB',
      ip: '203.0.113.2',
      userAgent: CHROME_DESKTOP,
    },
    {
      path: '/sites/zeus/',
      referrer: '',
      sessionId: 'authSessC',
      ip: '203.0.113.3',
      userAgent: SAFARI_IPHONE,
    },
    {
      path: '/sites/zeus/',
      referrer: 'https://bot-ref.example/crawl',
      sessionId: 'authSessD',
      ip: '66.249.66.1',
      userAgent: GOOGLEBOT,
    },
  ];
  for (const view of views) {
    const recorded = await recordPageView(view);
    assert.ok(recorded?.recorded, `view not recorded: ${JSON.stringify(view)}`);
  }

  // API request log rows with known methods, statuses, and durations.
  const requests = [
    ['req_a1', 'GET', '/api/v1/names', 200, 12],
    ['req_a2', 'GET', '/api/v1/names/apollo', 200, 30],
    ['req_a3', 'POST', '/api/v1/convert', 201, 55],
    ['req_a4', 'GET', '/api/v1/names/nope', 404, 8],
    ['req_a5', 'GET', '/api/v1/boom', 500, 120],
  ];
  for (const [requestId, method, path, status, duration] of requests) {
    await run(
      `INSERT INTO api_request_log (key_id, request_id, method, path, status_code, duration_ms, ip_hash)
       VALUES (NULL, $1, $2, $3, $4, $5, NULL)`,
      [requestId, method, path, status, duration]
    );
  }

  const login = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
    headers: { 'x-forwarded-for': '10.99.0.1' },
    body: { email: 'admin@punicodex.com', password: process.env.ADMIN_PASSWORD },
  });
  assert.strictEqual(login.status, 200, JSON.stringify(login.body));
  portalToken = login.body.token;
});

test('traffic overview returns the exact seeded counts (not sampled, not estimated)', async () => {
  const denied = await invoke(overviewHandler, 'GET', '/api/analytics/overview/?days=30');
  assert.strictEqual(denied.status, 401, 'overview stays admin-only');

  const res = await invoke(overviewHandler, 'GET', '/api/analytics/overview/?days=30', {
    headers: adminHeader(portalToken),
  });
  assert.strictEqual(res.status, 200);
  const data = res.body.data;

  assert.deepStrictEqual(data.totals, {
    humanViews: 4,
    botViews: 1,
    uniqueSessions: 4,
    botPct: 20,
  });
  assert.deepStrictEqual(
    data.byDay.find((row) => row.day === TODAY),
    { day: TODAY, human: 4, bot: 1 }
  );
  assert.deepStrictEqual(data.topTemples, [
    { templeId: 'nike', human: 3, bot: 0, uniques: 2 },
    { templeId: 'zeus', human: 1, bot: 1, uniques: 2 },
  ]);
  assert.deepStrictEqual(data.topReferrers, [
    { referrer: '(direct)', count: 3 },
    { referrer: 'google.com', count: 1 },
  ]);
  assert.deepStrictEqual(data.devices, { mobile: 1, tablet: 0, desktop: 4 });
  assert.deepStrictEqual(data.botCategories, [{ category: 'search-engine', count: 1 }]);

  // The raw event table agrees with the dashboard, row for row.
  const raw = await get('SELECT COUNT(*) AS c FROM site_analytics_events');
  assert.strictEqual(raw.c, 5, 'five raw events stored');
  const dailySum = await get(
    'SELECT SUM(human_views) AS h, SUM(bot_views) AS b FROM site_analytics_daily'
  );
  assert.strictEqual(dailySum.h, data.totals.humanViews);
  assert.strictEqual(dailySum.b, data.totals.botViews);
});

test('portal dashboard traffic widget matches api_request_log exactly', async () => {
  const res = await invoke(dashboardHandler, 'GET', '/api/admin/portal/dashboard/', {
    headers: adminHeader(portalToken),
  });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  const traffic = res.body.traffic;

  assert.strictEqual(traffic.requests, 5, 'exactly the five seeded requests');
  assert.strictEqual(traffic.errorCount, 2, 'the 404 and the 500');
  assert.strictEqual(traffic.errorRate, 0.4);

  // Direct independent aggregate agrees with the widget.
  const direct = await get(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS errors
     FROM api_request_log`
  );
  assert.strictEqual(traffic.requests, direct.total);
  assert.strictEqual(traffic.errorCount, direct.errors);
});

test('every other portal dashboard widget equals a direct database aggregate', async () => {
  const res = await invoke(dashboardHandler, 'GET', '/api/admin/portal/dashboard/', {
    headers: adminHeader(portalToken),
  });
  assert.strictEqual(res.status, 200);
  const b = res.body;

  const pendingBusiness = await get(
    "SELECT COUNT(*) AS c FROM bookings WHERE status = 'pending_application'"
  );
  assert.strictEqual(b.applications.businessPending, Number(pendingBusiness.c));

  const universityPending = await get(
    "SELECT COUNT(*) AS c FROM scholars_sponsorship_applications WHERE status = 'pending'"
  );
  assert.strictEqual(b.applications.universityPending, Number(universityPending.c));

  const pendingEdits = await get(
    "SELECT COUNT(*) AS c FROM scholars_edits WHERE status = 'pending'"
  );
  assert.strictEqual(b.scholars.pendingEdits, Number(pendingEdits.c));

  const pendingMedia = await get(
    "SELECT COUNT(*) AS c FROM scholars_media WHERE status = 'pending'"
  );
  assert.strictEqual(b.scholars.pendingMedia, Number(pendingMedia.c));

  const activePatrons = await get("SELECT COUNT(*) AS c FROM patrons WHERE status = 'active'");
  assert.strictEqual(b.patrons.active, Number(activePatrons.c));
  const mrr = await get(
    "SELECT COALESCE(SUM(amount_cents), 0) AS mrr FROM patrons WHERE status = 'active'"
  );
  assert.strictEqual(b.patrons.estimatedMrrCents, Number(mrr.mrr));

  const revenue = await get(
    `SELECT COALESCE(SUM(amount_paid_cents), 0) AS c
     FROM bookings WHERE status IN ('live', 'ended', 'approved')`
  );
  const revenueWindow = await get(
    `SELECT COALESCE(SUM(amount_paid_cents), 0) AS c
     FROM bookings
     WHERE status IN ('live', 'ended', 'approved') AND created_at >= datetime('now', '-30 days')`
  );
  assert.strictEqual(b.revenue.last30dCents, Number(revenueWindow.c));
  assert.ok(Number(revenue.c) >= b.revenue.last30dCents, '30d window cannot exceed lifetime');

  const sites = await get("SELECT COUNT(*) AS c FROM indexed_sites WHERE status = 'active'");
  assert.strictEqual(b.indexedSites, Number(sites.c));
});

test('legacy observability endpoint reports the same exact request counts', async () => {
  const res = await invoke(observabilityHandler, 'GET', '/api/admin/observability/?hours=24', {
    headers: adminHeader(portalToken),
  });
  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 300));
  const metrics = res.body.data.metrics;
  assert.strictEqual(metrics.totalRequests, 5);
  assert.strictEqual(metrics.errorCount, 2);
  assert.strictEqual(metrics.errorRate, 0.4);
  assert.strictEqual(metrics.averageDurationMs, 45, '(12+30+55+8+120)/5');

  // Health summary: last-hour request count sees all five rows.
  assert.strictEqual(res.body.data.health.lastHour.requests, 5);
});

async function runTests() {
  console.log('\n▸ Admin Analytics Authority Tests\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
      if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
  console.log(`\nAdmin Analytics Authority: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
