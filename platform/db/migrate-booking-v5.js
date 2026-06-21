/**
 * Booking schema v5 — prevent double-booking races.
 *
 * Adds a partial unique index so a slot can only have one active booking at a
 * time. Active statuses cover the entire lifecycle from reservation through live
 * serving; ended/cancelled/rejected bookings are excluded so the slot can be
 * re-booked later.
 */

const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

const indexExists = db
  .prepare("SELECT 1 FROM sqlite_master WHERE type='index' AND name='idx_bookings_active_slot'")
  .get();

if (!indexExists) {
  db.exec(`
    CREATE UNIQUE INDEX idx_bookings_active_slot
    ON bookings(slot_id)
    WHERE status IN ('pending_payment', 'pending_application', 'pending_upload', 'pending_approval', 'approved', 'live')
  `);
  console.log('Created partial unique index idx_bookings_active_slot');
} else {
  console.log('idx_bookings_active_slot already exists');
}

db.close();
console.log('Booking v5 migration complete');
