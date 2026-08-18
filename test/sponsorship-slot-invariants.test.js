/**
 * Sponsorship Slot Consistency Invariant Tests
 *
 * After every booking state transition, `ad_slots.status` and
 * `ad_slots.current_booking_id` must agree with the booking's status:
 *
 *   reserved holds — a booking at any pre-live stage keeps its frame(s)
 *                    reserved with current_booking_id set;
 *   live frames    — goLive flips the frame(s) to live, bundle members
 *                    included;
 *   release        — reject/end return every frame to available with
 *                    current_booking_id NULLed, bundle members included,
 *                    and the frame is immediately re-bookable.
 *
 * Pause invariants (reserved-but-held, bundle cascade) are covered by
 * booking-publish-pause.test.js and are not duplicated here.
 *
 * DB bootstrap mirrors test/booking-publish-pause.test.js: an isolated copy
 * of the golden SQLite DB via prepareTestDb(__filename).
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
          id: `cs_test_invariants_${++sessionCounter}`,
          url: 'https://checkout.stripe.com/invariants-mock',
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
  releaseSlotsForBooking,
  sweepStaleReservations,
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
  return `inv-${tag}-${emailCounter}@invariants.test`;
}

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

function allocBundleSlot() {
  const d = db();
  // A bundle can only be booked when every member frame is free too
  // (createBooking refuses otherwise), so pick a takeover whose whole site
  // is still untouched by the individual-slot bookings above.
  const row = d
    .prepare(
      `SELECT b.id, b.site_slug FROM ad_slots b
        WHERE b.is_bundle = 1 AND b.status = 'available'
          AND NOT EXISTS (
            SELECT 1 FROM bundle_members bm
            JOIN ad_slots m ON m.id = bm.member_slot_id
            WHERE bm.bundle_slot_id = b.id AND m.status != 'available'
          )
        ORDER BY b.id LIMIT 1`
    )
    .get();
  d.close();
  if (!row) throw new Error('no fully-available bundle slot left in the test DB');
  return row;
}

function bundleMemberIds(bundleSlotId) {
  const d = db();
  const rows = d
    .prepare('SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = ?')
    .all(bundleSlotId)
    .map((r) => r.member_slot_id);
  d.close();
  return rows;
}

function getSlotRow(slotId) {
  const d = db();
  const row = d.prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?').get(slotId);
  d.close();
  return row;
}

function assertSlot(slotId, status, bookingId, label) {
  const slot = getSlotRow(slotId);
  const where = label ? ` (${label})` : '';
  assert.strictEqual(slot.status, status, `slot ${slotId} status${where}`);
  assert.strictEqual(slot.current_booking_id, bookingId, `slot ${slotId} holder${where}`);
}

// Assert the bundle frame AND every member frame.
function assertBundleFrames(bundleSlotId, status, bookingId, label) {
  const members = bundleMemberIds(bundleSlotId);
  assert.ok(members.length > 0, `bundle ${bundleSlotId} has member slots`);
  assertSlot(bundleSlotId, status, bookingId, label ? `${label} — bundle frame` : 'bundle frame');
  for (const memberId of members) {
    assertSlot(memberId, status, bookingId, label ? `${label} — member ${memberId}` : null);
  }
  return members.length + 1;
}

async function makeBooking(status = 'pending_payment', { creative = false, bundle = false } = {}) {
  const slot = bundle ? allocBundleSlot() : allocSlot();
  const { id } = await createBooking({
    slotId: slot.id,
    email: nextEmail('booking'),
    companyName: 'Invariant Test Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: slot.site_slug,
    status,
  });
  if (creative) {
    const d = db();
    d.prepare(
      "UPDATE bookings SET creative_path = '/uploads/test/inv-creative.png' WHERE id = ?"
    ).run(id);
    d.close();
  }
  return { id, slotId: slot.id, siteSlug: slot.site_slug };
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ─── Reservation holds ────────────────────────────────────────

test('createBooking reserves the frame: status reserved, current_booking_id set', async () => {
  const { id, slotId } = await makeBooking();
  assertSlot(slotId, 'reserved', id);
});

test('createBooking on a bundle reserves the bundle frame and every member frame', async () => {
  const { id, slotId } = await makeBooking('pending_payment', { bundle: true });
  assertBundleFrames(slotId, 'reserved', id);
});

test('createBooking touches nothing else: sibling slots of the site stay available', async () => {
  const slot = allocSlot();
  const d = db();
  const before = d
    .prepare("SELECT COUNT(*) AS c FROM ad_slots WHERE site_slug = ? AND status = 'available'")
    .get(slot.site_slug).c;
  d.close();
  const { id } = await createBooking({
    slotId: slot.id,
    email: nextEmail('sibling'),
    companyName: 'Invariant Test Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: slot.site_slug,
  });
  assert.ok(id);
  const d2 = db();
  const after = d2
    .prepare("SELECT COUNT(*) AS c FROM ad_slots WHERE site_slug = ? AND status = 'available'")
    .get(slot.site_slug).c;
  d2.close();
  assert.strictEqual(after, before - 1, 'exactly one frame left the available pool');
});

test('hold: approving the application keeps the frame reserved for the applicant', async () => {
  const { id, slotId } = await makeBooking('pending_application');
  await approveApplication(id, 'test-admin-token');
  assert.strictEqual((await getBookingById(id)).status, 'pending_payment');
  assertSlot(slotId, 'reserved', id, 'application approval must not publish or release');
});

test('hold: payment keeps the frame reserved while the creative is pending', async () => {
  const { id, slotId } = await makeBooking('pending_payment');
  await updateBookingStripeSession(id, 'cs_inv_hold_paid');
  await markBookingPaid('cs_inv_hold_paid', 'pi_inv_hold', 15000);
  assert.strictEqual((await getBookingById(id)).status, 'pending_upload');
  assertSlot(slotId, 'reserved', id, 'payment must not publish the frame');
});

test('hold: creative upload keeps the frame reserved through review', async () => {
  const { id, slotId } = await makeBooking('pending_upload');
  await saveCreative(id, '/uploads/test/inv-upload.png', 'inv-upload.png');
  assert.strictEqual((await getBookingById(id)).status, 'pending_approval');
  assertSlot(slotId, 'reserved', id, 'review queue must not publish the frame');
});

test('hold: admin approval keeps the frame reserved — approval is not publish', async () => {
  const { id, slotId } = await makeBooking('pending_approval', { creative: true });
  await approveBooking(id, 'ok', 'test-admin-token');
  assert.strictEqual((await getBookingById(id)).status, 'approved');
  assertSlot(slotId, 'reserved', id, 'approved bookings wait for the publish switch');
});

// ─── Live frames ──────────────────────────────────────────────

test('goLive flips the frame to live, held by the booking', async () => {
  const { id, slotId } = await makeBooking('approved', { creative: true });
  await goLive(id);
  assertSlot(slotId, 'live', id);
});

test('goLive on a bundle cascades: the bundle frame and every member frame go live', async () => {
  const { id, slotId } = await makeBooking('approved', { creative: true, bundle: true });
  await goLive(id);
  assertBundleFrames(slotId, 'live', id);
});

// ─── Release on reject ────────────────────────────────────────

test('reject from a reserved stage releases the frame to available with no holder', async () => {
  const { id, slotId } = await makeBooking('pending_approval', { creative: true });
  await rejectBooking(id, 'Off brief', 'test-admin-token');
  assertSlot(slotId, 'available', null, 'release-on-reject');
});

test('reject from live releases the frame to available with no holder', async () => {
  const { id, slotId } = await makeBooking('approved', { creative: true });
  await goLive(id);
  await rejectBooking(id, 'Pulled mid-lease', 'test-admin-token');
  assert.strictEqual((await getBookingById(id)).status, 'rejected');
  assertSlot(slotId, 'available', null, 'release-on-reject from live');
});

test('reject on a bundle releases the bundle frame and every member frame', async () => {
  const { id, slotId } = await makeBooking('pending_approval', { creative: true, bundle: true });
  await rejectBooking(id, 'Off brief', 'test-admin-token');
  assertBundleFrames(slotId, 'available', null, 'bundle release-on-reject');
});

// ─── Release on end ───────────────────────────────────────────

test('end from a reserved stage releases the frame to available with no holder', async () => {
  const { id, slotId } = await makeBooking('pending_upload');
  await endBookingAdmin(id, 'test-admin-token');
  assertSlot(slotId, 'available', null, 'release-on-end');
});

test('end from live releases the frame to available with no holder', async () => {
  const { id, slotId } = await makeBooking('approved', { creative: true });
  await goLive(id);
  await endBookingAdmin(id, 'test-admin-token');
  assert.strictEqual((await getBookingById(id)).status, 'ended');
  assertSlot(slotId, 'available', null, 'release-on-end from live');
});

test('end on a live bundle releases the bundle frame and every member frame', async () => {
  const { id, slotId } = await makeBooking('approved', { creative: true, bundle: true });
  await goLive(id);
  await endBookingAdmin(id, 'test-admin-token');
  assertBundleFrames(slotId, 'available', null, 'bundle release-on-end');
});

// ─── Compensating actions ─────────────────────────────────────

test('releaseSlotsForBooking compensates an abandoned reservation exactly', async () => {
  const { id, slotId } = await makeBooking();
  const released = await releaseSlotsForBooking(id);
  assert.strictEqual(released, 1, 'exactly one frame compensated');
  assertSlot(slotId, 'available', null, 'compensated frame');
});

test('releaseSlotsForBooking on a bundle compensates every member frame', async () => {
  const { id, slotId } = await makeBooking('pending_payment', { bundle: true });
  const members = bundleMemberIds(slotId);
  const released = await releaseSlotsForBooking(id);
  assert.strictEqual(released, members.length + 1, 'bundle frame + members compensated');
  assertBundleFrames(slotId, 'available', null, 'compensated bundle');
});

test('sweepStaleReservations cancels stale unpaid bookings and frees their frames only', async () => {
  const stale = await makeBooking('pending_payment');
  const fresh = await makeBooking('pending_payment');
  const d = db();
  d.prepare("UPDATE bookings SET created_at = datetime('now', '-72 hours') WHERE id = ?").run(
    stale.id
  );
  d.close();

  const result = await sweepStaleReservations({ olderThanHours: 48 });
  assert.ok(result.canceled >= 1, 'at least the stale booking was swept');
  assert.strictEqual((await getBookingById(stale.id)).status, 'cancelled');
  assertSlot(stale.slotId, 'available', null, 'swept frame released');

  assert.strictEqual(
    (await getBookingById(fresh.id)).status,
    'pending_payment',
    'fresh reservations are untouched'
  );
  assertSlot(fresh.slotId, 'reserved', fresh.id, 'fresh reservation keeps its hold');
});

// ─── Re-inventory ─────────────────────────────────────────────

test('a frame freed by end is immediately re-bookable by a new sponsor', async () => {
  const first = await makeBooking('approved', { creative: true });
  await goLive(first.id);
  await endBookingAdmin(first.id, 'test-admin-token');

  const { id: secondId } = await createBooking({
    slotId: first.slotId,
    email: nextEmail('second'),
    companyName: 'Second Sponsor Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: first.siteSlug,
  });
  assert.ok(secondId, 'freed frame accepts a new booking');
  assert.notStrictEqual(secondId, first.id);
  assertSlot(first.slotId, 'reserved', secondId, 'frame held by the new booking');
});

test('a frame freed by reject is immediately re-bookable by a new sponsor', async () => {
  const first = await makeBooking('pending_approval', { creative: true });
  await rejectBooking(first.id, 'Off brief', 'test-admin-token');

  const { id: secondId } = await createBooking({
    slotId: first.slotId,
    email: nextEmail('second'),
    companyName: 'Second Sponsor Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: first.siteSlug,
  });
  assert.ok(secondId, 'freed frame accepts a new booking');
  assertSlot(first.slotId, 'reserved', secondId, 'frame held by the new booking');
});

// ─── Contention ───────────────────────────────────────────────

test('a contested frame refuses the second booking and keeps the first hold intact', async () => {
  const first = await makeBooking('pending_payment');
  await assert.rejects(
    createBooking({
      slotId: first.slotId,
      email: nextEmail('rival'),
      companyName: 'Rival Co',
      leaseMonths: 1,
      trialMonths: 0,
      siteSlug: first.siteSlug,
    }),
    (err) => {
      assert.strictEqual(err.status, 409);
      return true;
    }
  );
  assertSlot(first.slotId, 'reserved', first.id, 'the original hold survives the conflict');
});

test('goLive refuses a frame already live with another booking and changes nothing', async () => {
  const first = await makeBooking('approved', { creative: true });
  await goLive(first.id);

  // Craft the collision directly: a second approved booking whose slot_id
  // points at the live frame (its own reservation was released first).
  const second = await makeBooking('approved', { creative: true });
  await releaseSlotsForBooking(second.id);
  const d = db();
  d.prepare('UPDATE bookings SET slot_id = ? WHERE id = ?').run(first.slotId, second.id);
  d.close();

  await assert.rejects(goLive(second.id), (err) => {
    assert.strictEqual(err.status, 409);
    assert.match(err.message, /already live with another booking/);
    return true;
  });
  assert.strictEqual((await getBookingById(second.id)).status, 'approved');
  assertSlot(first.slotId, 'live', first.id, 'the live frame is untouched');
});

async function run() {
  console.log('\n▸ Sponsorship Slot Consistency Invariant Tests\n');
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
  console.log(`\nSponsorship Slot Invariants: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
