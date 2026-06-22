/**
 * PÚNYCODEX — Domain Parser Tests
 */

const assert = require('node:assert');
const { parseDomain, decodePuny, isIPv4Literal } = require('../platform/api/domain-parser');

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
  console.log(`\nDomain Parser: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('parses simple com domain', () => {
  const r = parseDomain('example.com');
  assert.strictEqual(r.hostname, 'example.com');
  assert.strictEqual(r.domain, 'example.com');
  assert.strictEqual(r.etld, 'com');
  assert.strictEqual(r.subdomain, null);
  assert.strictEqual(r.isIp, false);
});

test('parses subdomain for co.uk', () => {
  const r = parseDomain('foo.bar.co.uk');
  assert.strictEqual(r.etld, 'co.uk');
  assert.strictEqual(r.domain, 'bar.co.uk');
  assert.strictEqual(r.subdomain, 'foo');
});

test('strips scheme, port, path and query', () => {
  const r = parseDomain('https://sub.site.com:8080/path?query=1');
  assert.strictEqual(r.hostname, 'sub.site.com');
  assert.strictEqual(r.domain, 'site.com');
  assert.strictEqual(r.subdomain, 'sub');
});

test('decodes punycode labels', () => {
  const r = parseDomain('xn--pple-43d.com');
  assert.strictEqual(r.isPunycode, true);
  assert.deepStrictEqual(r.decodedLabels, ['аpple', 'com']);
});

test('detects IPv4 literal', () => {
  const r = parseDomain('192.168.1.1');
  assert.strictEqual(r.isIp, true);
  assert.strictEqual(r.domain, null);
  assert.strictEqual(r.etld, null);
});

test('rejects invalid IPv4', () => {
  const r = parseDomain('256.1.1.1');
  assert.strictEqual(r.isIp, false);
  assert.strictEqual(r.etld, '1');
  assert.strictEqual(r.domain, '1.1');
});

test('falls back to last two labels for unknown TLD', () => {
  const r = parseDomain('foo.bar.baz');
  assert.strictEqual(r.domain, 'bar.baz');
  assert.strictEqual(r.etld, 'baz');
  assert.strictEqual(r.subdomain, 'foo');
});

test('handles bare public suffix', () => {
  const r = parseDomain('com');
  assert.strictEqual(r.etld, 'com');
  assert.strictEqual(r.domain, null);
});

test('decodes punycode subdomain', () => {
  const r = parseDomain('xn--pple-43d.xn--pple-43d.com');
  assert.strictEqual(r.isPunycode, true);
  assert.strictEqual(r.domain, 'xn--pple-43d.com');
  assert.strictEqual(r.subdomain, 'xn--pple-43d');
});

test('decodePuny returns ASCII labels unchanged', () => {
  assert.strictEqual(decodePuny('example'), 'example');
});

test('isIPv4Literal true for valid address', () => {
  assert.strictEqual(isIPv4Literal('127.0.0.1'), true);
  assert.strictEqual(isIPv4Literal('0.0.0.0'), true);
});

test('isIPv4Literal false for hostname', () => {
  assert.strictEqual(isIPv4Literal('example.com'), false);
  assert.strictEqual(isIPv4Literal('1.2.3'), false);
});

test('normalizes to lowercase', () => {
  const r = parseDomain('EXAMPLE.COM');
  assert.strictEqual(r.hostname, 'example.com');
});

test('handles empty input', () => {
  const r = parseDomain('');
  assert.strictEqual(r.hostname, '');
  assert.strictEqual(r.domain, null);
  assert.deepStrictEqual(r.labels, []);
});

run();
