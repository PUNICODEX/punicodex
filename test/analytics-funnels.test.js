/**
 * PuniCodex — Business funnel analytics tests.
 *
 * Covers funnel registry, live funnel computation, temple scoping,
 * conversion/drop-off metrics, cross-event funnels, and rollup materialization.
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
  computeFunnel,
  materializeFunnels,
  getFunnel,
} = require('../platform/api/analytics-funnels.js');
const { FUNNELS, listFunnels, getFunnelConfig } = require('../platform/analytics/funnels.js');

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
  await run('DELETE FROM site_analytics_funnels');

  const events = [
    // Temple → Sponsor: session A completes all 5 steps on zeus.
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'sponsor-a',
      created_at: iso(1, 10, 0),
    },
    {
      event_name: 'sponsor_modal_open',
      path: '/sites/zeus/',
      temple_id: 'zeus',
      session_hash: 'sponsor-a',
      created_at: iso(1, 10, 1),
    },
    {
      event_name: 'sponsor_apply_submit',
      path: '/sites/zeus/apply',
      temple_id: 'zeus',
      session_hash: 'sponsor-a',
      created_at: iso(1, 10, 5),
    },
    {
      event_name: 'sponsor_payment_complete',
      path: '/sites/zeus/apply',
      temple_id: 'zeus',
      session_hash: 'sponsor-a',
      created_at: iso(1, 10, 10),
    },
    {
      event_name: 'sponsor_go_live',
      path: '/sites/zeus/',
      temple_id: 'zeus',
      session_hash: 'sponsor-a',
      created_at: iso(1, 10, 15),
    },

    // Session B on zeus: view + modal only.
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'sponsor-b',
      created_at: iso(1, 11, 0),
    },
    {
      event_name: 'sponsor_modal_open',
      path: '/sites/zeus/',
      temple_id: 'zeus',
      session_hash: 'sponsor-b',
      created_at: iso(1, 11, 2),
    },

    // Session C on athena: full funnel.
    {
      event_name: 'page_view',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 'sponsor-c',
      created_at: iso(1, 12, 0),
    },
    {
      event_name: 'sponsor_modal_open',
      path: '/sites/athena/',
      temple_id: 'athena',
      session_hash: 'sponsor-c',
      created_at: iso(1, 12, 1),
    },
    {
      event_name: 'sponsor_apply_submit',
      path: '/sites/athena/apply',
      temple_id: 'athena',
      session_hash: 'sponsor-c',
      created_at: iso(1, 12, 5),
    },
    {
      event_name: 'sponsor_payment_complete',
      path: '/sites/athena/apply',
      temple_id: 'athena',
      session_hash: 'sponsor-c',
      created_at: iso(1, 12, 10),
    },
    {
      event_name: 'sponsor_go_live',
      path: '/sites/athena/',
      temple_id: 'athena',
      session_hash: 'sponsor-c',
      created_at: iso(1, 12, 15),
    },

    // Session D on athena: view only.
    {
      event_name: 'page_view',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 'sponsor-d',
      created_at: iso(1, 13, 0),
    },

    // Session E on zeus: reaches payment but not go_live.
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'sponsor-e',
      created_at: iso(1, 14, 0),
    },
    {
      event_name: 'sponsor_modal_open',
      path: '/sites/zeus/',
      temple_id: 'zeus',
      session_hash: 'sponsor-e',
      created_at: iso(1, 14, 1),
    },
    {
      event_name: 'sponsor_apply_submit',
      path: '/sites/zeus/apply',
      temple_id: 'zeus',
      session_hash: 'sponsor-e',
      created_at: iso(1, 14, 5),
    },
    {
      event_name: 'sponsor_payment_complete',
      path: '/sites/zeus/apply',
      temple_id: 'zeus',
      session_hash: 'sponsor-e',
      created_at: iso(1, 14, 10),
    },

    // Search → Visit: session A completes all 3 steps.
    {
      event_name: 'search_query',
      path: '/search',
      page_type: 'search',
      session_hash: 'search-a',
      created_at: iso(2, 9, 0),
    },
    {
      event_name: 'search_result_click',
      path: '/search',
      page_type: 'search',
      session_hash: 'search-a',
      created_at: iso(2, 9, 1),
    },
    {
      event_name: 'page_view',
      path: '/sites/zeus/',
      page_type: 'temple',
      temple_id: 'zeus',
      session_hash: 'search-a',
      created_at: iso(2, 9, 5),
    },

    // Session B: search only.
    {
      event_name: 'search_query',
      path: '/search',
      page_type: 'search',
      session_hash: 'search-b',
      created_at: iso(2, 10, 0),
    },

    // Session C: search, click, visit athena.
    {
      event_name: 'search_query',
      path: '/search',
      page_type: 'search',
      session_hash: 'search-c',
      created_at: iso(2, 11, 0),
    },
    {
      event_name: 'search_result_click',
      path: '/search',
      page_type: 'search',
      session_hash: 'search-c',
      created_at: iso(2, 11, 1),
    },
    {
      event_name: 'page_view',
      path: '/sites/athena/',
      page_type: 'temple',
      temple_id: 'athena',
      session_hash: 'search-c',
      created_at: iso(2, 11, 5),
    },

    // Session D: search + click, no temple visit.
    {
      event_name: 'search_query',
      path: '/search',
      page_type: 'search',
      session_hash: 'search-d',
      created_at: iso(2, 12, 0),
    },
    {
      event_name: 'search_result_click',
      path: '/search',
      page_type: 'search',
      session_hash: 'search-d',
      created_at: iso(2, 12, 1),
    },
  ];

  for (const e of events) {
    await seedEvent(e);
  }
});

after(() => {
  closeDb();
});

test('funnel registry exports all configured funnels', () => {
  assert.strictEqual(Object.keys(FUNNELS).length, 4);
  assert.ok(getFunnelConfig('temple_to_sponsor'));
  assert.ok(getFunnelConfig('search_to_visit'));
  assert.strictEqual(getFunnelConfig('missing'), null);
  const names = listFunnels().map((f) => f.id);
  assert.ok(names.includes('temple_to_sponsor'));
  assert.ok(names.includes('store_purchase'));
});

test('temple_to_sponsor funnel computes correct ordered step counts', async () => {
  const result = await computeFunnel({ funnelId: 'temple_to_sponsor', days: 7 });
  assert.strictEqual(result.funnelId, 'temple_to_sponsor');
  assert.strictEqual(result.name, 'Temple → Sponsor');
  // Any session with a temple page_view enters the sponsor funnel, including
  // the two search sessions that later visited a temple.
  assert.strictEqual(result.totalSessions, 7);
  assert.strictEqual(result.steps.length, 5);

  assert.strictEqual(result.steps[0].count, 7);
  assert.strictEqual(result.steps[1].count, 4);
  assert.strictEqual(result.steps[2].count, 3);
  assert.strictEqual(result.steps[3].count, 3);
  assert.strictEqual(result.steps[4].count, 2);
});

test('temple scoping isolates the funnel to the entry temple', async () => {
  const zeus = await computeFunnel({ funnelId: 'temple_to_sponsor', days: 7, templeId: 'zeus' });
  // zeus sessions: sponsor-a, sponsor-b, sponsor-e, and search-a.
  assert.strictEqual(zeus.totalSessions, 4);
  assert.strictEqual(zeus.steps[0].count, 4);
  assert.strictEqual(zeus.steps[1].count, 3);
  assert.strictEqual(zeus.steps[4].count, 1);

  const athena = await computeFunnel({
    funnelId: 'temple_to_sponsor',
    days: 7,
    templeId: 'athena',
  });
  // athena sessions: sponsor-c, sponsor-d, and search-c.
  assert.strictEqual(athena.totalSessions, 3);
  assert.strictEqual(athena.steps[0].count, 3);
  assert.strictEqual(athena.steps[1].count, 1);
  assert.strictEqual(athena.steps[4].count, 1);
});

test('conversion and drop-off percentages are computed relative to the previous step', async () => {
  const result = await computeFunnel({ funnelId: 'temple_to_sponsor', days: 7 });

  assert.strictEqual(result.steps[0].conversionPct, 100);
  assert.strictEqual(result.steps[0].dropOffPct, 0);
  assert.strictEqual(result.steps[0].previousCount, 7);

  assert.strictEqual(result.steps[1].conversionPct, 57.1);
  assert.strictEqual(result.steps[1].dropOffPct, 42.9);
  assert.strictEqual(result.steps[1].previousCount, 7);

  assert.strictEqual(result.steps[2].conversionPct, 75);
  assert.strictEqual(result.steps[2].dropOffPct, 25);
  assert.strictEqual(result.steps[2].previousCount, 4);

  assert.strictEqual(result.steps[3].conversionPct, 100);
  assert.strictEqual(result.steps[3].dropOffPct, 0);
  assert.strictEqual(result.steps[3].previousCount, 3);

  assert.strictEqual(result.steps[4].conversionPct, 66.7);
  assert.strictEqual(result.steps[4].dropOffPct, 33.3);
  assert.strictEqual(result.steps[4].previousCount, 3);
});

test('search_to_visit funnel works across unrelated event types', async () => {
  const result = await computeFunnel({ funnelId: 'search_to_visit', days: 7 });
  assert.strictEqual(result.totalSessions, 4);
  assert.strictEqual(result.steps[0].count, 4);
  assert.strictEqual(result.steps[1].count, 3);
  assert.strictEqual(result.steps[2].count, 2);
  assert.strictEqual(result.steps[0].event, 'search_query');
  assert.strictEqual(result.steps[2].event, 'page_view');
});

test('median seconds from step 1 are reported for completed paths', async () => {
  const result = await computeFunnel({ funnelId: 'temple_to_sponsor', days: 7 });
  assert.strictEqual(result.steps[0].medianSecondsFromFirst, 0);
  assert.ok(result.steps[1].medianSecondsFromFirst >= 60);
  assert.ok(result.steps[4].medianSecondsFromFirst >= 600);
});

test('materializeFunnels writes daily per-temple rollups', async () => {
  await materializeFunnels({ days: 7 });

  const rows = await all(
    `
      SELECT funnel_id, step_index, step_name, day, temple_id, count
        FROM site_analytics_funnels
       WHERE funnel_id = 'temple_to_sponsor'
         AND day = $1
       ORDER BY step_index, temple_id
    `,
    [iso(1).slice(0, 10)]
  );

  assert.ok(rows.length >= 10, 'expected rollup rows for temple_to_sponsor');

  const zeusRows = rows.filter((r) => r.temple_id === 'zeus');
  assert.strictEqual(zeusRows.length, 5);
  assert.strictEqual(zeusRows[0].count, 3);
  assert.strictEqual(zeusRows[1].count, 3);
  assert.strictEqual(zeusRows[4].count, 1);

  const athenaRows = rows.filter((r) => r.temple_id === 'athena');
  assert.strictEqual(athenaRows.length, 5);
  assert.strictEqual(athenaRows[0].count, 2);
  assert.strictEqual(athenaRows[4].count, 1);
});

test('getFunnel falls back to live computation when rollup is incomplete', async () => {
  // Remove any rolled-up rows for the search funnel so the fast path cannot
  // be used and the function must fall back to live computation.
  await run("DELETE FROM site_analytics_funnels WHERE funnel_id = 'search_to_visit'");

  const result = await getFunnel({ funnelId: 'search_to_visit', days: 7 });
  assert.strictEqual(result.funnelId, 'search_to_visit');
  assert.strictEqual(result.totalSessions, 4);
  assert.strictEqual(result.steps[2].count, 2);
  assert.ok(result.steps[1].medianSecondsFromFirst !== null, 'live fallback should include median');
});

test('unknown funnel ids throw a clear error', async () => {
  await assert.rejects(
    async () => computeFunnel({ funnelId: 'not_real', days: 7 }),
    /Unknown funnel/
  );
});
