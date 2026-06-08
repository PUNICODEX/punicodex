const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'platform', 'db', 'punycodex.db');
const db = new Database(DB_PATH);

const now = new Date().toISOString();

function insertSlot(id, name, slug, width, height, priceCents, aspectRatio, sortOrder, isBundle, siteSlug) {
  const stmt = db.prepare(`
    INSERT INTO ad_slots (id, name, slug, width, height, price_cents, aspect_ratio, sort_order, is_bundle, site_slug, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available', ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name=excluded.name,
      slug=excluded.slug,
      width=excluded.width,
      height=excluded.height,
      price_cents=excluded.price_cents,
      aspect_ratio=excluded.aspect_ratio,
      sort_order=excluded.sort_order,
      is_bundle=excluded.is_bundle,
      site_slug=excluded.site_slug,
      updated_at=excluded.updated_at
  `);
  stmt.run(id, name, slug, width, height, priceCents, aspectRatio, sortOrder, isBundle, siteSlug, now, now);
}

function insertBundleMember(bundleId, memberId) {
  const stmt = db.prepare(`
    INSERT INTO bundle_members (bundle_slot_id, member_slot_id)
    VALUES (?, ?)
    ON CONFLICT(bundle_slot_id, member_slot_id) DO NOTHING
  `);
  stmt.run(bundleId, memberId);
}

// ========== RA SLOTS (IDs 27-39) ==========
const raSlots = [
  [27, 'Solar Disk', 'ra-solar-disk', 1136, 379, 120000, '1200:400', 1, 0, 'ra'],
  [28, 'Sun Pillar', 'ra-sun-pillar', 260, 520, 80000, '300:600', 2, 0, 'ra'],
  [29, 'Horizon Strip', 'ra-horizon-strip', 844, 317, 60000, '844:317', 3, 0, 'ra'],
  [30, 'Ray I', 'ra-ray-1', 844, 394, 50000, '844:394', 4, 0, 'ra'],
  [31, 'Ray II', 'ra-ray-2', 552, 309, 40000, '552:309', 5, 0, 'ra'],
  [32, 'Ray III', 'ra-ray-3', 552, 309, 35000, '552:309', 6, 0, 'ra'],
  [33, 'Golden Ribbon', 'ra-golden-ribbon', 511, 131, 30000, '511:131', 7, 0, 'ra'],
  [34, 'Scarab Badge', 'ra-scarab-badge', 306, 115, 25000, '306:115', 8, 0, 'ra'],
  [35, 'Inscription', 'ra-inscription', 255, 87, 18000, '255:87', 9, 0, 'ra'],
  [36, 'Emblem I', 'ra-emblem-1', 552, 221, 15000, '552:221', 10, 0, 'ra'],
  [37, 'Emblem II', 'ra-emblem-2', 552, 221, 12000, '552:221', 11, 0, 'ra'],
  [38, 'Foundation', 'ra-foundation', 1136, 95, 30000, '1200:100', 12, 0, 'ra'],
  [39, 'Total Conquest', 'ra-total-conquest', 1136, 379, 515000, null, 13, 1, 'ra'],
];

for (const s of raSlots) insertSlot(...s);

// Ra bundle members (27-38)
for (let i = 27; i <= 38; i++) {
  insertBundleMember(39, i);
}

// ========== AKH SLOTS (IDs 40-52) ==========
const akhSlots = [
  [40, 'Crown of Passing', 'akh-crown', 1136, 379, 120000, '1200:400', 1, 0, 'akh'],
  [41, 'Jackal Pillar', 'akh-column', 260, 520, 80000, '300:600', 2, 0, 'akh'],
  [42, 'Liminal Strip', 'akh-strip', 844, 317, 60000, '844:317', 3, 0, 'akh'],
  [43, 'Wing I', 'akh-wing-1', 844, 394, 50000, '844:394', 4, 0, 'akh'],
  [44, 'Wing II', 'akh-wing-2', 552, 309, 40000, '552:309', 5, 0, 'akh'],
  [45, 'Wing III', 'akh-wing-3', 552, 309, 35000, '552:309', 6, 0, 'akh'],
  [46, 'Sable Ribbon', 'akh-ribbon', 511, 131, 30000, '511:131', 7, 0, 'akh'],
  [47, 'Ankh Badge', 'akh-badge', 306, 115, 25000, '306:115', 8, 0, 'akh'],
  [48, 'Inscription', 'akh-inscription', 255, 87, 18000, '255:87', 9, 0, 'akh'],
  [49, 'Emblem I', 'akh-emblem-1', 552, 221, 15000, '552:221', 10, 0, 'akh'],
  [50, 'Emblem II', 'akh-emblem-2', 552, 221, 12000, '552:221', 11, 0, 'akh'],
  [51, 'Foundation', 'akh-foundation', 1136, 95, 30000, '1200:100', 12, 0, 'akh'],
  [52, 'Total Conquest', 'akh-total-conquest', 1136, 379, 515000, null, 13, 1, 'akh'],
];

for (const s of akhSlots) insertSlot(...s);

// Akh bundle members (40-51)
for (let i = 40; i <= 51; i++) {
  insertBundleMember(52, i);
}

console.log('Seeded Ra slots 27-39 and Akh slots 40-52');

// Verify
const rows = db.prepare('SELECT id, name, site_slug FROM ad_slots WHERE site_slug IN (?,?) ORDER BY id').all('ra','akh');
for (const r of rows) {
  console.log(`${r.id}: ${r.name} (${r.site_slug})`);
}

db.close();
