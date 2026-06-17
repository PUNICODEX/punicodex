const { getDb } = require('../db/connection');

function logAction({ adminToken, action, bookingId = null, entryId = null, payload = null }) {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO admin_actions (admin_token, action, booking_id, entry_id, payload, created_at)
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(adminToken || null, action, bookingId, entryId, payload ? JSON.stringify(payload) : null);
  } catch (err) {
    console.error('[admin-actions] Failed to log action:', err.message);
  }
}

function getActionsForBooking(bookingId, limit = 50) {
  const db = getDb();
  return db
    .prepare(`SELECT * FROM admin_actions WHERE booking_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(bookingId, limit);
}

module.exports = { logAction, getActionsForBooking };
