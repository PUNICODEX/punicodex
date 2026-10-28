/**
 * Migration: University introductory-call bookings.
 *
 * Rows are written by POST /api/university/book/ (the calendar on
 * /university/book/) and read by the partnerships follow-up flow. Idempotent;
 * runs on first use, mirroring migrate-careers.js.
 */

const UNIVERSITY_BOOKINGS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS university_call_bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    institution TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    scheduled_at TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    meeting_url TEXT NOT NULL DEFAULT '',
    ip_hash TEXT NOT NULL DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_university_call_bookings_email
    ON university_call_bookings(email);
  CREATE INDEX IF NOT EXISTS idx_university_call_bookings_scheduled
    ON university_call_bookings(scheduled_at);
`;

function addColumnIfMissing(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function migrate(db) {
  db.exec(UNIVERSITY_BOOKINGS_SCHEMA);
  // Set when the pre-call reminder fires (cron: university-call-reminders).
  addColumnIfMissing(db, 'university_call_bookings', 'reminded_at', 'DATETIME');
}

module.exports = { migrate, UNIVERSITY_BOOKINGS_SCHEMA };
