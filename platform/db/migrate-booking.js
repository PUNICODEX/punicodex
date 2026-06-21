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

  -- Prevent two active bookings from ever referencing the same slot.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_active_slot
  ON bookings(slot_id)
  WHERE status IN ('pending_payment', 'pending_application', 'pending_upload', 'pending_approval', 'approved', 'live');
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
    [1, 'Crown Position', 'crown', 1136, 379, 120000, '1200:400', 1, 0],
    [2, 'Victory Column', 'column', 260, 520, 80000, '300:600', 2, 0],
    [3, 'Champion Strip', 'champion', 844, 317, 60000, '844:317', 3, 0],
    [4, 'Wingspan I', 'wingspan-1', 844, 394, 50000, '844:394', 4, 0],
    [5, 'Wingspan II', 'wingspan-2', 552, 309, 40000, '552:309', 5, 0],
    [6, 'Wingspan III', 'wingspan-3', 552, 309, 35000, '552:309', 6, 0],
    [7, 'Golden Ribbon', 'ribbon', 511, 131, 30000, '511:131', 7, 0],
    [8, 'Laurel Badge', 'badge', 306, 115, 25000, '306:115', 8, 0],
    [9, 'Inscription', 'inscription', 255, 87, 18000, '255:87', 9, 0],
    [10, 'Emblem I', 'emblem-1', 552, 221, 15000, '552:221', 10, 0],
    [11, 'Emblem II', 'emblem-2', 552, 221, 12000, '552:221', 11, 0],
    [12, 'Foundation', 'foundation', 1136, 95, 30000, '1200:100', 12, 0],
    [13, 'Total Conquest', 'total-conquest', 1136, 379, 515000, null, 13, 1],
  ];
  for (const slot of slots) {
    insert.run(...slot);
  }
  console.log('Seeded 13 ad_slots');
} else {
  console.log(`Ad slots already seeded: ${count}`);
}

// Seed bundle_members for Total Conquest (slot 13 → slots 1-12) if not present
const bundleCount = db
  .prepare('SELECT COUNT(*) as c FROM bundle_members WHERE bundle_slot_id = 13')
  .get().c;
if (bundleCount === 0) {
  const insertBundle = db.prepare(
    'INSERT INTO bundle_members (bundle_slot_id, member_slot_id) VALUES (?, ?)'
  );
  for (let i = 1; i <= 12; i++) {
    insertBundle.run(13, i);
  }
  console.log('Seeded bundle_members for Total Conquest');
}

console.log('Booking migration complete');
console.log('Slots:', db.prepare('SELECT COUNT(*) as c FROM ad_slots').get().c);
console.log('Bookings:', db.prepare('SELECT COUNT(*) as c FROM bookings').get().c);

db.close();
