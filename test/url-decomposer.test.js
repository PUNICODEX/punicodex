/**
 * PuniCodex — URL Decomposer Tests
 */

const assert = require('node:assert');
const { decomposeUrl } = require('../platform/api/url-decomposer');

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
  console.log(`\nURL Decomposer: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('parses https://example.com', () => {
  const r = decomposeUrl('https://example.com');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.protocol.value, 'https');
  assert.strictEqual(r.protocol.secure, true);
  assert.strictEqual(r.protocol.risk, 'none');
  assert.strictEqual(r.hostname.value, 'example.com');
  assert.deepStrictEqual(r.hostname.labels, ['example', 'com']);
  assert.deepStrictEqual(r.hostname.decodedLabels, ['example', 'com']);
  assert.strictEqual(r.hostname.registrableDomain, 'example.com');
  assert.strictEqual(r.hostname.etld, 'com');
  assert.strictEqual(r.hostname.risk, 'none');
  assert.strictEqual(r.port.value, null);
  assert.strictEqual(r.port.declared, false);
  assert.deepStrictEqual(r.path.segments, []);
  assert.deepStrictEqual(r.query.params, []);
  assert.strictEqual(r.fragment.value, null);
  assert.strictEqual(r.isIp, false);
});

test('detects http protocol as insecure', () => {
  const r = decomposeUrl('http://example.com');
  assert.strictEqual(r.protocol.value, 'http');
  assert.strictEqual(r.protocol.secure, false);
  assert.strictEqual(r.protocol.risk, 'insecure');
});

test('detects userinfo credentials', () => {
  const r = decomposeUrl('https://admin:secret@example.com');
  assert.strictEqual(r.userinfo.value, 'admin:secret');
  assert.strictEqual(r.userinfo.risk, 'warning');
  assert.strictEqual(r.obfuscation.credentialInUserinfo, true);
});

test('detects IP literal', () => {
  const r = decomposeUrl('https://192.168.1.1/path');
  assert.strictEqual(r.isIp, true);
  assert.strictEqual(r.hostname.value, '192.168.1.1');
  assert.strictEqual(r.hostname.risk, 'medium');
});

test('decodes punycode hostname', () => {
  const r = decomposeUrl('https://xn--pple-43d.com');
  assert.deepStrictEqual(r.hostname.labels, ['xn--pple-43d', 'com']);
  assert.deepStrictEqual(r.hostname.decodedLabels, ['аpple', 'com']);
  assert.strictEqual(r.hostname.risk, 'medium');
});

test('detects percent-encoded path', () => {
  const r = decomposeUrl('https://example.com/%61%70%70%6C%65');
  assert.strictEqual(r.path.segments[0], '%61%70%70%6C%65');
  assert.strictEqual(r.path.risk, 'medium');
  assert.strictEqual(r.obfuscation.percentEncoded, true);
});

test('detects percent-encoded query', () => {
  const r = decomposeUrl('https://example.com/?q=%61pple');
  assert.strictEqual(r.query.params[0].value, 'apple');
  assert.strictEqual(r.query.risk, 'medium');
});

test('detects RTL override', () => {
  const r = decomposeUrl('https://example.com/\u202eprofile');
  assert.strictEqual(r.obfuscation.rtlOverride, true);
});

test('detects mixed punycode labels', () => {
  const r = decomposeUrl('https://xn--pple-43d.example.com');
  assert.strictEqual(r.obfuscation.mixedPunycode, true);
  assert.strictEqual(r.hostname.risk, 'high');
});

test('detects suspicious port', () => {
  const r = decomposeUrl('https://example.com:1337');
  assert.strictEqual(r.port.value, 1337);
  assert.strictEqual(r.port.declared, true);
  assert.strictEqual(r.port.risk, 'warning');
});

test('marks common ports as safe', () => {
  const r = decomposeUrl('https://example.com:8080');
  assert.strictEqual(r.port.value, 8080);
  assert.strictEqual(r.port.risk, 'none');
});

test('detects suspicious path segment', () => {
  const r = decomposeUrl('https://evil.com/login');
  assert.strictEqual(r.path.segments[0], 'login');
  assert.strictEqual(r.path.risk, 'high');
});

test('detects redirect query parameter', () => {
  const r = decomposeUrl('https://example.com/?next=https://evil.com');
  assert.strictEqual(r.query.risk, 'high');
});

test('handles invalid URL gracefully', () => {
  const r = decomposeUrl('not a url');
  assert.strictEqual(r.valid, false);
  assert.strictEqual(r.hostname.value, null);
});

test('exposes pathname and search', () => {
  const r = decomposeUrl('https://example.com/foo?bar=1#baz');
  assert.strictEqual(r.pathname, '/foo');
  assert.strictEqual(r.search, '?bar=1');
  assert.strictEqual(r.fragment.value, 'baz');
});

run();
