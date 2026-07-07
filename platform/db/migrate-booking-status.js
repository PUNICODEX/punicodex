const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

// The booking lifecycle includes an application step for full-page takeovers.
// Ensure the status CHECK constraint allows it and add cancel_at_end flag.
const createSql = db
  .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='bookings'")
  .get()?.sql;

const needsStatusFix = !createSql || !createSql.includes('pending_application');
const columns = db.prepare('PRAGMA table_info(bookings)').all().map((c) => c.name);
const needsCancelAtEnd = !columns.includes('cancel_at_end');
const needsCanceledAt = !columns.includes('canceled_at');

if (needsStatusFix || needsCancelAtEnd || needsCanceledAt) {
  db.exec('BEGIN TRANSACTION');
  try {
    // SQLite does not support dropping constraints; recreate the table.
    db.exec(`
      CREATE TABLE bookings_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slot_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        company_name TEXT,
        website_url TEXT,
        custom_heading TEXT,
        custom_subtitle TEXT,
        status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'pending_application', 'pending_upload', 'pending_approval', 'approved', 'rejected', 'live', 'ended', 'cancelled')),
        stripe_session_id TEXT,
        stripe_payment_intent TEXT,
        amount_paid_cents INTEGER,
        creative_path TEXT,
        creative_original_name TEXT,
        admin_note TEXT,
        analytics_token TEXT NOT NULL UNIQUE,
        started_at DATETIME,
        ends_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        lease_months INTEGER DEFAULT 1,
        site_slug TEXT DEFAULT 'nike',
        trial_months INTEGER DEFAULT 0,
        trial_ends_at TEXT,
        billing_starts_at TEXT,
        reminder_7d_sent INTEGER DEFAULT 0,
        reminder_1d_sent INTEGER DEFAULT 0,
        stripe_subscription_id TEXT,
        billing_status TEXT DEFAULT 'none',
        cancel_at_end INTEGER DEFAULT 0,
        canceled_at DATETIME,
        FOREIGN KEY (slot_id) REFERENCES ad_slots(id)
      )
    `);

    const oldColumns = db.prepare('PRAGMA table_info(bookings)').all().map((c) => c.name);
    const commonColumns = oldColumns.filter((c) =>
      ['id','slot_id','email','company_name','website_url','custom_heading','custom_subtitle','status','stripe_session_id','stripe_payment_intent','amount_paid_cents','creative_path','creative_original_name','admin_note','analytics_token','started_at','ends_at','created_at','updated_at','lease_months','site_slug','trial_months','trial_ends_at','billing_starts_at','reminder_7d_sent','reminder_1d_sent','stripe_subscription_id','billing_status','cancel_at_end','canceled_at'].includes(c)
    );
    db.exec(`
      INSERT INTO bookings_new (${commonColumns.join(', ')})
      SELECT ${commonColumns.join(', ')} FROM bookings
    `);

    db.exec('DROP TABLE bookings');
    db.exec('ALTER TABLE bookings_new RENAME TO bookings');
    db.exec('CREATE INDEX idx_bookings_slot ON bookings(slot_id)');
    db.exec('CREATE INDEX idx_bookings_status ON bookings(status)');
    db.exec('CREATE INDEX idx_bookings_email ON bookings(email)');
    db.exec('CREATE INDEX idx_bookings_analytics_token ON bookings(analytics_token)');
    db.exec('COMMIT');
    console.log('Recreated bookings table with pending_application status and cancel_at_end column');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
} else {
  console.log('Bookings status constraint and cancel_at_end already correct');
}

db.close();
console.log('Booking status migration complete');
