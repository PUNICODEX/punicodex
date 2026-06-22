/**
 * PÚNYCODEX — Result cache tests
 *
 * Verifies the in-memory result cache (and Redis-backed path when available).
 */

const assert = require('node:assert');
const {
  withResultCache,
  getCachedResult,
  setCachedResult,
  invalidateCache,
  getCacheStats,
  getResultCacheKey,
  getCacheTtl,
  isCacheEnabled,
} = require('../platform/api/cache.js');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nCache Invalidation: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('cache key is deterministic', () => {
  const key1 = getResultCacheKey({
    input: 'Áres',
    type: 'term',
    modelVersion: '2.0.6',
    policyHash: 'default',
  });
  const key2 = getResultCacheKey({
    input: 'áres',
    type: 'term',
    modelVersion: '2.0.6',
    policyHash: 'default',
  });
  assert.strictEqual(key1, key2, 'NFC normalization should make keys case-insensitive equal');
  assert.strictEqual(key1.length, 64, 'SHA-256 hex is 64 chars');
});

test('TTL depends on verdict stability', () => {
  assert.strictEqual(getCacheTtl({ verdict: 'canonical' }), 24 * 60 * 60);
  assert.strictEqual(getCacheTtl({ verdict: 'verified-variant' }), 24 * 60 * 60);
  assert.strictEqual(getCacheTtl({ verdict: 'unknown' }), 60 * 60);
  assert.strictEqual(getCacheTtl({ verdict: 'deceptive' }), 5 * 60);
  assert.strictEqual(getCacheTtl({ verdict: 'homograph-spoof' }), 5 * 60);
});

test('withResultCache returns cached result on second call', async () => {
  process.env.PUNYCODEX_CACHE = '1';
  await invalidateCache();
  let calls = 0;
  const compute = async () => {
    calls += 1;
    return { verdict: 'canonical', input: 'zeus' };
  };

  const first = await withResultCache(
    { input: 'zeus', type: 'term', modelVersion: 'v1', policyHash: 'default' },
    compute
  );
  assert.strictEqual(first._cache, 'miss');
  assert.strictEqual(calls, 1);

  const second = await withResultCache(
    { input: 'zeus', type: 'term', modelVersion: 'v1', policyHash: 'default' },
    compute
  );
  assert.strictEqual(second._cache, 'hit');
  assert.strictEqual(calls, 1);

  const stats = getCacheStats();
  assert.ok(stats.hits >= 1, 'expected at least one hit');
  assert.ok(stats.misses >= 1, 'expected at least one miss');

  delete process.env.PUNYCODEX_CACHE;
  await invalidateCache();
});

test('invalidateCache clears memory cache', async () => {
  process.env.PUNYCODEX_CACHE = '1';
  await setCachedResult('test-key', { verdict: 'safe' }, 60);
  const cached = await getCachedResult('test-key');
  assert.ok(cached, 'value should be cached');

  await invalidateCache();
  const after = await getCachedResult('test-key');
  assert.strictEqual(after, undefined, 'value should be cleared after invalidation');
  delete process.env.PUNYCODEX_CACHE;
});

test('cache is disabled by default in test environment', () => {
  const previous = process.env.PUNYCODEX_CACHE;
  delete process.env.PUNYCODEX_CACHE;
  process.env.NODE_ENV = 'test';
  assert.strictEqual(
    isCacheEnabled(),
    false,
    'cache should be disabled in test env without override'
  );
  process.env.PUNYCODEX_CACHE = '1';
  assert.strictEqual(isCacheEnabled(), true, 'override should enable cache');
  if (previous !== undefined) process.env.PUNYCODEX_CACHE = previous;
  else delete process.env.PUNYCODEX_CACHE;
});

run();
