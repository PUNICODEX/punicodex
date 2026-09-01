/**
 * Admin Analytics Engine Tests
 *
 * Covers the v4 site-analytics additions used by the admin portal:
 *
 *   - getQuarterlyOverview
 *   - getTrendMetrics
 *   - getCrossTempleFlows
 *   - exportAnalyticsCsv
 *   - GET /api/admin/portal/analytics/ handler modes:
 *       rolling (120 days + compare), quarter (with compare),
 *       cross, export CSV
 *
 * Runs against an isolated SQLite test database (no Redis) with seeded
 * page-view, engagement, and quarterly rollup data.
 *
 * Run: node test/admin-analytics.test.js
 */

const assert = require('node:assert');
const { test, before, after } = require('node:test');

process.env.ADMIN_PASSWORD = 'test-admin-analytics-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';
delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;

const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock Stripe before any service module loads it (the portal auth path can
// pull in booking/patron layers that import stripe).
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_analytics',
          url: 'https://checkout.stripe.com/analytics-mock',
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
const { run, closeDb } = require('../platform/db/operational.js');
const analytics = require('../platform/api/site-analytics.js');
const { runMigration: runMigrationV4 } = require('../platform/db/migrate-site-analytics-v4.js');
const portalAuth = require('../platform/api/admin-portal-auth.js');
const analyticsHandler = require('../platform/api-handlers/admin/portal/analytics/index.js');

const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const FIREFOX_DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0';
const SAFARI_MOBILE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

const TODAY = new Date().toISOString().slice(0, 10);

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return dayString(d);
}

function quarterFor(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return `${d.getUTCFullYear()}-Q${Math.ceil((d.getUTCMonth() + 1) / 3)}`;
}

let adminToken;

async function seedAnalyticsData() {
  // Clean slate.
  await run('DELETE FROM site_analytics_events');
  await run('DELETE FROM site_analytics_daily');
  await run('DELETE FROM site_analytics_paths_daily');
  await run('DELETE FROM site_analytics_countries_daily');
  await run('DELETE FROM site_analytics_engagement');
  await run('DELETE FROM site_analytics_engagement_daily');
  await run('DELETE FROM site_analytics_quarterly');

  // ── Current-window events via the real recording path ──
  const todayEvents = [
    { path: '/sites/zeus/', sessionId: 'curS1', ip: '203.0.113.1', ua: CHROME_DESKTOP },
    { path: '/sites/zeus/', sessionId: 'curS2', ip: '203.0.113.2', ua: SAFARI_MOBILE },
    { path: '/sites/zeus/', sessionId: 'curS3', ip: '203.0.113.3', ua: CHROME_DESKTOP },
    { path: '/sites/zeus/', sessionId: 'bot1', ip: '66.249.66.1', ua: GOOGLEBOT },
    { path: '/sites/nike/', sessionId: 'curS4', ip: '203.0.113.4', ua: CHROME_DESKTOP },
    { path: '/sites/nike/', sessionId: 'curS5', ip: '203.0.113.5', ua: FIREFOX_DESKTOP },
    { path: '/sites/apollo/', sessionId: 'curS6', ip: '203.0.113.6', ua: CHROME_DESKTOP },
  ];
  for (const event of todayEvents) {
    const recorded = await analytics.recordPageView({
      path: event.path,
      sessionId: event.sessionId,
      ip: event.ip,
      userAgent: event.ua,
    });
    assert.ok(recorded?.recorded, `today view not recorded: ${event.path}`);
  }

  // Engagement pings for today (human-only).
  await analytics.recordEngagement({
    path: '/sites/zeus/',
    sessionId: 'curS1',
    visibleMs: 30000,
    scrollPct: 75,
    userAgent: CHROME_DESKTOP,
  });
  await analytics.recordEngagement({
    path: '/sites/zeus/',
    sessionId: 'curS2',
    visibleMs: 20000,
    scrollPct: 50,
    userAgent: SAFARI_MOBILE,
  });
  await analytics.recordEngagement({
    path: '/sites/nike/',
    sessionId: 'curS4',
    visibleMs: 15000,
    scrollPct: 60,
    userAgent: CHROME_DESKTOP,
  });

  // ── Historical daily rollups for trend + quarter coverage ──
  const historicalDaily = [
    // Previous trend window (31-60 days ago).
    { day: daysAgo(35), templeId: 'zeus', human: 10, bot: 2 },
    { day: daysAgo(35), templeId: 'nike', human: 5, bot: 0 },
    { day: daysAgo(50), templeId: 'apollo', human: 1, bot: 0 },
    // Current trend window.
    { day: daysAgo(5), templeId: 'zeus', human: 8, bot: 1 },
    { day: daysAgo(5), templeId: 'nike', human: 4, bot: 0 },
    { day: daysAgo(5), templeId: 'apollo', human: 2, bot: 0 },
    // Current quarter, earlier in the quarter.
    { day: daysAgo(45), templeId: 'zeus', human: 7, bot: 1 },
    // Previous quarter.
    { day: `${new Date().getUTCFullYear()}-04-15`, templeId: 'zeus', human: 20, bot: 3 },
    { day: `${new Date().getUTCFullYear()}-04-15`, templeId: 'nike', human: 10, bot: 1 },
  ];
  for (const row of historicalDaily) {
    await run(
      `INSERT INTO site_analytics_daily (day, temple_id, human_views, bot_views)
       VALUES ($1, $2, $3, $4)`,
      [row.day, row.templeId, row.human, row.bot]
    );
  }

  // ── Historical events for cross-temple flows (within last 30 days) ──
  // Distinct sessions visiting multiple temples in sequence.
  const crossEvents = [
    // Session crossA: zeus -> nike.
    { day: daysAgo(3), templeId: 'zeus', session: 'crossA', t: '09:00:00', ua: CHROME_DESKTOP },
    { day: daysAgo(3), templeId: 'nike', session: 'crossA', t: '09:05:00', ua: CHROME_DESKTOP },
    // Session crossB: nike -> apollo.
    { day: daysAgo(4), templeId: 'nike', session: 'crossB', t: '10:00:00', ua: FIREFOX_DESKTOP },
    { day: daysAgo(4), templeId: 'apollo', session: 'crossB', t: '10:10:00', ua: FIREFOX_DESKTOP },
    // Session crossC: zeus -> apollo.
    { day: daysAgo(5), templeId: 'zeus', session: 'crossC', t: '11:00:00', ua: SAFARI_MOBILE },
    { day: daysAgo(5), templeId: 'apollo', session: 'crossC', t: '11:15:00', ua: SAFARI_MOBILE },
    // Single-temple session for entry/exit baseline.
    { day: daysAgo(2), templeId: 'zeus', session: 'crossD', t: '12:00:00', ua: CHROME_DESKTOP },
  ];
  for (const event of crossEvents) {
    const createdAt = `${event.day}T${event.t}Z`;
    const sessionHash = `sess-${event.session}-${event.day}`;
    await run(
      `INSERT INTO site_analytics_events
         (path, temple_id, referrer, session_hash, ip_hash, ua_hash, is_bot, bot_category, device, country, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, NULL, $7, $8, $9)`,
      [
        `/sites/${event.templeId}/`,
        event.templeId,
        '',
        sessionHash,
        'iphash0000000000',
        'uahash0000000000',
        analytics.detectDevice(event.ua),
        'US',
        createdAt,
      ]
    );
  }

  // ── Historical engagement rollups ──
  const historicalEngagement = [
    { day: daysAgo(5), templeId: 'zeus', engagements: 4, totalMs: 40000 },
    { day: daysAgo(35), templeId: 'zeus', engagements: 2, totalMs: 12000 },
  ];
  for (const row of historicalEngagement) {
    await run(
      `INSERT INTO site_analytics_engagement_daily
         (day, temple_id, engagements, total_visible_ms, total_scroll_pct)
       VALUES ($1, $2, $3, $4, 0)`,
      [row.day, row.templeId, row.engagements, row.totalMs]
    );
  }

  // ── Backfill quarterly rollups from the seeded daily + event tables ──
  runMigrationV4();
}

async function getAdminToken() {
  await portalAuth.bootstrap();
  const login = await portalAuth.login('admin@punicodex.com', process.env.ADMIN_PASSWORD);
  assert.ok(login?.success, `portal login failed: ${login?.message}`);
  return login.token;
}

before(async () => {
  await seedAnalyticsData();
  adminToken = await getAdminToken();
});

after(() => {
  closeDb();
  cleanupTestDb(__filename);
});

// ─── Direct site-analytics function tests ───

test('getQuarterlyOverview returns current-quarter totals and rankings', async () => {
  const currentQuarter = quarterFor(TODAY);
  const overview = await analytics.getQuarterlyOverview({ yearQuarter: currentQuarter });

  assert.strictEqual(overview.yearQuarter, currentQuarter);
  assert.ok(overview.totals);
  // Current quarter (Q3) human views = today 6 + day-5 14 + day-45 7 + day-35 15 + day-50 1 = 43.
  assert.strictEqual(overview.totals.humanViews, 43);
  assert.strictEqual(overview.totals.botViews, 5);

  const zeus = overview.topTemples.find((t) => t.templeId === 'zeus');
  const nike = overview.topTemples.find((t) => t.templeId === 'nike');
  const apollo = overview.topTemples.find((t) => t.templeId === 'apollo');
  assert.ok(zeus);
  assert.ok(nike);
  assert.ok(apollo);
  assert.strictEqual(zeus.human, 28); // 3 today + 8 day-5 + 7 day-45 + 10 day-35
  assert.strictEqual(nike.human, 11); // 2 today + 4 day-5 + 5 day-35
  assert.strictEqual(apollo.human, 4); // 1 today + 2 day-5 + 1 day-50

  assert.ok(Array.isArray(overview.topReferrers));
  assert.deepStrictEqual(overview.devices, { mobile: 3, tablet: 0, desktop: 11 });
});

test('getQuarterlyOverview supports quarter-over-quarter comparison', async () => {
  const currentQuarter = quarterFor(TODAY);
  const prevQuarter = quarterFor(`${new Date().getUTCFullYear()}-04-15`);
  const overview = await analytics.getQuarterlyOverview({
    yearQuarter: currentQuarter,
    compareWith: prevQuarter,
  });

  assert.ok(overview.comparison);
  assert.strictEqual(overview.comparison.yearQuarter, prevQuarter);
  // Previous quarter human views = 20 zeus + 10 nike = 30.
  assert.strictEqual(overview.comparison.totals.humanViews, 30);
  assert.strictEqual(typeof overview.comparison.changePct.humanViews, 'number');
});

test('getTrendMetrics compares current and previous windows', async () => {
  const trends = await analytics.getTrendMetrics({ days: 30 });

  assert.strictEqual(trends.days, 30);
  // Current window (last 30 days): today 6 + day-5 14 = 20 human views.
  assert.strictEqual(trends.current.humanViews, 20);
  // Previous window (days 31-60 ago): day-45 7 + day-35 15 + day-50 1 = 23 human views.
  assert.strictEqual(trends.previous.humanViews, 23);
  assert.strictEqual(typeof trends.changePct.humanViews, 'number');

  assert.ok(Array.isArray(trends.topMovers));
  assert.ok(trends.topMovers.length > 0);
  const zeusMover = trends.topMovers.find((m) => m.templeId === 'zeus');
  assert.ok(zeusMover);
  assert.strictEqual(zeusMover.currentHuman, 11); // 3 today + 8 day-5
  assert.strictEqual(zeusMover.previousHuman, 17); // 7 day-45 + 10 day-35
});

test('getCrossTempleFlows derives navigation flows from session sequences', async () => {
  const flows = await analytics.getCrossTempleFlows({ days: 30, limit: 25 });

  assert.strictEqual(flows.days, 30);
  assert.ok(Array.isArray(flows.flows));
  assert.ok(flows.flows.length >= 3);

  const zeusToNike = flows.flows.find((f) => f.from === 'zeus' && f.to === 'nike');
  const nikeToApollo = flows.flows.find((f) => f.from === 'nike' && f.to === 'apollo');
  const zeusToApollo = flows.flows.find((f) => f.from === 'zeus' && f.to === 'apollo');
  assert.ok(zeusToNike, 'expected zeus -> nike flow');
  assert.ok(nikeToApollo, 'expected nike -> apollo flow');
  assert.ok(zeusToApollo, 'expected zeus -> apollo flow');
  assert.strictEqual(zeusToNike.sessions, 1);

  assert.ok(flows.entryTemples.length > 0);
  assert.ok(flows.exitTemples.length > 0);
  assert.ok(flows.coViewClusters.length > 0);
});

test('exportAnalyticsCsv produces valid CSV for each supported mode', async () => {
  const overviewCsv = await analytics.exportAnalyticsCsv({ mode: 'overview', days: 30 });
  assert.ok(overviewCsv.includes('day,human,bot\n'));
  assert.ok(overviewCsv.includes('TOTAL,'));
  assert.ok(overviewCsv.includes(TODAY));

  const dailyCsv = await analytics.exportAnalyticsCsv({ mode: 'daily', days: 30 });
  assert.ok(dailyCsv.includes('day,human,bot\n'));
  assert.ok(!dailyCsv.includes('TOTAL,'));

  const templesCsv = await analytics.exportAnalyticsCsv({ mode: 'temples', days: 30 });
  assert.ok(templesCsv.includes('templeId,humanViews,botViews,uniqueSessions\n'));
  assert.ok(templesCsv.includes('zeus'));

  const referrersCsv = await analytics.exportAnalyticsCsv({ mode: 'referrers', days: 30 });
  assert.ok(referrersCsv.includes('referrer,count\n'));

  const flowsCsv = await analytics.exportAnalyticsCsv({ mode: 'flows', days: 30 });
  assert.ok(flowsCsv.includes('from,to,sessions\n'));
  assert.ok(flowsCsv.includes('zeus'));

  const quarterlyCsv = await analytics.exportAnalyticsCsv({ mode: 'quarterly' });
  assert.ok(
    quarterlyCsv.includes(
      'yearQuarter,humanViews,botViews,uniqueSessions,engagements,avgVisibleMs,botPct\n'
    )
  );
  assert.ok(quarterlyCsv.includes(quarterFor(TODAY)));
});

// ─── Admin portal analytics handler tests ───

test('handler rejects unauthenticated requests', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=rolling&days=30'
  );
  assert.strictEqual(res.status, 401);
});

test('handler rejects non-GET methods and allows OPTIONS', async () => {
  const postRes = await invoke(
    analyticsHandler,
    'POST',
    '/api/admin/portal/analytics/?mode=rolling',
    {
      headers: adminHeader(adminToken),
    }
  );
  assert.strictEqual(postRes.status, 405);

  const optionsRes = await invoke(analyticsHandler, 'OPTIONS', '/api/admin/portal/analytics/');
  assert.strictEqual(optionsRes.status, 200);
  assert.strictEqual(optionsRes.body, null);
});

test('handler rolling mode returns 120-day overview with trends when compare=1', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=rolling&days=120&compare=1',
    { headers: adminHeader(adminToken) }
  );

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.mode, 'rolling');
  assert.strictEqual(res.body.days, 120);
  assert.ok(res.body.overview);
  assert.ok(res.body.engagement);
  assert.ok(res.body.trends);
  assert.strictEqual(res.body.overview.totals.humanViews, 43); // 6 today + 14 day-5 + 7 day-45 + 15 day-35 + 1 day-50
});

test('handler quarter mode returns comparison when compare=1', async () => {
  const currentQuarter = quarterFor(TODAY);
  const res = await invoke(
    analyticsHandler,
    'GET',
    `/api/admin/portal/analytics/?mode=quarter&quarter=${currentQuarter}&compare=1`,
    { headers: adminHeader(adminToken) }
  );

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.mode, 'quarter');
  assert.strictEqual(res.body.quarter, currentQuarter);
  assert.ok(res.body.overview);
  assert.ok(res.body.overview.comparison, 'compare=1 must include previous quarter');
});

test('handler cross mode returns cross-temple navigation flows', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=cross&days=30',
    { headers: adminHeader(adminToken) }
  );

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.mode, 'cross');
  assert.strictEqual(res.body.days, 30);
  assert.ok(Array.isArray(res.body.crossTemple.flows));
  assert.ok(res.body.crossTemple.flows.some((f) => f.from === 'zeus' && f.to === 'nike'));
});

test('handler export mode returns a CSV attachment', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=export&days=30&type=temples',
    { headers: adminHeader(adminToken) }
  );

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers['content-type'], 'text/csv; charset=utf-8');
  assert.ok(res.headers['content-disposition'].includes('attachment; filename="'));
  assert.ok(typeof res.body === 'string');
  assert.ok(res.body.includes('templeId,humanViews,botViews,uniqueSessions\n'));
  assert.ok(res.body.includes('zeus'));
});
