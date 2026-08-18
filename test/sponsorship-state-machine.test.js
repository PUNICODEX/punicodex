/**
 * Sponsorship State Machine Matrix Tests
 *
 * One test per transition pair across the booking state machine
 * (platform/api/bookings.js + platform/api/admin-booking-service.js):
 *
 *   apply → approve-application → paid → upload → approve → publish →
 *   pause → republish → end; reject at each stage; end at each stage.
 *
 * plus every illegal move:
 *
 *   publish before approval, pause when not live, double-publish,
 *   double-approve, approve after end, approve-application at the wrong
 *   stage, double-end, end after reject, duplicate payment webhooks.
 *
 * Slot-state side effects live in sponsorship-slot-invariants.test.js; the
 * pause/resume lease-window semantics live in booking-publish-pause.test.js
 * and are deliberately not re-asserted here.
 *
 * DB bootstrap mirrors test/booking-publish-pause.test.js: an isolated copy
 * of the golden SQLite DB via prepareTestDb(__filename). Stripe is mocked at
 * the module boundary with a unique checkout-session id per call so
 * markBookingPaid lookups never collide across tests.
 */

const assert = require('node:assert');

process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';

const Database = require('better-sqlite3');
const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

let sessionCounter = 0;
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async () => ({
          id: `cs_test_state_machine_${++sessionCounter}`,
          url: 'https://checkout.stripe.com/state-machine-mock',
        }),
      },
    },
    webhooks: {
      constructEvent: (p) => JSON.parse(typeof p === 'string' ? p : p.toString('utf8')),
    },
  }),
};

const {
  createBooking,
  getBookingById,
  updateBookingStripeSession,
  markBookingPaid,
  saveCreative,
  goLive,
  pause,
} = require('../platform/api/bookings.js');
const {
  approveApplication,
  approveBooking,
  rejectBooking,
  endBookingAdmin,
} = require('../platform/api/admin-booking-service.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

let emailCounter = 0;
function nextEmail(tag) {
  emailCounter += 1;
  return `sm-${tag}-${emailCounter}@statemachine.test`;
}

// Allocate the next available slot straight from the isolated DB; each
// createBooking reserves its slot, so successive calls naturally advance.
function allocSlot() {
  const d = db();
  const row = d
    .prepare(
      "SELECT id, site_slug FROM ad_slots WHERE is_bundle = 0 AND status = 'available' ORDER BY id LIMIT 1"
    )
    .get();
  d.close();
  if (!row) throw new Error('no available slot left in the test DB');
  return row;
}

async function makeBooking(status = 'pending_payment', { creative = false, email } = {}) {
  const slot = allocSlot();
  const { id } = await createBooking({
    slotId: slot.id,
    email: email || nextEmail('booking'),
    companyName: 'State Machine Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: slot.site_slug,
    status,
  });
  if (creative) {
    const d = db();
    d.prepare(
      "UPDATE bookings SET creative_path = '/uploads/test/sm-creative.png' WHERE id = ?"
    ).run(id);
    d.close();
  }
  return { id, slotId: slot.id };
}

async function expectConflict(promise, match) {
  await assert.rejects(promise, (err) => {
    assert.strictEqual(err.status, 409, `expected 409, got ${err.status}: ${err.message}`);
    assert.strictEqual(err.isBookingConflict, true, 'booking conflicts carry the marker');
    if (match) assert.match(err.message, match);
    return true;
  });
}

async function expectAdminError(promise, status, match) {
  await assert.rejects(promise, (err) => {
    assert.strictEqual(err.status, status, `expected ${status}, got ${err.status}: ${err.message}`);
    if (match) assert.match(err.message, match);
    return true;
  });
}

async function statusOf(id) {
  const booking = await getBookingById(id);
  return booking.status;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ─── Legal transitions ────────────────────────────────────────

test('apply: createBooking defaults to pending_payment and reserves the slot', async () => {
  const { id, slotId } = await makeBooking();
  assert.strictEqual(await statusOf(id), 'pending_payment');
  const d = db();
  const slot = d
    .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
    .get(slotId);
  d.close();
  assert.strictEqual(slot.status, 'reserved');
  assert.strictEqual(slot.current_booking_id, id);
});

test('apply: createBooking with status pending_application enters the application queue', async () => {
  const { id } = await makeBooking('pending_application');
  assert.strictEqual(await statusOf(id), 'pending_application');
});

test('approve-application: pending_application → pending_payment with a checkout session stored', async () => {
  const { id } = await makeBooking('pending_application');
  const result = await approveApplication(id, 'test-admin-token');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, 'pending_payment');
  assert.ok(result.stripeUrl, 'sponsor gets a payment URL');
  const d = db();
  const row = d.prepare('SELECT stripe_session_id FROM bookings WHERE id = ?').get(id);
  d.close();
  assert.match(row.stripe_session_id, /^cs_test_state_machine_/, 'checkout session recorded');
});

test('paid: markBookingPaid moves pending_payment → pending_upload with the amount recorded', async () => {
  const { id } = await makeBooking('pending_payment');
  await updateBookingStripeSession(id, 'cs_sm_manual_paid');
  const paid = await markBookingPaid('cs_sm_manual_paid', 'pi_sm_1', 15000);
  assert.strictEqual(paid.status, 'pending_upload');
  assert.strictEqual(paid.amount_paid_cents, 15000);
});

test('upload: saveCreative moves pending_upload → pending_approval with the creative stored', async () => {
  const { id } = await makeBooking('pending_upload');
  await saveCreative(id, '/uploads/test/sm-upload.png', 'sm-upload.png');
  const booking = await getBookingById(id);
  assert.strictEqual(booking.status, 'pending_approval');
  assert.strictEqual(booking.creative_path, '/uploads/test/sm-upload.png');
});

test('approve: pending_approval → approved', async () => {
  const { id } = await makeBooking('pending_approval', { creative: true });
  const result = await approveBooking(id, 'Reviewed', 'test-admin-token');
  assert.strictEqual(result.status, 'approved');
  assert.strictEqual(await statusOf(id), 'approved');
});

test('approve: pending_upload → approved (admin-created trial lease path)', async () => {
  const { id } = await makeBooking('pending_upload');
  const result = await approveBooking(id, null, 'test-admin-token');
  assert.strictEqual(result.status, 'approved');
  assert.strictEqual(await statusOf(id), 'approved');
});

test('publish: goLive moves approved + creative → live and stamps the lease window', async () => {
  const { id } = await makeBooking('approved', { creative: true });
  const live = await goLive(id);
  assert.strictEqual(live.status, 'live');
  assert.ok(live.started_at, 'first publish stamps started_at');
  assert.ok(live.ends_at, 'first publish stamps ends_at');
});

test('pause: live → approved', async () => {
  const { id } = await makeBooking('approved', { creative: true });
  await goLive(id);
  const paused = await pause(id);
  assert.strictEqual(paused.status, 'approved');
});

test('republish: goLive after pause returns the booking to live', async () => {
  const { id } = await makeBooking('approved', { creative: true });
  await goLive(id);
  await pause(id);
  const resumed = await goLive(id);
  assert.strictEqual(resumed.status, 'live');
});

test('full journey: apply → approve-application → paid → upload → approve → publish → pause → republish → end', async () => {
  const { id } = await makeBooking('pending_application');
  assert.strictEqual(await statusOf(id), 'pending_application');

  await approveApplication(id, 'test-admin-token');
  assert.strictEqual(await statusOf(id), 'pending_payment');

  const d0 = db();
  const sessionId = d0
    .prepare('SELECT stripe_session_id FROM bookings WHERE id = ?')
    .get(id).stripe_session_id;
  d0.close();
  await markBookingPaid(sessionId, 'pi_journey', 15000);
  assert.strictEqual(await statusOf(id), 'pending_upload');

  await saveCreative(id, '/uploads/test/sm-journey.png', 'sm-journey.png');
  assert.strictEqual(await statusOf(id), 'pending_approval');

  await approveBooking(id, 'Good creative', 'test-admin-token');
  assert.strictEqual(await statusOf(id), 'approved');

  await goLive(id);
  assert.strictEqual(await statusOf(id), 'live');

  await pause(id);
  assert.strictEqual(await statusOf(id), 'approved');

  await goLive(id);
  assert.strictEqual(await statusOf(id), 'live');

  const ended = await endBookingAdmin(id, 'test-admin-token');
  assert.strictEqual(ended.status, 'ended');
  assert.strictEqual(await statusOf(id), 'ended');
});

// ─── Reject at each stage (legal) ─────────────────────────────

for (const stage of [
  'pending_application',
  'pending_payment',
  'pending_upload',
  'pending_approval',
  'approved',
  'live',
]) {
  test(`reject: ${stage} → rejected`, async () => {
    const { id } = await makeBooking(stage, { creative: true });
    const result = await rejectBooking(id, 'Off brief', 'test-admin-token');
    assert.strictEqual(result.status, 'rejected');
    assert.strictEqual(result.slotReleased, true);
    const booking = await getBookingById(id);
    assert.strictEqual(booking.status, 'rejected');
    assert.strictEqual(booking.admin_note, 'Off brief', 'rejection reason recorded');
  });
}

// ─── End at each stage (legal) ────────────────────────────────

for (const stage of [
  'pending_application',
  'pending_payment',
  'pending_upload',
  'pending_approval',
  'approved',
  'live',
]) {
  test(`end: ${stage} → ended`, async () => {
    const { id } = await makeBooking(stage, { creative: true });
    const result = await endBookingAdmin(id, 'test-admin-token');
    assert.strictEqual(result.status, 'ended');
    const booking = await getBookingById(id);
    assert.strictEqual(booking.status, 'ended');
    assert.strictEqual(booking.billing_status, 'cancelled', 'ending cancels billing');
  });
}

// ─── Illegal: createBooking ───────────────────────────────────

test('illegal: createBooking on an unknown slot is a 404', async () => {
  await expectAdminError(
    createBooking({
      slotId: 999999999,
      email: nextEmail('ghost'),
      companyName: 'Ghost Co',
      siteSlug: 'nike',
    }),
    404,
    /Slot not found/
  );
});

test('illegal: createBooking on an already-reserved slot is a 409', async () => {
  const { slotId } = await makeBooking('pending_payment');
  await expectConflict(
    createBooking({
      slotId,
      email: nextEmail('rival'),
      companyName: 'Rival Co',
      siteSlug: 'nike',
    }),
    /not available|no longer available/
  );
});

// ─── Illegal: approveApplication ──────────────────────────────

for (const stage of [
  'pending_payment',
  'pending_upload',
  'pending_approval',
  'approved',
  'live',
  'rejected',
  'ended',
]) {
  test(`illegal: approveApplication on ${stage} is a 400`, async () => {
    const { id } = await makeBooking(stage, { creative: true });
    await expectAdminError(
      approveApplication(id, 'test-admin-token'),
      400,
      /not pending application/
    );
    assert.strictEqual(await statusOf(id), stage, 'rejected approval must not move the booking');
  });
}

test('illegal: approveApplication on an unknown booking is a 404', async () => {
  await expectAdminError(approveApplication(999999999, 'test-admin-token'), 404, /not found/i);
});

test('illegal: double approve-application is a 400 and creates no second session', async () => {
  const { id } = await makeBooking('pending_application');
  await approveApplication(id, 'test-admin-token');
  const sessionsBefore = sessionCounter;
  await expectAdminError(approveApplication(id, 'test-admin-token'), 400);
  assert.strictEqual(sessionCounter, sessionsBefore, 'no second checkout session created');
  assert.strictEqual(await statusOf(id), 'pending_payment');
});

// ─── Illegal: approveBooking ──────────────────────────────────

for (const stage of [
  'pending_application',
  'pending_payment',
  'approved',
  'live',
  'rejected',
  'ended',
]) {
  test(`illegal: approveBooking on ${stage} is a 400`, async () => {
    const { id } = await makeBooking(stage, { creative: true });
    await expectAdminError(
      approveBooking(id, 'nope', 'test-admin-token'),
      400,
      /Cannot approve a booking in status/
    );
    assert.strictEqual(await statusOf(id), stage, 'rejected approval must not move the booking');
  });
}

test('illegal: approveBooking on an unknown booking is a 404', async () => {
  await expectAdminError(approveBooking(999999999, null, 'test-admin-token'), 404, /not found/i);
});

test('illegal: double-approve is a 400 (approved is not re-approvable)', async () => {
  const { id } = await makeBooking('pending_approval', { creative: true });
  await approveBooking(id, 'first', 'test-admin-token');
  await expectAdminError(approveBooking(id, 'second', 'test-admin-token'), 400);
  assert.strictEqual(await statusOf(id), 'approved');
});

test('illegal: approve after end is a 400 and the booking stays ended', async () => {
  const { id } = await makeBooking('approved', { creative: true });
  await goLive(id);
  await endBookingAdmin(id, 'test-admin-token');
  await expectAdminError(approveBooking(id, 'zombie', 'test-admin-token'), 400);
  const booking = await getBookingById(id);
  assert.strictEqual(booking.status, 'ended', 'an ended lease must never resurrect');
});

// ─── Illegal: goLive ──────────────────────────────────────────

for (const stage of [
  'pending_application',
  'pending_payment',
  'pending_upload',
  'rejected',
  'ended',
]) {
  test(`illegal: goLive on ${stage} is a 409`, async () => {
    const { id } = await makeBooking(stage, { creative: true });
    await expectConflict(goLive(id), /must be approved/);
    assert.strictEqual(await statusOf(id), stage, 'rejected publish must not move the booking');
  });
}

test('illegal: publish before approval (pending_approval with a creative) is a 409', async () => {
  const { id } = await makeBooking('pending_approval', { creative: true });
  await expectConflict(goLive(id), /must be approved/);
  assert.strictEqual(await statusOf(id), 'pending_approval');
});

test('illegal: double-publish is a 409', async () => {
  const { id } = await makeBooking('approved', { creative: true });
  await goLive(id);
  await expectConflict(goLive(id), /must be approved/);
  assert.strictEqual(await statusOf(id), 'live');
});

test('illegal: goLive on an unknown booking is a 404', async () => {
  await expectAdminError(goLive(999999999), 404, /not found/i);
});

// ─── Illegal: pause ───────────────────────────────────────────
// pause on 'approved' is covered by booking-publish-pause.test.js.

for (const stage of [
  'pending_payment',
  'pending_upload',
  'pending_approval',
  'rejected',
  'ended',
  'cancelled',
]) {
  test(`illegal: pause on ${stage} is a 409`, async () => {
    const { id } = await makeBooking(stage, { creative: true });
    await expectConflict(pause(id), /Only a live booking can be paused/);
    assert.strictEqual(await statusOf(id), stage, 'rejected pause must not move the booking');
  });
}

test('illegal: pause on an unknown booking is a 404', async () => {
  await expectAdminError(pause(999999999), 404, /not found/i);
});

// ─── Illegal: endBookingAdmin ─────────────────────────────────

for (const stage of ['ended', 'rejected', 'cancelled']) {
  test(`illegal: endBookingAdmin on ${stage} is a 400`, async () => {
    const { id } = await makeBooking(stage);
    await expectAdminError(endBookingAdmin(id, 'test-admin-token'), 400, /already/);
    assert.strictEqual(await statusOf(id), stage, 'rejected end must not move the booking');
  });
}

test('illegal: endBookingAdmin on an unknown booking is a 404', async () => {
  await expectAdminError(endBookingAdmin(999999999, 'test-admin-token'), 404, /not found/i);
});

// ─── Payment webhook idempotence ──────────────────────────────

test('duplicate payment webhook on a pending_upload booking is a no-op', async () => {
  const { id } = await makeBooking('pending_payment');
  await updateBookingStripeSession(id, 'cs_sm_dup_webhook');
  await markBookingPaid('cs_sm_dup_webhook', 'pi_first', 15000);
  const again = await markBookingPaid('cs_sm_dup_webhook', 'pi_second', 15000);
  assert.strictEqual(again.status, 'pending_upload', 'status unchanged by the duplicate');
  assert.strictEqual(
    again.stripe_payment_intent,
    'pi_first',
    'the first payment intent wins — duplicates never rewrite'
  );
});

test('late duplicate payment webhook on a live booking never rolls it back', async () => {
  const { id } = await makeBooking('pending_payment');
  await updateBookingStripeSession(id, 'cs_sm_late_webhook');
  await markBookingPaid('cs_sm_late_webhook', 'pi_live', 15000);
  const d = db();
  d.prepare(
    "UPDATE bookings SET status = 'approved', creative_path = '/uploads/test/sm-late.png' WHERE id = ?"
  ).run(id);
  d.close();
  await goLive(id);
  const again = await markBookingPaid('cs_sm_late_webhook', 'pi_live_retry', 15000);
  assert.strictEqual(again.status, 'live', 'a live booking must never regress to pending_upload');
});

async function run() {
  console.log('\n▸ Sponsorship State Machine Matrix Tests\n');
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
      if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
  console.log(`\nSponsorship State Machine: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
