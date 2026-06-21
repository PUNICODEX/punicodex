/**
 * Public Booking Service Tests
 *
 * Covers the advertiser-facing booking lifecycle end-to-end with a mocked
 * Stripe SDK so no live payment calls are made.
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.PLATFORM_URL = 'https://punycodex.com';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock stripe SDK before booking-service loads.
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: (/* secretKey */) => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_mock',
          url: 'https://checkout.stripe.com/mock',
          mode: config.mode || 'payment',
        }),
      },
    },
  }),
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

function getVerificationCode(email) {
  const db = new Database(getTestDbPath(__filename));
  const row = db.prepare('SELECT code FROM email_verifications WHERE email = ?').get(email);
  db.close();
  return row?.code;
}

async function makeVerifiedEmail(email) {
  await sendVerification(email);
  const code = getVerificationCode(email);
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
  const slot = await getSlot('crown', 'nike');
  assert.strictEqual(slot.slug, 'crown');
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

test('sendVerification rejects invalid email', async () => {
  try {
    await sendVerification('not-an-email');
    assert.fail('expected error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }
});

test('sendVerification stores a 6-digit code', async () => {
  const result = await sendVerification('test-verify@example.com');
  assert.strictEqual(result.sent, true);
  const code = getVerificationCode('test-verify@example.com');
  assert.ok(/^\d{6}$/.test(code));
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
    await checkVerification(
      'wrong-code@example.com',
      getVerificationCode('wrong-code@example.com')
    );
    assert.fail('expected error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }
});

test('createBookingRequest creates a pending_payment booking', async () => {
  const token = await makeVerifiedEmail('booking-create@example.com');
  const result = await createBookingRequest({
    slotId: 1,
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
  assert.strictEqual(result.totalCents, 120000);
  assert.ok(result.stripeUrl.includes('checkout.stripe.com'));
  const booking = await getBookingByTokenSafe(result.token);
  assert.strictEqual(booking.status, 'pending_payment');
});

test('createBookingRequest rejects unverified email', async () => {
  try {
    await createBookingRequest({
      slotId: 1,
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
      slotId: 1,
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
      slotId: 1,
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
    slotId: 13,
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
      slotId: 1,
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
    slotId: 14,
    email: 'multi-bookings@example.com',
    companyName: 'A',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  // Need a fresh token for second booking because consumeVerifiedSession deletes it.
  const token2 = await makeVerifiedEmail('multi-bookings@example.com');
  const r2 = await createBookingRequest({
    slotId: 15,
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
    slotId: 14,
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
    slotId: 15,
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
    slotId: 16,
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
    slotId: 17,
    email: 'recover-test@example.com',
    companyName: 'Recover Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  const result = await recoverBookings('recover-test@example.com');
  assert.strictEqual(result.sent, true);
});

run();
