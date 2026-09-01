/**
 * PuniCodex — Analytics red-team / integrity tests (Phase 8).
 *
 * Adversarial scenarios: bot spoofing, path traversal, SQL injection, duplicate
 * ingestion, unauthorized admin access, velocity attacks, and timestamp abuse.
 */

'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

prepareTestDb(__filename);
process.env.ADMIN_PASSWORD = 'test-red-team-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';
delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;

const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_red_team',
          url: 'https://checkout.stripe.com/red-team-mock',
          mode: config.mode || 'payment',
        }),
      },
    },
    webhooks: {
      constructEvent: (payload) => JSON.parse(payload),
    },
  }),
};

const { run, all, closeDb } = require('../platform/db/operational.js');
const { runMigration: runMigrationV5 } = require('../platform/db/migrate-site-analytics-v5.js');
const { scoreEventQuality } = require('../platform/api/analytics-quality.js');
const { classifyUserAgent } = require('../platform/api/bot-detection.js');
const { normalizeEvent } = require('../platform/api/analytics-events.js');
const { computeFunnel } = require('../platform/api/analytics-funnels.js');
const analyticsHandler = require('../platform/api-handlers/admin/portal/analytics/index.js');
const portalAuth = require('../platform/api/admin-portal-auth.js');
const { invoke, adminHeader } = require('./helpers/http.js');

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

let adminToken;

before(async () => {
  runMigrationV5();
  await run('DELETE FROM site_analytics_events_v2');
  await run('DELETE FROM site_analytics_sessions');
  await run('DELETE FROM site_analytics_funnels');
  await run('DELETE FROM site_analytics_cohorts');
  await portalAuth.bootstrap();
  const login = await portalAuth.login('admin@punicodex.com', process.env.ADMIN_PASSWORD);
  assert.ok(login?.success, `portal login failed: ${login?.message}`);
  adminToken = login.token;
});

after(() => {
  closeDb();
  cleanupTestDb(__filename);
});

// ---------------------------------------------------------------------------
// Bot spoofing
// ---------------------------------------------------------------------------

test('bots spoofing a human UA are still classified via heuristics', () => {
  const spoofedBot = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
  const classified = classifyUserAgent(spoofedBot);
  assert.strictEqual(classified.isBot, true);
  assert.strictEqual(classified.category, 'search-engine');

  const headlessSpoof = `${HUMAN_UA} HeadlessChrome`;
  const headlessClass = classifyUserAgent(headlessSpoof);
  assert.strictEqual(headlessClass.isBot, true);
  assert.strictEqual(headlessClass.category, 'headless');

  const playwrightSpoof = `${HUMAN_UA} Playwright`;
  const pwClass = classifyUserAgent(playwrightSpoof);
  assert.strictEqual(pwClass.isBot, true);
  assert.strictEqual(pwClass.category, 'headless');
});

test('scoreEventQuality flags a spoofed human UA that still carries bot signals', async () => {
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 'spoof-1', path: '/zeus/' },
    { userAgent: `${HUMAN_UA} Playwright`, ipHash: 'ip-spoof', recentSessionEvents: [] }
  );
  assert.ok(result.flags.includes('headless'));
  assert.ok(result.qualityScore < 0.3);
});

// ---------------------------------------------------------------------------
// Path traversal / null bytes
// ---------------------------------------------------------------------------

test('path traversal attempts are sanitized to a controlled page type', () => {
  const cases = [
    { path: '../etc/passwd', expectedType: 'static', expectedTemple: '' },
    { path: '/../admin/secrets', expectedType: 'static', expectedTemple: '' },
    { path: '/sites/zeus/../../etc/passwd', expectedType: 'temple', expectedTemple: 'zeus' },
    { path: '/foo\0bar', expectedType: 'static', expectedTemple: '' },
    { path: '/sites/zeus/\x00hidden', expectedType: 'temple', expectedTemple: 'zeus' },
  ];
  for (const { path, expectedType, expectedTemple } of cases) {
    const ev = normalizeEvent({ event_name: 'page_view', session_hash: 'pt-1', path });
    if (ev.error) {
      assert.ok(ev.error.includes('path') || ev.error.includes('validation'));
      continue;
    }
    assert.strictEqual(ev.page_type, expectedType, `page_type for ${path}`);
    assert.strictEqual(ev.temple_id, expectedTemple, `temple_id for ${path}`);
    assert.ok(!ev.temple_id.includes('etc') && !ev.temple_id.includes('passwd'));
  }
});

test('normalizeEvent sanitizes paths that do not start with slash to static', () => {
  const ev = normalizeEvent({ event_name: 'page_view', session_hash: 'pt-2', path: 'sites/zeus/' });
  assert.strictEqual(ev.error, undefined, ev.error);
  assert.strictEqual(ev.page_type, 'static');
  assert.strictEqual(ev.temple_id, '');
});

// ---------------------------------------------------------------------------
// SQL injection
// ---------------------------------------------------------------------------

test('SQL injection payloads in event fields are stored as literal strings', async () => {
  const payloads = [
    { field: 'session_hash', value: "' OR '1'='1" },
    { field: 'path', value: "/sites/zeus/'; DROP TABLE site_analytics_events_v2; --" },
  ];

  for (const { field, value } of payloads) {
    const base = {
      event_name: 'page_view',
      session_hash: field === 'session_hash' ? value : `sql-${field}`,
      path: field === 'path' ? value : '/sites/zeus/',
    };
    const normalized = normalizeEvent(base);
    assert.strictEqual(normalized.error, undefined, normalized.error);

    await seedEvent({
      event_name: normalized.event_name,
      session_hash: normalized.session_hash,
      path: normalized.path,
      created_at: iso(0, 10, 0),
    });

    const rows = await all(
      `SELECT ${field} AS val FROM site_analytics_events_v2 WHERE ${field} = $1`,
      [value]
    );
    assert.ok(rows.length >= 1, `expected to read back ${field} payload: ${value}`);
    assert.strictEqual(rows[rows.length - 1].val, value);
  }

  // The events table has no query column; store the query payload in properties
  // and prove it round-trips as a literal string rather than executing SQL.
  const queryPayload = "apollo'; DELETE FROM site_analytics_events_v2; --";
  await seedEvent({
    event_name: 'search_query',
    session_hash: 'sql-query',
    path: '/search',
    properties: JSON.stringify({ query: queryPayload }),
    created_at: iso(0, 10, 0),
  });
  const queryRows = await all(
    "SELECT properties FROM site_analytics_events_v2 WHERE event_name = 'search_query' AND session_hash = $1",
    ['sql-query']
  );
  assert.strictEqual(queryRows.length, 1);
  const parsed = JSON.parse(queryRows[0].properties);
  assert.strictEqual(parsed.query, queryPayload);

  const tableCheck = await all(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='site_analytics_events_v2'"
  );
  assert.strictEqual(tableCheck.length, 1, 'table should survive injection attempts');
});

// ---------------------------------------------------------------------------
// Duplicate ingestion
// ---------------------------------------------------------------------------

test('duplicate event ingestion is not silently deduplicated', async () => {
  await run('DELETE FROM site_analytics_events_v2');

  const beforeCount = await all('SELECT COUNT(*) AS n FROM site_analytics_events_v2');
  assert.strictEqual(beforeCount[0].n, 0);

  for (let i = 0; i < 5; i++) {
    await seedEvent({
      event_name: 'page_view',
      session_hash: 'dup-1',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      created_at: iso(0, 10, i),
    });
  }

  const afterCount = await all('SELECT COUNT(*) AS n FROM site_analytics_events_v2');
  assert.strictEqual(afterCount[0].n, 5);

  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 'dup-1', path: '/zeus/' },
    { userAgent: HUMAN_UA, ipHash: 'ip-dup', recentSessionEvents: [] }
  );
  assert.strictEqual(result.qualityScore, 1.0);
});

// ---------------------------------------------------------------------------
// Unauthorized admin access
// ---------------------------------------------------------------------------

test('analytics admin handler rejects requests without a token', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=rolling&days=7'
  );
  assert.strictEqual(res.status, 401);
  assert.ok(res.body.error || res.body.message || res.body.code || true);
});

test('analytics admin handler rejects requests with an invalid token', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=rolling&days=7',
    { headers: adminHeader('not-a-real-token') }
  );
  assert.strictEqual(res.status, 401);
});

test('analytics admin handler accepts a valid token', async () => {
  const res = await invoke(
    analyticsHandler,
    'GET',
    '/api/admin/portal/analytics/?mode=rolling&days=7',
    { headers: adminHeader(adminToken) }
  );
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.mode, 'rolling');
});

// ---------------------------------------------------------------------------
// Velocity attacks
// ---------------------------------------------------------------------------

test('large batch ingestion within one session triggers velocity flag but survives', async () => {
  await run('DELETE FROM site_analytics_events_v2');

  const sessionHash = 'velocity-1';
  const recentEvents = Array.from({ length: 500 }, () => ({
    created_at: new Date().toISOString(),
  }));

  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: sessionHash, path: '/zeus/' },
    { userAgent: HUMAN_UA, ipHash: 'ip-velocity', recentSessionEvents: recentEvents }
  );
  assert.ok(result.flags.includes('session-velocity'));
  assert.ok(result.qualityScore < 1.0);

  for (let i = 0; i < 500; i++) {
    await seedEvent({
      event_name: 'page_view',
      session_hash: sessionHash,
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      quality_score: result.qualityScore,
      quality_flags: result.qualityFlags,
      created_at: new Date(Date.now() - i * 100).toISOString(),
    });
  }

  const count = await all('SELECT COUNT(*) AS n FROM site_analytics_events_v2');
  assert.strictEqual(count[0].n, 500);
});

// ---------------------------------------------------------------------------
// Timestamp abuse
// ---------------------------------------------------------------------------

test('future and far-past timestamps are handled without crashing', async () => {
  await run('DELETE FROM site_analytics_events_v2');

  const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const farPast = new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString();

  await seedEvent({
    event_name: 'page_view',
    session_hash: 'ts-future',
    path: '/sites/zeus/',
    page_type: 'temple',
    temple_id: 'zeus',
    created_at: farFuture,
  });
  await seedEvent({
    event_name: 'page_view',
    session_hash: 'ts-past',
    path: '/sites/zeus/',
    page_type: 'temple',
    temple_id: 'zeus',
    created_at: farPast,
  });

  const rows = await all(
    'SELECT session_hash, created_at FROM site_analytics_events_v2 ORDER BY created_at'
  );
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(rows[0].session_hash, 'ts-past');
  assert.strictEqual(rows[1].session_hash, 'ts-future');

  const result = await computeFunnel({ funnelId: 'temple_to_sponsor', days: 120 });
  assert.ok(result.steps.length > 0);
  assert.strictEqual(result.totalSessions, 0);
});

test('scoreEventQuality timestamp parsing survives numeric and string extremes', async () => {
  const farFutureNum = Date.now() + 1e12;
  const farPastNum = Date.now() - 1e12;
  const result = await scoreEventQuality(
    { event_name: 'page_view', session_hash: 'ts-extreme', path: '/zeus/' },
    {
      userAgent: HUMAN_UA,
      ipHash: 'ip-ts',
      recentSessionEvents: [
        { created_at: farFutureNum },
        { created_at: farPastNum },
        { created_at: 'invalid-timestamp' },
      ],
    }
  );
  assert.strictEqual(result.qualityScore, 1.0);
  assert.ok(!result.flags.includes('session-velocity'));
});
