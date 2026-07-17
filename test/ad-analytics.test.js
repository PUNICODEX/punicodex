/**
 * Ad Analytics Tests
 *
 * Covers pixel, click, viewability, and dashboard flows end-to-end.
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');

process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const {
  trackPixel,
  trackClick,
  trackViewability,
  getDashboard,
  isSafeRedirectUrl,
  GIF_BUFFER,
} = require('../platform/api/ad-analytics.js');
const { createBooking, goLive } = require('../platform/api/bookings.js');
const { getIndividualSlotIds } = require('./helpers/slots.js');

function mockReq(overrides = {}) {
  return {
    headers: {},
    ip: '127.0.0.1',
    connection: { remoteAddress: '127.0.0.1' },
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
}

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.headers = {};
  res.body = null;
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.setHeader = (k, v) => {
    res.headers[k] = v;
  };
  res.send = (data) => {
    res.body = data;
    return res;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  res.redirect = (url) => {
    res.redirectUrl = url;
    return res;
  };
  return res;
}

const nikeSlotIds = getIndividualSlotIds(__filename, 'nike');
let nextAdSlotIndex = 0;

async function makeLiveBooking(email = 'adtest@example.com') {
  const slotId = nikeSlotIds[nextAdSlotIndex++];
  const { id, token } = await createBooking({
    slotId,
    email,
    companyName: 'Ad Test Co',
    websiteUrl: 'https://example.com',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET status = 'approved' WHERE id = ?").run(id);
  db.close();
  await goLive(id);
  return { id, token };
}

function countEvents(bookingId, eventType) {
  const db = new Database(getTestDbPath(__filename));
  const row = db
    .prepare('SELECT COUNT(*) as c FROM analytics_events WHERE booking_id = ? AND event_type = ?')
    .get(bookingId, eventType);
  db.close();
  return row.c;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n▸ Ad Analytics Tests\n');
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
  console.log(`\nAd Analytics: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// isSafeRedirectUrl unit tests
test('isSafeRedirectUrl allows absolute same-origin paths', () => {
  assert.strictEqual(isSafeRedirectUrl('/sites/zeus', 'https://punicodex.com'), true);
});

test('isSafeRedirectUrl allows full same-origin URLs', () => {
  assert.strictEqual(
    isSafeRedirectUrl('https://punicodex.com/sites/zeus', 'https://punicodex.com'),
    true
  );
});

test('isSafeRedirectUrl allows external URLs', () => {
  assert.strictEqual(isSafeRedirectUrl('https://example.com/ad', 'https://punicodex.com'), true);
});

test('isSafeRedirectUrl rejects non-http protocols', () => {
  assert.strictEqual(isSafeRedirectUrl('javascript:alert(1)', 'https://punicodex.com'), false);
  assert.strictEqual(isSafeRedirectUrl('ftp://punicodex.com/file', 'https://punicodex.com'), false);
});

test('isSafeRedirectUrl rejects malformed URLs', () => {
  assert.strictEqual(isSafeRedirectUrl('::::', 'https://punicodex.com'), false);
  assert.strictEqual(isSafeRedirectUrl('', 'https://punicodex.com'), false);
});

test('isSafeRedirectUrl falls back to PLATFORM_URL env', () => {
  assert.strictEqual(isSafeRedirectUrl('https://punicodex.com/ok'), true);
});

// Pixel tests
test('trackPixel returns a 1x1 GIF for any token', async () => {
  const res = mockRes();
  await trackPixel('nonsense', mockReq(), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.headers['Content-Type'], 'image/gif');
  assert.ok(Buffer.isBuffer(res.body));
  assert.strictEqual(res.body.toString('base64'), GIF_BUFFER.toString('base64'));
});

test('trackPixel records an impression for a live booking', async () => {
  const { id, token } = await makeLiveBooking('pixel@example.com');
  const res = mockRes();
  await trackPixel(token, mockReq({ headers: { 'user-agent': 'test-bot/1.0' } }), res);
  assert.strictEqual(countEvents(id, 'impression'), 1);
});

// Click tests
test('trackClick rejects missing parameters', async () => {
  const res = mockRes();
  await trackClick(null, '/ok', mockReq(), res);
  assert.strictEqual(res.statusCode, 400);
});

test('trackClick rejects unsafe non-http URLs', async () => {
  const res = mockRes();
  await trackClick('tok', 'javascript:alert(1)', mockReq(), res);
  assert.strictEqual(res.statusCode, 400);
});

test('trackClick records click and redirects for live booking', async () => {
  const { id, token } = await makeLiveBooking('click@example.com');
  const res = mockRes();
  await trackClick(
    token,
    '/sites/zeus',
    mockReq({ headers: { referer: 'https://punicodex.com' } }),
    res
  );
  assert.strictEqual(res.redirectUrl, '/sites/zeus');
  assert.strictEqual(countEvents(id, 'click'), 1);
});

// Viewability tests
test('trackViewability rejects missing token', async () => {
  const res = mockRes();
  await trackViewability(null, 2, 75, mockReq(), res);
  assert.strictEqual(res.statusCode, 400);
});

test('trackViewability rejects below-threshold input', async () => {
  const res = mockRes();
  await trackViewability('tok', 0.5, 75, mockReq(), res);
  assert.strictEqual(res.statusCode, 400);
  const res2 = mockRes();
  await trackViewability('tok', 2, 25, mockReq(), res2);
  assert.strictEqual(res2.statusCode, 400);
});

test('trackViewability records viewable_impression for live booking', async () => {
  const { id, token } = await makeLiveBooking('view@example.com');
  const res = mockRes();
  await trackViewability(token, 2, 75, mockReq(), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(countEvents(id, 'viewable_impression'), 1);
});

// Dashboard tests
test('getDashboard rejects missing token', async () => {
  const res = mockRes();
  await getDashboard(null, res);
  assert.strictEqual(res.statusCode, 400);
});

test('getDashboard returns 404 for unknown token', async () => {
  const res = mockRes();
  await getDashboard('unknown-token', res);
  assert.strictEqual(res.statusCode, 404);
});

test('getDashboard returns metrics for live booking', async () => {
  const { token } = await makeLiveBooking('dash@example.com');
  const res = mockRes();
  await getDashboard(token, res);
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.booking);
  assert.ok(res.body.metrics);
});

run();
