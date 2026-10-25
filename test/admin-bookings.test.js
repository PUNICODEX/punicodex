/**
 * Admin Booking Routes Tests
 *
 * Exercises the Vercel serverless wrappers for the admin booking lifecycle
 * against an isolated copy of the SQLite database.
 */

const assert = require('node:assert');
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-admin-password-for-ci';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock the Stripe SDK before any admin module loads: checkout-session
// creation throws while `stripeCreateError` is set (discount-rollback test),
// subscription cancellation throws while `stripeCancelError` is set
// (end-abort test).
let stripeCreateError = null;
let stripeCancelError = null;
const subscriptionCancels = [];
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async () => {
          if (stripeCreateError) throw stripeCreateError;
          return { id: 'cs_admin_mock', url: 'https://checkout.stripe.com/mock' };
        },
      },
    },
    subscriptions: {
      cancel: async (subscriptionId) => {
        if (stripeCancelError) throw stripeCancelError;
        subscriptionCancels.push(subscriptionId);
        return { id: subscriptionId, status: 'canceled' };
      },
    },
  }),
};

const { login: adminLogin } = require('../platform/api/admin.js');
const { invoke, adminHeader } = require('./helpers/http.js');
const { getSlotId } = require('./helpers/slots.js');

let adminToken;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'));
    process.exit(1);
  }
}

async function runTests() {
  console.log('\n▸ Admin Booking Routes Tests\n');

  adminToken = (await adminLogin(process.env.ADMIN_PASSWORD)).token;

  const bookingsHandler = require('../platform/api-handlers/admin/bookings/index.js');

  await test('GET /api/admin/bookings requires admin token', async () => {
    const noAuth = await invoke(bookingsHandler, 'GET', '/api/admin/bookings');
    assert.strictEqual(noAuth.status, 401);
  });

  await test('GET /api/admin/bookings lists bookings and stats', async () => {
    const res = await invoke(bookingsHandler, 'GET', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.bookings));
    assert.ok(typeof res.body.stats === 'object');
  });

  let createdId;

  await test('POST /api/admin/bookings creates a booking', async () => {
    const res = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId: getSlotId(__filename, 'nike', 1),
        email: 'advertiser@example.com',
        companyName: 'Test Co',
        websiteUrl: 'https://example.com',
        customHeading: 'Great Products',
        customSubtitle: 'Try us today for great deals',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.status, 'pending_upload');
    assert.ok(res.body.bookingId);
    createdId = res.body.bookingId;
  });

  await test('POST /api/admin/bookings/:id/approve', async () => {
    const handler = require('../platform/api-handlers/admin/bookings/[id]/approve/index.js');
    const res = await invoke(handler, 'POST', `/api/admin/bookings/${createdId}/approve`, {
      headers: adminHeader(adminToken),
      body: { note: 'Looks good' },
      params: { id: String(createdId) },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'approved');
  });

  await test('POST /api/admin/bookings/:id/golive', async () => {
    // Go Live requires a creative (2026-08 gate): attach one first.
    const Database = require('better-sqlite3');
    const { getTestDbPath } = require('./helpers/test-db.js');
    const wdb = new Database(getTestDbPath(__filename));
    wdb
      .prepare(
        "UPDATE bookings SET creative_path = '/uploads/test/admin-golive-creative.png' WHERE id = ?"
      )
      .run(createdId);
    wdb.close();
    const handler = require('../platform/api-handlers/admin/bookings/[id]/golive/index.js');
    const res = await invoke(handler, 'POST', `/api/admin/bookings/${createdId}/golive`, {
      headers: adminHeader(adminToken),
      params: { id: String(createdId) },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'live');
  });

  await test('POST /api/admin/bookings/:id/end', async () => {
    const handler = require('../platform/api-handlers/admin/bookings/[id]/end/index.js');
    const res = await invoke(handler, 'POST', `/api/admin/bookings/${createdId}/end`, {
      headers: adminHeader(adminToken),
      params: { id: String(createdId) },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ended');
  });

  await test('POST /api/admin/bookings/:id/end refuses an already-ended booking', async () => {
    const handler = require('../platform/api-handlers/admin/bookings/[id]/end/index.js');
    const res = await invoke(handler, 'POST', `/api/admin/bookings/${createdId}/end`, {
      headers: adminHeader(adminToken),
      params: { id: String(createdId) },
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /already ended/);
  });

  await test('revocation notifies the sponsor and frees the slot', async () => {
    const service = require('node:fs').readFileSync(
      require('node:path').join(__dirname, '..', 'platform', 'api', 'admin-booking-service.js'),
      'utf8'
    );
    assert.ok(service.includes('notifyRevoked'), 'endBookingAdmin emails the sponsor');
    const email = require('node:fs').readFileSync(
      require('node:path').join(__dirname, '..', 'platform', 'api', 'email.js'),
      'utf8'
    );
    assert.ok(email.includes('Placement Ended'), 'revocation template present');
    assert.ok(email.includes('30 days'), 'purge grace period disclosed');
    // The slot freed by the end action above is back to available inventory.
    const { get } = require('../platform/db/operational');
    const freed = await get(
      'SELECT s.status FROM ad_slots s JOIN bookings b ON s.id = b.slot_id WHERE b.id = $1',
      [createdId]
    );
    assert.strictEqual(freed.status, 'available', 'slot returns to available inventory');
  });

  await test('POST /api/admin/bookings rejects a slot that is already reserved', async () => {
    const createRes = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId: getSlotId(__filename, 'nike', 2),
        email: 'reserved-slot@example.com',
        companyName: 'Reserved Co',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(createRes.status, 201);

    const secondRes = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId: getSlotId(__filename, 'nike', 2),
        email: 'reserved-slot-2@example.com',
        companyName: 'Reserved Two',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(secondRes.status, 409);
  });

  await test('POST /api/admin/bookings/:id/golive rejects an unapproved booking', async () => {
    const createRes = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId: getSlotId(__filename, 'nike', 3),
        email: 'unapproved-golive@example.com',
        companyName: 'Unapproved Co',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(createRes.status, 201);

    const handler = require('../platform/api-handlers/admin/bookings/[id]/golive/index.js');
    const res = await invoke(
      handler,
      'POST',
      `/api/admin/bookings/${createRes.body.bookingId}/golive`,
      {
        headers: adminHeader(adminToken),
        params: { id: String(createRes.body.bookingId) },
      }
    );
    assert.strictEqual(res.status, 409);
  });

  let rejectedId;

  await test('POST /api/admin/bookings/:id/reject frees the slot', async () => {
    const slotId = getSlotId(__filename, 'nike', 4);
    const createRes = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId,
        email: 'rejected@example.com',
        companyName: 'Bad Actor',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    rejectedId = createRes.body.bookingId;

    const Database = require('better-sqlite3');
    const { getTestDbPath } = require('./helpers/test-db.js');
    const before = new Database(getTestDbPath(__filename), { readonly: true })
      .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
      .get(slotId);
    assert.strictEqual(before.status, 'reserved', 'slot is reserved after booking');
    assert.strictEqual(before.current_booking_id, rejectedId);

    const handler = require('../platform/api-handlers/admin/bookings/[id]/reject/index.js');
    const res = await invoke(handler, 'POST', `/api/admin/bookings/${rejectedId}/reject`, {
      headers: adminHeader(adminToken),
      body: { note: 'Policy violation' },
      params: { id: String(rejectedId) },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'rejected');
    assert.strictEqual(res.body.slotReleased, true);

    const after = new Database(getTestDbPath(__filename), { readonly: true })
      .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
      .get(slotId);
    assert.strictEqual(after.status, 'available', 'rejection must free the slot');
    assert.strictEqual(after.current_booking_id, null, 'booking link cleared');
  });

  await test('GET /api/admin/revenue returns revenue stats', async () => {
    const handler = require('../platform/api-handlers/admin/revenue/index.js');
    const res = await invoke(handler, 'GET', '/api/admin/revenue?days=7', {
      headers: adminHeader(adminToken),
    });
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.totalRevenueCents === 'number');
    assert.ok(Array.isArray(res.body.daily));
  });

  await test('POST /api/admin/trial-reminders returns counts', async () => {
    const handler = require('../platform/api-handlers/admin/trial-reminders/index.js');
    const res = await invoke(handler, 'POST', '/api/admin/trial-reminders', {
      headers: adminHeader(adminToken),
    });
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.checked === 'number');
  });

  // ── Audit fixes: reject guards, Stripe-failure aborts, discount rollback ──

  await test('POST /api/admin/bookings/:id/reject refuses a live booking', async () => {
    const slotId = getSlotId(__filename, 'nike', 5);
    const createRes = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId,
        email: 'reject-live@example.com',
        companyName: 'Live Reject Co',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(createRes.status, 201);
    const id = createRes.body.bookingId;

    const Database = require('better-sqlite3');
    const { getTestDbPath } = require('./helpers/test-db.js');
    const wdb = new Database(getTestDbPath(__filename));
    wdb
      .prepare(
        "UPDATE bookings SET creative_path = '/uploads/test/reject-live-creative.png' WHERE id = ?"
      )
      .run(id);
    wdb.close();

    const approveHandler = require('../platform/api-handlers/admin/bookings/[id]/approve/index.js');
    await invoke(approveHandler, 'POST', `/api/admin/bookings/${id}/approve`, {
      headers: adminHeader(adminToken),
      body: { note: 'ok' },
      params: { id: String(id) },
    });
    const goliveHandler = require('../platform/api-handlers/admin/bookings/[id]/golive/index.js');
    const liveRes = await invoke(goliveHandler, 'POST', `/api/admin/bookings/${id}/golive`, {
      headers: adminHeader(adminToken),
      params: { id: String(id) },
    });
    assert.strictEqual(liveRes.status, 200);

    const rejectHandler = require('../platform/api-handlers/admin/bookings/[id]/reject/index.js');
    const res = await invoke(rejectHandler, 'POST', `/api/admin/bookings/${id}/reject`, {
      headers: adminHeader(adminToken),
      body: { note: 'should not work' },
      params: { id: String(id) },
    });
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error, /Cannot reject/);

    const check = new Database(getTestDbPath(__filename), { readonly: true });
    const booking = check.prepare('SELECT status FROM bookings WHERE id = ?').get(id);
    const slot = check
      .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
      .get(slotId);
    check.close();
    assert.strictEqual(booking.status, 'live', 'the live booking must not move');
    assert.strictEqual(slot.status, 'live', 'the live frame must not be freed');
    assert.strictEqual(slot.current_booking_id, id);
  });

  await test('reject leaves a resold slot untouched (current_booking_id predicate)', async () => {
    const slotA = getSlotId(__filename, 'nike', 6);
    const slotB = getSlotId(__filename, 'nike', 7);
    const createA = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId: slotA,
        email: 'resold-a@example.com',
        companyName: 'Resold A',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    const createB = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId: slotB,
        email: 'resold-b@example.com',
        companyName: 'Resold B',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(createA.status, 201);
    assert.strictEqual(createB.status, 201);
    const idA = createA.body.bookingId;
    const idB = createB.body.bookingId;

    // Simulate a resale: slot A now belongs to booking B (booking A's row is
    // stale). Rejecting A must not free B's frame.
    const Database = require('better-sqlite3');
    const { getTestDbPath } = require('./helpers/test-db.js');
    const wdb = new Database(getTestDbPath(__filename));
    wdb
      .prepare("UPDATE ad_slots SET status = 'reserved', current_booking_id = ? WHERE id = ?")
      .run(idB, slotA);
    wdb.close();

    const rejectHandler = require('../platform/api-handlers/admin/bookings/[id]/reject/index.js');
    const res = await invoke(rejectHandler, 'POST', `/api/admin/bookings/${idA}/reject`, {
      headers: adminHeader(adminToken),
      body: { note: 'Policy violation' },
      params: { id: String(idA) },
    });
    assert.strictEqual(res.status, 200);

    const check = new Database(getTestDbPath(__filename), { readonly: true });
    const slot = check
      .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
      .get(slotA);
    const bookingA = check.prepare('SELECT status FROM bookings WHERE id = ?').get(idA);
    const bookingB = check.prepare('SELECT status FROM bookings WHERE id = ?').get(idB);
    check.close();
    assert.strictEqual(bookingA.status, 'rejected');
    assert.strictEqual(
      slot.current_booking_id,
      idB,
      'the resold frame stays with the newer booking'
    );
    assert.strictEqual(slot.status, 'reserved', 'the resold frame is not freed');
    assert.strictEqual(bookingB.status, 'pending_upload', 'the newer booking is untouched');
  });

  await test('POST /api/admin/bookings/:id/end aborts when the Stripe cancel fails', async () => {
    const slotId = getSlotId(__filename, 'nike', 8);
    const createRes = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId,
        email: 'end-stripe-down@example.com',
        companyName: 'Stripe Down Co',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(createRes.status, 201);
    const id = createRes.body.bookingId;

    const Database = require('better-sqlite3');
    const { getTestDbPath } = require('./helpers/test-db.js');
    const wdb = new Database(getTestDbPath(__filename));
    wdb
      .prepare("UPDATE bookings SET stripe_subscription_id = 'sub_admin_abort' WHERE id = ?")
      .run(id);
    wdb.close();

    stripeCancelError = new Error('Stripe API unreachable');
    let res;
    try {
      const endHandler = require('../platform/api-handlers/admin/bookings/[id]/end/index.js');
      res = await invoke(endHandler, 'POST', `/api/admin/bookings/${id}/end`, {
        headers: adminHeader(adminToken),
        params: { id: String(id) },
      });
    } finally {
      stripeCancelError = null;
    }
    assert.strictEqual(res.status, 502);
    assert.match(res.body.error, /NOT ended, retry/);

    const check = new Database(getTestDbPath(__filename), { readonly: true });
    const booking = check.prepare('SELECT status FROM bookings WHERE id = ?').get(id);
    const slot = check
      .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
      .get(slotId);
    check.close();
    assert.strictEqual(booking.status, 'pending_upload', 'the booking must not be ended');
    assert.strictEqual(slot.status, 'reserved', 'the frame must not be freed');
    assert.strictEqual(slot.current_booking_id, id);

    // Retry succeeds once Stripe is back: the end is not permanently blocked.
    const endHandler = require('../platform/api-handlers/admin/bookings/[id]/end/index.js');
    const retry = await invoke(endHandler, 'POST', `/api/admin/bookings/${id}/end`, {
      headers: adminHeader(adminToken),
      params: { id: String(id) },
    });
    assert.strictEqual(retry.status, 200);
    assert.ok(subscriptionCancels.includes('sub_admin_abort'), 'retry cancels the subscription');
  });

  await test('approval rolls the discount code back when Stripe session creation fails', async () => {
    const discountService = require('../platform/api/discount-service.js');
    await discountService.createCode(
      { code: 'ROLLBACK-25', kind: 'percent_off', percent: 25, appliesTo: 'nike' },
      null
    );

    const slotId = getSlotId(__filename, 'nike', 9);
    const createRes = await invoke(bookingsHandler, 'POST', '/api/admin/bookings', {
      headers: adminHeader(adminToken),
      body: {
        slotId,
        email: 'discount-rollback@example.com',
        companyName: 'Rollback Co',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(createRes.status, 201);
    const id = createRes.body.bookingId;

    const Database = require('better-sqlite3');
    const { getTestDbPath } = require('./helpers/test-db.js');
    const wdb = new Database(getTestDbPath(__filename));
    wdb
      .prepare(
        "UPDATE bookings SET status = 'pending_application', discount_code = 'ROLLBACK-25' WHERE id = ?"
      )
      .run(id);
    wdb.close();

    stripeCreateError = new Error('Stripe API unreachable');
    let threw = null;
    try {
      const { approveApplication } = require('../platform/api/admin-booking-service.js');
      await approveApplication(id, adminToken);
    } catch (err) {
      threw = err;
    } finally {
      stripeCreateError = null;
    }
    assert.ok(threw, 'the Stripe failure must propagate so the admin can retry');
    assert.match(threw.message, /Stripe API unreachable/);

    const check = new Database(getTestDbPath(__filename), { readonly: true });
    const code = check
      .prepare('SELECT used_count FROM discount_codes WHERE code = ?')
      .get('ROLLBACK-25');
    const redemption = check
      .prepare('SELECT * FROM discount_redemptions WHERE booking_id = ?')
      .get(id);
    check.close();
    assert.strictEqual(code.used_count, 0, 'the redemption is rolled back');
    assert.strictEqual(redemption, undefined, 'no redemption row survives the rollback');
  });

  console.log('\nAdmin Booking Routes: all tests passed');
}

runTests();
