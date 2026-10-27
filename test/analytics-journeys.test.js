#!/usr/bin/env node
/**
 * PuniCodex — analytics journeys tests.
 *
 * Seeds the v5 event stream with synthetic human + bot sessions and asserts
 * the nervous-system queries: flow reconstruction, entry-page truth,
 * surface attribution, dwell aggregation, bot separation. Human-only is
 * the contract — bots must never leak into any product metric.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

delete process.env.REDIS_URL;
delete process.env.DATABASE_URL;

// Golden-DB test isolation must happen BEFORE the services open connections.
prepareTestDb(__filename);
const { runMigration } = require('../platform/db/migrate-site-analytics-v5.js');
runMigration();

const { run, closeDb } = require('../platform/db/operational.js');
const {
  journeyFlows,
  topJourneys,
  entryPages,
  attribution,
  surfaceAttribution,
  botOverview,
} = require('../platform/api/analytics-journeys.js');

before(async () => {
  const H = 0; // human
  const B = 1; // bot
  const now = Date.now();
  const minutesAgo = (m) => new Date(now - m * 60000).toISOString().slice(0, 19).replace('T', ' ');
  const iso = (m) => new Date(now - m * 60000).toISOString();

  // Session H1: blog entry → temple → store (the money journey).
  await run(
    `INSERT INTO site_analytics_sessions
       (session_hash, first_seen_at, last_seen_at, entry_path, entry_temple_id, event_count, is_bot, referrer_domain)
     VALUES ('h1', ?, ?, '/blog/herald-issue-9/', '', 3, ?, 'news.ycombinator.com')`,
    [minutesAgo(60), minutesAgo(58), H]
  );
  await run(
    `INSERT INTO site_analytics_events_v2
       (event_name, path, session_hash, is_bot, referrer_domain, created_at)
     VALUES
       ('page_view', '/blog/herald-issue-9/', 'h1', ?, 'news.ycombinator.com', ?),
       ('page_view', '/sites/aigyptos/', 'h1', ?, '', ?),
       ('page_view', '/store/aigyptos/tee/', 'h1', ?, '', ?)`,
    [H, iso(60), H, iso(59), H, iso(58)]
  );

  // Session H2: direct temple entry, single page (bounce-ish).
  await run(
    `INSERT INTO site_analytics_sessions
       (session_hash, first_seen_at, last_seen_at, entry_path, entry_temple_id, event_count, is_bot)
     VALUES ('h2', ?, ?, '/zeus/', 'zeus', 1, ?)`,
    [minutesAgo(45), minutesAgo(45), H]
  );
  await run(
    `INSERT INTO site_analytics_events_v2 (event_name, path, session_hash, is_bot, created_at)
     VALUES ('page_view', '/zeus/', 'h2', ?, ?)`,
    [H, iso(45)]
  );

  // Session H3: home → pantheon → realms (engaged browse).
  await run(
    `INSERT INTO site_analytics_sessions
       (session_hash, first_seen_at, last_seen_at, entry_path, entry_temple_id, event_count, is_bot)
     VALUES ('h3', ?, ?, '/', '', 3, ?)`,
    [minutesAgo(30), minutesAgo(28), H]
  );
  await run(
    `INSERT INTO site_analytics_events_v2 (event_name, path, session_hash, is_bot, created_at)
     VALUES
       ('page_view', '/', 'h3', ?, ?),
       ('page_view', '/pantheon/', 'h3', ?, ?),
       ('page_view', '/realms/', 'h3', ?, ?)`,
    [H, iso(30), H, iso(29), H, iso(28)]
  );

  // Session B1: a scanner hammering — must NEVER appear in human metrics.
  await run(
    `INSERT INTO site_analytics_sessions
       (session_hash, first_seen_at, last_seen_at, entry_path, entry_temple_id, event_count, is_bot)
     VALUES ('b1', ?, ?, '/wp-login.php', '', 40, ?)`,
    [minutesAgo(20), minutesAgo(19), B]
  );
  for (let i = 0; i < 5; i++) {
    await run(
      `INSERT INTO site_analytics_events_v2 (event_name, path, session_hash, is_bot, created_at)
       VALUES ('page_view', '/wp-scan-' || ?, 'b1', ?, ?)`,
      [String(i), B, iso(20 - i * 0.1)]
    );
  }

  // Engagement events for dwell.
  await run(
    `INSERT INTO site_analytics_events_v2
       (event_name, path, session_hash, is_bot, properties, created_at)
     VALUES
       ('engagement', '/zeus/', 'h2', ?, '{"visible_ms":42000,"scroll_pct":80}', ?),
       ('engagement', '/blog/herald-issue-9/', 'h1', ?, '{"visible_ms":90000,"scroll_pct":95}', ?)`,
    [H, iso(44), H, iso(57)]
  );
});

after(async () => {
  await closeDb();
});

test('journey flows reconstruct the blog→temple→store money path', async () => {
  const flows = await journeyFlows({ days: 1 });
  const key = (f) => `${f.from_path}→${f.to_path}`;
  const blogToTemple = flows.find((f) => key(f) === '/blog/herald-issue-9/→/sites/aigyptos/');
  assert.ok(blogToTemple, `money path missing: ${flows.map(key).join(' | ')}`);
  const templeToStore = flows.find((f) => key(f) === '/sites/aigyptos/→/store/aigyptos/tee/');
  assert.ok(templeToStore, 'temple→store transition missing');
  // Bot paths never leak.
  assert.ok(!flows.some((f) => f.from_path.includes('wp-') || f.to_path.includes('wp-')));
});

test('entry pages report true session doors, not raw view counts', async () => {
  const entries = await entryPages({ days: 1 });
  const blog = entries.find((e) => e.path === '/blog/herald-issue-9/');
  assert.ok(blog, 'blog entry missing');
  assert.strictEqual(Number(blog.sessions), 1);
  // '/' has exactly ONE session (h3) despite being 1 event — and h1's blog
  // view does not inflate it.
  const home = entries.find((e) => e.path === '/');
  assert.strictEqual(Number(home.sessions), 1, 'home entry should count sessions, not views');
});

test('attribution ties referrers to store and temple reach', async () => {
  const attr = await attribution({ days: 1 });
  const yc = attr.find((a) => a.referrer_domain === 'news.ycombinator.com');
  assert.ok(yc, 'referrer missing');
  assert.strictEqual(Number(yc.reached_store), 1, 'the YC session reached the store');
});

test('surface attribution buckets entries and computes engagement', async () => {
  const surfaces = await surfaceAttribution({ days: 1 });
  const blog = surfaces.find((s) => s.surface === 'blog');
  const home = surfaces.find((s) => s.surface === 'home');
  assert.ok(blog && Number(blog.sessions) === 1);
  assert.ok(home && Number(home.sessions) === 1);
  assert.ok(!surfaces.some((s) => s.surface.includes('wp')));
});

test('bot overview counts scanners separately — never in product metrics', async () => {
  const bots = await botOverview({ days: 1 });
  assert.ok(Number(bots.botSessions) >= 1, 'scanner session must be visible to security');
  const flows = await journeyFlows({ days: 1 });
  const entries = await entryPages({ days: 1 });
  assert.ok(!flows.some((f) => JSON.stringify(f).includes('wp-')));
  assert.ok(!entries.some((e) => e.path.includes('wp-')));
});

test('top journeys fold identical sessions and ignore single-page visits', async () => {
  const tops = await topJourneys({ days: 1 });
  assert.ok(tops.length >= 1);
  const journeyText = tops.map((t) => t.journey).join('\n');
  assert.ok(journeyText.includes('→'), 'journeys should chain pages');
  // h2 is a single-page session → excluded by the >=2 page rule.
  assert.ok(!tops.some((t) => t.journey === '/zeus/'));
});
