/**
 * Sponsor Content Safety
 *
 * Two defects a sponsor could exploit before paying a cent, both found in the
 * 2026-08 audit and both guarded here:
 *
 *  1. Stored XSS — company_name was interpolated into an HTML string in the
 *     flagship ad renderer (an innerHTML overlay and an alt="" attribute).
 *     That template is generated verbatim into all 895 sites/{id}/script.js,
 *     and the overlay renders while a booking is still merely 'reserved', so
 *     an unpaid stranger could run script on every temple page — the same
 *     origin as the admin portal.
 *
 *  2. Stranded inventory — a Stripe failure deleted the booking row but left
 *     ad_slots.status = 'reserved' pointing at an id that no longer exists,
 *     making the slot permanently unsellable.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const { createBooking, releaseSlotsForBooking } = require('../platform/api/bookings.js');
const { getIndividualSlotIds, getBundleSlotId } = require('./helpers/slots.js');

const ROOT = path.join(__dirname, '..');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ── 1. The XSS sink ────────────────────────────────────────────────────────

test('the flagship ad renderer never interpolates company_name into markup', () => {
  const src = fs.readFileSync(path.join(ROOT, 'templates', 'flagship', 'flagship.js'), 'utf8');
  const lines = src.split(/\r?\n/);
  const offenders = [];
  lines.forEach((line, i) => {
    if (!line.includes('company_name')) return;
    // Sponsor-controlled text may only reach the DOM through a property
    // assignment (textContent / .alt), never through interpolation into an
    // HTML string.
    const code = line.replace(/\/\/.*$/, '').trim();
    if (!code.includes('company_name')) return; // a comment mentioning it is fine
    const safe = /\.textContent\s*=/.test(code) || /\.alt\s*=/.test(code);
    if (!safe) offenders.push(`${i + 1}: ${line.trim()}`);
  });
  assert.deepStrictEqual(offenders, [], 'company_name reaching the DOM unescaped');
});

test('the renderer builds the reserved overlay with textContent, not innerHTML', () => {
  const src = fs.readFileSync(path.join(ROOT, 'templates', 'flagship', 'flagship.js'), 'utf8');
  assert.ok(
    src.includes("overlaySub.className = 'space-frame-overlay-sub'"),
    'overlay subtitle is no longer built as an element'
  );
  assert.ok(
    /overlaySub\.textContent\s*=\s*slot\.company_name/.test(src),
    'overlay subtitle must be written with textContent'
  );
  assert.ok(
    !/overlay\.innerHTML\s*=/.test(src),
    'the reserved overlay must not be assembled from an HTML string'
  );
});

test('every generated temple carries the hardened renderer', () => {
  // The template is the canonical source; sites/{id}/script.js is generated
  // from it. A fix that is not regenerated protects nobody.
  const sitesDir = path.join(ROOT, 'sites');
  const withScript = fs
    .readdirSync(sitesDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(sitesDir, d.name, 'script.js'))
    .filter((p) => fs.existsSync(p));
  assert.ok(withScript.length > 0, 'no generated temple scripts found');

  const stale = [];
  for (const file of withScript) {
    const src = fs.readFileSync(file, 'utf8');
    if (!src.includes('company_name')) continue;
    for (const line of src.split(/\r?\n/)) {
      const code = line.replace(/\/\/.*$/, '').trim();
      if (!code.includes('company_name')) continue; // a comment mentioning it is fine
      const safe = /\.textContent\s*=/.test(code) || /\.alt\s*=/.test(code);
      if (!safe) {
        stale.push(path.relative(ROOT, file));
        break;
      }
    }
  }
  assert.deepStrictEqual(stale.slice(0, 5), [], `${stale.length} temple(s) still ship the sink`);
});

// ── 2. The compensating release ────────────────────────────────────────────

async function reserve(slotId, email) {
  return createBooking({
    slotId,
    email,
    companyName: 'Release Test Co',
    websiteUrl: 'https://example.com',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
}

function readSlot(slotId) {
  const db = new Database(getTestDbPath(__filename));
  try {
    return db.prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?').get(slotId);
  } finally {
    db.close();
  }
}

test('releaseSlotsForBooking puts a reserved slot back on the market', async () => {
  const slotId = getIndividualSlotIds(__filename, 'nike')[0];
  const { id } = await reserve(slotId, 'release-one@example.com');

  const reserved = readSlot(slotId);
  assert.strictEqual(reserved.status, 'reserved', 'booking should reserve the slot');
  assert.strictEqual(reserved.current_booking_id, id);

  const changed = await releaseSlotsForBooking(id);
  assert.strictEqual(changed, 1, 'exactly the one slot is released');

  const freed = readSlot(slotId);
  assert.strictEqual(freed.status, 'available');
  assert.strictEqual(freed.current_booking_id, null);
});

test('releaseSlotsForBooking cascades to every member of a bundle', async () => {
  const bundleId = getBundleSlotId(__filename, 'nike');
  const { id } = await reserve(bundleId, 'release-bundle@example.com');

  const db = new Database(getTestDbPath(__filename));
  const reservedCount = db
    .prepare(
      "SELECT COUNT(*) AS c FROM ad_slots WHERE current_booking_id = ? AND status = 'reserved'"
    )
    .get(id).c;
  db.close();
  assert.ok(reservedCount > 1, 'a bundle should reserve the bundle slot and its members');

  const changed = await releaseSlotsForBooking(id);
  assert.strictEqual(changed, reservedCount, 'every reserved slot is released');

  const after = readSlot(bundleId);
  assert.strictEqual(after.status, 'available');
  assert.strictEqual(after.current_booking_id, null);

  const db2 = new Database(getTestDbPath(__filename));
  const stillHeld = db2
    .prepare('SELECT COUNT(*) AS c FROM ad_slots WHERE current_booking_id = ?')
    .get(id).c;
  db2.close();
  assert.strictEqual(stillHeld, 0, 'no slot may still point at the abandoned booking');
});

test('a booking abandoned after reservation never strands inventory', async () => {
  // Mirrors the Stripe-failure path in booking-service.js: release first, then
  // delete. Deleting first would leave the slot pointing at a vanished id.
  const slotId = getIndividualSlotIds(__filename, 'nike')[1];
  const { id } = await reserve(slotId, 'release-abandon@example.com');

  await releaseSlotsForBooking(id);
  const db = new Database(getTestDbPath(__filename));
  db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
  const orphans = db
    .prepare(
      "SELECT COUNT(*) AS c FROM ad_slots WHERE status = 'reserved' AND current_booking_id NOT IN (SELECT id FROM bookings)"
    )
    .get().c;
  db.close();
  assert.strictEqual(orphans, 0, 'no slot is reserved for a booking that no longer exists');
  assert.strictEqual(readSlot(slotId).status, 'available');
});

(async () => {
  console.log('\n▸ Sponsor Content Safety\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nSponsor Content Safety: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
})();
