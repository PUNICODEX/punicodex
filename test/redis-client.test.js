/**
 * Redis Client Resilience Tests
 *
 * A malformed REDIS_URL (e.g. the Upstash "redis-cli --tls -u <url>" console
 * string pasted verbatim) threw inside `new Redis()` at construction time,
 * taking down every rate-limited endpoint with ERR_INVALID_URL. The client
 * must instead disable Redis and fall back to the in-memory path.
 *
 * Run: node test/redis-client.test.js
 */

const assert = require('node:assert');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const MANGLED_UPSTASH_CLI_STRING =
  'redis://redis-cli --tls -u redis://default:TOKEN@informed-lark-170646.upstash.io:6379';

test('getRedisClient returns null (does not throw) on a malformed REDIS_URL', () => {
  const {
    getRedisClient,
    isRedisEnabled,
    resetRedisClient,
  } = require('../platform/api/redis-client');
  resetRedisClient();
  process.env.REDIS_URL = MANGLED_UPSTASH_CLI_STRING;

  let client;
  assert.doesNotThrow(() => {
    client = getRedisClient();
  });
  assert.strictEqual(client, null);
  assert.strictEqual(isRedisEnabled(), false);
  resetRedisClient();
});

test('a well-formed REDIS_URL still creates a lazy client (no connection attempted)', () => {
  const {
    getRedisClient,
    isRedisEnabled,
    resetRedisClient,
  } = require('../platform/api/redis-client');
  resetRedisClient();
  process.env.REDIS_URL = 'rediss://default:token@host.example.com:6379';

  const client = getRedisClient();
  assert.ok(client, 'expected a client instance');
  assert.strictEqual(isRedisEnabled(), true);
  // lazyConnect: status must not have started connecting
  assert.strictEqual(client.status, 'wait');
  resetRedisClient();
});

test('no REDIS_URL at all returns null without touching Redis', () => {
  const {
    getRedisClient,
    isRedisEnabled,
    resetRedisClient,
  } = require('../platform/api/redis-client');
  resetRedisClient();
  delete process.env.REDIS_URL;

  assert.strictEqual(getRedisClient(), null);
  assert.strictEqual(isRedisEnabled(), false);
  resetRedisClient();
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}
delete process.env.REDIS_URL;
console.log(`\nRedis Client Resilience: ${tests.length - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
