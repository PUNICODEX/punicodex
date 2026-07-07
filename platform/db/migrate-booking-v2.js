const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);

// ─── Add site_slug to ad_slots (idempotent) ───
try {
  db.exec(`ALTER TABLE ad_slots ADD COLUMN site_slug TEXT DEFAULT 'nike'`);
  console.log('Added site_slug to ad_slots');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('site_slug already exists on ad_slots');
  } else {
    console.error('Error adding site_slug to ad_slots:', e.message);
  }
}

// ─── Add site_slug to bookings (idempotent) ───
try {
  db.exec(`ALTER TABLE bookings ADD COLUMN site_slug TEXT DEFAULT 'nike'`);
  console.log('Added site_slug to bookings');
} catch (e) {
  if (e.message.includes('duplicate column')) {
    console.log('site_slug already exists on bookings');
  } else {
    console.error('Error adding site_slug to bookings:', e.message);
  }
}

// ─── Update existing slots to nike ───
const updatedNike = db
  .prepare(`UPDATE ad_slots SET site_slug = 'nike' WHERE site_slug IS NULL OR site_slug = ''`)
  .run();
console.log(`Updated ${updatedNike.changes} existing slots to site_slug='nike'`);

// ─── Update existing bookings to nike ───
const updatedBookings = db
  .prepare(`UPDATE bookings SET site_slug = 'nike' WHERE site_slug IS NULL OR site_slug = ''`)
  .run();
console.log(`Updated ${updatedBookings.changes} existing bookings to site_slug='nike'`);

// ─── Seed Hermes slots if none exist ───
const hermesCount = db
  .prepare(`SELECT COUNT(*) as c FROM ad_slots WHERE site_slug = 'hermes'`)
  .get().c;
if (hermesCount === 0) {
  const insert = db.prepare(`
    INSERT INTO ad_slots (id, name, slug, width, height, price_cents, aspect_ratio, sort_order, is_bundle, site_slug)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const slots = [
    [
      15,
      'Winged Crown Banner',
      'hermes-crown-banner',
      1200,
      400,
      75000,
      '1200:400',
      1,
      0,
      'hermes',
    ],
    [16, 'Herald Box I', 'hermes-herald-box-1', 600, 600, 30000, '600:600', 2, 0, 'hermes'],
    [17, 'Herald Box II', 'hermes-herald-box-2', 600, 600, 26000, '600:600', 3, 0, 'hermes'],
    [18, 'Traveler Banner', 'hermes-traveler-banner', 1200, 400, 47000, '1200:400', 4, 0, 'hermes'],
    [19, 'Sandal Box I', 'hermes-sandal-box-1', 600, 600, 20000, '600:600', 5, 0, 'hermes'],
    [20, 'Sandal Box II', 'hermes-sandal-box-2', 600, 600, 15000, '600:600', 6, 0, 'hermes'],
    [21, 'Silver Banner', 'hermes-silver-banner', 1200, 400, 27000, '1200:400', 7, 0, 'hermes'],
    [22, 'Caduceus Box I', 'hermes-caduceus-box-1', 600, 600, 11000, '600:600', 8, 0, 'hermes'],
    [23, 'Caduceus Box II', 'hermes-caduceus-box-2', 600, 600, 9000, '600:600', 9, 0, 'hermes'],
    [
      24,
      'Messenger Banner',
      'hermes-messenger-banner',
      1200,
      400,
      16000,
      '1200:400',
      10,
      0,
      'hermes',
    ],
    [25, 'Road Box I', 'hermes-road-box-1', 600, 600, 7000, '600:600', 11, 0, 'hermes'],
    [26, 'Road Box II', 'hermes-road-box-2', 600, 600, 6000, '600:600', 12, 0, 'hermes'],
    [
      27,
      'Foundation Banner',
      'hermes-foundation-banner',
      1200,
      400,
      11000,
      '1200:400',
      13,
      0,
      'hermes',
    ],
    [
      28,
      'Full Page Takeover',
      'hermes-full-page-takeover',
      1200,
      400,
      250000,
      null,
      14,
      1,
      'hermes',
    ],
  ];
  for (const slot of slots) {
    insert.run(...slot);
  }
  console.log('Seeded 14 Hermes ad_slots (IDs 15-28)');
} else {
  console.log(`Hermes slots already seeded: ${hermesCount}`);
}

// ─── Seed bundle_members for Hermes (slot 28 → slots 15-27) ───
const hermesBundleCount = db
  .prepare('SELECT COUNT(*) as c FROM bundle_members WHERE bundle_slot_id = 28')
  .get().c;
if (hermesBundleCount === 0) {
  const insertBundle = db.prepare(
    'INSERT INTO bundle_members (bundle_slot_id, member_slot_id) VALUES (?, ?)'
  );
  for (let i = 15; i <= 27; i++) {
    insertBundle.run(28, i);
  }
  console.log('Seeded bundle_members for Hermes Full Page Takeover (28 → 15-27)');
} else {
  console.log(`Hermes bundle_members already seeded: ${hermesBundleCount}`);
}

console.log('Booking v2 migration complete');
console.log('Total slots:', db.prepare('SELECT COUNT(*) as c FROM ad_slots').get().c);
console.log(
  'Nike slots:',
  db.prepare("SELECT COUNT(*) as c FROM ad_slots WHERE site_slug = 'nike'").get().c
);
console.log(
  'Hermes slots:',
  db.prepare("SELECT COUNT(*) as c FROM ad_slots WHERE site_slug = 'hermes'").get().c
);

db.close();
