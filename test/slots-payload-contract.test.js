/**
 * Slots Payload Contract Tests
 *
 * The temple page (templates/flagship/flagship.js) renders live creatives
 * straight from GET /api/slots/?site=…, which is booking-service.listSlots →
 * bookings.getSlots verbatim (no field filtering anywhere in between). This
 * suite pins the payload shape the temple consumes:
 *
 *   - creative_path resolution: relative /uploads/ paths and absolute blob
 *     URLs both surface verbatim (display layers resolve both shapes).
 *   - has_slot_creative per frame: 1 only when a slot_creatives row carries
 *     a real creative_path for THAT frame; the booking-level creative is the
 *     COALESCE fallback, never marked as per-slot.
 *   - COALESCE copy fields (heading/subtitle/url) follow the same rule.
 *   - public_id (the write-only tracking id) is present on booked slots…
 *   - …and analytics_token (the management/dashboard credential) NEVER is.
 *   - creative_webp_path advertises only siblings that exist on disk.
 *
 * DB bootstrap mirrors test/booking-publish-pause.test.js: an isolated copy
 * of the golden SQLite DB via prepareTestDb(__filename).
 */

const assert = require('node:assert');

process.env.PLATFORM_URL = 'https://punicodex.com';

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const {
  createBooking,
  saveCreative,
  endBooking,
  getSlots,
} = require('../platform/api/bookings.js');
const { getIndividualSlotIds, getBundleSlotId } = require('./helpers/slots.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

const slotIds = getIndividualSlotIds(__filename, 'nike');
let slotCursor = 0;
let emailCounter = 0;
function nextEmail(tag) {
  emailCounter += 1;
  return `payload-${tag}-${emailCounter}@slots.test`;
}

async function makeBookedSlot({ creativePath } = {}) {
  const slotId = slotIds[slotCursor++];
  const booking = await createBooking({
    slotId,
    email: nextEmail('booking'),
    companyName: 'Payload Test Co',
    websiteUrl: 'https://sponsor.example.com',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  if (creativePath) {
    await saveCreative(booking.id, creativePath, path.basename(creativePath));
  }
  return { slotId, booking };
}

async function slotPayload(slotId) {
  const slots = await getSlots('nike');
  const slot = slots.find((s) => s.id === slotId);
  assert.ok(slot, `slot ${slotId} present in the nike payload`);
  return slot;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('available slot: no booking fields, no creative, has_slot_creative 0', async () => {
  const slotId = slotIds[slotCursor++];
  const slot = await slotPayload(slotId);
  assert.strictEqual(slot.status, 'available');
  assert.strictEqual(slot.booking_id, null);
  assert.strictEqual(slot.booking_status, null);
  assert.strictEqual(slot.public_id, null);
  assert.strictEqual(slot.company_name, null);
  assert.strictEqual(slot.creative_path, null);
  assert.strictEqual(slot.has_slot_creative, 0);
  assert.strictEqual(slot.creative_webp_path, null);
});

test('public_id is present on a booked slot and matches the bookings row', async () => {
  const { slotId, booking } = await makeBookedSlot();
  const slot = await slotPayload(slotId);
  assert.strictEqual(slot.status, 'reserved');
  assert.strictEqual(slot.booking_id, booking.id);
  assert.ok(slot.public_id, 'public tracking id present');
  assert.strictEqual(slot.public_id, booking.publicId);
});

test('analytics_token is NEVER in the payload — no key, no value', async () => {
  const { slotId, booking } = await makeBookedSlot({
    creativePath: '/uploads/test/token-check.png',
  });
  const slot = await slotPayload(slotId);
  assert.ok(!('analytics_token' in slot), 'analytics_token key present in slot payload');
  assert.ok(booking.token, 'createBooking returned the management token');
  assert.ok(
    !JSON.stringify(slot).includes(booking.token),
    'management token value leaked into the serialized payload'
  );
});

test('relative /uploads/ creative_path surfaces verbatim (not prefixed, not absolutized)', async () => {
  const { slotId } = await makeBookedSlot({ creativePath: '/uploads/test/payload-relative.png' });
  const slot = await slotPayload(slotId);
  assert.strictEqual(slot.creative_path, '/uploads/test/payload-relative.png');
});

test('absolute blob URL creative_path surfaces verbatim', async () => {
  const blobUrl = 'https://xyz123.public.blob.vercel-storage.com/9/creative.png';
  const { slotId } = await makeBookedSlot({ creativePath: blobUrl });
  const slot = await slotPayload(slotId);
  assert.strictEqual(slot.creative_path, blobUrl);
  // No webp sibling probing for absolute URLs — the blob CDN serves its own.
  assert.strictEqual(slot.creative_webp_path, null);
});

test('slot_creatives row wins over the booking creative (COALESCE) and sets has_slot_creative=1', async () => {
  const { slotId, booking } = await makeBookedSlot({
    creativePath: '/uploads/test/booking-level.png',
  });
  const d = db();
  d.prepare('INSERT INTO slot_creatives (booking_id, slot_id, creative_path) VALUES (?, ?, ?)').run(
    booking.id,
    slotId,
    '/uploads/test/per-slot.png'
  );
  d.close();

  const slot = await slotPayload(slotId);
  assert.strictEqual(slot.creative_path, '/uploads/test/per-slot.png', 'per-slot creative wins');
  assert.strictEqual(slot.has_slot_creative, 1);
});

test('slot_creatives row with NULL creative_path falls back to the booking creative', async () => {
  const { slotId, booking } = await makeBookedSlot({ creativePath: '/uploads/test/fallback.png' });
  const d = db();
  d.prepare(
    'INSERT INTO slot_creatives (booking_id, slot_id, creative_path, custom_heading) VALUES (?, ?, NULL, ?)'
  ).run(booking.id, slotId, 'Per-slot heading');
  d.close();

  const slot = await slotPayload(slotId);
  assert.strictEqual(
    slot.creative_path,
    '/uploads/test/fallback.png',
    'NULL per-slot creative falls back to the booking creative'
  );
  assert.strictEqual(slot.has_slot_creative, 0, 'a copy-only row is not a slot creative');
  assert.strictEqual(slot.custom_heading, 'Per-slot heading', 'copy COALESCE still applies');
});

test('bundle members: per-member has_slot_creative with booking-level fallback per frame', async () => {
  const bundleSlotId = getBundleSlotId(__filename, 'zeus');
  const d0 = db();
  const memberIds = d0
    .prepare(
      'SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = ? ORDER BY member_slot_id'
    )
    .all(bundleSlotId)
    .map((r) => r.member_slot_id);
  d0.close();
  assert.ok(memberIds.length >= 2, 'zeus bundle has at least two member frames');

  const booking = await createBooking({
    slotId: bundleSlotId,
    email: nextEmail('bundle'),
    companyName: 'Takeover Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'zeus',
  });
  await saveCreative(booking.id, '/uploads/test/takeover-main.png', 'takeover-main.png');
  // One member gets its own creative; the rest fall back to the booking's.
  const d = db();
  d.prepare('INSERT INTO slot_creatives (booking_id, slot_id, creative_path) VALUES (?, ?, ?)').run(
    booking.id,
    memberIds[0],
    '/uploads/test/takeover-member.png'
  );
  d.close();

  const slots = await getSlots('zeus');
  const member0 = slots.find((s) => s.id === memberIds[0]);
  const member1 = slots.find((s) => s.id === memberIds[1]);
  assert.strictEqual(member0.creative_path, '/uploads/test/takeover-member.png');
  assert.strictEqual(member0.has_slot_creative, 1);
  assert.strictEqual(
    member1.creative_path,
    '/uploads/test/takeover-main.png',
    'member without its own creative falls back to the booking creative'
  );
  assert.strictEqual(member1.has_slot_creative, 0);
  // The booking itself rides on the bundle slot row too.
  const bundleRow = slots.find((s) => s.id === bundleSlotId);
  assert.strictEqual(bundleRow.creative_path, '/uploads/test/takeover-main.png');
  assert.strictEqual(bundleRow.public_id, booking.publicId);
});

test('COALESCE copy fields: per-slot subtitle/url override, nulls fall back to booking values', async () => {
  const { slotId, booking } = await makeBookedSlot({ creativePath: '/uploads/test/copy.png' });
  const d = db();
  d.prepare(
    "UPDATE bookings SET custom_heading = 'Booking heading', custom_subtitle = 'Booking subtitle' WHERE id = ?"
  ).run(booking.id);
  d.prepare(
    'INSERT INTO slot_creatives (booking_id, slot_id, custom_subtitle, website_url) VALUES (?, ?, ?, ?)'
  ).run(booking.id, slotId, 'Slot subtitle', 'https://per-slot.example.com');
  d.close();

  const slot = await slotPayload(slotId);
  assert.strictEqual(slot.custom_heading, 'Booking heading', 'NULL per-slot heading falls back');
  assert.strictEqual(slot.custom_subtitle, 'Slot subtitle', 'per-slot subtitle wins');
  assert.strictEqual(slot.website_url, 'https://per-slot.example.com', 'per-slot url wins');
});

test('creative_webp_path advertises only a sibling that exists on disk', async () => {
  const { slotId } = await makeBookedSlot({ creativePath: '/uploads/test/webp-probe.png' });
  const before = await slotPayload(slotId);
  assert.strictEqual(before.creative_webp_path, null, 'no sibling on disk → no webp key');

  const uploadsDir = path.join(__dirname, '..', 'platform', 'api', 'public', 'uploads', 'test');
  fs.mkdirSync(uploadsDir, { recursive: true });
  const sibling = path.join(uploadsDir, 'webp-probe.webp');
  fs.writeFileSync(sibling, 'fake-webp');
  try {
    const after = await slotPayload(slotId);
    assert.strictEqual(after.creative_webp_path, '/uploads/test/webp-probe.webp');
  } finally {
    fs.unlinkSync(sibling);
  }
});

test('ending the booking releases the frame: payload returns to available with no booking data', async () => {
  const { slotId, booking } = await makeBookedSlot({ creativePath: '/uploads/test/release.png' });
  await endBooking(booking.id);
  const slot = await slotPayload(slotId);
  assert.strictEqual(slot.status, 'available');
  assert.strictEqual(slot.current_booking_id, null);
  assert.strictEqual(slot.booking_id, null);
  assert.strictEqual(slot.creative_path, null);
  assert.strictEqual(slot.public_id, null);
  assert.strictEqual(slot.has_slot_creative, 0);
});

test('getSlots(siteSlug) filters to that site; unfiltered spans sites', async () => {
  const nikeOnly = await getSlots('nike');
  assert.ok(nikeOnly.length > 0);
  assert.ok(
    nikeOnly.every((s) => s.site_slug === 'nike'),
    'nike payload carries only nike slots'
  );
  const all = await getSlots();
  assert.ok(
    all.some((s) => s.site_slug === 'zeus'),
    'unfiltered payload spans sites'
  );
});

async function run() {
  console.log('\n▸ Slots Payload Contract Tests\n');
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
  console.log(`\nSlots Payload Contract: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
