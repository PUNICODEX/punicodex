const { all } = require('../db/operational');
const { endBooking } = require('../api/bookings');

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

  return { checked: expired.length, ended, errors };
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
