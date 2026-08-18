/**
 * Booking Publish/Pause Primitive Tests
 *
 * Covers the advertiser-driven pause/resume cycle in the booking state
 * machine (platform/api/bookings.js):
 *
 * - pause() flips a live booking back to 'approved' and its slot(s) back to
 *   'reserved' while KEEPING current_booking_id, so the frame stays held for
 *   the sponsor.
 * - pause() refuses anything that is not live (BookingConflictError, 409).
 * - pause() cascades to every member slot of a bundle booking.
 * - goLive() after a pause preserves the original started_at/ends_at lease
 *   window — resuming must never extend a lease.
 * - goLive() first-time still stamps started_at/ends_at as before.
 *
 * DB bootstrap mirrors test/sponsorship-flow.test.js: an isolated copy of the
 * golden SQLite DB via prepareTestDb(__filename).
 */

const assert = require('node:assert');

process.env.PLATFORM_URL = 'https://punicodex.com';

const Database = require('better-sqlite3');
const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const { createBooking, goLive, pause, getBookingById } = require('../platform/api/bookings.js');
const { getIndividualSlotIds, getBundleSlotId } = require('./helpers/slots.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

const slotIds = getIndividualSlotIds(__filename, 'nike');
let slotCursor = 0;

async function makeLiveBooking(email, { slotId } = {}) {
  const { id } = await createBooking({
    slotId: slotId || slotIds[slotCursor++],
    email,
    companyName: 'Pause Test Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  const d = db();
  d.prepare(
    "UPDATE bookings SET status = 'approved', creative_path = '/uploads/test/pause-creative.png' WHERE id = ?"
  ).run(id);
  d.close();
  await goLive(id);
  return id;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('pause() flips a live booking to approved and its slot to reserved, keeping current_booking_id', async () => {
  const id = await makeLiveBooking('pause-basic@example.com');
  const before = await getBookingById(id);
  assert.strictEqual(before.status, 'live');
  assert.ok(before.started_at, 'live booking has started_at');

  const paused = await pause(id);
  assert.strictEqual(paused.status, 'approved');
  assert.strictEqual(paused.started_at, before.started_at, 'pause keeps the lease dates');

  const d = db();
  const slot = d
    .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
    .get(before.slot_id);
  d.close();
  assert.strictEqual(slot.status, 'reserved', 'frame flips back to reserved');
  assert.strictEqual(slot.current_booking_id, id, 'frame stays held for this sponsor');
});

test("pause() on an 'approved' booking throws BookingConflictError", async () => {
  const { id } = await createBooking({
    slotId: slotIds[slotCursor++],
    email: 'pause-not-live@example.com',
    companyName: 'Pause Test Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  const d = db();
  d.prepare(
    "UPDATE bookings SET status = 'approved', creative_path = '/uploads/test/pause-creative.png' WHERE id = ?"
  ).run(id);
  d.close();

  await assert.rejects(
    () => pause(id),
    (err) => {
      assert.strictEqual(err.status, 409);
      assert.strictEqual(err.isBookingConflict, true);
      return true;
    }
  );
  const after = await getBookingById(id);
  assert.strictEqual(after.status, 'approved', 'rejected pause must not move the booking');
});

test('pause() on a live bundle booking cascades: every member slot goes reserved and keeps current_booking_id', async () => {
  const bundleSlotId = getBundleSlotId(__filename, 'zeus');
  const d0 = db();
  const memberIds = d0
    .prepare('SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = ?')
    .all(bundleSlotId)
    .map((r) => r.member_slot_id);
  d0.close();
  assert.ok(memberIds.length > 0, 'zeus bundle has member slots');

  const id = await makeLiveBooking('pause-bundle@example.com', { slotId: bundleSlotId });
  await pause(id);

  const booking = await getBookingById(id);
  assert.strictEqual(booking.status, 'approved');

  const d = db();
  const frames = d
    .prepare(
      `SELECT id, status, current_booking_id FROM ad_slots
       WHERE id = ? OR id IN (SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = ?)`
    )
    .all(bundleSlotId, bundleSlotId);
  d.close();
  assert.strictEqual(frames.length, memberIds.length + 1);
  for (const frame of frames) {
    assert.strictEqual(frame.status, 'reserved', `slot ${frame.id} back to reserved`);
    assert.strictEqual(frame.current_booking_id, id, `slot ${frame.id} stays held for the sponsor`);
  }
});

test('goLive() after a pause preserves the original started_at/ends_at lease window', async () => {
  const id = await makeLiveBooking('pause-resume@example.com');
  const firstLive = await getBookingById(id);
  assert.ok(firstLive.started_at && firstLive.ends_at);

  await pause(id);
  const resumed = await goLive(id);
  assert.strictEqual(resumed.status, 'live');
  assert.strictEqual(resumed.started_at, firstLive.started_at, 'resume must not reset started_at');
  assert.strictEqual(resumed.ends_at, firstLive.ends_at, 'resume must not extend ends_at');
});

test('goLive() first-time still stamps started_at/ends_at for the full lease', async () => {
  const { id } = await createBooking({
    slotId: slotIds[slotCursor++],
    email: 'first-golive@example.com',
    companyName: 'Pause Test Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  const d = db();
  d.prepare(
    "UPDATE bookings SET status = 'approved', creative_path = '/uploads/test/pause-creative.png' WHERE id = ?"
  ).run(id);
  d.close();

  const before = await getBookingById(id);
  assert.strictEqual(before.started_at, null, 'no lease window before first publish');

  const live = await goLive(id);
  assert.strictEqual(live.status, 'live');
  assert.ok(live.started_at, 'first publish stamps started_at');
  assert.ok(live.ends_at, 'first publish stamps ends_at');
  assert.ok(
    new Date(live.ends_at) > new Date(live.started_at),
    'lease window runs forward from start'
  );
});

async function run() {
  console.log('\n▸ Booking Publish/Pause Primitive Tests\n');
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
  console.log(`\nBooking Publish/Pause: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
