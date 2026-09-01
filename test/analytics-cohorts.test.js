/**
 * PuniCodex — Cohort analytics tests.
 *
 * Covers daily/weekly cohort bucketing, temple scoping, exact day-N retention,
 * summary averages, and idempotent materialization.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb(__filename);
delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;

const { run, all, closeDb } = require('../platform/db/operational.js');
const { runMigration: runMigrationV5 } = require('../platform/db/migrate-site-analytics-v5.js');
const {
  computeCohorts,
  materializeCohorts,
  getCohort,
} = require('../platform/api/analytics-cohorts.js');

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

before(async () => {
  runMigrationV5();
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');
  await run('DELETE FROM site_analytics_cohorts');

  const events = [
    // Cohort 2 days ago
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 's1',
      created_at: iso(2, 10, 0),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 's1',
      created_at: iso(1, 10, 0),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 's2',
      created_at: iso(2, 11, 0),
    },
    {
      event_name: 'page_view',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 's3',
      created_at: iso(2, 12, 0),
    },
    {
      event_name: 'page_view',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 's3',
      created_at: iso(0, 12, 0),
    },

    // Cohort 5 days ago
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 's4',
      created_at: iso(5, 10, 0),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 's4',
      created_at: iso(0, 10, 0),
    },
    {
      event_name: 'page_view',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 's5',
      created_at: iso(5, 11, 0),
    },

    // Cohort 8 days ago
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 's6',
      created_at: iso(8, 10, 0),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 's6',
      created_at: iso(1, 10, 0),
    },
  ];

  for (const e of events) {
    await seedEvent(e);
  }

  // Backfill sessions now that events are seeded.
  runMigrationV5();
});

after(() => {
  closeDb();
});

function findCohort(cohorts, date) {
  return cohorts.find((c) => c.date === date);
}

test('computeCohorts returns expected shape and summary for daily cohorts', async () => {
  const result = await computeCohorts({ days: 10, granularity: 'day' });

  assert.strictEqual(result.days, 10);
  assert.strictEqual(result.granularity, 'day');
  assert.strictEqual(result.templeId, null);
  assert.ok(Array.isArray(result.cohorts));
  assert.ok(result.cohorts.length >= 3);
  assert.strictEqual(result.summary.totalSessions, 6);
  assert.strictEqual(result.summary.avgSize, 2);

  const d2 = findCohort(result.cohorts, iso(2).slice(0, 10));
  assert.ok(d2, 'expected cohort for 2 days ago');
  assert.strictEqual(d2.size, 3);
  assert.strictEqual(d2.retention[0].count, 3);
  assert.strictEqual(d2.retention[0].pct, 100);
  assert.strictEqual(d2.retention[1].count, 1);
  assert.strictEqual(d2.retention[1].pct, 33.3);
  assert.strictEqual(d2.retention[2].count, 1);
  assert.strictEqual(d2.retention[2].pct, 33.3);

  const d5 = findCohort(result.cohorts, iso(5).slice(0, 10));
  assert.ok(d5, 'expected cohort for 5 days ago');
  assert.strictEqual(d5.size, 2);
  assert.strictEqual(d5.retention[0].count, 2);
  assert.strictEqual(d5.retention[5].count, 1);
  assert.strictEqual(d5.retention[5].pct, 50);

  const d8 = findCohort(result.cohorts, iso(8).slice(0, 10));
  assert.ok(d8, 'expected cohort for 8 days ago');
  assert.strictEqual(d8.size, 1);
  assert.strictEqual(d8.retention[7].count, 1);
  assert.strictEqual(d8.retention[7].pct, 100);
});

test('summary averages are computed from observable cohort days', async () => {
  const result = await computeCohorts({ days: 10, granularity: 'day' });

  // D1 is observed for the 2-day and 5-day cohorts; 8-day cohort also observes D1.
  assert.strictEqual(result.summary.avgD1, 11.1);
  // D7 is observed only for the 8-day cohort.
  assert.strictEqual(result.summary.avgD7, 100);
  // D30 is not within the 10-day retention window.
  assert.strictEqual(result.summary.avgD30, null);
});

test('temple scoping isolates cohorts to the entry temple', async () => {
  const zeus = await computeCohorts({ days: 10, templeId: 'zeus', granularity: 'day' });
  assert.strictEqual(zeus.templeId, 'zeus');
  assert.strictEqual(zeus.summary.totalSessions, 4);

  const d2 = findCohort(zeus.cohorts, iso(2).slice(0, 10));
  assert.ok(d2);
  assert.strictEqual(d2.size, 2);
  assert.strictEqual(d2.retention[1].count, 1);

  const athena = await computeCohorts({ days: 10, templeId: 'athena', granularity: 'day' });
  assert.strictEqual(athena.templeId, 'athena');
  assert.strictEqual(athena.summary.totalSessions, 2);

  const d5 = findCohort(athena.cohorts, iso(5).slice(0, 10));
  assert.ok(d5);
  assert.strictEqual(d5.size, 1);
});

test('weekly bucketing aggregates daily cohorts into week starts', async () => {
  const daily = await computeCohorts({ days: 10, granularity: 'day' });
  const weekly = await computeCohorts({ days: 10, granularity: 'week' });

  assert.strictEqual(weekly.granularity, 'week');
  assert.ok(weekly.cohorts.length <= daily.cohorts.length);
  assert.strictEqual(weekly.summary.totalSessions, 6);

  const weeklySizeSum = weekly.cohorts.reduce((acc, c) => acc + c.size, 0);
  assert.strictEqual(weeklySizeSum, 6);
});

test('materializeCohorts writes idempotent daily rollups', async () => {
  await materializeCohorts({ days: 10 });

  const firstCount = await all('SELECT COUNT(*) AS n FROM site_analytics_cohorts');
  assert.ok(firstCount[0].n > 0);

  await materializeCohorts({ days: 10 });

  const secondCount = await all('SELECT COUNT(*) AS n FROM site_analytics_cohorts');
  assert.strictEqual(secondCount[0].n, firstCount[0].n);

  const d2 = await all(
    `
      SELECT size, count
        FROM site_analytics_cohorts
       WHERE cohort_date = $1 AND day_index = 1 AND (temple_id IS NULL OR temple_id = '')
    `,
    [iso(2).slice(0, 10)]
  );
  assert.strictEqual(d2.length, 1);
  assert.strictEqual(d2[0].size, 3);
  assert.strictEqual(d2[0].count, 1);
});

test('materializeCohorts writes per-temple rollups', async () => {
  await materializeCohorts({ days: 10 });

  const zeus = await all(
    `
      SELECT cohort_date, day_index, size, count
        FROM site_analytics_cohorts
       WHERE cohort_date = $1 AND temple_id = $2
    `,
    [iso(2).slice(0, 10), 'zeus']
  );
  assert.ok(zeus.length > 0);
  const d0 = zeus.find((r) => r.day_index === 0);
  assert.ok(d0);
  assert.strictEqual(d0.size, 2);
});

test('getCohort falls back to live computation when rollup is incomplete', async () => {
  await run('DELETE FROM site_analytics_cohorts');

  const result = await getCohort({ days: 10, granularity: 'day' });
  assert.strictEqual(result.days, 10);
  assert.strictEqual(result.granularity, 'day');
  assert.strictEqual(result.summary.totalSessions, 6);

  const d2 = findCohort(result.cohorts, iso(2).slice(0, 10));
  assert.ok(d2);
  assert.strictEqual(d2.size, 3);
});

test('getCohort uses materialized rollups when complete', async () => {
  await materializeCohorts({ days: 10 });

  const result = await getCohort({ days: 10, granularity: 'day' });
  assert.strictEqual(result.summary.totalSessions, 6);

  const d8 = findCohort(result.cohorts, iso(8).slice(0, 10));
  assert.ok(d8);
  assert.strictEqual(d8.retention[7].count, 1);
});

test('empty data returns a safe zero/null shape', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');
  await run('DELETE FROM site_analytics_cohorts');

  const result = await computeCohorts({ days: 7, granularity: 'day' });
  assert.strictEqual(result.cohorts.length, 0);
  assert.strictEqual(result.summary.totalSessions, 0);
  assert.strictEqual(result.summary.avgSize, 0);
  assert.strictEqual(result.summary.avgD1, null);
});
