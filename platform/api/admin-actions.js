const { run, all } = require('../db/operational');
const { hashToken } = require('./admin');

/**
 * Append an entry to the admin audit trail.
 *
 * Legacy callers pass { adminToken, action, bookingId, entryId, payload };
 * the admin portal passes { adminUserId, action, target, meta }. Both write
 * into the admin_actions table created by platform/db/migrate-admin-users.js.
 * Logging is failure-tolerant: an audit failure must never break the admin
 * action itself.
 */
async function logAction({
  adminToken = null,
  adminUserId = null,
  action,
  bookingId = null,
  entryId = null,
  target = null,
  meta = null,
  payload = null,
}) {
  try {
    await run(
      `INSERT INTO admin_actions (admin_token, admin_user_id, action, booking_id, entry_id, target, meta, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        adminToken ? hashToken(adminToken) : null,
        adminUserId,
        action,
        bookingId,
        entryId,
        target,
        meta ? JSON.stringify(meta) : null,
        payload ? JSON.stringify(payload) : null,
      ]
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

async function listActions({ limit = 100, offset = 0 } = {}) {
  return all(`SELECT * FROM admin_actions ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [
    limit,
    offset,
  ]);
}

module.exports = { logAction, getActionsForBooking, listActions };
