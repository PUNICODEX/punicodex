/**
 * Account Booking Controls Tests
 *
 * Advertiser self-service controls in the tenant portal service layer
 * (platform/api/tenant-portal.js), plus the enriched getMe payload:
 *
 * - publishOwnBooking: owned + approved + creative → live; the slot goes live.
 *   Non-owners get 403 not_owner; non-approved statuses get a 409 conflict.
 * - pauseOwnBooking: live → approved; the slot flips back to reserved while
 *   KEEPING current_booking_id (the frame stays held for the sponsor).
 * - updateOwnBookingMeta: sets custom_heading/custom_subtitle/website_url on
 *   an owned non-bundle booking; touching a live or approved booking sends it
 *   back through review (pending_approval) and pulls its frames off live.
 *   validateMeta char limits and the https:// destination rule are enforced.
 * - getMe: per-booking hasCreative (booking creative OR any slot_creatives
 *   creative), pendingImageRequest (pending 'image' change request), and the
 *   customHeading/customSubtitle copy fields.
 *
 * DB bootstrap mirrors test/booking-publish-pause.test.js: an isolated copy
 * of the golden SQLite DB via prepareTestDb(__filename).
 */

const assert = require('node:assert');

process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const Database = require('better-sqlite3');
const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const tenantPortal = require('../platform/api/tenant-portal.js');
const { createBooking, goLive, getBookingById } = require('../platform/api/bookings.js');
const { getIndividualSlotIds } = require('./helpers/slots.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

const slotIds = getIndividualSlotIds(__filename, 'nike');
let slotCursor = 0;

async function makeAccount(email) {
  const { account } = await tenantPortal.provisionTenantAccount(email);
  assert.ok(account?.id, `account provisioned for ${email}`);
  return account;
}

async function makeBooking(email, { status = 'pending_upload', creative = false } = {}) {
  const { id } = await createBooking({
    slotId: slotIds[slotCursor++],
    email,
    companyName: 'Controls Test Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  const d = db();
  if (creative) {
    d.prepare(
      "UPDATE bookings SET creative_path = '/uploads/test/controls-creative.png' WHERE id = ?"
    ).run(id);
  }
  d.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
  d.close();
  return id;
}

async function makeLiveBooking(email) {
  const id = await makeBooking(email, { status: 'approved', creative: true });
  await goLive(id);
  return id;
}

function getSlotRow(slotId) {
  const d = db();
  const row = d.prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?').get(slotId);
  d.close();
  return row;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// 1. publishOwnBooking: owned + approved + creative → live; slot live.
test('publishOwnBooking: owned approved booking with a creative goes live and its slot goes live', async () => {
  const account = await makeAccount('publish-owner@controls.test');
  const id = await makeBooking(account.email, { status: 'approved', creative: true });

  const result = await tenantPortal.publishOwnBooking(account, id);
  assert.deepStrictEqual(result, { success: true, status: 'live' });

  const booking = await getBookingById(id);
  assert.strictEqual(booking.status, 'live');
  const slot = getSlotRow(booking.slot_id);
  assert.strictEqual(slot.status, 'live');
  assert.strictEqual(slot.current_booking_id, id);
});

// 2. publishOwnBooking: booking owned by another email → 403 not_owner.
test("publishOwnBooking: another account's booking is rejected with 403 not_owner", async () => {
  const owner = await makeAccount('publish-real-owner@controls.test');
  const stranger = await makeAccount('publish-stranger@controls.test');
  const id = await makeBooking(owner.email, { status: 'approved', creative: true });

  await assert.rejects(
    () => tenantPortal.publishOwnBooking(stranger, id),
    (err) => {
      assert.strictEqual(err.status, 403);
      assert.strictEqual(err.code, 'not_owner');
      return true;
    }
  );
  const booking = await getBookingById(id);
  assert.strictEqual(booking.status, 'approved', 'rejected publish must not move the booking');
});

// 3. publishOwnBooking: status 'pending_upload' → 409 conflict.
test('publishOwnBooking: a pending_upload booking is a 409 conflict', async () => {
  const account = await makeAccount('publish-too-early@controls.test');
  const id = await makeBooking(account.email, { status: 'pending_upload' });

  await assert.rejects(
    () => tenantPortal.publishOwnBooking(account, id),
    (err) => {
      assert.strictEqual(err.status, 409);
      return true;
    }
  );
  const booking = await getBookingById(id);
  assert.strictEqual(
    booking.status,
    'pending_upload',
    'rejected publish must not move the booking'
  );
});

// 4. pauseOwnBooking: live booking → approved; slot reserved, current_booking_id kept.
test('pauseOwnBooking: a live booking drops to approved; slot reserved but stays held', async () => {
  const account = await makeAccount('pause-owner@controls.test');
  const id = await makeLiveBooking(account.email);

  const result = await tenantPortal.pauseOwnBooking(account, id);
  assert.deepStrictEqual(result, { success: true, status: 'approved' });

  const booking = await getBookingById(id);
  assert.strictEqual(booking.status, 'approved');
  const slot = getSlotRow(booking.slot_id);
  assert.strictEqual(slot.status, 'reserved', 'frame flips back to reserved');
  assert.strictEqual(slot.current_booking_id, id, 'frame stays held for this sponsor');
});

// 5. updateOwnBookingMeta: sets copy on an owned non-bundle booking; a live
//    booking flips to pending_approval (and its frame stops serving).
test('updateOwnBookingMeta: sets heading/subtitle/website on an owned booking', async () => {
  const account = await makeAccount('meta-owner@controls.test');
  const id = await makeBooking(account.email, { status: 'pending_upload' });

  const result = await tenantPortal.updateOwnBookingMeta(account, id, {
    customHeading: 'Fresh Copy',
    customSubtitle: 'A sharper line',
    websiteUrl: 'https://example.com/landing',
  });
  assert.deepStrictEqual(result, { success: true });

  const booking = await getBookingById(id);
  assert.strictEqual(booking.custom_heading, 'Fresh Copy');
  assert.strictEqual(booking.custom_subtitle, 'A sharper line');
  assert.strictEqual(booking.website_url, 'https://example.com/landing');
  assert.strictEqual(booking.status, 'pending_upload', 'pre-live edits need no re-review');
});

test('updateOwnBookingMeta: editing a live booking flips it to pending_approval and reserves the slot', async () => {
  const account = await makeAccount('meta-live-owner@controls.test');
  const id = await makeLiveBooking(account.email);
  const before = await getBookingById(id);
  assert.strictEqual(before.status, 'live');

  const result = await tenantPortal.updateOwnBookingMeta(account, id, {
    customHeading: 'New Headline',
  });
  assert.deepStrictEqual(result, { success: true });

  const booking = await getBookingById(id);
  assert.strictEqual(booking.status, 'pending_approval');
  assert.strictEqual(booking.custom_heading, 'New Headline');
  const slot = getSlotRow(booking.slot_id);
  assert.strictEqual(slot.status, 'reserved', 'frames stop serving until re-approval');
  assert.strictEqual(slot.current_booking_id, id, 'frame stays held for this sponsor');
});

// 6. updateOwnBookingMeta: heading over the slot's char limit (validateMeta) → 400.
test("updateOwnBookingMeta: a heading over the slot's char limit is a 400", async () => {
  const account = await makeAccount('meta-long-heading@controls.test');
  const id = await makeBooking(account.email, { status: 'pending_upload' });

  await assert.rejects(
    () =>
      tenantPortal.updateOwnBookingMeta(account, id, {
        customHeading: 'x'.repeat(70), // over every slot shape's heading limit (max 60)
      }),
    (err) => {
      assert.strictEqual(err.status, 400);
      assert.match(err.message, /Heading exceeds/);
      return true;
    }
  );
  const booking = await getBookingById(id);
  assert.strictEqual(booking.custom_heading, null, 'rejected edit must not write anything');
});

// 7. updateOwnBookingMeta: websiteUrl not starting with https:// → 400.
test('updateOwnBookingMeta: a non-https destination link is a 400', async () => {
  const account = await makeAccount('meta-bad-url@controls.test');
  const id = await makeBooking(account.email, { status: 'pending_upload' });

  await assert.rejects(
    () => tenantPortal.updateOwnBookingMeta(account, id, { websiteUrl: 'http://example.com' }),
    (err) => {
      assert.strictEqual(err.status, 400);
      assert.match(err.message, /https/);
      return true;
    }
  );
  const booking = await getBookingById(id);
  assert.strictEqual(booking.website_url, null, 'rejected edit must not write anything');
});

// 8. getMe: pending image change request → pendingImageRequest: true;
//    slot_creatives-only creative → hasCreative: true.
test('getMe: reports pendingImageRequest and slot_creatives-based hasCreative honestly', async () => {
  const account = await makeAccount('me-flags@controls.test');

  // Booking A: booking-level creative + a pending image change request.
  const idA = await makeBooking(account.email, { status: 'live', creative: true });
  // Booking B: creative only in slot_creatives (bundle-style), no change request.
  const idB = await makeBooking(account.email, { status: 'approved' });

  const d = db();
  d.prepare(
    `INSERT INTO slot_creatives (booking_id, slot_id, creative_path)
     VALUES (?, (SELECT slot_id FROM bookings WHERE id = ?), '/uploads/test/frame-creative.png')`
  ).run(idB, idB);
  d.prepare(
    `INSERT INTO tenant_change_requests (account_id, target_kind, target_id, type, payload, status)
     VALUES (?, 'booking', ?, 'image', '{}', 'pending')`
  ).run(account.id, idA);
  d.prepare('UPDATE bookings SET custom_heading = ?, custom_subtitle = ? WHERE id = ?').run(
    'Panel Heading',
    'Panel Subtitle',
    idA
  );
  d.close();

  const me = await tenantPortal.getMe(account);
  const bookingA = me.resources.bookings.find((b) => b.id === idA);
  const bookingB = me.resources.bookings.find((b) => b.id === idB);
  assert.ok(bookingA && bookingB, 'both owned bookings appear in getMe');

  assert.strictEqual(bookingA.hasCreative, true, 'booking-level creative counts');
  assert.strictEqual(bookingA.pendingImageRequest, true, 'pending image request is flagged');
  assert.strictEqual(bookingA.customHeading, 'Panel Heading');
  assert.strictEqual(bookingA.customSubtitle, 'Panel Subtitle');

  assert.strictEqual(bookingB.hasCreative, true, 'slot_creatives creative counts');
  assert.strictEqual(bookingB.pendingImageRequest, false, 'no request → not flagged');
});

async function run() {
  console.log('\n▸ Account Booking Controls Tests\n');
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
      if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
  console.log(`\nAccount Booking Controls: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
