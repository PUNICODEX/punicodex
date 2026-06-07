const Database = require('better-sqlite3');
const path = require('path');

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
const updatedNike = db.prepare(`UPDATE ad_slots SET site_slug = 'nike' WHERE site_slug IS NULL OR site_slug = ''`).run();
console.log(`Updated ${updatedNike.changes} existing slots to site_slug='nike'`);

// ─── Update existing bookings to nike ───
const updatedBookings = db.prepare(`UPDATE bookings SET site_slug = 'nike' WHERE site_slug IS NULL OR site_slug = ''`).run();
console.log(`Updated ${updatedBookings.changes} existing bookings to site_slug='nike'`);

// ─── Seed Hermes slots if none exist ───
const hermesCount = db.prepare(`SELECT COUNT(*) as c FROM ad_slots WHERE site_slug = 'hermes'`).get().c;
if (hermesCount === 0) {
  const insert = db.prepare(`
    INSERT INTO ad_slots (id, name, slug, width, height, price_cents, aspect_ratio, sort_order, is_bundle, site_slug)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const slots = [
    [14, 'Winged Crown', 'hermes-winged-crown', 1136, 379, 120000, '1200:400', 1, 0, 'hermes'],
    [15, "Herald's Column", 'hermes-herald-column', 260, 520, 80000, '300:600', 2, 0, 'hermes'],
    [16, "Traveler's Strip", 'hermes-traveler-strip', 844, 317, 60000, '844:317', 3, 0, 'hermes'],
    [17, 'Sandal I', 'hermes-sandal-1', 844, 394, 50000, '844:394', 4, 0, 'hermes'],
    [18, 'Sandal II', 'hermes-sandal-2', 552, 309, 40000, '552:309', 5, 0, 'hermes'],
    [19, 'Sandal III', 'hermes-sandal-3', 552, 309, 35000, '552:309', 6, 0, 'hermes'],
    [20, 'Silver Ribbon', 'hermes-silver-ribbon', 511, 131, 30000, '511:131', 7, 0, 'hermes'],
    [21, 'Caduceus Badge', 'hermes-caduceus-badge', 306, 115, 25000, '306:115', 8, 0, 'hermes'],
    [22, 'Inscription', 'hermes-inscription', 255, 87, 18000, '255:87', 9, 0, 'hermes'],
    [23, 'Emblem I', 'hermes-emblem-1', 552, 221, 15000, '552:221', 10, 0, 'hermes'],
    [24, 'Emblem II', 'hermes-emblem-2', 552, 221, 12000, '552:221', 11, 0, 'hermes'],
    [25, 'Foundation', 'hermes-foundation', 1136, 95, 30000, '1200:100', 12, 0, 'hermes'],
    [26, 'Total Conquest', 'hermes-total-conquest', 1136, 379, 515000, null, 13, 1, 'hermes'],
  ];
  for (const slot of slots) {
    insert.run(...slot);
  }
  console.log('Seeded 13 Hermes ad_slots (IDs 14-26)');
} else {
  console.log(`Hermes slots already seeded: ${hermesCount}`);
}

// ─── Seed bundle_members for Hermes (slot 26 → slots 14-25) ───
const hermesBundleCount = db.prepare('SELECT COUNT(*) as c FROM bundle_members WHERE bundle_slot_id = 26').get().c;
if (hermesBundleCount === 0) {
  const insertBundle = db.prepare('INSERT INTO bundle_members (bundle_slot_id, member_slot_id) VALUES (?, ?)');
  for (let i = 14; i <= 25; i++) {
    insertBundle.run(26, i);
  }
  console.log('Seeded bundle_members for Hermes Total Conquest (26 → 14-25)');
} else {
  console.log(`Hermes bundle_members already seeded: ${hermesBundleCount}`);
}

console.log('Booking v2 migration complete');
console.log('Total slots:', db.prepare('SELECT COUNT(*) as c FROM ad_slots').get().c);
console.log('Nike slots:', db.prepare("SELECT COUNT(*) as c FROM ad_slots WHERE site_slug = 'nike'").get().c);
console.log('Hermes slots:', db.prepare("SELECT COUNT(*) as c FROM ad_slots WHERE site_slug = 'hermes'").get().c);

db.close();
