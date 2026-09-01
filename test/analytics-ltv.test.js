/**
 * PuniCodex — LTV analytics tests.
 *
 * Covers revenue aggregation, product-line splits, ARPU/ARPPU, temple scoping,
 * cohort grouping, and projection sanity.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb(__filename);
delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;

const { run, closeDb } = require('../platform/db/operational.js');
const { runMigration: runMigrationV5 } = require('../platform/db/migrate-site-analytics-v5.js');
const {
  computeLtv,
  computeLtvByCohort,
  getLtv,
  getLtvByCohort,
} = require('../platform/api/analytics-ltv.js');

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

before(async () => {
  runMigrationV5();
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');

  const sessions = [
    // Cohort today — zeus.
    { session_hash: 'zeus-pay-1', first_seen_at: iso(0, 9, 0), entry_temple_id: 'zeus' },
    { session_hash: 'zeus-pay-2', first_seen_at: iso(0, 9, 0), entry_temple_id: 'zeus' },
    { session_hash: 'zeus-browse-1', first_seen_at: iso(0, 9, 0), entry_temple_id: 'zeus' },
    // Cohort yesterday — athena.
    { session_hash: 'athena-pay-1', first_seen_at: iso(1, 9, 0), entry_temple_id: 'athena' },
    { session_hash: 'athena-browse-1', first_seen_at: iso(1, 9, 0), entry_temple_id: 'athena' },
    // Cohort two days ago — mixed/no temple.
    { session_hash: 'store-pay-1', first_seen_at: iso(2, 9, 0), entry_temple_id: null },
    { session_hash: 'store-browse-1', first_seen_at: iso(2, 9, 0), entry_temple_id: null },
  ];

  const events = [
    // Zeus sponsor revenue today.
    {
      event_name: 'sponsor_payment_complete',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'zeus-pay-1',
      properties: JSON.stringify({ amount: 100, currency: 'USD' }),
      created_at: iso(0, 10, 0),
    },
    {
      event_name: 'sponsor_payment_complete',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'zeus-pay-2',
      properties: JSON.stringify({ amount: 75 }),
      created_at: iso(0, 11, 0),
    },
    // Zeus patron revenue today.
    {
      event_name: 'patron_checkout_complete',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'zeus-pay-1',
      properties: JSON.stringify({ amount: 25 }),
      created_at: iso(0, 12, 0),
    },
    // Zeus browse (no revenue).
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'zeus-browse-1',
      created_at: iso(0, 13, 0),
    },
    // Athena patron revenue yesterday.
    {
      event_name: 'patron_checkout_complete',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 'athena-pay-1',
      properties: JSON.stringify({ amount: 50 }),
      created_at: iso(1, 10, 0),
    },
    // Athena browse.
    {
      event_name: 'page_view',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 'athena-browse-1',
      created_at: iso(1, 11, 0),
    },
    // Store revenue two days ago.
    {
      event_name: 'store_checkout_complete',
      path: '/store/checkout',
      page_type: 'store',
      temple_id: null,
      session_hash: 'store-pay-1',
      properties: JSON.stringify({ amount: 40 }),
      created_at: iso(2, 10, 0),
    },
    // Store browse.
    {
      event_name: 'page_view',
      path: '/store',
      page_type: 'store',
      temple_id: null,
      session_hash: 'store-browse-1',
      created_at: iso(2, 11, 0),
    },
    // Bot revenue — should be excluded.
    {
      event_name: 'sponsor_payment_complete',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'bot-session',
      properties: JSON.stringify({ amount: 999 }),
      is_bot: 1,
      quality_score: 0.1,
      created_at: iso(0, 14, 0),
    },
    // Missing/zero amount — should be ignored.
    {
      event_name: 'store_checkout_complete',
      path: '/store/checkout',
      page_type: 'store',
      temple_id: null,
      session_hash: 'store-browse-1',
      properties: JSON.stringify({ amount: 0 }),
      created_at: iso(2, 12, 0),
    },
  ];

  for (const s of sessions) {
    await seedSession(s);
  }
  for (const e of events) {
    await seedEvent(e);
  }
});

after(() => {
  closeDb();
});

test('computeLtv aggregates total revenue and transactions', async () => {
  const result = await computeLtv({ days: 3 });

  assert.strictEqual(result.days, 3);
  assert.strictEqual(result.templeId, null);
  assert.strictEqual(result.totalRevenue, 290);
  assert.strictEqual(result.transactions, 5);
});

test('computeLtv splits revenue by product line', async () => {
  const result = await computeLtv({ days: 3 });

  assert.strictEqual(result.byProductLine.sponsor.revenue, 175);
  assert.strictEqual(result.byProductLine.sponsor.transactions, 2);
  assert.strictEqual(result.byProductLine.patron.revenue, 75);
  assert.strictEqual(result.byProductLine.patron.transactions, 2);
  assert.strictEqual(result.byProductLine.store.revenue, 40);
  assert.strictEqual(result.byProductLine.store.transactions, 1);
});

test('computeLtv computes ARPU and ARPPU correctly', async () => {
  const result = await computeLtv({ days: 3 });

  // 7 human sessions across 3 days.
  assert.strictEqual(result.uniqueSessions, 7);
  // 4 unique paying sessions.
  assert.strictEqual(result.uniquePayingSessions, 4);
  assert.strictEqual(result.arpu, round(290 / 7));
  assert.strictEqual(result.arppu, round(290 / 4));
});

test('computeLtv breaks revenue down by temple', async () => {
  const result = await computeLtv({ days: 3 });

  assert.strictEqual(result.byTemple.length, 3);
  const zeus = result.byTemple.find((t) => t.templeId === 'zeus');
  const athena = result.byTemple.find((t) => t.templeId === 'athena');
  const none = result.byTemple.find((t) => t.templeId === null);

  assert.ok(zeus);
  assert.strictEqual(zeus.revenue, 200);
  assert.strictEqual(zeus.transactions, 3);
  assert.ok(athena);
  assert.strictEqual(athena.revenue, 50);
  assert.strictEqual(athena.transactions, 1);
  assert.ok(none);
  assert.strictEqual(none.revenue, 40);
  assert.strictEqual(none.transactions, 1);
});

test('computeLtv scopes to a single temple', async () => {
  const zeus = await computeLtv({ days: 3, templeId: 'zeus' });

  assert.strictEqual(zeus.totalRevenue, 200);
  assert.strictEqual(zeus.transactions, 3);
  assert.strictEqual(zeus.uniqueSessions, 3);
  assert.strictEqual(zeus.uniquePayingSessions, 2);
  assert.strictEqual(zeus.byTemple.length, 1);
  assert.strictEqual(zeus.byTemple[0].templeId, 'zeus');
});

test('computeLtv ignores bot and zero-amount events', async () => {
  const result = await computeLtv({ days: 3 });

  // Bot 999 and zero-amount events must not inflate totals.
  assert.strictEqual(result.totalRevenue, 290);
  assert.strictEqual(result.transactions, 5);
});

test('computeLtvByCohort groups revenue by acquisition date', async () => {
  const cohorts = await computeLtvByCohort({ days: 3 });

  assert.ok(cohorts.length >= 2);
  const today = cohorts.find((c) => c.date === iso(0).slice(0, 10));
  const yesterday = cohorts.find((c) => c.date === iso(1).slice(0, 10));
  const twoDaysAgo = cohorts.find((c) => c.date === iso(2).slice(0, 10));

  assert.ok(today);
  assert.strictEqual(today.revenue, 200);
  assert.strictEqual(today.transactions, 3);
  assert.strictEqual(today.uniqueSessions, 3);
  assert.strictEqual(today.uniquePayingSessions, 2);

  assert.ok(yesterday);
  assert.strictEqual(yesterday.revenue, 50);
  assert.strictEqual(yesterday.transactions, 1);
  assert.strictEqual(yesterday.uniqueSessions, 2);
  assert.strictEqual(yesterday.uniquePayingSessions, 1);

  assert.ok(twoDaysAgo);
  assert.strictEqual(twoDaysAgo.revenue, 40);
  assert.strictEqual(twoDaysAgo.transactions, 1);
  assert.strictEqual(twoDaysAgo.uniqueSessions, 2);
  assert.strictEqual(twoDaysAgo.uniquePayingSessions, 1);
});

test('computeLtvByCohort computes ARPU per cohort', async () => {
  const cohorts = await computeLtvByCohort({ days: 3 });
  const today = cohorts.find((c) => c.date === iso(0).slice(0, 10));

  assert.strictEqual(today.arpu, round(200 / 3));
});

test('computeLtvByCohort scopes to a single temple', async () => {
  const cohorts = await computeLtvByCohort({ days: 3, templeId: 'athena' });

  assert.strictEqual(cohorts.length, 1);
  assert.strictEqual(cohorts[0].templeId, undefined);
  assert.strictEqual(cohorts[0].revenue, 50);
  assert.strictEqual(cohorts[0].uniqueSessions, 2);
});

test('getLtv adds a projected 90-day value', async () => {
  const result = await getLtv({ days: 3 });

  assert.strictEqual(result.totalRevenue, 290);
  assert.strictEqual(result.projected90Day, round((290 / 3) * 90));
});

test('getLtvByCohort adds a projected 90-day value', async () => {
  const result = await getLtvByCohort({ days: 3 });

  assert.strictEqual(result.days, 3);
  assert.strictEqual(result.templeId, null);
  assert.ok(Array.isArray(result.cohorts));
  assert.strictEqual(result.projected90Day, round((290 / 3) * 90));
});

test('getLtvByCohort returns empty cohorts when no revenue exists', async () => {
  const result = await getLtvByCohort({ days: 3, templeId: 'nonexistent' });

  assert.strictEqual(result.cohorts.length, 0);
  assert.strictEqual(result.projected90Day, 0);
});

test('computeLtv returns zeroed values when no revenue exists', async () => {
  const result = await computeLtv({ days: 3, templeId: 'nonexistent' });

  assert.strictEqual(result.totalRevenue, 0);
  assert.strictEqual(result.transactions, 0);
  assert.strictEqual(result.uniquePayingSessions, 0);
  assert.strictEqual(result.uniqueSessions, 0);
  assert.strictEqual(result.arpu, 0);
  assert.strictEqual(result.arppu, 0);
  assert.strictEqual(result.byTemple.length, 0);
  assert.strictEqual(result.byProductLine.sponsor.revenue, 0);
  assert.strictEqual(result.byProductLine.patron.revenue, 0);
  assert.strictEqual(result.byProductLine.store.revenue, 0);
});

function round(value) {
  return Math.round(value * 100) / 100;
}
