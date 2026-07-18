/**
 * Booking public ID — split the public tracking identifier from the secret
 * management token (second-pass review 2026-07, finding 1).
 *
 * bookings.analytics_token is the bearer credential for booking management
 * and the advertiser dashboard, but it was also returned by the public slots
 * endpoints and rendered into temple pages for ad tracking. This migration
 * adds a separate public_id column that is safe to expose: it identifies a
 * booking for write-only analytics event recording (pixel/click/viewability)
 * and authorizes nothing else.
 */

const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

const columns = db
  .prepare('PRAGMA table_info(bookings)')
  .all()
  .map((c) => c.name);

if (!columns.includes('public_id')) {
  db.exec('ALTER TABLE bookings ADD COLUMN public_id TEXT');
  // Backfill existing bookings with a fresh random public ID (192 bits, same
  // entropy as the management token).
  db.exec('UPDATE bookings SET public_id = lower(hex(randomblob(24))) WHERE public_id IS NULL');
  db.exec('CREATE UNIQUE INDEX idx_bookings_public_id ON bookings(public_id)');
  console.log('Added public_id to bookings and backfilled existing rows');
} else {
  console.log('public_id already exists on bookings');
}

db.close();
console.log('Booking public-id migration complete');
