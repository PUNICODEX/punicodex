/**
 * PuniCodex — Analytics retention/pruning tests.
 *
 * Validates retention configuration read/write and chunked pruning of old rows
 * from the event stream, sessions, and rollup tables while preserving recent
 * data.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

prepareTestDb(__filename);
delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;
process.env.ADMIN_PASSWORD = 'test-admin-analytics-retention-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const { invoke, adminHeader, jsonBody } = require('./helpers/http.js');
const { run, all, get, closeDb } = require('../platform/db/operational.js');
const { runMigration: runMigrationV5 } = require('../platform/db/migrate-site-analytics-v5.js');
const portalAuth = require('../platform/api/admin-portal-auth.js');
const retentionHandler = require('../platform/api-handlers/admin/analytics/retention.js');

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
  await run('DELETE FROM analytics_retention_config');

  // Old data — should be pruned with a 1-day retention window.
  await seedSession({
    session_hash: 'old-session',
    first_seen_at: iso(5, 10, 0),
    entry_temple_id: 'zeus',
  });
  await seedEvent({
    event_name: 'page_view',
    path: '/sites/zeus/',
    page_type: 'temple',
    temple_id: 'zeus',
    session_hash: 'old-session',
    created_at: iso(5, 10, 0),
  });
  await run(
    `
      INSERT INTO site_analytics_funnels (funnel_id, step_index, step_name, day, temple_id, count)
      VALUES ('test_funnel', 0, 'Step', $1, 'zeus', 1)
    `,
    [iso(5).slice(0, 10)]
  );
  await run(
    `
      INSERT INTO site_analytics_cohorts (cohort_date, day_index, temple_id, size, count)
      VALUES ($1, 0, 'zeus', 1, 1)
    `,
    [iso(5).slice(0, 10)]
  );
  await run(
    `
      INSERT INTO site_analytics_ltv_rollups
        (day, total_revenue, transactions, unique_paying_sessions, unique_sessions, arpu, arppu)
      VALUES ($1, 10, 1, 1, 1, 10, 10)
    `,
    [iso(5).slice(0, 10)]
  );

  // Recent data — should survive a 1-day retention window.
  await seedSession({
    session_hash: 'recent-session',
    first_seen_at: iso(0, 10, 0),
    entry_temple_id: 'athena',
  });
  await seedEvent({
    event_name: 'page_view',
    path: '/sites/athena/',
    page_type: 'temple',
    temple_id: 'athena',
    session_hash: 'recent-session',
    created_at: iso(0, 10, 0),
  });
  await run(
    `
      INSERT INTO site_analytics_funnels (funnel_id, step_index, step_name, day, temple_id, count)
      VALUES ('test_funnel', 0, 'Step', $1, 'athena', 1)
    `,
    [iso(0).slice(0, 10)]
  );
  await run(
    `
      INSERT INTO site_analytics_cohorts (cohort_date, day_index, temple_id, size, count)
      VALUES ($1, 0, 'athena', 1, 1)
    `,
    [iso(0).slice(0, 10)]
  );
  await run(
    `
      INSERT INTO site_analytics_ltv_rollups
        (day, total_revenue, transactions, unique_paying_sessions, unique_sessions, arpu, arppu)
      VALUES ($1, 20, 1, 1, 1, 20, 20)
    `,
    [iso(0).slice(0, 10)]
  );

  await portalAuth.bootstrap();
  const login = await portalAuth.login('admin@punicodex.com', process.env.ADMIN_PASSWORD);
  assert.ok(login?.success, `portal login failed: ${login?.message}`);
  adminToken = login.token;
});

after(() => {
  closeDb();
  cleanupTestDb(__filename);
});

test('retention endpoint rejects unauthenticated requests', async () => {
  const res = await invoke(retentionHandler, 'GET', '/api/admin/analytics/retention');
  assert.strictEqual(res.status, 401);
});

test('GET retention returns default configuration', async () => {
  const res = await invoke(retentionHandler, 'GET', '/api/admin/analytics/retention', {
    headers: adminHeader(adminToken),
  });

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.config.events_days, 120);
  assert.strictEqual(res.body.config.sessions_days, 365);
  assert.strictEqual(res.body.config.rollups_days, 90);
});

test('POST retention prunes only old rows and preserves recent rows', async () => {
  const res = await invoke(retentionHandler, 'POST', '/api/admin/analytics/retention', {
    ...jsonBody({ events_days: 1, sessions_days: 1, rollups_days: 1 }),
    headers: adminHeader(adminToken),
  });

  assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  assert.strictEqual(res.body.config.events_days, 1);
  assert.strictEqual(res.body.config.sessions_days, 1);
  assert.strictEqual(res.body.config.rollups_days, 1);
  assert.ok(res.body.removed);
  assert.strictEqual(res.body.removed.events, 1);
  assert.strictEqual(res.body.removed.sessions, 1);
  assert.strictEqual(res.body.removed.funnels, 1);
  assert.strictEqual(res.body.removed.cohorts, 1);
  assert.strictEqual(res.body.removed.ltvRollups, 1);

  const events = await all(`SELECT session_hash FROM site_analytics_events_v2 ORDER BY created_at`);
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].session_hash, 'recent-session');

  const sessions = await all(
    `SELECT session_hash FROM site_analytics_sessions ORDER BY first_seen_at`
  );
  assert.strictEqual(sessions.length, 1);
  assert.strictEqual(sessions[0].session_hash, 'recent-session');

  const funnels = await all(`SELECT day, temple_id FROM site_analytics_funnels ORDER BY day`);
  assert.strictEqual(funnels.length, 1);
  assert.strictEqual(funnels[0].temple_id, 'athena');

  const cohorts = await all(
    `SELECT cohort_date, temple_id FROM site_analytics_cohorts ORDER BY cohort_date`
  );
  assert.strictEqual(cohorts.length, 1);
  assert.strictEqual(cohorts[0].temple_id, 'athena');

  const ltv = await all(`SELECT day, total_revenue FROM site_analytics_ltv_rollups ORDER BY day`);
  assert.strictEqual(ltv.length, 1);
  assert.strictEqual(ltv[0].total_revenue, 20);
});

test('GET retention returns updated configuration after POST', async () => {
  const res = await invoke(retentionHandler, 'GET', '/api/admin/analytics/retention', {
    headers: adminHeader(adminToken),
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.config.events_days, 1);
  assert.strictEqual(res.body.config.sessions_days, 1);
  assert.strictEqual(res.body.config.rollups_days, 1);

  const stored = await get('SELECT * FROM analytics_retention_config ORDER BY id LIMIT 1');
  assert.ok(stored);
  assert.strictEqual(stored.events_days, 1);
  assert.strictEqual(stored.sessions_days, 1);
  assert.strictEqual(stored.rollups_days, 1);
});

test('POST retention clamps out-of-range days to safe bounds', async () => {
  const res = await invoke(retentionHandler, 'POST', '/api/admin/analytics/retention', {
    ...jsonBody({ events_days: -10, sessions_days: 10000, rollups_days: 0 }),
    headers: adminHeader(adminToken),
  });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.config.events_days, 1);
  assert.strictEqual(res.body.config.sessions_days, 3650);
  assert.strictEqual(res.body.config.rollups_days, 1);
});
