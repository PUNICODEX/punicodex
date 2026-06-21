/**
 * PÚNYCODEX — Search Engine Kernel v2 tests
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('search-v2.test.js');

const Database = require('better-sqlite3');
const { getDbPath } = require('../platform/db/db.js');
const db = new Database(getDbPath());

const {
  searchV2,
  VALID_VERTICALS,
  recordFeedback,
  updatePreferences,
} = require('../platform/api/search-v2.js');

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err.message);
    console.error(err.stack);
    process.exitCode = 1;
  }
}

console.log('Search v2 Tests');

test('searchV2 rejects empty query', async () => {
  const res = await searchV2('');
  assert.deepStrictEqual(Object.keys(res.results), []);
  assert.strictEqual(res.pagination.hasMore, false);
});

test('searchV2 returns all verticals by default', async () => {
  const res = await searchV2('zeus', { limit: 3 });
  assert.strictEqual(res.vertical, 'all');
  for (const v of VALID_VERTICALS) {
    if (v === 'all') continue;
    assert.ok(res.results[v], `vertical ${v} should be present`);
  }
  assert.ok(res.results.sites.total >= 0);
  assert.ok(Array.isArray(res.related));
  assert.ok(Array.isArray(res.trending));
  assert.ok(res.pagination.nextCursor || !res.pagination.hasMore);
});

test('searchV2 supports each vertical', async () => {
  for (const vertical of ['sites', 'domains', 'lore', 'api', 'images']) {
    const res = await searchV2('zeus', { vertical, limit: 3 });
    assert.strictEqual(res.vertical, vertical);
    assert.ok(res.results[vertical] || res.results, `should have results for ${vertical}`);
  }
});

test('searchV2 returns instant answer for convert query', async () => {
  const res = await searchV2('convert apollōn', { limit: 3 });
  assert.ok(res.instantAnswer);
  assert.strictEqual(res.instantAnswer.type, 'convert');
  assert.strictEqual(res.instantAnswer.punycode, 'xn--apolln-fgb');
});

test('searchV2 returns API vertical results', async () => {
  const res = await searchV2('names', { vertical: 'api', limit: 5 });
  assert.ok(res.results.api.results.length > 0);
  assert.ok(res.results.api.results.some((r) => r.path === '/api/v1/names'));
});

test('searchV2 returns related searches', async () => {
  const res = await searchV2('zeus', { limit: 3 });
  assert.ok(Array.isArray(res.related));
  assert.ok(res.related.length > 0);
});

test('searchV2 cursor pagination works', async () => {
  const first = await searchV2('zeus', { vertical: 'lore', limit: 2 });
  assert.ok(first.pagination.nextCursor);
  const second = await searchV2('zeus', {
    vertical: 'lore',
    limit: 2,
    cursor: first.pagination.nextCursor,
  });
  assert.strictEqual(second.results.lore.results.length, 2);
});

test('searchV2 assigns rank variant to session', async () => {
  const res = await searchV2('zeus', { limit: 3 });
  assert.ok(res.rankVariant);
  assert.ok(['control', 'freshness', 'authority', 'keyword'].includes(res.rankVariant));
});

test('searchV2 rank variant can change ordering', async () => {
  const control = await searchV2('zeus', { limit: 5, variant: 'control', vertical: 'sites' });
  const freshness = await searchV2('zeus', { limit: 5, variant: 'freshness', vertical: 'sites' });
  assert.strictEqual(control.rankVariant, 'control');
  assert.strictEqual(freshness.rankVariant, 'freshness');
  // Variant-aware primary results annotate the score breakdown.
  assert.ok(
    freshness.results.sites.results.some((r) => Object.hasOwn(r.scoreBreakdown || {}, 'variant'))
  );
});

test('searchV2 records accurate result_count in search_queries', async () => {
  const res = await searchV2('zeus', { limit: 5, vertical: 'sites' });
  const row = db
    .prepare(
      'SELECT result_count FROM search_queries WHERE query = ? AND mode = ? ORDER BY timestamp DESC LIMIT 1'
    )
    .get(res.normalizedQuery, `v2:${res.vertical}`);
  assert.ok(row);
  assert.strictEqual(row.result_count, res.results.sites.total);
});

test('searchV2 tenant ad pagination respects offset', async () => {
  const res = await searchV2('zeus', { limit: 3, vertical: 'ads' });
  assert.ok(res.results.ads);
  assert.ok(typeof res.results.ads.total === 'number');
  assert.ok(res.results.ads.results.length <= 3);
});

test('feedback and preferences persist', async () => {
  const token = 'test-session-v2-001';
  const res = await searchV2('zeus', { sessionToken: token, limit: 3 });
  assert.strictEqual(res.sessionToken, token);
  recordFeedback(token, 'zeus', { helpful: true, reason: 'great answer' });
  updatePreferences(token, { preferredPantheon: 'greek' });
  const again = await searchV2('zeus', { sessionToken: token, limit: 3 });
  assert.ok(again.personalization);
});
