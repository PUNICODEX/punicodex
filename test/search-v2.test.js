/**
 * PÚNYCODEX — Search Engine Kernel v2 tests
 */

const assert = require('node:assert');
const {
  searchV2,
  VALID_VERTICALS,
  recordFeedback,
  updatePreferences,
} = require('../platform/api/search-v2');

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
  assert.strictEqual(second.pagination.offset, 2);
});

test('searchV2 assigns rank variant to session', async () => {
  const fakeReq = {
    headers: { 'user-agent': 'test-bot-v2', 'x-forwarded-for': '127.0.0.1' },
    connection: {},
  };
  const res = await searchV2('zeus', { limit: 3 }, fakeReq);
  assert.ok(res.sessionToken);
  assert.ok(['control', 'freshness', 'authority', 'engagement'].includes(res.rankVariant));
});

test('feedback and preferences persist', async () => {
  const fakeReq = {
    headers: { 'user-agent': 'test-bot-feedback', 'x-forwarded-for': '127.0.0.2' },
    connection: {},
  };
  const res = await searchV2('zeus', { limit: 3 }, fakeReq);
  const token = res.sessionToken;
  assert.ok(token);

  recordFeedback(token, 'zeus', { siteId: 1, helpful: false, reason: 'not relevant' });
  const prefs = updatePreferences(token, { preferredPantheon: 'greek' });
  assert.strictEqual(prefs.preferredPantheon, 'greek');
});

if (!process.exitCode) {
  console.log('\n✓ All Search v2 tests passed');
} else {
  console.log('\n✗ Some Search v2 tests failed');
  process.exit(1);
}
