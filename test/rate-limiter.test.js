/**
 * PÚNYCODEX — API Rate Limiter Tests
 */

const assert = require('node:assert');
const {
  InMemoryRateLimiter,
  RedisRateLimiter,
  checkRateLimit,
  resetLimiters,
} = require('../platform/api/api-rate-limiter.js');

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
  console.log(`\nRate Limiter: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('InMemoryRateLimiter allows requests up to the limit', () => {
  const limiter = new InMemoryRateLimiter({ maxRequests: 3, windowMs: 60_000 });
  const key = 'test-key';
  const r1 = limiter.check(key);
  const r2 = limiter.check(key);
  const r3 = limiter.check(key);
  const r4 = limiter.check(key);
  assert.strictEqual(r1.allowed, true);
  assert.strictEqual(r2.allowed, true);
  assert.strictEqual(r3.allowed, true);
  assert.strictEqual(r4.allowed, false);
  assert.strictEqual(r4.remaining, 0);
  limiter.stop();
});

test('InMemoryRateLimiter isolates keys', () => {
  const limiter = new InMemoryRateLimiter({ maxRequests: 2, windowMs: 60_000 });
  assert.strictEqual(limiter.check('a').allowed, true);
  assert.strictEqual(limiter.check('a').allowed, true);
  assert.strictEqual(limiter.check('a').allowed, false);
  assert.strictEqual(limiter.check('b').allowed, true);
  limiter.stop();
});

test('InMemoryRateLimiter handles IPv6 keys with colons', () => {
  const limiter = new InMemoryRateLimiter({ maxRequests: 2, windowMs: 60_000 });
  const ipv6 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
  assert.strictEqual(limiter.check(ipv6).allowed, true);
  assert.strictEqual(limiter.check(ipv6).allowed, true);
  assert.strictEqual(limiter.check(ipv6).allowed, false);
  // Sweep should not crash and should remove nothing because window is current.
  limiter.sweep();
  limiter.stop();
});

test('InMemoryRateLimiter sweep removes stale windows', () => {
  const limiter = new InMemoryRateLimiter({ maxRequests: 1, windowMs: 10, sweepIntervalMs: 5 });
  const key = 'sweep-key';
  limiter.check(key);
  assert.strictEqual(limiter.windows.size, 1);
  // Wait for the window to become stale.
  return new Promise((resolve) => {
    setTimeout(() => {
      limiter.sweep();
      assert.strictEqual(limiter.windows.size, 0);
      limiter.stop();
      resolve();
    }, 40);
  });
});

test('RedisRateLimiter falls back to memory when Redis is disabled', async () => {
  const limiter = new RedisRateLimiter({ maxRequests: 2, windowMs: 60_000 });
  const key = 'redis-fallback-key';
  assert.strictEqual((await limiter.check(key)).allowed, true);
  assert.strictEqual((await limiter.check(key)).allowed, true);
  assert.strictEqual((await limiter.check(key)).allowed, false);
  limiter.stop();
});

test('checkRateLimit uses tier configuration', async () => {
  resetLimiters();
  const r1 = await checkRateLimit('public-test', 'public');
  assert.strictEqual(r1.limit, 10);
  assert.strictEqual(r1.allowed, true);
});

test('unknown tier falls back to free limits', async () => {
  resetLimiters();
  const r = await checkRateLimit('unknown-tier-test', 'nonexistent');
  assert.strictEqual(r.limit, 100);
});

run();
