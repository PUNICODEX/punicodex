/**
 * Ad Analytics Tests
 *
 * Covers pixel, click, viewability, and dashboard flows end-to-end.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
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
  const { id, token, publicId } = await createBooking({
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
  return { id, token, publicId };
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

test('isSafeRedirectUrl allows owned and registrar allowlist hosts', () => {
  for (const url of [
    'https://punycodex.com/sites/zeus',
    'https://www.punycodex.com/',
    'https://www.punicodex.com/search',
    'https://www.godaddy.com/domainsearch/find?domainToCheck=xn--nk-qla',
    'https://www.namecheap.com/domains/registration/results/?domain=xn--nk-qla',
    'https://porkbun.com/checkout/search?q=xn--nk-qla',
    'https://www.dynadot.com/domain/search.html?domain=xn--nk-qla',
    'https://spaceship.com/domains/?query=xn--nk-qla',
  ]) {
    assert.strictEqual(isSafeRedirectUrl(url, 'https://punicodex.com'), true, url);
  }
});

test('isSafeRedirectUrl rejects unregistered external URLs', () => {
  assert.strictEqual(isSafeRedirectUrl('https://evil.com/ad', 'https://punicodex.com'), false);
  assert.strictEqual(isSafeRedirectUrl('https://example.com/ad', 'https://punicodex.com'), false);
});

test('isSafeRedirectUrl rejects protocol-relative and backslash URLs', () => {
  assert.strictEqual(isSafeRedirectUrl('//evil.com', 'https://punicodex.com'), false);
  assert.strictEqual(isSafeRedirectUrl('/\\evil.com', 'https://punicodex.com'), false);
  assert.strictEqual(isSafeRedirectUrl('\\\\evil.com', 'https://punicodex.com'), false);
});

test('isSafeRedirectUrl rejects subdomain spoofs and encoded variants', () => {
  assert.strictEqual(
    isSafeRedirectUrl('https://punicodex.com.evil.com', 'https://punicodex.com'),
    false
  );
  // %2e decodes to a dot inside the host: punicodex.com.evil.com
  assert.strictEqual(
    isSafeRedirectUrl('https://punicodex.com%2eevil.com', 'https://punicodex.com'),
    false
  );
  // %2f scheme-relative smuggling does not parse as an allowlisted host
  assert.strictEqual(isSafeRedirectUrl('https:%2f%2fevil.com', 'https://punicodex.com'), false);
});

test('isSafeRedirectUrl allows the booking registered website by origin', () => {
  const registered = ['https://example.com/landing'];
  assert.strictEqual(
    isSafeRedirectUrl('https://example.com/landing', 'https://punicodex.com', registered),
    true
  );
  assert.strictEqual(
    isSafeRedirectUrl('https://example.com/other-path', 'https://punicodex.com', registered),
    true
  );
  assert.strictEqual(
    isSafeRedirectUrl('https://evil-example.com', 'https://punicodex.com', registered),
    false
  );
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
  const { id, publicId } = await makeLiveBooking('pixel@example.com');
  const res = mockRes();
  await trackPixel(publicId, mockReq({ headers: { 'user-agent': 'test-bot/1.0' } }), res);
  assert.strictEqual(countEvents(id, 'impression'), 1);
});

// Token split (second-pass review finding 1): the private analytics_token is
// a management credential and must no longer drive public tracking.
test('trackPixel does not record events for the private analytics_token', async () => {
  const { id, token } = await makeLiveBooking('pixel-secret@example.com');
  const res = mockRes();
  await trackPixel(token, mockReq(), res);
  assert.strictEqual(res.statusCode, 200); // pixel still served
  assert.strictEqual(countEvents(id, 'impression'), 0);
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
  const { id, publicId } = await makeLiveBooking('click@example.com');
  const res = mockRes();
  await trackClick(
    publicId,
    '/sites/zeus',
    mockReq({ headers: { referer: 'https://punicodex.com' } }),
    res
  );
  assert.strictEqual(res.redirectUrl, '/sites/zeus');
  assert.strictEqual(countEvents(id, 'click'), 1);
});

test('trackClick redirects to the booking registered website', async () => {
  const { id, publicId } = await makeLiveBooking('click-registered@example.com');
  const res = mockRes();
  await trackClick(publicId, 'https://example.com/landing', mockReq(), res);
  assert.strictEqual(res.redirectUrl, 'https://example.com/landing');
  assert.strictEqual(countEvents(id, 'click'), 1);
});

test('trackClick rejects unregistered external URLs even with a valid token', async () => {
  const { id, publicId } = await makeLiveBooking('click-evil@example.com');
  for (const bad of ['https://evil.com', '//evil.com', 'https://example.com.evil.com']) {
    const res = mockRes();
    await trackClick(publicId, bad, mockReq(), res);
    assert.strictEqual(res.statusCode, 400, bad);
    assert.strictEqual(res.redirectUrl, undefined);
  }
  assert.strictEqual(countEvents(id, 'click'), 0);
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
  const { id, publicId } = await makeLiveBooking('view@example.com');
  const res = mockRes();
  await trackViewability(publicId, 2, 75, mockReq(), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(countEvents(id, 'viewable_impression'), 1);
});

test('trackViewability does not record events for the private analytics_token', async () => {
  const { id, token } = await makeLiveBooking('view-secret@example.com');
  const res = mockRes();
  await trackViewability(token, 2, 75, mockReq(), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(countEvents(id, 'viewable_impression'), 0);
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

// Template regression (second-pass review finding 1): the shipped flagship
// template must track ads with the public slot identifier only. The private
// analytics_token may never be read from the public slots payload. (The
// template still uses currentBooking.analytics_token — the tenant's own
// management token returned by their authenticated booking flow — which is
// the intended credential for upload/dashboard links.)
test('flagship template tracks with slot.public_id, never slot.analytics_token', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'templates', 'flagship', 'flagship.js'),
    'utf8'
  );
  assert.ok(!src.includes('slot.analytics_token'), 'slot.analytics_token leaked in template');
  assert.ok(src.includes('slot.public_id'), 'template must track with slot.public_id');
});

// Runs last: drops analytics_events to force the internal-error branch.
test('getDashboard 400s non-string tokens and masks 500 details in production', async () => {
  const { token } = await makeLiveBooking('mask@example.com');

  // Repeated query params arrive as an array — previously this crashed the
  // SQL bind and leaked the driver error in a 500 body.
  const arrRes = mockRes();
  await getDashboard(['a', 'b'], arrRes);
  assert.strictEqual(arrRes.statusCode, 400);
  const objRes = mockRes();
  await getDashboard({ t: 1 }, objRes);
  assert.strictEqual(objRes.statusCode, 400);

  const sabotage = new Database(getTestDbPath(__filename));
  sabotage.prepare('DROP TABLE analytics_events').run();
  sabotage.close();

  const devRes = mockRes();
  await getDashboard(token, devRes);
  assert.strictEqual(devRes.statusCode, 500);
  assert.notStrictEqual(devRes.body.error, 'Internal server error');

  process.env.VERCEL = '1';
  try {
    const prodRes = mockRes();
    await getDashboard(token, prodRes);
    assert.strictEqual(prodRes.statusCode, 500);
    assert.strictEqual(prodRes.body.error, 'Internal server error');
  } finally {
    delete process.env.VERCEL;
  }
});

run();
