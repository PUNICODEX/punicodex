/**
 * Slots Seeded Tests
 *
 * Guards the flagship sponsorship pipeline against the production incident
 * where /om (and, at the time, ~280 temples) rendered sponsorship boxes but
 * the slots API returned an empty array — every click silently did nothing.
 *
 * Two layers:
 *   1. Static: every BUILT flagship whose generated temple HTML carries
 *      space-slots must have hasAdSite — otherwise migrate-booking-v3 never
 *      seeds it (this was the om bug).
 *   2. DB: migrate-booking-v3, run against a fresh schema, must seed exactly
 *      14 slots (bundle at sort_order 14) for every such site, and must be
 *      idempotent (a second run reseeds nothing).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const { migrate } = require('../platform/db/migrate-booking-v3.js');

const ARCHETYPES = require(path.join(ROOT, 'js', 'archetypes-v2.js'));
const LIST = Array.isArray(ARCHETYPES)
  ? ARCHETYPES
  : ARCHETYPES.archetypes || ARCHETYPES.ARCHETYPES || Object.values(ARCHETYPES)[0];

const SCHEMA = `
CREATE TABLE ad_slots (
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
CREATE INDEX idx_ad_slots_status ON ad_slots(status);
CREATE INDEX idx_ad_slots_slug ON ad_slots(slug);
CREATE TABLE bundle_members (
  bundle_slot_id INTEGER NOT NULL,
  member_slot_id INTEGER NOT NULL,
  PRIMARY KEY (bundle_slot_id, member_slot_id)
);
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  site_slug TEXT
);
`;

function sitesWithSpaceSlots() {
  const out = [];
  for (const a of LIST) {
    if (!a.built) continue;
    const htmlPath = path.join(ROOT, 'sites', a.id, 'index.html');
    if (!fs.existsSync(htmlPath)) continue;
    if (fs.readFileSync(htmlPath, 'utf8').includes('space-slot')) out.push(a);
  }
  return out;
}

// ── 1. Static hasAdSite coverage ──────────────────────────────────────────
{
  const offenders = sitesWithSpaceSlots().filter((a) => !a.hasAdSite);
  assert.deepStrictEqual(
    offenders.map((a) => a.id),
    [],
    `flagships rendering space-slots must have hasAdSite (unseeded): ${offenders
      .map((a) => a.id)
      .join(', ')}`
  );
  console.log(`✓ static: all ${sitesWithSpaceSlots().length} space-slot temples are ad-enabled`);
}

// ── 2. Fresh-schema seeding ────────────────────────────────────────────────
{
  const db = new Database(':memory:');
  db.exec(SCHEMA);
  try {
    migrate(db);

    const bySite = db
      .prepare('SELECT site_slug, COUNT(*) c, SUM(is_bundle) b FROM ad_slots GROUP BY site_slug')
      .all();
    const expected = new Set(sitesWithSpaceSlots().map((a) => a.id));
    const seeded = new Map(bySite.map((r) => [r.site_slug, r]));

    const missing = [...expected].filter((id) => !seeded.has(id));
    assert.deepStrictEqual(missing, [], `sites not seeded: ${missing.join(', ')}`);

    const malformed = [...expected].filter((id) => {
      const r = seeded.get(id);
      return r.c !== 14 || r.b !== 1;
    });
    assert.deepStrictEqual(
      malformed,
      [],
      `sites without exactly 14 slots + 1 bundle: ${malformed.join(', ')}`
    );

    const bundleAt14 = db
      .prepare('SELECT COUNT(*) c FROM ad_slots WHERE is_bundle = 1 AND sort_order = 14')
      .get().c;
    assert.strictEqual(bundleAt14, expected.size, 'every bundle must sit at sort_order 14');

    const memberCount = db.prepare('SELECT COUNT(*) c FROM bundle_members').get().c;
    assert.strictEqual(memberCount, expected.size * 13, 'every bundle needs 13 members');

    console.log(`✓ db: fresh schema seeds ${expected.size} sites (14 slots + bundle each)`);

    // Idempotence: second run must reseed nothing and keep counts.
    migrate(db);
    const after = db.prepare('SELECT COUNT(*) c FROM ad_slots').get().c;
    assert.strictEqual(after, expected.size * 14, 'idempotent re-run keeps slot count stable');
    console.log('✓ db: migration is idempotent');
  } finally {
    db.close();
  }
}

console.log('Slots Seeded Tests: OK');
