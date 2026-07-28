/**
 * Public Booking Service Tests
 *
 * Covers the advertiser-facing booking lifecycle end-to-end with a mocked
 * Stripe SDK so no live payment calls are made.
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock stripe SDK before booking-service loads.
const stripeModulePath = require.resolve('stripe');
const sessionsCreated = [];
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: (/* secretKey */) => ({
    checkout: {
      sessions: {
        create: async (config) => {
          sessionsCreated.push(config);
          return {
            id: 'cs_test_mock',
            url: 'https://checkout.stripe.com/mock',
            mode: config.mode || 'payment',
          };
        },
      },
    },
  }),
};

// Discount codes schema on the isolated copy (same as production cold starts).
{
  const Database2 = require('better-sqlite3');
  const tmpDb = new Database2(getTestDbPath(__filename));
  require('../platform/db/migrate-discount-codes.js').migrate(tmpDb);
  tmpDb.close();
}

// Capture verification codes at the email boundary before booking-service
// loads. Codes are stored hashed in the DB, so tests observe the code where
// it is actually delivered: the outgoing verification email.
const emailModulePath = require.resolve('../platform/api/email.js');
const realEmail = require(emailModulePath);
const deliveredCodes = new Map();
require.cache[emailModulePath].exports = {
  ...realEmail,
  sendVerificationCode: async ({ email, code }) => {
    deliveredCodes.set(email, code);
    return { success: true, mocked: true };
  },
};

const {
  BookingError,
  listSlots,
  getSlot,
  createBookingRequest,
  applyBookingRequest,
  sendVerification,
  checkVerification,
  getBookingByTokenSafe,
  getAllBookingsByToken,
  updateBookingMeta,
  cancelBooking,
  uncancelBooking,
  renewBooking,
  recoverBookings,
} = require('../platform/api/booking-service.js');
const { createBooking } = require('../platform/api/bookings.js');
const { invoke } = require('./helpers/http.js');
const slotsHandler = require('../api/slots/[[...slug]].js');
const {
  getSlotId,
  getSlotSlug,
  getBundleSlotId,
  getIndividualSlotIds,
} = require('./helpers/slots.js');

function getDeliveredCode(email) {
  return deliveredCodes.get(email);
}

function getStoredCode(email) {
  const db = new Database(getTestDbPath(__filename));
  const row = db.prepare('SELECT code FROM email_verifications WHERE email = ?').get(email);
  db.close();
  return row?.code;
}

async function makeVerifiedEmail(email) {
  await sendVerification(email);
  const code = getDeliveredCode(email);
  const result = await checkVerification(email, code);
  return result.verificationToken;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n▸ Booking Service Tests\n');
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
  console.log(`\nBooking Service: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('listSlots returns available ad slots', async () => {
  const { slots } = await listSlots('nike');
  assert.ok(Array.isArray(slots));
  assert.ok(slots.length > 0);
  assert.ok(slots.every((s) => s.site_slug === 'nike'));
});

test('getSlot returns a slot by slug', async () => {
  const slug = getSlotSlug(__filename, 'nike', 1);
  const slot = await getSlot(slug, 'nike');
  assert.strictEqual(slot.slug, slug);
});

test('getSlot throws 404 for unknown slot', async () => {
  try {
    await getSlot('does-not-exist', 'nike');
    assert.fail('expected 404');
  } catch (err) {
    assert.ok(err instanceof BookingError);
    assert.strictEqual(err.status, 404);
  }
});

// Token split (second-pass review finding 1): public slot payloads expose a
// write-only public_id for ad tracking and must never include the private
// analytics_token management credential.
test('GET /api/slots responses expose public_id, never analytics_token', async () => {
  const token = await makeVerifiedEmail('slots-public-id@example.com');
  const slotId = getSlotId(__filename, 'nike', 11);
  const result = await createBookingRequest({
    slotId,
    email: 'slots-public-id@example.com',
    companyName: 'Slots Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });

  const listRes = await invoke(slotsHandler, 'GET', '/api/slots/?site=nike');
  assert.strictEqual(listRes.status, 200);
  const listBody = JSON.stringify(listRes.body);
  assert.ok(!listBody.includes('analytics_token'), 'analytics_token key leaked in /api/slots');
  assert.ok(!listBody.includes(result.token), 'private token value leaked in /api/slots');
  const reserved = listRes.body.slots.find((s) => s.id === slotId);
  assert.ok(reserved, 'reserved slot present in payload');
  assert.ok(reserved.public_id, 'public tracking id exposed for slot display');
  assert.notStrictEqual(reserved.public_id, result.token);

  const slug = getSlotSlug(__filename, 'nike', 11);
  const oneRes = await invoke(slotsHandler, 'GET', `/api/slots/${slug}/?site=nike`, {
    params: { slug: [slug] },
  });
  assert.strictEqual(oneRes.status, 200);
  const oneBody = JSON.stringify(oneRes.body);
  assert.ok(!oneBody.includes('analytics_token'), 'analytics_token key leaked in /api/slots/:slug');
  assert.ok(!oneBody.includes(result.token), 'private token value leaked in /api/slots/:slug');
  assert.strictEqual(oneRes.body.public_id, reserved.public_id);
});

test('getSlot exposes public_id but never analytics_token', async () => {
  const token = await makeVerifiedEmail('slot-public-id@example.com');
  await createBookingRequest({
    slotId: getSlotId(__filename, 'nike', 12),
    email: 'slot-public-id@example.com',
    companyName: 'Slot Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  const slug = getSlotSlug(__filename, 'nike', 12);
  const slot = await getSlot(slug, 'nike');
  assert.ok(!('analytics_token' in slot));
  assert.ok(slot.public_id);
});

test('createBooking returns distinct publicId and management token', async () => {
  const result = await createBooking({
    slotId: getSlotId(__filename, 'nike', 13),
    email: 'token-split@example.com',
    companyName: 'Split Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
    status: 'pending_payment',
  });
  assert.ok(result.token);
  assert.ok(result.publicId);
  assert.notStrictEqual(result.publicId, result.token);
});

test('sendVerification rejects invalid email', async () => {
  try {
    await sendVerification('not-an-email');
    assert.fail('expected error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }
});

test('sendVerification stores only a sha256 hash of the code', async () => {
  const result = await sendVerification('test-verify@example.com');
  assert.strictEqual(result.sent, true);
  const delivered = getDeliveredCode('test-verify@example.com');
  assert.ok(/^\d{6}$/.test(delivered));
  const stored = getStoredCode('test-verify@example.com');
  assert.notStrictEqual(stored, delivered);
  assert.strictEqual(stored, crypto.createHash('sha256').update(delivered).digest('hex'));
});

test('checkVerification rejects missing inputs', async () => {
  try {
    await checkVerification('', '123456');
    assert.fail('expected error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }
});

test('checkVerification rejects wrong and expired codes', async () => {
  await sendVerification('wrong-code@example.com');
  try {
    await checkVerification('wrong-code@example.com', '000000');
    assert.fail('expected error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }

  const db = new Database(getTestDbPath(__filename));
  db.prepare(
    "UPDATE email_verifications SET expires_at = datetime('now','-1 minute') WHERE email = ?"
  ).run('wrong-code@example.com');
  db.close();
  try {
    await checkVerification('wrong-code@example.com', getDeliveredCode('wrong-code@example.com'));
    assert.fail('expected error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }
});

test('createBookingRequest creates a pending_payment booking', async () => {
  const token = await makeVerifiedEmail('booking-create@example.com');
  const result = await createBookingRequest({
    slotId: getSlotId(__filename, 'nike', 1),
    email: 'booking-create@example.com',
    companyName: 'Test Co',
    websiteUrl: 'https://example.com',
    customHeading: 'Great Products',
    customSubtitle: 'Try us today',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  assert.ok(result.bookingId);
  assert.ok(result.token);
  assert.strictEqual(result.leaseMonths, 1);
  assert.strictEqual(result.totalCents, 75000);
  assert.ok(result.stripeUrl.includes('checkout.stripe.com'));
  const booking = await getBookingByTokenSafe(result.token);
  assert.strictEqual(booking.status, 'pending_payment');
});

test('createBookingRequest rejects unverified email', async () => {
  try {
    await createBookingRequest({
      slotId: getSlotId(__filename, 'nike', 1),
      email: 'unverified@example.com',
      verificationToken: 'bad-token',
    });
    assert.fail('expected error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }
});

test('createBookingRequest rejects invalid lease/trial combinations', async () => {
  const token = await makeVerifiedEmail('invalid-lease@example.com');
  try {
    await createBookingRequest({
      slotId: getSlotId(__filename, 'nike', 1),
      email: 'invalid-lease@example.com',
      leaseMonths: 6,
      trialMonths: 0,
      verificationToken: token,
    });
    assert.fail('expected error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }

  const token2 = await makeVerifiedEmail('invalid-trial@example.com');
  try {
    await createBookingRequest({
      slotId: getSlotId(__filename, 'nike', 1),
      email: 'invalid-trial@example.com',
      leaseMonths: 1,
      trialMonths: 1,
      verificationToken: token2,
    });
    assert.fail('expected error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }
});

test('applyBookingRequest requires a bundle slot', async () => {
  const token = await makeVerifiedEmail('apply-bundle@example.com');
  const result = await applyBookingRequest({
    slotId: getBundleSlotId(__filename, 'zeus'),
    email: 'apply-bundle@example.com',
    companyName: 'Bundle Co',
    leaseMonths: 12,
    trialMonths: 0,
    applicationNote: 'We want everything',
    verificationToken: token,
  });
  assert.strictEqual(result.status, 'pending_application');
});

test('applyBookingRequest rejects non-bundle slots', async () => {
  const token = await makeVerifiedEmail('apply-nonbundle@example.com');
  try {
    await applyBookingRequest({
      slotId: getSlotId(__filename, 'nike', 2),
      email: 'apply-nonbundle@example.com',
      verificationToken: token,
    });
    assert.fail('expected error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }
});

test('getAllBookingsByToken returns bookings for the same email', async () => {
  const token = await makeVerifiedEmail('multi-bookings@example.com');
  const r1 = await createBookingRequest({
    slotId: getSlotId(__filename, 'nike', 3),
    email: 'multi-bookings@example.com',
    companyName: 'A',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  // Need a fresh token for second booking because consumeVerifiedSession deletes it.
  const token2 = await makeVerifiedEmail('multi-bookings@example.com');
  const r2 = await createBookingRequest({
    slotId: getSlotId(__filename, 'nike', 4),
    email: 'multi-bookings@example.com',
    companyName: 'B',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token2,
  });
  const { bookings } = await getAllBookingsByToken(r1.token);
  assert.strictEqual(bookings.length, 2);
  const ids = bookings.map((b) => b.id);
  assert.ok(ids.includes(r1.bookingId));
  assert.ok(ids.includes(r2.bookingId));
});

test('updateBookingMeta validates heading length', async () => {
  const token = await makeVerifiedEmail('meta-update@example.com');
  const result = await createBookingRequest({
    slotId: getSlotId(__filename, 'nike', 5),
    email: 'meta-update@example.com',
    companyName: 'Meta Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  await updateBookingMeta(result.token, {
    customHeading: 'Short heading',
    customSubtitle: 'Short subtitle',
  });
  const booking = await getBookingByTokenSafe(result.token);
  assert.strictEqual(booking.custom_heading, 'Short heading');

  try {
    await updateBookingMeta(result.token, { customHeading: 'a'.repeat(100) });
    assert.fail('expected error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }
});

test('cancelBooking and uncancelBooking toggle cancel_at_end', async () => {
  const token = await makeVerifiedEmail('cancel-test@example.com');
  const result = await createBookingRequest({
    slotId: getSlotId(__filename, 'hermes', 8),
    email: 'cancel-test@example.com',
    companyName: 'Cancel Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  const canceled = await cancelBooking(result.token);
  assert.strictEqual(canceled.cancelAtEnd, true);
  const uncanceled = await uncancelBooking(result.token);
  assert.strictEqual(uncanceled.cancelAtEnd, false);
});

test('renewBooking generates a renewal checkout URL', async () => {
  const token = await makeVerifiedEmail('renew-test@example.com');
  const result = await createBookingRequest({
    slotId: getSlotId(__filename, 'nike', 7),
    email: 'renew-test@example.com',
    companyName: 'Renew Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  // Renew is only allowed once the booking is approved or live.
  const db = new Database(getTestDbPath(__filename));
  db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run('approved', result.bookingId);
  db.close();
  const renewal = await renewBooking(result.token, 12);
  assert.strictEqual(renewal.success, true);
  assert.strictEqual(renewal.extensionMonths, 12);
  assert.ok(renewal.stripeUrl.includes('checkout.stripe.com'));
});

test('recoverBookings sends dashboard links when bookings exist', async () => {
  const token = await makeVerifiedEmail('recover-test@example.com');
  await createBookingRequest({
    slotId: getSlotId(__filename, 'nike', 8),
    email: 'recover-test@example.com',
    companyName: 'Recover Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  const result = await recoverBookings('recover-test@example.com');
  assert.strictEqual(result.sent, true);
});

test('createBooking blocks a second active booking for the same slot', async () => {
  const first = await createBooking({
    slotId: getSlotId(__filename, 'nike', 9),
    email: 'race-first@example.com',
    companyName: 'First Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
    status: 'pending_payment',
  });
  assert.ok(first.id);

  try {
    await createBooking({
      slotId: getSlotId(__filename, 'nike', 9),
      email: 'race-second@example.com',
      companyName: 'Second Co',
      leaseMonths: 1,
      trialMonths: 0,
      siteSlug: 'nike',
      status: 'pending_payment',
    });
    assert.fail('expected conflict');
  } catch (err) {
    assert.strictEqual(err.status, 409);
  }
});

test('createBooking handles concurrent attempts for the same slot', async () => {
  const attempts = [
    createBooking({
      slotId: getSlotId(__filename, 'nike', 10),
      email: 'concurrent-a@example.com',
      companyName: 'Concurrent A',
      leaseMonths: 1,
      trialMonths: 0,
      siteSlug: 'nike',
      status: 'pending_payment',
    }),
    createBooking({
      slotId: getSlotId(__filename, 'nike', 10),
      email: 'concurrent-b@example.com',
      companyName: 'Concurrent B',
      leaseMonths: 1,
      trialMonths: 0,
      siteSlug: 'nike',
      status: 'pending_payment',
    }),
  ];
  const results = await Promise.allSettled(attempts);
  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');
  assert.strictEqual(fulfilled.length, 1, 'exactly one concurrent attempt should succeed');
  assert.strictEqual(rejected.length, 1, 'exactly one concurrent attempt should fail');
  assert.strictEqual(rejected[0].reason.status, 409);
});

// ── Discount codes at booking creation (flow 1: pay-now slots) ─────────────

test('createBookingRequest: 25% code discounts the Stripe session to the cent', async () => {
  const slotId = getSlotId(__filename, 'nike', 2); // $300/mo
  await discountService.createCode(
    { code: 'SPRING-25', kind: 'percent_off', percent: 25, appliesTo: 'nike' },
    null
  );
  const token = await makeVerifiedEmail('pct25@example.com');
  const result = await createBookingRequest({
    slotId,
    email: 'pct25@example.com',
    companyName: 'Percent Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
    discountCode: 'SPRING-25',
  });
  assert.strictEqual(result.discount.finalCents, 22500);
  const config = sessionsCreated[sessionsCreated.length - 1];
  assert.strictEqual(
    config.line_items[0].price_data.unit_amount,
    22500,
    'Stripe charges exactly the discounted price'
  );
  const redemption = new Database(getTestDbPath(__filename))
    .prepare('SELECT * FROM discount_redemptions WHERE booking_id = ?')
    .get(result.bookingId);
  assert.ok(redemption, 'redemption recorded at creation');
  assert.strictEqual(redemption.final_cents, 22500);
});

test('createBookingRequest: fixed_off prices off the yearly base, not the monthly price', async () => {
  const slotId = getSlotId(__filename, 'hermes', 3); // $78/mo → yearly $842.40
  await discountService.createCode(
    { code: 'YEAR-FIXED', kind: 'fixed_off', fixedCents: 24000, appliesTo: 'hermes' },
    null
  );
  const token = await makeVerifiedEmail('fixed@example.com');
  const result = await createBookingRequest({
    slotId,
    email: 'fixed@example.com',
    companyName: 'Fixed Co',
    leaseMonths: 12,
    trialMonths: 0,
    verificationToken: token,
    discountCode: 'YEAR-FIXED',
  });
  // 26000 × 12 × 0.9 = 280800 base; minus 24000 → 256800. Consistent with the
  // approval path, so the modal display always equals the charge.
  assert.strictEqual(result.discount.finalCents, 256800);
});

test('createBookingRequest: a 100% code is complimentary — no Stripe, booking approved', async () => {
  const slotId = getSlotId(__filename, 'hermes', 4);
  await discountService.createCode(
    { code: 'HERMES-FOUNDING', kind: 'percent_off', percent: 100, appliesTo: 'hermes' },
    null
  );
  const token = await makeVerifiedEmail('founding@example.com');
  const sessionsBefore = sessionsCreated.length;
  const result = await createBookingRequest({
    slotId,
    email: 'founding@example.com',
    companyName: 'Founding Co',
    leaseMonths: 12,
    trialMonths: 0,
    verificationToken: token,
    discountCode: 'HERMES-FOUNDING',
  });
  assert.strictEqual(result.complimentary, true);
  assert.strictEqual(result.totalCents, 0);
  assert.strictEqual(sessionsCreated.length, sessionsBefore, 'no Stripe session for a nil term');
  const db = new Database(getTestDbPath(__filename));
  const booking = db.prepare('SELECT status FROM bookings WHERE id = ?').get(result.bookingId);
  assert.strictEqual(booking.status, 'approved', 'goes straight to the post-payment state');
  const redemption = db
    .prepare('SELECT * FROM discount_redemptions WHERE booking_id = ?')
    .get(result.bookingId);
  assert.ok(redemption, 'redemption recorded');
  assert.strictEqual(redemption.final_cents, 0);
  db.close();
});

test('createBookingRequest: slot-restricted code on the wrong frame charges full price', async () => {
  const scopedSlot = getSlotId(__filename, 'hermes', 1);
  await discountService.createCode(
    {
      code: 'TOP-FRAME',
      kind: 'percent_off',
      percent: 100,
      appliesTo: 'hermes',
      appliesSlots: [scopedSlot],
    },
    null
  );
  const otherSlot = getSlotId(__filename, 'hermes', 5); // $200/mo
  const token = await makeVerifiedEmail('wrongframe@example.com');
  const result = await createBookingRequest({
    slotId: otherSlot,
    email: 'wrongframe@example.com',
    companyName: 'Wrong Frame Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
    discountCode: 'TOP-FRAME',
  });
  assert.strictEqual(result.complimentary, undefined, 'no complimentary on the wrong frame');
  const config = sessionsCreated[sessionsCreated.length - 1];
  assert.strictEqual(
    config.line_items[0].price_data.unit_amount,
    20000,
    'full price charged — the code never touches other frames'
  );
  const redemption = new Database(getTestDbPath(__filename))
    .prepare('SELECT * FROM discount_redemptions WHERE booking_id = ?')
    .get(result.bookingId);
  assert.strictEqual(redemption, undefined, 'no redemption when the code does not apply');
});

test('createBookingRequest: an unknown code falls back to full price, no redemption', async () => {
  const token = await makeVerifiedEmail('badcode@example.com');
  const result = await createBookingRequest({
    slotId: getSlotId(__filename, 'hermes', 9),
    email: 'badcode@example.com',
    companyName: 'Bad Code Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
    discountCode: 'DOES-NOT-EXIST',
  });
  assert.strictEqual(result.discount, undefined);
  const config = sessionsCreated[sessionsCreated.length - 1];
  assert.strictEqual(config.line_items[0].price_data.unit_amount, 9000);
});

const discountService = require('../platform/api/discount-service.js');

run();
