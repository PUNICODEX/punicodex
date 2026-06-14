const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

// Ensure bookings table exists before adding columns
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT
  )
`);

const columns = [
  { name: 'trial_months', def: 'INTEGER DEFAULT 0' },
  { name: 'trial_ends_at', def: 'TEXT' },
  { name: 'billing_starts_at', def: 'TEXT' },
  { name: 'reminder_7d_sent', def: 'INTEGER DEFAULT 0' },
  { name: 'reminder_1d_sent', def: 'INTEGER DEFAULT 0' },
  { name: 'stripe_subscription_id', def: 'TEXT' },
  { name: 'billing_status', def: "TEXT DEFAULT 'none'" },
];

const existing = db
  .prepare('PRAGMA table_info(bookings)')
  .all()
  .map((c) => c.name);

for (const col of columns) {
  if (!existing.includes(col.name)) {
    db.prepare(`ALTER TABLE bookings ADD COLUMN ${col.name} ${col.def}`).run();
    console.log(`Added column ${col.name}`);
  } else {
    console.log(`Column ${col.name} already exists`);
  }
}

db.close();
console.log('Bookings trial migration complete.');
