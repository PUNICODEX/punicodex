/**
 * Admin Authentication & Stats Tests
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-admin-password-for-ci';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const {
  login,
  validateAdminToken,
  revokeToken,
  getBookingStats,
  getRevenueStats,
  hashToken,
} = require('../platform/api/admin.js');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n▸ Admin Tests\n');
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
  console.log(`\nAdmin: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('login fails without configured password', async () => {
  const original = process.env.ADMIN_PASSWORD;
  delete process.env.ADMIN_PASSWORD;
  const result = await login('anything');
  assert.strictEqual(result.success, false);
  process.env.ADMIN_PASSWORD = original;
});

test('login rejects wrong password', async () => {
  const result = await login('definitely-wrong');
  assert.strictEqual(result.success, false);
  assert.ok(result.error);
});

test('login succeeds and returns a token', async () => {
  const result = await login(process.env.ADMIN_PASSWORD);
  assert.strictEqual(result.success, true);
  assert.ok(result.token);
  assert.strictEqual(result.token.length, 64);
  assert.strictEqual(await validateAdminToken(result.token), true);
});

test('validateAdminToken rejects unknown tokens', async () => {
  assert.strictEqual(await validateAdminToken('not-a-real-token'), false);
  assert.strictEqual(await validateAdminToken(''), false);
  assert.strictEqual(await validateAdminToken(null), false);
});

test('revokeToken invalidates a session', async () => {
  const { token } = await login(process.env.ADMIN_PASSWORD);
  assert.strictEqual(await validateAdminToken(token), true);
  await revokeToken(token);
  assert.strictEqual(await validateAdminToken(token), false);
});

test('expired tokens are rejected', async () => {
  const { token } = await login(process.env.ADMIN_PASSWORD);
  const db = new Database(getTestDbPath(__filename));
  db.prepare(
    "UPDATE admin_sessions SET expires_at = datetime('now', '-1 day') WHERE token = ?"
  ).run(hashToken(token));
  db.close();
  assert.strictEqual(await validateAdminToken(token), false);
});

test('getBookingStats returns zeroed defaults', async () => {
  const stats = await getBookingStats();
  assert.strictEqual(typeof stats.totalLive, 'number');
  assert.strictEqual(typeof stats.totalPending, 'number');
  assert.strictEqual(typeof stats.revenueCents, 'number');
  assert.strictEqual(stats.totalLive, 0);
  assert.strictEqual(stats.totalPending, 0);
});

test('getBookingStats filters by site slug', async () => {
  const stats = await getBookingStats('nike');
  assert.strictEqual(typeof stats.totalLive, 'number');
});

test('getRevenueStats returns daily series', async () => {
  const stats = await getRevenueStats(7);
  assert.strictEqual(stats.days, 7);
  assert.strictEqual(stats.daily.length, 7);
  assert.strictEqual(typeof stats.totalRevenueCents, 'number');
  assert.ok(/^\d+\.\d{2}$/.test(stats.totalRevenueDollars));
});

run();
