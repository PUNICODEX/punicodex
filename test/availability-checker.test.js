/**
 * Availability Checker Tests
 *
 * Mocks DNS and HTTP so the checker can be tested without real network calls.
 */

const assert = require('node:assert');
const dns = require('node:dns');

const { checkDomain, checkBulk } = require('../platform/api/availability-checker.js');

let resolve4Calls = [];
let lookupCalls = [];
let fetchCalls = [];

function resetMocks() {
  resolve4Calls = [];
  lookupCalls = [];
  fetchCalls = [];
}

dns.resolve4 = (domain, cb) => {
  resolve4Calls.push(domain);
  if (domain === 'nxdomain.test') {
    const err = new Error('queryA ENOTFOUND nxdomain.test');
    err.code = 'ENOTFOUND';
    return cb(err);
  }
  if (domain === 'dns-error.test') {
    const err = new Error('some dns failure');
    err.code = 'ESERVFAIL';
    return cb(err);
  }
  if (domain === 'timeout.test') {
    // never calls back
    return;
  }
  return cb(null, ['1.2.3.4']);
};

dns.lookup = (domain, cb) => {
  lookupCalls.push(domain);
  if (domain === 'nxdomain.test') {
    const err = new Error('getaddrinfo ENOTFOUND');
    err.code = 'ENOTFOUND';
    return cb(err);
  }
  if (domain === 'dns-error.test') {
    const err = new Error('getaddrinfo ESERVFAIL');
    err.code = 'ESERVFAIL';
    return cb(err);
  }
  if (domain === 'timeout.test') {
    return;
  }
  return cb(null, '1.2.3.4');
};

const originalFetch = global.fetch;
global.fetch = async (url) => {
  fetchCalls.push(url);
  const protocol = url.startsWith('https') ? 'https' : 'http';
  const domain = new URL(url).hostname;

  if (domain === 'live-html.test') {
    return {
      status: 200,
      headers: { get: (h) => (h === 'content-type' ? 'text/html; charset=utf-8' : null) },
    };
  }
  if (domain === 'non-html.test') {
    return {
      status: 200,
      headers: { get: (h) => (h === 'content-type' ? 'application/json' : null) },
    };
  }
  if (domain === 'http-only.test') {
    if (protocol === 'https') throw Object.assign(new Error('fetch failed'), { name: 'TypeError' });
    return {
      status: 200,
      headers: { get: (h) => (h === 'content-type' ? 'text/html' : null) },
    };
  }
  throw Object.assign(new Error('fetch failed'), { name: 'TypeError' });
};

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n▸ Availability Checker Tests\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    resetMocks();
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
  console.log(`\nAvailability Checker: ${passed} passed, ${failed} failed`);
  global.fetch = originalFetch;
  process.exit(failed > 0 ? 1 : 0);
}

test('NXDOMAIN returns available', async () => {
  const result = await checkDomain('nxdomain.test');
  assert.strictEqual(result.status, 'available');
  assert.strictEqual(result.details, 'NXDOMAIN');
});

test('transient DNS error returns unknown', async () => {
  const result = await checkDomain('dns-error.test');
  assert.strictEqual(result.status, 'unknown');
  assert.ok(result.details.includes('DNS'));
});

test('DNS timeout returns unknown', async () => {
  const result = await checkDomain('timeout.test');
  assert.strictEqual(result.status, 'unknown');
  assert.ok(result.details.includes('timeout'));
});

test('resolving domain with HTML response returns live', async () => {
  const result = await checkDomain('live-html.test');
  assert.strictEqual(result.status, 'live');
  assert.strictEqual(result.httpStatus, 200);
  assert.strictEqual(result.protocol, 'https');
});

test('resolving domain with non-HTML response returns registered', async () => {
  const result = await checkDomain('non-html.test');
  assert.strictEqual(result.status, 'registered');
  assert.strictEqual(result.httpStatus, 200);
});

test('falls back from https to http', async () => {
  const result = await checkDomain('http-only.test');
  assert.strictEqual(result.status, 'live');
  assert.strictEqual(result.protocol, 'http');
  assert.ok(fetchCalls.some((u) => u.startsWith('https://http-only.test')));
  assert.ok(fetchCalls.some((u) => u.startsWith('http://http-only.test')));
});

test('checkBulk returns one result per domain', async () => {
  resetMocks();
  const results = await checkBulk(['nxdomain.test', 'live-html.test'], 2);
  assert.strictEqual(results.length, 2);
  const statuses = results.map((r) => r.status);
  assert.ok(statuses.includes('available'));
  assert.ok(statuses.includes('live'));
});

run();
