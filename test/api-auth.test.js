/**
 * PÚNYCODEX — API Auth Helper Tests
 */

const assert = require('node:assert');
const { extractBearer, normalizeIp, hashKey } = require('../platform/api/api-auth.js');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nAPI Auth: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('extractBearer returns the token from a Bearer header', () => {
  assert.strictEqual(extractBearer({ headers: { authorization: 'Bearer abc123' } }), 'abc123');
});

test('extractBearer is case-insensitive for Bearer prefix', () => {
  assert.strictEqual(extractBearer({ headers: { authorization: 'bearer ABC' } }), 'ABC');
});

test('extractBearer returns null for non-Bearer auth', () => {
  assert.strictEqual(extractBearer({ headers: { authorization: 'Basic abc' } }), null);
  assert.strictEqual(extractBearer({ headers: {} }), null);
});

test('normalizeIp strips IPv4 port', () => {
  assert.strictEqual(normalizeIp('127.0.0.1:3000'), '127.0.0.1');
});

test('normalizeIp strips IPv6 port', () => {
  assert.strictEqual(normalizeIp('[::1]:3000'), '::1');
  assert.strictEqual(normalizeIp('[2001:db8::1]:443'), '2001:db8::1');
});

test('normalizeIp preserves bare IPv6', () => {
  assert.strictEqual(normalizeIp('2001:db8::1'), '2001:db8::1');
  assert.strictEqual(normalizeIp('::1'), '::1');
});

test('normalizeIp handles unknown and empty inputs', () => {
  assert.strictEqual(normalizeIp('unknown'), 'unknown');
  assert.strictEqual(normalizeIp(''), 'unknown');
  assert.strictEqual(normalizeIp(null), 'unknown');
});

test('hashKey produces a deterministic SHA-256 hex string', () => {
  const a = hashKey('same');
  const b = hashKey('same');
  const c = hashKey('different');
  assert.strictEqual(a, b);
  assert.notStrictEqual(a, c);
  assert.strictEqual(a.length, 64);
});

run();
