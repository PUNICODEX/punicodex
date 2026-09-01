/**
 * Admin Analytics v2 Handler Tests
 *
 * Covers GET /api/admin/portal/analytics/ modes added by the v2 event pipeline:
 *   - cohort
 *   - ltv
 *   - ltv with cohort=1
 *
 * Seeded directly into site_analytics_events_v2 / site_analytics_sessions so the
 * numbers are deterministic and authoritative.
 */

const assert = require('node:assert');
const { test, before, after } = require('node:test');

process.env.ADMIN_PASSWORD = 'test-admin-analytics-v2-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';
delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;

const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_analytics_v2',
          url: 'https://checkout.stripe.com/analytics-v2-mock',
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
const { runMigration: runMigrationV5 } = require('../platform/db/migrate-site-analytics-v5.js');
const portalAuth = require('../platform/api/admin-portal-auth.js');
const analyticsHandler = require('../platform/api-handlers/admin/portal/analytics/index.js');

function iso(daysAgo, hour = 0, minute = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function seedSession(s) {
  await run(
    `
      INSERT INTO site_analytics_sessions
        (session_hash, first_seen_at, last_seen_at, entry_path, entry_temple_id,
         device, country, referrer_domain, utm_source, utm_medium, utm_campaign,
         event_count, is_bot, quality_score, quality_flags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      ON CONFLICT(session_hash) DO UPDATE SET
        first_seen_at = excluded.first_seen_at,
        last_seen_at = excluded.last_seen_at
    `,
    [
      s.session_hash,
      s.first_seen_at,
      s.last_seen_at || s.first_seen_at,
      s.entry_path || '/',
      s.entry_temple_id || null,
      s.device || 'desktop',
      s.country || null,
      s.referrer_domain || '(direct)',
      s.utm_source || null,
      s.utm_medium || null,
      s.utm_campaign || null,
      s.event_count || 1,
      s.is_bot !== undefined ? s.is_bot : 0,
      s.quality_score !== undefined ? s.quality_score : 1.0,
      s.quality_flags || '',
    ]
  );
}

async function seedEvent(e) {
  await run(
    `
      INSERT INTO site_analytics_events_v2
        (event_name, event_version, path, page_type, temple_id, session_hash,
         ip_hash, ua_hash, ua_class, device, referrer, referrer_domain,
         utm_source, utm_medium, utm_campaign, country, properties, is_bot,
         quality_score, quality_flags, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20, $21)
    `,
    [
      e.event_name,
      e.event_version || 1,
      e.path,
      e.page_type || null,
      e.temple_id || null,
      e.session_hash,
      e.ip_hash || 'iphash',
      e.ua_hash || 'uahash',
      e.ua_class || 'desktop',
      e.device || 'desktop',
      e.referrer || null,
      e.referrer_domain || '(direct)',
      e.utm_source || null,
      e.utm_medium || null,
      e.utm_campaign || null,
      e.country || null,
      e.properties || null,
      e.is_bot !== undefined ? e.is_bot : 0,
      e.quality_score !== undefined ? e.quality_score : 1.0,
      e.quality_flags || '',
      e.created_at,
    ]
  );
}

let adminToken;

before(async () => {
  runMigrationV5();
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');
  await run('DELETE FROM site_analytics_cohorts');

  // Three acquisition cohorts: today, yesterday, two days ago.
  const sessions = [
    { session_hash: 'cohort-today-1', first_seen_at: iso(0, 9, 0), entry_temple_id: 'zeus' },
    { session_hash: 'cohort-today-2', first_seen_at: iso(0, 9, 5), entry_temple_id: 'zeus' },
    { session_hash: 'cohort-yesterday-1', first_seen_at: iso(1, 9, 0), entry_temple_id: 'athena' },
    { session_hash: 'cohort-2d-1', first_seen_at: iso(2, 9, 0), entry_temple_id: 'zeus' },
  ];

  // One returning view today from the 2-day-ago cohort.
  const events = [
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'cohort-today-1',
      created_at: iso(0, 10, 0),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'cohort-today-2',
      created_at: iso(0, 10, 0),
    },
    {
      event_name: 'page_view',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 'cohort-yesterday-1',
      created_at: iso(1, 10, 0),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'cohort-2d-1',
      created_at: iso(2, 9, 30),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'cohort-2d-1',
      created_at: iso(0, 11, 0),
    },
    {
      event_name: 'sponsor_payment_complete',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'cohort-today-1',
      properties: JSON.stringify({ amount: 200, currency: 'USD' }),
      created_at: iso(0, 10, 30),
    },
    {
      event_name: 'patron_checkout_complete',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 'cohort-yesterday-1',
      properties: JSON.stringify({ amount: 50 }),
      created_at: iso(1, 10, 30),
    },
    {
      event_name: 'store_checkout_complete',
      path: '/store/checkout',
      page_type: 'store',
      temple_id: null,
      session_hash: 'cohort-2d-1',
      properties: JSON.stringify({ amount: 40 }),
      created_at: iso(2, 10, 0),
    },
  ];

  for (const s of sessions) {
    await seedSession(s);
  }
  for (const e of events) {
    await seedEvent(e);
  }

  await portalAuth.bootstrap();
  const login = await portalAuth.login('admin@punicodex.com', process.env.ADMIN_PASSWORD);
  assert.ok(login?.success, `portal login failed: ${login?.message}`);
  adminToken = login.token;
});

after(() => {
  closeDb();
  cleanupTestDb(__filename);
});

test('handler cohort mode returns a retention matrix', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=cohort&days=7&granularity=day',
    { headers: adminHeader(adminToken) }
  );

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.mode, 'cohort');
  assert.strictEqual(res.body.granularity, 'day');
  assert.ok(res.body.cohort);
  assert.ok(Array.isArray(res.body.cohort.cohorts));
  assert.strictEqual(res.body.cohort.summary.totalSessions, 4);

  const todayCohort = res.body.cohort.cohorts.find((c) => c.date === iso(0).slice(0, 10));
  assert.ok(todayCohort);
  assert.strictEqual(todayCohort.size, 2);
  assert.strictEqual(todayCohort.retention[0].count, 2);

  const twoDayCohort = res.body.cohort.cohorts.find((c) => c.date === iso(2).slice(0, 10));
  assert.ok(twoDayCohort);
  assert.strictEqual(twoDayCohort.retention[2].count, 1);
});

test('handler cohort mode scopes to a temple', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=cohort&days=7&temple=zeus',
    { headers: adminHeader(adminToken) }
  );

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.cohort.templeId, 'zeus');
  assert.strictEqual(res.body.cohort.summary.totalSessions, 3);
});

test('handler ltv mode returns revenue summary', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=ltv&days=7',
    { headers: adminHeader(adminToken) }
  );

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.mode, 'ltv');
  assert.strictEqual(res.body.byCohort, false);
  assert.ok(res.body.ltv);
  assert.strictEqual(res.body.ltv.totalRevenue, 290);
  assert.strictEqual(res.body.ltv.transactions, 3);
  assert.strictEqual(res.body.ltv.byProductLine.sponsor.revenue, 200);
  assert.strictEqual(res.body.ltv.byProductLine.patron.revenue, 50);
  assert.strictEqual(res.body.ltv.byProductLine.store.revenue, 40);
  assert.ok(typeof res.body.ltv.projected90Day === 'number');
});

test('handler ltv mode supports cohort grouping', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=ltv&days=7&cohort=1',
    { headers: adminHeader(adminToken) }
  );

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.mode, 'ltv');
  assert.strictEqual(res.body.byCohort, true);
  assert.ok(res.body.ltv.cohorts);
  assert.ok(res.body.ltv.cohorts.length >= 2);

  const today = res.body.ltv.cohorts.find((c) => c.date === iso(0).slice(0, 10));
  assert.ok(today);
  assert.strictEqual(today.revenue, 200);
});

test('handler ltv mode scopes revenue to a temple', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=ltv&days=7&temple=athena',
    { headers: adminHeader(adminToken) }
  );

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.ltv.templeId, 'athena');
  assert.strictEqual(res.body.ltv.totalRevenue, 50);
});

test('handler realtime mode returns a live pulse with current and previous windows', async () => {
  // Insert a recent event far enough in the past that it is stable inside the
  // 60-minute window even if the handler call is queued behind other tests.
  const recentAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  await run(
    `
      INSERT INTO site_analytics_events_v2
        (event_name, session_hash, temple_id, page_type, device,
         referrer_domain, quality_score, created_at)
      VALUES ('page_view', 'rt-admin', 'zeus', 'temple', 'desktop', 'google.com', 1.0, $1)
    `,
    [recentAt]
  );

  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=realtime&minutes=60',
    { headers: adminHeader(adminToken) }
  );

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.mode, 'realtime');
  assert.strictEqual(res.body.minutes, 60);
  assert.ok(res.body.pulse);
  assert.ok(res.body.pulse.current.events >= 1);
  assert.ok(res.body.pulse.topTemples.some((t) => t.name === 'zeus'));
  assert.ok(Array.isArray(res.body.pulse.timeline));
});
