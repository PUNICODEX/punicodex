/**
 * PÚNYCODEX — Booking migration v3
 *
 * Seeds the new 13+1 tenant-space layout (5 banners + 8 boxes + Full Page Takeover)
 * for every ad-enabled flagship temple. It is idempotent and booking-safe:
 *   - Sites that already have exactly 14 new-style slots are skipped.
 *   - Sites with existing bookings are skipped (to avoid data loss in production).
 *   - All other sites are reseeded from the generated temple HTML.
 *
 * Run: node platform/db/migrate-booking-v3.js
 */

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..', '..');
const SITES_DIR = path.join(ROOT, 'sites');
const DB_PATH = path.join(__dirname, 'punycodex.db');

const SLOT_TYPES = [
  'Banner',
  'Box',
  'Box',
  'Banner',
  'Box',
  'Box',
  'Banner',
  'Box',
  'Box',
  'Banner',
  'Box',
  'Box',
  'Banner',
];

function loadArchetypes() {
  const archetypePath = path.join(ROOT, 'js', 'archetypes-v2.js');
  const code = fs.readFileSync(archetypePath, 'utf8').replace('const ARCHETYPES', 'var ARCHETYPES');
  return new Function(`${code}; return ARCHETYPES;`)();
}

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function parseSlotsFromHtml(siteSlug) {
  const htmlPath = path.join(SITES_DIR, siteSlug, 'index.html');
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Generated HTML not found: ${htmlPath}`);
  }

  const html = fs.readFileSync(htmlPath, 'utf8');
  const $ = cheerio.load(html);
  const slots = [];

  $('.space-slot').each((_idx, el) => {
    const $el = $(el);
    const sortOrder = parseInt($el.attr('data-space'), 10);
    if (!sortOrder || sortOrder < 1 || sortOrder > 14) {
      throw new Error(`${siteSlug}: unexpected data-space "${$el.attr('data-space')}"`);
    }

    const priceCents = parseInt($el.attr('data-price-cents'), 10);
    if (!Number.isFinite(priceCents)) {
      throw new Error(`${siteSlug}: slot ${sortOrder} missing data-price-cents`);
    }

    const name = $el.find('.space-name').first().text().trim();
    if (!name) {
      throw new Error(`${siteSlug}: slot ${sortOrder} missing space-name`);
    }

    const isBundle = $el.attr('data-bundle') === '1' || $el.hasClass('space-slot--fullpage');

    let width;
    let height;
    let aspectRatio;

    if (isBundle) {
      width = 1200;
      height = 400;
      aspectRatio = null;
    } else {
      const type = SLOT_TYPES[sortOrder - 1];
      if (type === 'Banner') {
        width = 1200;
        height = 400;
        aspectRatio = '1200:400';
      } else {
        width = 600;
        height = 600;
        aspectRatio = '600:600';
      }
    }

    slots.push({
      sortOrder,
      name,
      slug: `${siteSlug}-${slugify(name)}`,
      width,
      height,
      priceCents,
      aspectRatio,
      isBundle: isBundle ? 1 : 0,
    });
  });

  if (slots.length !== 14) {
    throw new Error(`${siteSlug}: expected 14 slots, found ${slots.length}`);
  }

  const seenSortOrders = new Set(slots.map((s) => s.sortOrder));
  if (seenSortOrders.size !== 14) {
    throw new Error(`${siteSlug}: duplicate sort_order values`);
  }

  const bundle = slots.find((s) => s.isBundle);
  if (!bundle || bundle.sortOrder !== 14) {
    throw new Error(`${siteSlug}: bundle must be at sort_order 14`);
  }

  return slots.sort((a, b) => a.sortOrder - b.sortOrder);
}

function seedSite(db, siteSlug, slots) {
  const deleteBundle = db.prepare('DELETE FROM bundle_members WHERE bundle_slot_id IN (SELECT id FROM ad_slots WHERE site_slug = ?)');
  const deleteSlots = db.prepare('DELETE FROM ad_slots WHERE site_slug = ?');

  deleteBundle.run(siteSlug);
  deleteSlots.run(siteSlug);

  const insertSlot = db.prepare(`
    INSERT INTO ad_slots (name, slug, width, height, price_cents, aspect_ratio, sort_order, is_bundle, site_slug)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertedIds = [];
  for (const slot of slots) {
    const result = insertSlot.run(
      slot.name,
      slot.slug,
      slot.width,
      slot.height,
      slot.priceCents,
      slot.aspectRatio,
      slot.sortOrder,
      slot.isBundle,
      siteSlug
    );
    insertedIds.push(result.lastInsertRowid);
  }

  const bundleId = insertedIds[13];
  const insertBundleMember = db.prepare('INSERT INTO bundle_members (bundle_slot_id, member_slot_id) VALUES (?, ?)');
  for (let i = 0; i < 13; i++) {
    insertBundleMember.run(bundleId, insertedIds[i]);
  }

  return { siteSlug, slots: insertedIds.length };
}

function main() {
  const db = new Database(DB_PATH);

  // Ensure site_slug column exists (idempotent)
  try {
    db.exec('ALTER TABLE ad_slots ADD COLUMN site_slug TEXT DEFAULT \'nike\'');
  } catch (_e) {}

  // Ensure tables exist
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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      site_slug TEXT DEFAULT 'nike'
    );
    CREATE INDEX IF NOT EXISTS idx_ad_slots_status ON ad_slots(status);
    CREATE INDEX IF NOT EXISTS idx_ad_slots_slug ON ad_slots(slug);

    CREATE TABLE IF NOT EXISTS bundle_members (
      bundle_slot_id INTEGER NOT NULL,
      member_slot_id INTEGER NOT NULL,
      PRIMARY KEY (bundle_slot_id, member_slot_id),
      FOREIGN KEY (bundle_slot_id) REFERENCES ad_slots(id),
      FOREIGN KEY (member_slot_id) REFERENCES ad_slots(id)
    );
  `);

  const archetypes = loadArchetypes().filter((a) => a.hasAdSite);
  console.log(`Found ${archetypes.length} ad-enabled flagships`);

  const skipped = [];
  const reseeded = [];
  const errors = [];

  for (const archetype of archetypes) {
    const siteSlug = archetype.id;

    // Safety: never touch a site that has any bookings.
    const bookingCount = db
      .prepare('SELECT COUNT(*) as c FROM bookings WHERE site_slug = ?')
      .get(siteSlug).c;
    if (bookingCount > 0) {
      skipped.push({ siteSlug, reason: `${bookingCount} existing booking(s)` });
      continue;
    }

    // Check whether the new layout is already present.
    const currentSlots = db
      .prepare('SELECT id, sort_order, is_bundle FROM ad_slots WHERE site_slug = ? ORDER BY sort_order')
      .all(siteSlug);

    if (currentSlots.length === 14) {
      const hasBundleAt14 = currentSlots.some((s) => s.sort_order === 14 && s.is_bundle === 1);
      if (hasBundleAt14) {
        skipped.push({ siteSlug, reason: 'already has 14 new-style slots' });
        continue;
      }
    }

    try {
      const slots = parseSlotsFromHtml(siteSlug);
      const result = seedSite(db, siteSlug, slots);
      reseeded.push(result);
    } catch (err) {
      errors.push({ siteSlug, error: err.message });
      console.error(`✗ ${siteSlug}: ${err.message}`);
    }
  }

  db.close();

  console.log('\n─── Migration complete ───');
  console.log(`Reseeded: ${reseeded.length}`);
  console.log(`Skipped:  ${skipped.length}`);
  if (errors.length > 0) {
    console.log(`Errors:   ${errors.length}`);
    process.exit(1);
  }
}

main();
