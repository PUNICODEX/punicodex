/**
 * Reservation Expiry Tests — the stale-reservation sweep.
 *
 * A booking abandoned at checkout (status pending_payment, never paid) leaves
 * its slot 'reserved' forever without the sweep — unsellable inventory.
 * sweepStaleReservations cancels bookings older than the window and releases
 * their slots; fresh unpaid bookings and paid/live states are untouched.
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-reservation-expiry-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
const testDb = prepareTestDb(__filename);
void testDb;

const { getBundleSlotId } = require('./helpers/slots.js');
const { createBooking, sweepStaleReservations, releaseSlotsForBooking } = require('../platform/api/bookings.js');

function rawDb() {
  const Database = require('better-sqlite3');
  return new Database(getTestDbPath(__filename));
}

async function run() {
  await test('stale pending_payment booking is canceled and its slot released', async () => {
    const slotId = getBundleSlotId(__filename, 'zeus');
    const booking = await createBooking({
      slotId,
      email: 'stale@example.com',
      companyName: 'Stale Co',
      status: 'pending_payment',
    });
    const db = rawDb();
    db.prepare(
      `UPDATE bookings SET created_at = datetime('now', '-3 days') WHERE id = ?`
    ).run(booking.id);
    db.prepare(`UPDATE ad_slots SET status = 'reserved', current_booking_id = ? WHERE id = ?`).run(
      booking.id,
      slotId
    );
    db.close();

    const result = await sweepStaleReservations({ olderThanHours: 48 });
    assert.ok(result.canceled >= 1, `expected ≥1 cancellation, got ${result.canceled}`);

    const check = rawDb();
    const bookingRow = check.prepare('SELECT status FROM bookings WHERE id = ?').get(booking.id);
    const slotRow = check
      .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
      .get(slotId);
    check.close();
    assert.strictEqual(bookingRow.status, 'cancelled');
    assert.strictEqual(slotRow.status, 'available');
    assert.strictEqual(slotRow.current_booking_id, null);
  });

  await test('fresh pending_payment booking is left alone', async () => {
    const slotId = getBundleSlotId(__filename, 'athena');
    const booking = await createBooking({
      slotId,
      email: 'fresh@example.com',
      companyName: 'Fresh Co',
      status: 'pending_payment',
    });
    const db = rawDb();
    db.prepare(`UPDATE ad_slots SET status = 'reserved', current_booking_id = ? WHERE id = ?`).run(
      booking.id,
      slotId
    );
    db.close();

    await sweepStaleReservations({ olderThanHours: 48 });

    const check = rawDb();
    const bookingRow = check.prepare('SELECT status FROM bookings WHERE id = ?').get(booking.id);
    const slotRow = check
      .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
      .get(slotId);
    check.close();
    assert.strictEqual(bookingRow.status, 'pending_payment');
    assert.strictEqual(slotRow.status, 'reserved');
    assert.strictEqual(slotRow.current_booking_id, booking.id);
    await releaseSlotsForBooking(booking.id); // fixture cleanup
  });

  await test('live bookings are never swept', async () => {
    const slotId = getBundleSlotId(__filename, 'nike');
    const booking = await createBooking({
      slotId,
      email: 'live@example.com',
      companyName: 'Live Co',
      status: 'live',
    });
    const db = rawDb();
    db.prepare(
      `UPDATE bookings SET created_at = datetime('now', '-30 days') WHERE id = ?`
    ).run(booking.id);
    db.close();

    await sweepStaleReservations({ olderThanHours: 48 });

    const check = rawDb();
    const bookingRow = check.prepare('SELECT status FROM bookings WHERE id = ?').get(booking.id);
    check.close();
    assert.strictEqual(bookingRow.status, 'live');
  });
}

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ✓ ${name}`))
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      console.error(err);
      process.exitCode = 1;
      throw err;
    });
}

run()
  .then(() => {
    if (process.exitCode !== 1) console.log('\n✓ All reservation expiry tests passed');
  })
  .catch(() => {
    console.error('\n✗ Some reservation expiry tests failed');
    process.exit(1);
  });
