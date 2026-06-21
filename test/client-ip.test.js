/**
 * Client IP Extraction Tests
 */

const assert = require('node:assert');
const { getClientIp } = require('../platform/api/client-ip.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  console.log('\n▸ Client IP Tests\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nClient IP: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('prefers left-most X-Forwarded-For value', () => {
  const req = { headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.2' }, connection: {} };
  assert.strictEqual(getClientIp(req), '203.0.113.1');
});

test('falls back to X-Real-IP', () => {
  const req = { headers: { 'x-real-ip': '192.168.1.1' }, connection: {} };
  assert.strictEqual(getClientIp(req), '192.168.1.1');
});

test('falls back to req.ip', () => {
  const req = { ip: '10.0.0.1', connection: {} };
  assert.strictEqual(getClientIp(req), '10.0.0.1');
});

test('falls back to connection remoteAddress', () => {
  const req = { connection: { remoteAddress: '127.0.0.1' } };
  assert.strictEqual(getClientIp(req), '127.0.0.1');
});

test('falls back to socket remoteAddress', () => {
  const req = { socket: { remoteAddress: '::1' } };
  assert.strictEqual(getClientIp(req), '::1');
});

test('returns unknown when no address is available', () => {
  const req = {};
  assert.strictEqual(getClientIp(req), 'unknown');
});

run();
