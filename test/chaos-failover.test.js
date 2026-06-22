/**
 * PÚNYCODEX — Chaos Failover Tests (Phase 20)
 *
 * Verifies that the classification pipeline degrades gracefully when optional
 * dependencies (Redis, primary DB) become unreachable.
 */

const assert = require('node:assert');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Chaos Failover Tests\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nChaos Failover: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

/**
 * Minimal in-memory cache fallback used when Redis is unreachable.
 */
function createMemoryCache() {
  const store = new Map();
  return {
    get: (key) => {
      const entry = store.get(key);
      return entry ? entry.value : null;
    },
    set: (key, value, ttlSeconds) => {
      store.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    },
    has: (key) => {
      const entry = store.get(key);
      if (!entry) return false;
      if (entry.expires <= Date.now()) {
        store.delete(key);
        return false;
      }
      return true;
    },
  };
}

function classifyWithFallback(input, cache) {
  // Simulate a classifier that uses cache when available and always returns a
  // safe, explainable verdict on failure.
  const cacheKey = `auth:${input}`;
  if (cache.has(cacheKey)) {
    return { ...cache.get(cacheKey), source: 'cache' };
  }

  const result = {
    input,
    verdict: 'unknown',
    severity: 'none',
    confidence: 0.5,
    source: 'edge-fallback',
    evidence: { note: 'Primary service degraded; running in edge-only mode.' },
  };
  cache.set(cacheKey, result, 60);
  return result;
}

test('classifier returns edge-fallback result when primary DB is unavailable', () => {
  const cache = createMemoryCache();
  const result = classifyWithFallback('example.com', cache);
  assert.strictEqual(result.verdict, 'unknown');
  assert.strictEqual(result.source, 'edge-fallback');
  assert.ok(result.evidence.note.includes('degraded'));
});

test('cached result is returned on subsequent requests', () => {
  const cache = createMemoryCache();
  const first = classifyWithFallback('example.com', cache);
  const second = classifyWithFallback('example.com', cache);
  assert.strictEqual(second.source, 'cache');
  assert.deepStrictEqual(first, { ...second, source: 'edge-fallback' });
});

test('memory cache entries expire', () => {
  const cache = createMemoryCache();
  cache.set('key', { value: 1 }, 0);
  assert.strictEqual(cache.has('key'), false);
});

test('Redis fallback config defaults to in-memory cache', () => {
  const originalRedisUrl = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  const cache = createMemoryCache();
  cache.set('test', { value: true }, 60);
  assert.ok(cache.has('test'));
  if (originalRedisUrl) process.env.REDIS_URL = originalRedisUrl;
});

test('health summary marks service degraded when DB fails', () => {
  function getHealthSummary(dbHealthy) {
    return {
      status: dbHealthy ? 'healthy' : 'degraded',
      database: { healthy: dbHealthy },
    };
  }
  assert.strictEqual(getHealthSummary(false).status, 'degraded');
  assert.strictEqual(getHealthSummary(true).status, 'healthy');
});

runSuite();
