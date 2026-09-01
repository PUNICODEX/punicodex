/**
 * PuniCodex — Analytics rollup cron + admin trigger tests.
 *
 * Validates cron secret gating, end-to-end materialization, and LTV rollup
 * persistence for both the scheduled cron and the admin on-demand endpoint.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

prepareTestDb(__filename);
delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;
process.env.CRON_SECRET = 'test-cron-analytics-rollups-secret';
process.env.ADMIN_PASSWORD = 'test-admin-analytics-rollups-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const { invoke, adminHeader } = require('./helpers/http.js');
const { run, all, closeDb } = require('../platform/db/operational.js');
const { runMigration: runMigrationV5 } = require('../platform/db/migrate-site-analytics-v5.js');
const portalAuth = require('../platform/api/admin-portal-auth.js');
const cronHandler = require('../api/cron/analytics-rollups.js');
const rollupHandler = require('../platform/api-handlers/admin/analytics/rollup.js');

function iso(daysAgo, hour = 0, minute = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
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

let adminToken;

before(async () => {
  runMigrationV5();
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');
  await run('DELETE FROM site_analytics_funnels');
  await run('DELETE FROM site_analytics_cohorts');
  await run('DELETE FROM site_analytics_ltv_rollups');

  const sessions = [
    { session_hash: 'rollups-pay-1', first_seen_at: iso(0, 9, 0), entry_temple_id: 'zeus' },
    { session_hash: 'rollups-pay-2', first_seen_at: iso(0, 9, 0), entry_temple_id: 'zeus' },
    { session_hash: 'rollups-browse-1', first_seen_at: iso(0, 9, 0), entry_temple_id: 'athena' },
    { session_hash: 'rollups-old-1', first_seen_at: iso(5, 9, 0), entry_temple_id: 'zeus' },
  ];

  const events = [
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rollups-pay-1',
      created_at: iso(0, 10, 0),
    },
    {
      event_name: 'sponsor_modal_open',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rollups-pay-1',
      created_at: iso(0, 10, 1),
    },
    {
      event_name: 'sponsor_payment_complete',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rollups-pay-1',
      properties: JSON.stringify({ amount: 100 }),
      created_at: iso(0, 10, 5),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rollups-pay-2',
      created_at: iso(0, 11, 0),
    },
    {
      event_name: 'patron_checkout_complete',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rollups-pay-2',
      properties: JSON.stringify({ amount: 50 }),
      created_at: iso(0, 11, 5),
    },
    {
      event_name: 'page_view',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 'rollups-browse-1',
      created_at: iso(0, 12, 0),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rollups-old-1',
      created_at: iso(5, 10, 0),
    },
  ];

  for (const s of sessions) await seedSession(s);
  for (const e of events) await seedEvent(e);

  await portalAuth.bootstrap();
  const login = await portalAuth.login('admin@punicodex.com', process.env.ADMIN_PASSWORD);
  assert.ok(login?.success, `portal login failed: ${login?.message}`);
  adminToken = login.token;
});

after(() => {
  closeDb();
  cleanupTestDb(__filename);
});

test('cron rejects requests without a cron secret', async () => {
  const res = await invoke(cronHandler, 'POST', '/api/cron/analytics-rollups', {
    headers: {},
  });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'Unauthorized');
});

test('cron rejects requests with an incorrect cron secret', async () => {
  const res = await invoke(cronHandler, 'POST', '/api/cron/analytics-rollups', {
    headers: { 'x-cron-secret': 'wrong-secret' },
  });
  assert.strictEqual(res.status, 401);
  assert.strictEqual(res.body.error, 'Unauthorized');
});

test('cron materializes funnels, cohorts, and LTV rollups', async () => {
  const res = await invoke(cronHandler, 'POST', '/api/cron/analytics-rollups', {
    headers: { 'x-cron-secret': process.env.CRON_SECRET },
  });

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.ok, true);
  assert.ok(res.body.materialized);
  assert.ok(res.body.materialized.funnels > 0, 'expected funnel rollup rows');
  assert.ok(res.body.materialized.cohorts > 0, 'expected cohort rollup rows');
  assert.strictEqual(res.body.materialized.ltv, 30);
});

test('LTV rollup row for today is persisted with correct revenue', async () => {
  const rows = await all(
    `
      SELECT day, total_revenue, transactions, unique_paying_sessions,
             unique_sessions, arpu, arppu, by_product_line, by_cohort
        FROM site_analytics_ltv_rollups
       WHERE day = $1
    `,
    [iso(0).slice(0, 10)]
  );

  assert.strictEqual(rows.length, 1);
  const row = rows[0];
  assert.strictEqual(row.total_revenue, 150);
  assert.strictEqual(row.transactions, 2);
  assert.strictEqual(row.unique_paying_sessions, 2);
  assert.strictEqual(row.unique_sessions, 3);
  assert.strictEqual(row.arpu, Math.round((150 / 3) * 100) / 100);
  assert.strictEqual(row.arppu, Math.round((150 / 2) * 100) / 100);

  const productLine = JSON.parse(row.by_product_line);
  assert.strictEqual(productLine.sponsor.revenue, 100);
  assert.strictEqual(productLine.patron.revenue, 50);
  assert.strictEqual(productLine.store.revenue, 0);

  const cohort = JSON.parse(row.by_cohort);
  assert.strictEqual(cohort.date, iso(0).slice(0, 10));
  assert.strictEqual(cohort.revenue, 150);
});

test('admin rollup endpoint rejects unauthenticated requests', async () => {
  const res = await invoke(rollupHandler, 'POST', '/api/admin/analytics/rollup');
  assert.strictEqual(res.status, 401);
});

test('admin rollup endpoint triggers materialization on demand', async () => {
  const res = await invoke(rollupHandler, 'POST', '/api/admin/analytics/rollup', {
    headers: adminHeader(adminToken),
  });

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.ok, true);
  assert.ok(res.body.materialized);
  assert.ok(res.body.materialized.funnels > 0);
  assert.ok(res.body.materialized.cohorts > 0);
  assert.strictEqual(res.body.materialized.ltv, 30);
});

test('admin rollup endpoint respects a custom days window', async () => {
  const res = await invoke(rollupHandler, 'POST', '/api/admin/analytics/rollup?days=7', {
    headers: adminHeader(adminToken),
  });

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.ok, true);
  assert.strictEqual(res.body.materialized.ltv, 7);
});
