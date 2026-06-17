const { run, all } = require('../db/operational');

async function logAction({ adminToken, action, bookingId = null, entryId = null, payload = null }) {
  try {
    await run(
      `INSERT INTO admin_actions (admin_token, action, booking_id, entry_id, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [adminToken || null, action, bookingId, entryId, payload ? JSON.stringify(payload) : null]
    );
  } catch (err) {
    console.error('[admin-actions] Failed to log action:', err.message);
  }
}

async function getActionsForBooking(bookingId, limit = 50) {
  return all(
    `SELECT * FROM admin_actions WHERE booking_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [bookingId, limit]
  );
}

module.exports = { logAction, getActionsForBooking };
