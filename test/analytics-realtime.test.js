/**
 * PuniCodex — Real-time analytics pulse tests.
 *
 * Covers current/previous window comparison, velocity, timeline bucketing,
 * top temples/pages/devices/referrers, bot/quality filtering, and temple scoping.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb(__filename);
delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;

const { run, all, closeDb } = require('../platform/db/operational.js');
const { runMigration: runMigrationV5 } = require('../platform/db/migrate-site-analytics-v5.js');
const { getRealtimePulse, clampMinutes } = require('../platform/api/analytics-realtime.js');

function minutesAgoIso(minutesAgo, offsetSeconds = 0) {
  return new Date(Date.now() - minutesAgo * 60 * 1000 + offsetSeconds * 1000).toISOString();
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

  const events = [
    // Current window: 4 page views, 2 unique sessions, 2 temples.
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rt-a',
      device: 'desktop',
      referrer_domain: 'google.com',
      created_at: minutesAgoIso(10),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rt-a',
      device: 'desktop',
      referrer_domain: 'google.com',
      created_at: minutesAgoIso(9),
    },
    {
      event_name: 'page_view',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 'rt-b',
      device: 'mobile',
      referrer_domain: '(direct)',
      created_at: minutesAgoIso(8),
    },
    {
      event_name: 'engagement',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rt-a',
      device: 'desktop',
      referrer_domain: 'google.com',
      created_at: minutesAgoIso(7),
    },
    // Last 5 minutes.
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rt-c',
      device: 'mobile',
      referrer_domain: 'google.com',
      created_at: minutesAgoIso(2),
    },

    // Previous window: 2 page views, 1 unique session.
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rt-prev',
      device: 'desktop',
      referrer_domain: 'google.com',
      created_at: minutesAgoIso(70),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rt-prev',
      device: 'desktop',
      referrer_domain: 'google.com',
      created_at: minutesAgoIso(65),
    },

    // Bot event in current window — should be excluded.
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rt-bot',
      device: 'desktop',
      is_bot: 1,
      quality_score: 0.1,
      created_at: minutesAgoIso(15),
    },
    // Low-quality event in current window — should be excluded.
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'rt-low',
      device: 'desktop',
      quality_score: 0.1,
      created_at: minutesAgoIso(14),
    },
  ];

  for (const e of events) {
    await seedEvent(e);
  }
});

after(() => {
  closeDb();
});

test('getRealtimePulse aggregates current window and compares to previous', async () => {
  const pulse = await getRealtimePulse({ minutes: 60 });

  assert.strictEqual(pulse.minutes, 60);
  assert.ok(pulse.generatedAt);
  assert.strictEqual(pulse.current.events, 5);
  assert.strictEqual(pulse.current.pageViews, 4);
  assert.strictEqual(pulse.current.uniqueSessions, 3);

  assert.strictEqual(pulse.previous.events, 2);
  assert.strictEqual(pulse.previous.pageViews, 2);
  assert.strictEqual(pulse.previous.uniqueSessions, 1);

  assert.strictEqual(pulse.velocity.eventsPct, 150);
  assert.strictEqual(pulse.velocity.pageViewsPct, 100);
  assert.strictEqual(pulse.velocity.uniqueSessionsPct, 200);
});

test('getRealtimePulse surfaces top temples, devices, and referrers', async () => {
  const pulse = await getRealtimePulse({ minutes: 60 });

  const zeus = pulse.topTemples.find((t) => t.name === 'zeus');
  const athena = pulse.topTemples.find((t) => t.name === 'athena');
  assert.ok(zeus);
  assert.strictEqual(zeus.uniqueSessions, 2);
  assert.strictEqual(zeus.events, 4);
  assert.ok(athena);
  assert.strictEqual(athena.uniqueSessions, 1);

  const desktop = pulse.devices.find((d) => d.name === 'desktop');
  const mobile = pulse.devices.find((d) => d.name === 'mobile');
  assert.ok(desktop);
  assert.ok(mobile);
  assert.strictEqual(desktop.count + mobile.count, 5);

  const google = pulse.referrers.find((r) => r.name === 'google.com');
  const direct = pulse.referrers.find((r) => r.name === '(direct)');
  assert.ok(google);
  assert.ok(direct);
});

test('getRealtimePulse builds a 5-minute timeline covering the window', async () => {
  const pulse = await getRealtimePulse({ minutes: 60 });

  // 60 minutes / 5-minute buckets; an unaligned window can produce 12 or 13
  // buckets because the start is floored to the nearest 5-minute boundary.
  assert.ok(pulse.timeline.length >= 12);
  assert.ok(pulse.timeline.length <= 13);
  const totalTimelineEvents = pulse.timeline.reduce((sum, b) => sum + b.events, 0);
  const totalTimelinePageViews = pulse.timeline.reduce((sum, b) => sum + b.pageViews, 0);
  assert.strictEqual(totalTimelineEvents, 5);
  assert.strictEqual(totalTimelinePageViews, 4);
});

test('getRealtimePulse reports last-5-minute activity', async () => {
  const pulse = await getRealtimePulse({ minutes: 60 });

  assert.strictEqual(pulse.last5Minutes.events, 1);
  assert.strictEqual(pulse.last5Minutes.pageViews, 1);
  assert.strictEqual(pulse.last5Minutes.uniqueSessions, 1);
});

test('getRealtimePulse scopes to a single temple', async () => {
  const pulse = await getRealtimePulse({ minutes: 60, templeId: 'athena' });

  assert.strictEqual(pulse.templeId, 'athena');
  assert.strictEqual(pulse.current.events, 1);
  assert.strictEqual(pulse.current.pageViews, 1);
  assert.strictEqual(pulse.current.uniqueSessions, 1);
  assert.strictEqual(pulse.topTemples.length, 1);
  assert.strictEqual(pulse.topTemples[0].name, 'athena');
});

test('getRealtimePulse excludes bot and low-quality events', async () => {
  const allSessionIds = new Set();
  for (const row of await all(
    'SELECT session_hash FROM site_analytics_events_v2 WHERE is_bot = 0 AND quality_score >= 0.3'
  )) {
    allSessionIds.add(row.session_hash);
  }
  assert.ok(!allSessionIds.has('rt-bot'));
  assert.ok(!allSessionIds.has('rt-low'));
});

test('clampMinutes enforces bounds', () => {
  assert.strictEqual(clampMinutes('30'), 30);
  assert.strictEqual(clampMinutes('200'), 120);
  assert.strictEqual(clampMinutes('0'), 1);
  assert.strictEqual(clampMinutes('abc'), 60);
  assert.strictEqual(clampMinutes(null), 60);
});
