/**
 * PuniCodex — Analytics edge-case and boundary tests (Phase 8).
 *
 * Exercises the corners of the v2 analytics pipeline: event normalization,
 * quality scoring, funnel ordering, cohort bucketing, LTV parsing, and
 * real-time aggregation boundaries.
 */

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb(__filename);
delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;

const { run, closeDb } = require('../platform/db/operational.js');
const { runMigration: runMigrationV5 } = require('../platform/db/migrate-site-analytics-v5.js');
const {
  EVENT_REGISTRY,
  normalizeEvent,
  getPageType,
  extractTempleId,
  sanitizePath,
} = require('../platform/api/analytics-events.js');
const {
  scoreEventQuality,
  checkSessionVelocity,
  isImplausibleEngagement,
} = require('../platform/api/analytics-quality.js');
const { computeFunnel } = require('../platform/api/analytics-funnels.js');
const { computeCohorts, getCohort } = require('../platform/api/analytics-cohorts.js');
const { computeLtv, getLtv } = require('../platform/api/analytics-ltv.js');
const { getRealtimePulse, clampMinutes } = require('../platform/api/analytics-realtime.js');

const HUMAN_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

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

before(() => {
  runMigrationV5();
});

after(() => {
  closeDb();
});

// ---------------------------------------------------------------------------
// normalizeEvent boundary conditions
// ---------------------------------------------------------------------------

test('normalizeEvent rejects non-object payloads', () => {
  assert.strictEqual(normalizeEvent(null).error, 'event must be an object');
  assert.strictEqual(normalizeEvent(undefined).error, 'event must be an object');
  assert.strictEqual(normalizeEvent([]).error, 'event must be an object');
  assert.strictEqual(normalizeEvent('page_view').error, 'event must be an object');
  assert.strictEqual(normalizeEvent(123).error, 'event must be an object');
});

test('normalizeEvent rejects empty or missing event_name', () => {
  assert.strictEqual(normalizeEvent({}).error, 'event_name is required');
  assert.strictEqual(normalizeEvent({ event_name: '' }).error, 'event_name is required');
  assert.strictEqual(normalizeEvent({ event_name: '   ' }).error, 'unknown event_name:    ');
});

test('normalizeEvent derives correct page type and temple despite query and hash', () => {
  const ev = normalizeEvent({
    event_name: 'page_view',
    path: '/sites/zeus/?utm_source=email#section-2',
    session_hash: 's1',
  });
  // Required path is stored as-is; derivation uses sanitized path.
  assert.strictEqual(ev.path, '/sites/zeus/?utm_source=email#section-2');
  assert.strictEqual(ev.page_type, 'temple');
  assert.strictEqual(ev.temple_id, 'zeus');
  assert.strictEqual(sanitizePath(ev.path), '/sites/zeus/');
});

test('sanitizePath clamps oversized paths and rejects invalid shapes', () => {
  const longPath = `/${'a'.repeat(300)}`;
  assert.strictEqual(sanitizePath(longPath).length, 200);
  assert.strictEqual(sanitizePath('no-leading-slash'), null);
  assert.strictEqual(sanitizePath(''), null);
  assert.strictEqual(sanitizePath(null), null);
  assert.strictEqual(sanitizePath('/trim  '), '/trim');
});

test('getPageType derives canonical page types', () => {
  assert.strictEqual(getPageType('/sites/zeus/blog/'), 'blog');
  assert.strictEqual(getPageType('/sites/zeus/patterns/'), 'patterns');
  assert.strictEqual(getPageType('/sites/zeus/lore/'), 'lore');
  assert.strictEqual(getPageType('/sites/zeus/scholars/'), 'scholars');
  assert.strictEqual(getPageType('/store/checkout'), 'store');
  assert.strictEqual(getPageType('/search?q=apollo'), 'search');
  assert.strictEqual(getPageType('/admin/users'), 'admin');
  assert.strictEqual(getPageType('/account/bookings'), 'account');
});

test('getPageType falls back to temple or static for unknown forms', () => {
  assert.strictEqual(getPageType('/zeus/'), 'temple');
  assert.strictEqual(getPageType('/sites/zeus/unknown-tab/'), 'temple');
  assert.strictEqual(getPageType('/not-a-known-temple/'), 'static');
  assert.strictEqual(getPageType('/'), 'static');
  assert.strictEqual(getPageType(''), 'static');
  assert.strictEqual(getPageType(null), 'static');
});

test('extractTempleId handles sites, canonical, and invalid paths', () => {
  assert.strictEqual(extractTempleId('/sites/athena/'), 'athena');
  assert.strictEqual(extractTempleId('/sites/athena/blog/'), 'athena');
  assert.strictEqual(extractTempleId('/zeus/'), 'zeus');
  assert.strictEqual(extractTempleId('/not-a-known-temple/'), '');
  assert.strictEqual(extractTempleId('../etc/passwd'), '');
  assert.strictEqual(extractTempleId('/foo\0bar'), '');
  assert.strictEqual(extractTempleId(''), '');
});

test('normalizeEvent stores unknown extra properties in properties bag', () => {
  const ev = normalizeEvent({
    event_name: 'page_view',
    path: '/sites/zeus/',
    session_hash: 's1',
    custom_field: 'keep-me',
    nested: { a: 1 },
  });
  assert.strictEqual(ev.properties.custom_field, 'keep-me');
  assert.deepStrictEqual(ev.properties.nested, { a: 1 });
  assert.strictEqual(ev.custom_field, undefined);
});

test('normalizeEvent reports missing required props for every event class', () => {
  for (const [name, cfg] of Object.entries(EVENT_REGISTRY)) {
    const base = { event_name: name };
    for (const prop of cfg.requiredProps) {
      base[prop] = prop === 'amount' || prop === 'visible_ms' || prop === 'scroll_pct' ? 1 : 'x';
      if (prop === 'quantity') base[prop] = 1;
      if (prop === 'result_count') base[prop] = 1;
      if (prop === 'position') base[prop] = 1;
    }
    for (const prop of cfg.requiredProps) {
      const payload = { ...base };
      delete payload[prop];
      const result = normalizeEvent(payload);
      assert.ok(result.error, `${name} should error without ${prop}`);
      assert.ok(
        result.error.includes(prop) || result.error.includes('validation failed'),
        `${name}: unexpected error for missing ${prop}: ${result.error}`
      );
    }
  }
});

test('normalizeEvent coerces and clamps numeric engagement fields', () => {
  const low = normalizeEvent({
    event_name: 'engagement',
    path: '/sites/zeus/',
    session_hash: 's1',
    visible_ms: '-1000',
    scroll_pct: '-5',
  });
  assert.strictEqual(low.visible_ms, 0);
  assert.strictEqual(low.scroll_pct, 0);

  const high = normalizeEvent({
    event_name: 'engagement',
    path: '/sites/zeus/',
    session_hash: 's1',
    visible_ms: 99999999,
    scroll_pct: 999,
  });
  assert.strictEqual(high.visible_ms, 30 * 60 * 1000);
  assert.strictEqual(high.scroll_pct, 100);
});

test('normalizeEvent preserves explicit valid page_type and ignores invalid ones', () => {
  const explicit = normalizeEvent({
    event_name: 'page_view',
    path: '/sites/zeus/',
    session_hash: 's1',
    page_type: 'blog',
  });
  assert.strictEqual(explicit.page_type, 'blog');

  const invalid = normalizeEvent({
    event_name: 'page_view',
    path: '/sites/zeus/',
    session_hash: 's1',
    page_type: 'not-a-type',
  });
  assert.strictEqual(invalid.page_type, 'temple');
});

// ---------------------------------------------------------------------------
// analytics-quality boundary conditions
// ---------------------------------------------------------------------------

test('scoreEventQuality clamps to [0.0, 1.0]', async () => {
  const bot = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's1', path: '/zeus/' },
    { userAgent: 'Googlebot/2.1', ipHash: 'ip1', recentSessionEvents: [] }
  );
  assert.strictEqual(bot.qualityScore, 0.0);

  const events = Array.from({ length: 65 }, () => ({ created_at: new Date().toISOString() }));
  const penalized = await scoreEventQuality(
    {
      event_name: 'engagement',
      session_hash: 's2',
      path: '/zeus/',
      visible_ms: 100,
      scroll_pct: 50,
    },
    { userAgent: HUMAN_UA, ipHash: 'ip2', recentSessionEvents: events }
  );
  // 1.0 - 0.25 (velocity) - 0.15 (implausible) = 0.6, clamped to [0,1].
  assert.strictEqual(penalized.qualityScore, 0.6);
});

test('scoreEventQuality combines multiple flags additively', async () => {
  const events = Array.from({ length: 65 }, () => ({ created_at: new Date().toISOString() }));
  const result = await scoreEventQuality(
    {
      event_name: 'engagement',
      session_hash: 's3',
      path: '/zeus/',
      visible_ms: 100,
      scroll_pct: 50,
    },
    { userAgent: 'HeadlessChrome/120', ipHash: 'ip3', recentSessionEvents: events }
  );
  assert.ok(result.flags.includes('headless'));
  assert.ok(result.flags.includes('session-velocity'));
  assert.ok(result.flags.includes('implausible-engagement'));
  assert.strictEqual(result.qualityScore, 0.0);
});

test('scoreEventQuality tolerates malformed or missing UA', async () => {
  const missing = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's4', path: '/zeus/' },
    { userAgent: undefined, ipHash: 'ip4', recentSessionEvents: [] }
  );
  assert.strictEqual(missing.qualityScore, 0.0);
  assert.ok(missing.flags.includes('bot-ua'));

  const malformed = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's5', path: '/zeus/' },
    { userAgent: 12345, ipHash: 'ip5', recentSessionEvents: [] }
  );
  assert.strictEqual(malformed.qualityScore, 0.0);
});

test('scoreEventQuality reads UA from event when context omits it', async () => {
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 's6', path: '/zeus/', user_agent: HUMAN_UA },
    { ipHash: 'ip6', recentSessionEvents: [] }
  );
  assert.strictEqual(result.qualityScore, 1.0);
  assert.deepStrictEqual(result.flags, []);
});

test('isImplausibleEngagement boundary values', () => {
  assert.strictEqual(isImplausibleEngagement(500, 0), false);
  assert.strictEqual(isImplausibleEngagement(499, 0), true);
  assert.strictEqual(isImplausibleEngagement(30 * 60 * 1000, 100), false);
  assert.strictEqual(isImplausibleEngagement(30 * 60 * 1000 + 1, 100), true);
  assert.strictEqual(isImplausibleEngagement(5000, 100), false);
  assert.strictEqual(isImplausibleEngagement(5000, 101), true);
  assert.strictEqual(isImplausibleEngagement(5000, -1), true);
});

test('timestamp parsing edge cases in checkSessionVelocity', () => {
  const now = Date.now();
  assert.strictEqual(checkSessionVelocity('s', [{ created_at: 'not-a-date' }], 60000, 1), false);
  // Use maxEvents=0 so a single parseable event triggers the flag.
  assert.strictEqual(checkSessionVelocity('s', [{ timestamp: now }], 60000, 0), true);
  assert.strictEqual(
    checkSessionVelocity('s', [{ created_at: new Date(now).toISOString() }], 60000, 0),
    true
  );
  assert.strictEqual(checkSessionVelocity('s', [{ created_at: now - 120000 }], 60000, 0), false);
});

// ---------------------------------------------------------------------------
// analytics-funnels boundary conditions
// ---------------------------------------------------------------------------

test('computeFunnel converts out-of-order events within a session', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  const session = 'funnel-out-of-order';
  const base = {
    session_hash: session,
    path: '/sites/zeus/',
    temple_id: 'zeus',
    page_type: 'temple',
  };
  await seedEvent({ ...base, event_name: 'sponsor_payment_complete', created_at: iso(1, 10, 30) });
  await seedEvent({ ...base, event_name: 'page_view', created_at: iso(1, 10, 0) });
  await seedEvent({ ...base, event_name: 'sponsor_apply_submit', created_at: iso(1, 10, 20) });
  await seedEvent({ ...base, event_name: 'sponsor_modal_open', created_at: iso(1, 10, 10) });
  await seedEvent({ ...base, event_name: 'sponsor_go_live', created_at: iso(1, 10, 40) });

  const result = await computeFunnel({ funnelId: 'temple_to_sponsor', days: 7 });
  const sessionRow = result.steps.find((s) => s.name === 'Temple view');
  assert.strictEqual(sessionRow.count, 1);
  assert.strictEqual(result.steps[result.steps.length - 1].count, 1);
});

test('computeFunnel deduplicates repeated steps without overcounting sessions', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  const session = 'funnel-duplicate';
  const base = {
    session_hash: session,
    path: '/sites/zeus/',
    temple_id: 'zeus',
    page_type: 'temple',
  };
  await seedEvent({ ...base, event_name: 'page_view', created_at: iso(1, 10, 0) });
  await seedEvent({ ...base, event_name: 'sponsor_modal_open', created_at: iso(1, 10, 1) });
  await seedEvent({ ...base, event_name: 'sponsor_modal_open', created_at: iso(1, 10, 2) });
  await seedEvent({ ...base, event_name: 'sponsor_modal_open', created_at: iso(1, 10, 3) });
  await seedEvent({ ...base, event_name: 'sponsor_apply_submit', created_at: iso(1, 10, 4) });

  const result = await computeFunnel({ funnelId: 'temple_to_sponsor', days: 7 });
  assert.strictEqual(result.totalSessions, 1);
  assert.strictEqual(result.steps[0].count, 1);
  assert.strictEqual(result.steps[1].count, 1);
  assert.strictEqual(result.steps[2].count, 1);
});

test('computeFunnel stops progression at missing intermediate step', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  const session = 'funnel-missing-step';
  const base = {
    session_hash: session,
    path: '/sites/zeus/',
    temple_id: 'zeus',
    page_type: 'temple',
  };
  await seedEvent({ ...base, event_name: 'page_view', created_at: iso(1, 10, 0) });
  await seedEvent({ ...base, event_name: 'sponsor_modal_open', created_at: iso(1, 10, 1) });
  await seedEvent({ ...base, event_name: 'sponsor_payment_complete', created_at: iso(1, 10, 2) });

  const result = await computeFunnel({ funnelId: 'temple_to_sponsor', days: 7 });
  assert.strictEqual(result.steps[0].count, 1);
  assert.strictEqual(result.steps[1].count, 1);
  assert.strictEqual(result.steps[2].count, 0);
  assert.strictEqual(result.steps[3].count, 0);
});

test('computeFunnel throws for unknown funnel id and handles tiny windows', async () => {
  await assert.rejects(
    async () => computeFunnel({ funnelId: 'nonexistent_funnel', days: 7 }),
    /Unknown funnel/
  );

  const zeroDay = await computeFunnel({ funnelId: 'temple_to_sponsor', days: 0 });
  assert.ok(zeroDay.steps.length > 0);
  assert.strictEqual(zeroDay.days, 0);
});

test('computeFunnel reports median seconds from first step', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  const session = 'funnel-medians';
  const base = {
    session_hash: session,
    path: '/sites/zeus/',
    temple_id: 'zeus',
    page_type: 'temple',
  };
  await seedEvent({ ...base, event_name: 'page_view', created_at: iso(1, 10, 0) });
  await seedEvent({ ...base, event_name: 'sponsor_modal_open', created_at: iso(1, 10, 1) });
  await seedEvent({ ...base, event_name: 'sponsor_apply_submit', created_at: iso(1, 10, 3) });
  await seedEvent({ ...base, event_name: 'sponsor_payment_complete', created_at: iso(1, 10, 6) });
  await seedEvent({ ...base, event_name: 'sponsor_go_live', created_at: iso(1, 10, 10) });

  const result = await computeFunnel({ funnelId: 'temple_to_sponsor', days: 7 });
  assert.strictEqual(result.steps[0].medianSecondsFromFirst, 0);
  assert.strictEqual(result.steps[1].medianSecondsFromFirst, 60);
  assert.strictEqual(result.steps[2].medianSecondsFromFirst, 180);
  assert.strictEqual(result.steps[3].medianSecondsFromFirst, 360);
  assert.strictEqual(result.steps[4].medianSecondsFromFirst, 600);
});

// ---------------------------------------------------------------------------
// analytics-cohorts boundary conditions
// ---------------------------------------------------------------------------

test('computeCohorts weekly bucketing aggregates sizes correctly', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');

  const sessions = [
    { session_hash: 'cw-1', first_seen_at: iso(2, 9, 0), entry_temple_id: 'zeus' },
    { session_hash: 'cw-2', first_seen_at: iso(1, 9, 0), entry_temple_id: 'zeus' },
    { session_hash: 'cw-3', first_seen_at: iso(0, 9, 0), entry_temple_id: 'zeus' },
  ];
  for (const s of sessions) await seedSession(s);
  for (const s of sessions) {
    await seedEvent({
      event_name: 'page_view',
      session_hash: s.session_hash,
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      created_at: s.first_seen_at,
    });
  }

  const weekly = await computeCohorts({ days: 7, granularity: 'week' });
  assert.strictEqual(weekly.granularity, 'week');
  assert.ok(weekly.cohorts.length >= 1);
  assert.strictEqual(weekly.summary.totalSessions, 3);
  const sizeSum = weekly.cohorts.reduce((acc, c) => acc + c.size, 0);
  assert.strictEqual(sizeSum, 3);
});

test('computeCohorts returns empty buckets safely', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');

  const result = await computeCohorts({ days: 7, granularity: 'day' });
  assert.deepStrictEqual(result.cohorts, []);
  assert.strictEqual(result.summary.avgSize, 0);
  assert.strictEqual(result.summary.avgD1, null);
  assert.strictEqual(result.summary.avgD7, null);
  assert.strictEqual(result.summary.avgD30, null);
  assert.strictEqual(result.summary.totalSessions, 0);
});

test('daysBetween rounding places events in correct retention index', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');

  await seedSession({ session_hash: 'db-1', first_seen_at: iso(2, 9, 0), entry_temple_id: 'zeus' });
  await seedEvent({
    event_name: 'page_view',
    session_hash: 'db-1',
    path: '/sites/zeus/',
    page_type: 'temple',
    temple_id: 'zeus',
    created_at: iso(2, 9, 0),
  });
  await seedEvent({
    event_name: 'page_view',
    session_hash: 'db-1',
    path: '/sites/zeus/',
    page_type: 'temple',
    temple_id: 'zeus',
    created_at: iso(1, 9, 0),
  });

  const result = await computeCohorts({ days: 7, granularity: 'day' });
  const cohort = result.cohorts.find((c) => c.date === iso(2).slice(0, 10));
  assert.ok(cohort);
  assert.strictEqual(cohort.size, 1);
  assert.strictEqual(cohort.retention[0].count, 1);
  assert.strictEqual(cohort.retention[1].count, 1);
  assert.strictEqual(cohort.retention[1].pct, 100);
});

test('computeSummary returns null for day indices not yet observable', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');

  await seedSession({ session_hash: 'cs-1', first_seen_at: iso(0, 9, 0), entry_temple_id: 'zeus' });
  await seedEvent({
    event_name: 'page_view',
    session_hash: 'cs-1',
    path: '/sites/zeus/',
    page_type: 'temple',
    temple_id: 'zeus',
    created_at: iso(0, 9, 0),
  });

  const result = await getCohort({ days: 1, granularity: 'day' });
  assert.strictEqual(result.cohorts.length, 1);
  assert.strictEqual(result.summary.avgD1, null);
  assert.strictEqual(result.summary.avgD7, null);
  assert.strictEqual(result.summary.avgD30, null);
});

// ---------------------------------------------------------------------------
// analytics-ltv boundary conditions
// ---------------------------------------------------------------------------

test('computeLtv ignores invalid JSON, negative, and zero amounts', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');

  const base = {
    session_hash: 'ltv-1',
    path: '/sites/zeus/',
    page_type: 'temple',
    temple_id: 'zeus',
  };
  await seedEvent({
    ...base,
    event_name: 'sponsor_payment_complete',
    properties: '{not json',
    created_at: iso(0, 10, 0),
  });
  await seedEvent({
    ...base,
    event_name: 'sponsor_payment_complete',
    properties: JSON.stringify({ amount: -10 }),
    created_at: iso(0, 10, 1),
  });
  await seedEvent({
    ...base,
    event_name: 'sponsor_payment_complete',
    properties: JSON.stringify({ amount: 0 }),
    created_at: iso(0, 10, 2),
  });
  await seedEvent({
    ...base,
    event_name: 'sponsor_payment_complete',
    properties: JSON.stringify({ amount: 12.345 }),
    created_at: iso(0, 10, 3),
  });

  const result = await computeLtv({ days: 1 });
  assert.strictEqual(result.totalRevenue, 12.35);
  assert.strictEqual(result.transactions, 1);
});

test('computeLtv groups byTemple and sorts descending by revenue', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');

  await seedEvent({
    event_name: 'sponsor_payment_complete',
    session_hash: 'bt-1',
    path: '/sites/zeus/',
    page_type: 'temple',
    temple_id: 'zeus',
    properties: JSON.stringify({ amount: 10 }),
    created_at: iso(0, 10, 0),
  });
  await seedEvent({
    event_name: 'patron_checkout_complete',
    session_hash: 'bt-2',
    path: '/sites/athena/',
    page_type: 'temple',
    temple_id: 'athena',
    properties: JSON.stringify({ amount: 50 }),
    created_at: iso(0, 10, 1),
  });
  await seedEvent({
    event_name: 'store_checkout_complete',
    session_hash: 'bt-3',
    path: '/store',
    page_type: 'store',
    temple_id: null,
    properties: JSON.stringify({ amount: 25 }),
    created_at: iso(0, 10, 2),
  });

  const result = await computeLtv({ days: 1 });
  assert.strictEqual(result.byTemple.length, 3);
  assert.strictEqual(result.byTemple[0].templeId, 'athena');
  assert.strictEqual(result.byTemple[0].revenue, 50);
  assert.strictEqual(result.byTemple[1].templeId, null);
  assert.strictEqual(result.byTemple[1].revenue, 25);
  assert.strictEqual(result.byTemple[2].templeId, 'zeus');
  assert.strictEqual(result.byTemple[2].revenue, 10);
});

test('getLtv projection handles zero and positive windows', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');

  const empty = await getLtv({ days: 1 });
  assert.strictEqual(empty.projected90Day, 0);

  await seedEvent({
    event_name: 'sponsor_payment_complete',
    session_hash: 'proj-1',
    path: '/sites/zeus/',
    page_type: 'temple',
    temple_id: 'zeus',
    properties: JSON.stringify({ amount: 10 }),
    created_at: iso(0, 10, 0),
  });

  const result = await getLtv({ days: 1 });
  assert.strictEqual(result.projected90Day, 900);
});

// ---------------------------------------------------------------------------
// analytics-realtime boundary conditions
// ---------------------------------------------------------------------------

test('clampMinutes enforces hard bounds', () => {
  assert.strictEqual(clampMinutes(-10), 1);
  assert.strictEqual(clampMinutes(0), 1);
  assert.strictEqual(clampMinutes(1), 1);
  assert.strictEqual(clampMinutes(60), 60);
  assert.strictEqual(clampMinutes(120), 120);
  assert.strictEqual(clampMinutes(121), 120);
  assert.strictEqual(clampMinutes('90'), 90);
  assert.strictEqual(clampMinutes({}), 60);
  assert.strictEqual(clampMinutes(NaN), 60);
});

test('getRealtimePulse fills timeline gaps with zero-event buckets', async () => {
  await run('DELETE FROM site_analytics_events_v2');

  const now = Date.now();
  const bucketMs = 5 * 60 * 1000;
  const recentBucket = new Date(Math.floor(now / bucketMs) * bucketMs);
  const olderBucket = new Date(recentBucket.getTime() - 2 * bucketMs);

  await seedEvent({
    event_name: 'page_view',
    session_hash: 'gap-1',
    path: '/sites/zeus/',
    page_type: 'temple',
    temple_id: 'zeus',
    created_at: recentBucket.toISOString(),
  });
  await seedEvent({
    event_name: 'page_view',
    session_hash: 'gap-2',
    path: '/sites/athena/',
    page_type: 'temple',
    temple_id: 'athena',
    created_at: olderBucket.toISOString(),
  });

  const pulse = await getRealtimePulse({ minutes: 15 });
  assert.ok(pulse.timeline.length >= 3);
  const totalEvents = pulse.timeline.reduce((sum, b) => sum + b.events, 0);
  assert.strictEqual(totalEvents, 2);
  const zeroBucket = pulse.timeline.find((b) => b.events === 0 && b.pageViews === 0);
  assert.ok(zeroBucket, 'expected at least one gap bucket pre-filled with zeros');
});

test('getRealtimePulse top aggregations respect limits', async () => {
  await run('DELETE FROM site_analytics_events_v2');

  const now = Date.now();
  for (let i = 0; i < 15; i++) {
    await seedEvent({
      event_name: 'page_view',
      session_hash: `limit-session-${i}`,
      path: `/sites/temple-${i}/`,
      page_type: 'temple',
      temple_id: `temple-${i}`,
      device: `device-${i}`,
      referrer_domain: `ref-${i}.com`,
      created_at: new Date(now - i * 1000).toISOString(),
    });
  }

  const pulse = await getRealtimePulse({ minutes: 60 });
  assert.ok(pulse.topTemples.length <= 10);
  assert.ok(pulse.topPages.length <= 10);
  assert.ok(pulse.referrers.length <= 10);
  assert.ok(pulse.devices.length <= 6);
});

test('getRealtimePulse returns zeroed summary when no events match', async () => {
  await run('DELETE FROM site_analytics_events_v2');
  const pulse = await getRealtimePulse({ minutes: 60 });
  assert.strictEqual(pulse.current.events, 0);
  assert.strictEqual(pulse.current.pageViews, 0);
  assert.strictEqual(pulse.current.uniqueSessions, 0);
  assert.strictEqual(pulse.previous.events, 0);
  assert.strictEqual(pulse.velocity.eventsPct, 0);
});
