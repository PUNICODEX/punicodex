const { all } = require('../db/operational');
const { endBooking, sweepStaleReservations } = require('../api/bookings');
const { runCreativePurge } = require('../api/creative-purge');

// Live leases past their window, plus paused ones (status 'approved' with a
// stamped lease window) whose ends_at elapsed while off the air — otherwise a
// paused-past-expiry booking would hold its frames reserved forever. Freshly
// approved bookings carry ends_at NULL and are never matched.
async function getLiveExpiredBookings() {
  return all(
    `
      SELECT b.*, s.name as slot_name
      FROM bookings b
      JOIN ad_slots s ON b.slot_id = s.id
      WHERE b.ends_at IS NOT NULL
        AND b.ends_at <= CURRENT_TIMESTAMP
        AND (
          b.status = 'live'
          OR b.status = 'approved'
        )
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

  // Storage lifecycle: creatives for placements ended beyond the 30-day
  // grace period are deleted (Blob or local), and decided/abandoned change
  // requests lose their staged images. Purge failures never block expiry.
  let purge = { endedCreativesPurged: 0, requestImagesPurged: 0 };
  try {
    purge = await runCreativePurge();
  } catch (err) {
    console.error('Creative purge failed:', err.message);
    errors++;
  }

  return {
    checked: expired.length,
    ended,
    errors,
    staleCanceled: swept.canceled,
    slotsReleased: swept.slotsReleased,
    ...purge,
  };
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
