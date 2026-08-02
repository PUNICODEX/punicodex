const { all } = require('../db/operational');
const { endBooking, sweepStaleReservations } = require('../api/bookings');

async function getLiveExpiredBookings() {
  return all(
    `
      SELECT b.*, s.name as slot_name
      FROM bookings b
      JOIN ad_slots s ON b.slot_id = s.id
      WHERE b.status = 'live'
        AND b.ends_at IS NOT NULL
        AND b.ends_at <= CURRENT_TIMESTAMP
    `
  );
}

async function runLeaseExpiry() {
  const expired = await getLiveExpiredBookings();
  let ended = 0;
  let errors = 0;

  for (const booking of expired) {
    try {
      await endBooking(booking.id);
      ended++;
    } catch (err) {
      console.error(`Failed to end booking ${booking.id}:`, err.message);
      errors++;
    }
  }

  // Reclaim inventory abandoned at checkout: unpaid reservations older than
  // 48h are canceled and their slots released back to available.
  let swept = { canceled: 0, slotsReleased: 0 };
  try {
    swept = await sweepStaleReservations({ olderThanHours: 48 });
  } catch (err) {
    console.error('Stale-reservation sweep failed:', err.message);
    errors++;
  }

  return { checked: expired.length, ended, errors, staleCanceled: swept.canceled, slotsReleased: swept.slotsReleased };
}

if (require.main === module) {
  runLeaseExpiry()
    .then((result) => {
      console.log('Lease expiry:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Lease expiry runner failed:', err);
      process.exit(1);
    });
}

module.exports = { runLeaseExpiry };
