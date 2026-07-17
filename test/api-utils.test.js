/**
 * API Utility Tests
 *
 * Covers CORS, admin/cron auth guards, and route parameter parsing.
 */

const assert = require('node:assert');

process.env.CRON_SECRET = 'cron-secret-for-tests';

const { setCors, requireAdmin, requireCronSecret, getRouteParam } = require('../api/_utils.js');

function mockRes() {
  const res = { headers: {}, statusCode: 200, body: undefined };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.setHeader = (k, v) => {
    res.headers[k] = v;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  res.send = (data) => {
    res.body = data;
    return res;
  };
  res.end = () => res;
  res.redirect = (url) => {
    res.redirectUrl = url;
    return res;
  };
  return res;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n▸ API Utils Tests\n');
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
  console.log(`\nAPI Utils: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('setCors allows whitelisted origins with credentials', () => {
  const res = mockRes();
  setCors({ headers: { origin: 'https://punicodex.com' } }, res);
  assert.strictEqual(res.headers['Access-Control-Allow-Origin'], 'https://punicodex.com');
  assert.strictEqual(res.headers['Access-Control-Allow-Credentials'], 'true');
});

test('setCors omits allow-origin for unknown origins', () => {
  const res = mockRes();
  setCors({ headers: { origin: 'https://evil.com' } }, res);
  assert.strictEqual(res.headers['Access-Control-Allow-Origin'], undefined);
});

test('setCors sets expected methods and headers', () => {
  const res = mockRes();
  setCors({ headers: {} }, res);
  assert.strictEqual(res.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
  assert.ok(res.headers['Access-Control-Allow-Headers'].includes('x-admin-token'));
  assert.ok(res.headers['Access-Control-Allow-Headers'].includes('x-cron-secret'));
});

test('requireAdmin rejects missing token', async () => {
  const res = mockRes();
  const ok = await requireAdmin({ headers: {} }, res);
  assert.strictEqual(ok, false);
  assert.strictEqual(res.statusCode, 401);
});

test('requireCronSecret rejects missing secret', () => {
  const res = mockRes();
  const ok = requireCronSecret({ headers: {} }, res);
  assert.strictEqual(ok, false);
  assert.strictEqual(res.statusCode, 401);
});

test('requireCronSecret rejects wrong secret', () => {
  const res = mockRes();
  const ok = requireCronSecret({ headers: { 'x-cron-secret': 'wrong' } }, res);
  assert.strictEqual(ok, false);
  assert.strictEqual(res.statusCode, 401);
});

test('requireCronSecret accepts correct secret', () => {
  const res = mockRes();
  const ok = requireCronSecret({ headers: { 'x-cron-secret': process.env.CRON_SECRET } }, res);
  assert.strictEqual(ok, true);
});

test('requireCronSecret does not throw on length mismatch', () => {
  const res = mockRes();
  assert.doesNotThrow(() => requireCronSecret({ headers: { 'x-cron-secret': 'short' } }, res));
});

test('getRouteParam reads query and params', () => {
  assert.strictEqual(getRouteParam({ query: { id: '42' } }, 'id'), '42');
  assert.strictEqual(getRouteParam({ params: { id: '43' } }, 'id'), '43');
  assert.strictEqual(getRouteParam({ query: {}, params: {} }, 'id'), undefined);
});

run();
