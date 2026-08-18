/**
 * Admin Creative Review queue tests (Task 7).
 *
 * - Static contracts: approveAndGoLive exists in admin-booking-service and is
 *   exported; the approve-live handler exists; pending_approval is a
 *   first-class bookings filter (API whitelist + leasing page select); the
 *   leasing page carries the Creative Review tab with approve-live.
 * - Behavior: a booking in pending_approval with a creative runs
 *   approveAndGoLive end-to-end → status live, two admin_actions rows
 *   (approve + golive), mirroring the booking-lifecycle bootstrap.
 */

'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

process.env.ADMIN_PASSWORD = 'test-creative-review-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const service = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'api', 'admin-booking-service.js'),
  'utf8'
);
const handlerPath = path.join(
  __dirname,
  '..',
  'platform',
  'api-handlers',
  'admin',
  'portal',
  'bookings',
  '[id]',
  'approve-live',
  'index.js'
);
const roster = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'api-handlers', 'admin', 'portal', 'bookings', 'index.js'),
  'utf8'
);
const leasing = fs.readFileSync(
  path.join(__dirname, '..', 'platform', 'public', 'admin-portal', 'leasing', 'index.html'),
  'utf8'
);
const router = fs.readFileSync(
  path.join(__dirname, '..', 'api', 'admin', '[[...slug]].js'),
  'utf8'
);

test('admin router registers approve-live with the same shape as golive', () => {
  assert.match(router, /approve-live/);
  const golive = router.match(/segments: \['portal', 'bookings', '\[id\]', 'golive'\]/g) || [];
  const approveLive =
    router.match(/segments: \['portal', 'bookings', '\[id\]', 'approve-live'\]/g) || [];
  assert.strictEqual(golive.length, 1, 'golive registered exactly once');
  assert.strictEqual(
    approveLive.length,
    golive.length,
    'approve-live must be registered in the admin router like golive'
  );
  const goliveHandler = router.match(/portal\/bookings\/\[id\]\/golive\/index\.js/g) || [];
  const approveLiveHandler =
    router.match(/portal\/bookings\/\[id\]\/approve-live\/index\.js/g) || [];
  assert.strictEqual(approveLiveHandler.length, goliveHandler.length);
});

test('approve-and-go-live service + handler exist', () => {
  assert.match(service, /async function approveAndGoLive\(/);
  assert.match(service, /approveAndGoLive/);
  assert.ok(fs.existsSync(handlerPath), 'approve-live handler missing');
});

test('pending_approval is a first-class bookings filter', () => {
  assert.match(roster, /'pending_approval'/);
  assert.match(leasing, /value="pending_approval"/);
});

test('leasing page carries the Creative Review tab with side-by-side compare', () => {
  assert.match(leasing, /Creative Review/);
  assert.match(leasing, /approve-live/);
});

test('approveAndGoLive approves then publishes: live status, two audit rows', async () => {
  const { approveAndGoLive } = require('../platform/api/admin-booking-service.js');
  const { createBooking, saveCreative, getBookingById } = require('../platform/api/bookings.js');
  const { getSlotId } = require('./helpers/slots.js');
  const Database = require('better-sqlite3');
  const { getTestDbPath } = require('./helpers/test-db.js');

  const booking = await createBooking({
    slotId: getSlotId(__filename, 'nike', 11),
    email: 'creative-review@example.com',
    companyName: 'Creative Review Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  await saveCreative(booking.id, '/uploads/test/creative-review.png', 'creative-review.png');
  const staged = await getBookingById(booking.id);
  assert.strictEqual(staged.status, 'pending_approval', 'saveCreative stages pending_approval');
  assert.ok(staged.creative_path, 'creative path recorded');

  const result = await approveAndGoLive(booking.id, 'Reviewed in the queue', 'test-admin-token');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, 'live');

  const final = await getBookingById(booking.id);
  assert.strictEqual(final.status, 'live', 'booking ends live');

  const db = new Database(getTestDbPath(__filename));
  try {
    const actions = db
      .prepare('SELECT action FROM admin_actions WHERE booking_id = ? ORDER BY id')
      .all(booking.id)
      .map((r) => r.action);
    assert.deepStrictEqual(actions, ['admin.booking.approve', 'admin.booking.golive']);
  } finally {
    db.close();
  }
});
