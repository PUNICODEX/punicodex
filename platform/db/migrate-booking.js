const Database = require('better-sqlite3');
const path = require('node:path');
const _crypto = require('node:crypto');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);

// Create ad_slots table
db.exec(`
  CREATE TABLE IF NOT EXISTS ad_slots (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    aspect_ratio TEXT,
    sort_order INTEGER NOT NULL,
    is_bundle INTEGER DEFAULT 0,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'live')),
    current_booking_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_ad_slots_status ON ad_slots(status);
  CREATE INDEX IF NOT EXISTS idx_ad_slots_slug ON ad_slots(slug);
`);

// Create bookings table
db.exec(`
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slot_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    company_name TEXT,
    website_url TEXT,
    custom_heading TEXT,
    custom_subtitle TEXT,
    status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'pending_upload', 'pending_approval', 'approved', 'rejected', 'live', 'ended', 'cancelled')),
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
    FOREIGN KEY (slot_id) REFERENCES ad_slots(id)
  );

  CREATE INDEX IF NOT EXISTS idx_bookings_slot ON bookings(slot_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  CREATE INDEX IF NOT EXISTS idx_bookings_token ON bookings(analytics_token);
  CREATE INDEX IF NOT EXISTS idx_bookings_email ON bookings(email);
`);

// Add meta customization columns (idempotent)
try {
  db.exec(`ALTER TABLE bookings ADD COLUMN custom_heading TEXT`);
} catch (_e) {}
try {
  db.exec(`ALTER TABLE bookings ADD COLUMN custom_subtitle TEXT`);
} catch (_e) {}

// Add lease duration column (idempotent)
try {
  db.exec(`ALTER TABLE bookings ADD COLUMN lease_months INTEGER DEFAULT 1`);
} catch (_e) {}

// Create analytics_events table
db.exec(`
  CREATE TABLE IF NOT EXISTS analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
    ip_hash TEXT NOT NULL,
    user_agent TEXT,
    referrer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  );

  CREATE INDEX IF NOT EXISTS idx_analytics_booking ON analytics_events(booking_id);
  CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(created_at);
`);

// Create admin_sessions table
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create email_verifications table
db.exec(`
  CREATE TABLE IF NOT EXISTS email_verifications (
    email TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create bundle_members table — maps bundle slots to their constituent slots
db.exec(`
  CREATE TABLE IF NOT EXISTS bundle_members (
    bundle_slot_id INTEGER NOT NULL,
    member_slot_id INTEGER NOT NULL,
    PRIMARY KEY (bundle_slot_id, member_slot_id),
    FOREIGN KEY (bundle_slot_id) REFERENCES ad_slots(id),
    FOREIGN KEY (member_slot_id) REFERENCES ad_slots(id)
  );
`);

// Create slot_creatives table — per-slot creative overrides within a bundle booking
db.exec(`
  CREATE TABLE IF NOT EXISTS slot_creatives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    slot_id INTEGER NOT NULL,
    creative_path TEXT,
    custom_heading TEXT,
    custom_subtitle TEXT,
    website_url TEXT,
    UNIQUE(booking_id, slot_id),
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
  );
  CREATE INDEX IF NOT EXISTS idx_slot_creatives_booking ON slot_creatives(booking_id);
`);

// Seed ad_slots if empty
const count = db.prepare('SELECT COUNT(*) as c FROM ad_slots').get().c;
if (count === 0) {
  const insert = db.prepare(`
    INSERT INTO ad_slots (id, name, slug, width, height, price_cents, aspect_ratio, sort_order, is_bundle)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const slots = [
    [1, 'Crown Banner', 'crown-banner', 1200, 400, 75000, '1200:400', 1, 0],
    [2, 'Victory Box I', 'victory-box-1', 600, 600, 30000, '600:600', 2, 0],
    [3, 'Victory Box II', 'victory-box-2', 600, 600, 26000, '600:600', 3, 0],
    [4, 'Champion Banner', 'champion-banner', 1200, 400, 47000, '1200:400', 4, 0],
    [5, 'Herald Box I', 'herald-box-1', 600, 600, 20000, '600:600', 5, 0],
    [6, 'Herald Box II', 'herald-box-2', 600, 600, 15000, '600:600', 6, 0],
    [7, 'Silver Banner', 'silver-banner', 1200, 400, 27000, '1200:400', 7, 0],
    [8, 'Traveler Box I', 'traveler-box-1', 600, 600, 11000, '600:600', 8, 0],
    [9, 'Traveler Box II', 'traveler-box-2', 600, 600, 9000, '600:600', 9, 0],
    [10, 'Caduceus Banner', 'caduceus-banner', 1200, 400, 16000, '1200:400', 10, 0],
    [11, 'Messenger Box I', 'messenger-box-1', 600, 600, 7000, '600:600', 11, 0],
    [12, 'Messenger Box II', 'messenger-box-2', 600, 600, 6000, '600:600', 12, 0],
    [13, 'Foundation Banner', 'foundation-banner', 1200, 400, 11000, '1200:400', 13, 0],
    [14, 'Full Page Takeover', 'full-page-takeover', 1200, 400, 250000, null, 14, 1],
  ];
  for (const slot of slots) {
    insert.run(...slot);
  }
  console.log('Seeded 14 ad_slots');
} else {
  console.log(`Ad slots already seeded: ${count}`);
}

// Seed bundle_members for Full Page Takeover (slot 14 → slots 1-13) if not present
const bundleCount = db
  .prepare('SELECT COUNT(*) as c FROM bundle_members WHERE bundle_slot_id = 14')
  .get().c;
if (bundleCount === 0) {
  const insertBundle = db.prepare(
    'INSERT INTO bundle_members (bundle_slot_id, member_slot_id) VALUES (?, ?)'
  );
  for (let i = 1; i <= 13; i++) {
    insertBundle.run(14, i);
  }
  console.log('Seeded bundle_members for Full Page Takeover');
}

console.log('Booking migration complete');
console.log('Slots:', db.prepare('SELECT COUNT(*) as c FROM ad_slots').get().c);
console.log('Bookings:', db.prepare('SELECT COUNT(*) as c FROM bookings').get().c);

db.close();
