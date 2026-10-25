/**
 * Public Booking Service Tests
 *
 * Covers the advertiser-facing booking lifecycle end-to-end with a mocked
 * Stripe SDK so no live payment calls are made — including the Stripe-failure
 * compensation path (slots released, booking deleted) exercised by making the
 * mock throw on checkout-session creation.
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
// When set, checkout-session creation throws with this error — the
// Stripe-failure compensation tests at the bottom flip it on and off.
let stripeCreateError = null;
// When set, subscription cancellation throws — the endBooking abort tests
// flip it on and off. Every cancelled subscription id lands in
// `subscriptionCancels` for assertions.
let stripeCancelError = null;
const subscriptionCancels = [];
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: (/* secretKey */) => ({
    checkout: {
      sessions: {
        create: async (config) => {
          if (stripeCreateError) throw stripeCreateError;
          sessionsCreated.push(config);
          return {
            id: 'cs_test_mock',
            url: 'https://checkout.stripe.com/mock',
            mode: config.mode || 'payment',
          };
        },
      },
    },
    subscriptions: {
      cancel: async (subscriptionId) => {
        if (stripeCancelError) throw stripeCancelError;
        subscriptionCancels.push(subscriptionId);
        return { id: subscriptionId, status: 'canceled' };
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
// Operator alerts for payment/booking mismatches (renewal refusals, paid-
// after-cancellation reconciliations) are captured here for assertions.
const paymentConflicts = [];
// Deterministic failure injection for the send-failure tests: these addresses
// make the sender resolve {success:false} exactly as a real SMTP outage would.
const FAILING_VERIFY_EMAIL = 'email-fails@example.com';
const FAILING_RECOVER_EMAIL = 'recover-fails@example.com';
require.cache[emailModulePath].exports = {
  ...realEmail,
  sendVerificationCode: async ({ email, code }) => {
    if (email === FAILING_VERIFY_EMAIL) return { success: false, error: 'SMTP down' };
    deliveredCodes.set(email, code);
    return { success: true, mocked: true };
  },
  sendDashboardLinks: async ({ email, bookings: bks }) => {
    if (email === FAILING_RECOVER_EMAIL) return { success: false, error: 'SMTP down' };
    return realEmail.sendDashboardLinks({ email, bookings: bks });
  },
  notifyAdminPaymentConflict: async (payload) => {
    paymentConflicts.push(payload);
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
const {
  createBooking,
  endBooking,
  extendBooking,
  sweepStaleReservations,
} = require('../platform/api/bookings.js');
const { runLeaseExpiry } = require('../platform/scripts/lease-expiry.js');
const { invoke } = require('./helpers/http.js');
const slotsHandler = require('../api/slots/[[...slug]].js');
const { getSlotId, getSlotSlug, getBundleSlotId } = require('./helpers/slots.js');

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

// server.js once carried an inline re-implementation of these endpoints that
// stored codes UNHASHED and compared with !== while sharing the same
// email_verifications table. Guard the dedup: the routes must delegate to
// booking-service and no plaintext/Math.random path may return.
test('server.js /api/verify routes delegate to booking-service (plaintext copy stays gone)', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const src = fs.readFileSync(path.join(__dirname, '..', 'platform', 'server.js'), 'utf8');
  assert.ok(src.includes("app.post('/api/verify/send'"), 'verify/send route preserved');
  assert.ok(src.includes("app.post('/api/verify/check'"), 'verify/check route preserved');
  assert.ok(
    src.includes('bookingSendVerification') && src.includes('bookingCheckVerification'),
    'both routes delegate to booking-service'
  );
  assert.ok(!src.includes('Math.random'), 'no Math.random code generation remains');
  assert.ok(!src.includes('row.code !=='), 'no plaintext code comparison remains');
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

// Token over-exposure fix: the sibling listing must never hand out raw
// analytics_tokens (per-booking management credentials). Each sibling gets an
// opaque dashboard URL instead.
test('getAllBookingsByToken exposes dashboard URLs, never raw sibling tokens', async () => {
  const token = await makeVerifiedEmail('sibling-tokens@example.com');
  const r1 = await createBookingRequest({
    slotId: getSlotId(__filename, 'ares', 8),
    email: 'sibling-tokens@example.com',
    companyName: 'S1',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  const token2 = await makeVerifiedEmail('sibling-tokens@example.com');
  const r2 = await createBookingRequest({
    slotId: getSlotId(__filename, 'ares', 9),
    email: 'sibling-tokens@example.com',
    companyName: 'S2',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token2,
  });
  const { bookings } = await getAllBookingsByToken(r1.token);
  assert.strictEqual(bookings.length, 2);
  for (const b of bookings) {
    assert.ok(!('token' in b), 'no raw management token field');
    assert.ok(!('analytics_token' in b), 'no analytics_token field');
    assert.ok(
      b.dashboard_url.startsWith('https://punicodex.com/'),
      `dashboard_url is platform-absolute: ${b.dashboard_url}`
    );
    assert.match(b.dashboard_url, /\/dashboard\/\?token=/, 'dashboard URL carries the token');
  }
  const r2Sibling = bookings.find((b) => b.id === r2.bookingId);
  assert.ok(r2Sibling, 'sibling booking listed');
  assert.ok(
    !r2Sibling.dashboard_url.includes(r1.token),
    'the caller token must not unlock sibling management'
  );
  const db = new Database(getTestDbPath(__filename));
  const r2Token = db
    .prepare('SELECT analytics_token FROM bookings WHERE id = ?')
    .get(r2.bookingId).analytics_token;
  db.close();
  assert.notStrictEqual(r2Token, r1.token, 'siblings have distinct tokens in the DB');
  assert.ok(
    r2Sibling.dashboard_url.includes(encodeURIComponent(r2Token)),
    'the sibling dashboard URL is the sibling token, not the caller'
  );
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

// Defect fix: the token-path meta edit used to flip a live booking to
// pending_approval while its frames stayed 'live' — the edited copy kept
// serving during review. Mirrors updateOwnBookingMeta: booking AND frames in
// one transaction.
test('updateBookingMeta on a live booking returns it to review and reserves the frame', async () => {
  const token = await makeVerifiedEmail('meta-live@example.com');
  const slotId = getSlotId(__filename, 'ares', 6);
  const result = await createBookingRequest({
    slotId,
    email: 'meta-live@example.com',
    companyName: 'Meta Live Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET status = 'live' WHERE id = ?").run(result.bookingId);
  db.prepare("UPDATE ad_slots SET status = 'live', current_booking_id = ? WHERE id = ?").run(
    result.bookingId,
    slotId
  );
  db.close();

  await updateBookingMeta(result.token, { customHeading: 'Edited live copy' });

  const booking = await getBookingByTokenSafe(result.token);
  assert.strictEqual(booking.status, 'pending_approval', 'edited copy goes back through review');
  assert.strictEqual(booking.custom_heading, 'Edited live copy');

  const after = new Database(getTestDbPath(__filename));
  const slot = after
    .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
    .get(slotId);
  after.close();
  assert.strictEqual(slot.status, 'reserved', 'the frame stops serving until re-approval');
  assert.strictEqual(slot.current_booking_id, result.bookingId, 'the booking keeps its hold');
});

// Token over-exposure fix: the sponsor-facing read must not leak Stripe
// internals or admin notes.
test('getBookingByTokenSafe omits stripe internals and admin notes', async () => {
  const token = await makeVerifiedEmail('safe-read@example.com');
  const result = await createBookingRequest({
    slotId: getSlotId(__filename, 'ares', 4),
    email: 'safe-read@example.com',
    companyName: 'Safe Read Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  const db = new Database(getTestDbPath(__filename));
  db.prepare(
    "UPDATE bookings SET stripe_session_id = 'cs_secret', stripe_payment_intent = 'pi_secret', stripe_subscription_id = 'sub_secret', admin_note = 'internal note' WHERE id = ?"
  ).run(result.bookingId);
  db.close();

  const booking = await getBookingByTokenSafe(result.token);
  assert.strictEqual(booking.status, 'pending_payment', 'dashboard fields still present');
  assert.ok(booking.slot_name, 'slot join still present');
  assert.ok(!('stripe_session_id' in booking), 'stripe_session_id omitted');
  assert.ok(!('stripe_payment_intent' in booking), 'stripe_payment_intent omitted');
  assert.ok(!('stripe_subscription_id' in booking), 'stripe_subscription_id omitted');
  assert.ok(!('admin_note' in booking), 'admin_note omitted');
  assert.ok(!('email' in booking), 'email omitted');
});

test('sendVerification surfaces an email send failure', async () => {
  await assert.rejects(sendVerification(FAILING_VERIFY_EMAIL), (err) => {
    assert.strictEqual(err.status, 502);
    assert.match(err.message, /try again/i);
    return true;
  });
});

test('recoverBookings reports a send failure instead of fake success', async () => {
  await createBooking({
    slotId: getSlotId(__filename, 'ares', 5),
    email: FAILING_RECOVER_EMAIL,
    companyName: 'Recover Fail Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'ares',
    status: 'approved',
  });
  const result = await recoverBookings(FAILING_RECOVER_EMAIL);
  assert.strictEqual(result.sent, false, 'a failed send must not report sent:true');
  assert.match(result.message, /try again/i);
});

// UPDATED for the pending_payment cancel fix: cancelling an UNPAID booking no
// longer just sets cancel_at_end — it transitions the booking to 'cancelled'
// and releases the reserved frame immediately (the old test encoded the buggy
// flag-only behavior, which let a sponsor complete checkout after cancelling).
test('cancelBooking on a pending_payment booking cancels it and frees the frame', async () => {
  const token = await makeVerifiedEmail('cancel-test@example.com');
  const slotId = getSlotId(__filename, 'hermes', 8);
  const result = await createBookingRequest({
    slotId,
    email: 'cancel-test@example.com',
    companyName: 'Cancel Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  const canceled = await cancelBooking(result.token);
  assert.strictEqual(canceled.status, 'cancelled');
  assert.strictEqual(canceled.cancelAtEnd, undefined, 'no flag — the booking is closed out');

  const db = new Database(getTestDbPath(__filename));
  const booking = db
    .prepare('SELECT status, cancel_at_end FROM bookings WHERE id = ?')
    .get(result.bookingId);
  const slot = db
    .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
    .get(slotId);
  db.close();
  assert.strictEqual(booking.status, 'cancelled');
  assert.strictEqual(booking.cancel_at_end, 0, 'no cancel_at_end flag on a cancelled booking');
  assert.strictEqual(slot.status, 'available', 'the frame is resellable immediately');
  assert.strictEqual(slot.current_booking_id, null, 'the hold is cleared');

  // A cancelled booking is terminal: uncancel must refuse it.
  try {
    await uncancelBooking(result.token);
    assert.fail('expected 400');
  } catch (err) {
    assert.strictEqual(err.status, 400);
    assert.match(err.message, /Cannot uncancel in status: cancelled/);
  }
});

test('cancelBooking on a live booking keeps the cancel_at_end flag', async () => {
  const token = await makeVerifiedEmail('cancel-live@example.com');
  const slotId = getSlotId(__filename, 'nike', 6);
  const result = await createBookingRequest({
    slotId,
    email: 'cancel-live@example.com',
    companyName: 'Cancel Live Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: token,
  });
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET status = 'live' WHERE id = ?").run(result.bookingId);
  db.prepare("UPDATE ad_slots SET status = 'live', current_booking_id = ? WHERE id = ?").run(
    result.bookingId,
    slotId
  );
  db.close();

  const canceled = await cancelBooking(result.token);
  assert.strictEqual(canceled.cancelAtEnd, true, 'live placements wind down at term end');
  const uncanceled = await uncancelBooking(result.token);
  assert.strictEqual(uncanceled.cancelAtEnd, false);

  const after = new Database(getTestDbPath(__filename));
  const slot = after
    .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
    .get(slotId);
  after.close();
  assert.strictEqual(slot.status, 'live', 'a flagged live placement keeps its frame');
  assert.strictEqual(slot.current_booking_id, result.bookingId);
});

test('uncancelBooking refuses terminal statuses', async () => {
  const ended = await createBooking({
    slotId: getSlotId(__filename, 'ares', 3),
    email: 'uncancel-ended@example.com',
    companyName: 'Ended Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'ares',
    status: 'ended',
  });
  try {
    await uncancelBooking(ended.token);
    assert.fail('expected 400');
  } catch (err) {
    assert.strictEqual(err.status, 400);
    assert.match(err.message, /Cannot uncancel in status: ended/);
  }
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

test('createBookingRequest: free_months is complimentary with the lease forced to the free term', async () => {
  const slotId = getSlotId(__filename, 'hermes', 10); // $160/mo
  await discountService.createCode(
    { code: 'HERMES-3FREE', kind: 'free_months', freeMonths: 3, appliesTo: 'hermes' },
    null
  );
  const token = await makeVerifiedEmail('freemonths@example.com');
  const sessionsBefore = sessionsCreated.length;
  const result = await createBookingRequest({
    slotId,
    email: 'freemonths@example.com',
    companyName: 'Free Months Co',
    leaseMonths: 12,
    trialMonths: 0,
    verificationToken: token,
    discountCode: 'HERMES-3FREE',
  });
  assert.strictEqual(result.complimentary, true, 'free_months never touches Stripe');
  assert.strictEqual(result.totalCents, 0);
  assert.strictEqual(result.leaseMonths, 3, 'the placement IS the free term');
  assert.strictEqual(sessionsCreated.length, sessionsBefore, 'no Stripe session');
  const db = new Database(getTestDbPath(__filename));
  const booking = db
    .prepare('SELECT status, lease_months FROM bookings WHERE id = ?')
    .get(result.bookingId);
  assert.strictEqual(booking.status, 'approved');
  assert.strictEqual(booking.lease_months, 3);
  db.close();
});

test('createBookingRequest: complimentary redemption stores trial_months 0 even when a trial was requested', async () => {
  const slotId = getSlotId(__filename, 'ares', 7);
  await discountService.createCode(
    { code: 'ARES-FOUNDING', kind: 'percent_off', percent: 100, appliesTo: 'ares' },
    null
  );
  const token = await makeVerifiedEmail('complimentary-trial@example.com');
  const result = await createBookingRequest({
    slotId,
    email: 'complimentary-trial@example.com',
    companyName: 'Complimentary Trial Co',
    leaseMonths: 12,
    trialMonths: 3,
    verificationToken: token,
    discountCode: 'ARES-FOUNDING',
  });
  assert.strictEqual(result.complimentary, true);
  assert.strictEqual(result.trialMonths, 0, 'the response advertises a zero trial');
  const db = new Database(getTestDbPath(__filename));
  const booking = db
    .prepare('SELECT trial_months FROM bookings WHERE id = ?')
    .get(result.bookingId);
  db.close();
  assert.strictEqual(
    booking.trial_months,
    0,
    'the row agrees with the confirmation email — a nil term has no trial'
  );
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

// ── Stripe failure compensation ──────────────────────────────────────────────
// When checkout-session creation throws, createBookingRequest must release the
// reserved slot(s) BEFORE deleting the booking row — otherwise the slots stay
// 'reserved' forever, pointing at a booking id that no longer exists.

test('createBookingRequest: a Stripe failure releases the slot and deletes the booking', async () => {
  const slotId = getSlotId(__filename, 'hermes', 2);
  const token = await makeVerifiedEmail('stripe-fail@example.com');
  const sessionsBefore = sessionsCreated.length;
  stripeCreateError = new Error('Stripe API key not configured');
  try {
    await createBookingRequest({
      slotId,
      email: 'stripe-fail@example.com',
      companyName: 'Doomed Co',
      leaseMonths: 1,
      trialMonths: 0,
      verificationToken: token,
    });
    assert.fail('expected a 400 BookingError');
  } catch (err) {
    assert.strictEqual(err.status, 400);
    assert.match(err.message, /Payment provider not configured/);
  } finally {
    stripeCreateError = null;
  }
  assert.strictEqual(sessionsCreated.length, sessionsBefore, 'no Stripe session was created');
  const db = new Database(getTestDbPath(__filename));
  const slot = db
    .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
    .get(slotId);
  assert.strictEqual(slot.status, 'available', 'slot released back to available');
  assert.strictEqual(slot.current_booking_id, null, 'current_booking_id cleared');
  const bySlot = db.prepare('SELECT COUNT(*) AS c FROM bookings WHERE slot_id = ?').get(slotId);
  assert.strictEqual(bySlot.c, 0, 'booking row deleted');
  const byEmail = db
    .prepare('SELECT COUNT(*) AS c FROM bookings WHERE email = ?')
    .get('stripe-fail@example.com');
  assert.strictEqual(byEmail.c, 0, 'no booking left behind for the failed email');
  db.close();
});

test('createBookingRequest: a Stripe failure on a bundle releases every member slot', async () => {
  const bundleId = getBundleSlotId(__filename, 'athena');
  const token = await makeVerifiedEmail('stripe-fail-bundle@example.com');
  stripeCreateError = new Error('Stripe API key not configured');
  try {
    await createBookingRequest({
      slotId: bundleId,
      email: 'stripe-fail-bundle@example.com',
      companyName: 'Doomed Bundle Co',
      leaseMonths: 1,
      trialMonths: 0,
      verificationToken: token,
    });
    assert.fail('expected a 400 BookingError');
  } catch (err) {
    assert.strictEqual(err.status, 400);
    assert.match(err.message, /Payment provider not configured/);
  } finally {
    stripeCreateError = null;
  }
  const db = new Database(getTestDbPath(__filename));
  const memberIds = db
    .prepare('SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = ?')
    .all(bundleId)
    .map((r) => r.member_slot_id);
  assert.ok(memberIds.length > 0, 'athena bundle has member slots');
  const stillReserved = db
    .prepare(
      `SELECT id FROM ad_slots
       WHERE (id = ? OR id IN (SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = ?))
         AND (status != 'available' OR current_booking_id IS NOT NULL)`
    )
    .all(bundleId, bundleId);
  assert.deepStrictEqual(
    stillReserved,
    [],
    'bundle slot and every member slot released back to available'
  );
  const bySlot = db.prepare('SELECT COUNT(*) AS c FROM bookings WHERE slot_id = ?').get(bundleId);
  assert.strictEqual(bySlot.c, 0, 'booking row deleted');
  db.close();
});

// ── Audit fixes: subscription termination, renewal idempotency, sweeps ──────

test('endBooking cancels the Stripe subscription and frees the slot', async () => {
  const slotId = getSlotId(__filename, 'ares', 1);
  const { id } = await createBooking({
    slotId,
    email: 'end-sub-cancel@example.com',
    companyName: 'End Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'ares',
    status: 'live',
  });
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET stripe_subscription_id = 'sub_end_1' WHERE id = ?").run(id);
  db.close();

  await endBooking(id);
  assert.ok(subscriptionCancels.includes('sub_end_1'), 'subscriptions.cancel was called');
  const after = new Database(getTestDbPath(__filename), { readonly: true });
  const booking = after.prepare('SELECT status FROM bookings WHERE id = ?').get(id);
  const slot = after
    .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
    .get(slotId);
  after.close();
  assert.strictEqual(booking.status, 'ended');
  assert.strictEqual(slot.status, 'available');
  assert.strictEqual(slot.current_booking_id, null);
});

test('endBooking ABORTS when the Stripe cancel fails — booking and slot untouched', async () => {
  const slotId = getSlotId(__filename, 'ares', 2);
  const { id } = await createBooking({
    slotId,
    email: 'end-sub-abort@example.com',
    companyName: 'Abort Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'ares',
    status: 'live',
  });
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET stripe_subscription_id = 'sub_abort_1' WHERE id = ?").run(id);
  db.close();

  stripeCancelError = new Error('Stripe API unreachable');
  try {
    await assert.rejects(() => endBooking(id), /Stripe subscription cancel failed/);
  } finally {
    stripeCancelError = null;
  }
  const after = new Database(getTestDbPath(__filename), { readonly: true });
  const booking = after.prepare('SELECT status FROM bookings WHERE id = ?').get(id);
  const slot = after
    .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
    .get(slotId);
  after.close();
  assert.strictEqual(booking.status, 'live', 'a failed cancel must not end the booking');
  assert.strictEqual(slot.status, 'reserved', 'the frame must not be freed');
  assert.strictEqual(slot.current_booking_id, id);
});

test('lease-expiry sweep ends a cancel_at_end booking past its lease end', async () => {
  const slotId = getSlotId(__filename, 'hermes', 1);
  const { id } = await createBooking({
    slotId,
    email: 'cancel-at-end@example.com',
    companyName: 'Cancel Sweep Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'hermes',
    status: 'pending_upload',
  });
  const db = new Database(getTestDbPath(__filename));
  db.prepare(
    "UPDATE bookings SET ends_at = '2020-01-01T00:00:00.000Z', cancel_at_end = 1 WHERE id = ?"
  ).run(id);
  db.close();

  const result = await runLeaseExpiry();
  assert.ok(result.cancelAtEndEnded >= 1, 'the cancel-at-end sweep ended the booking');

  const after = new Database(getTestDbPath(__filename), { readonly: true });
  const booking = after.prepare('SELECT status FROM bookings WHERE id = ?').get(id);
  const slot = after
    .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
    .get(slotId);
  after.close();
  assert.strictEqual(booking.status, 'ended');
  assert.strictEqual(slot.status, 'available');
  assert.strictEqual(slot.current_booking_id, null);
});

test('renewal with a new session id extends; a replayed webhook no-ops', async () => {
  const slotId = getSlotId(__filename, 'hermes', 6);
  const { id } = await createBooking({
    slotId,
    email: 'renew-replay@example.com',
    companyName: 'Replay Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'hermes',
    status: 'live',
  });
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET stripe_session_id = 'cs_initial_replay' WHERE id = ?").run(id);
  db.close();

  const first = await extendBooking(id, 6, 9000, 'cs_renewal_replay');
  assert.strictEqual(first.extended, true);
  assert.strictEqual(first.booking.lease_months, 7);

  const second = await extendBooking(id, 6, 9000, 'cs_renewal_replay');
  assert.strictEqual(
    second.extended,
    false,
    'the same session id is a replay and must not extend twice'
  );
  assert.strictEqual(second.booking.lease_months, 7, 'lease months unchanged by the replay');

  const after = new Database(getTestDbPath(__filename), { readonly: true });
  const row = after.prepare('SELECT stripe_session_id FROM bookings WHERE id = ?').get(id);
  after.close();
  assert.strictEqual(row.stripe_session_id, 'cs_renewal_replay', 'renewal session id persisted');
});

test('renewal on an ended booking is refused and pages the admin', async () => {
  const slotId = getSlotId(__filename, 'hermes', 7);
  const { id } = await createBooking({
    slotId,
    email: 'renew-ended@example.com',
    companyName: 'Ended Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'hermes',
    status: 'live',
  });
  const db = new Database(getTestDbPath(__filename));
  db.prepare(
    "UPDATE bookings SET status = 'ended', stripe_session_id = 'cs_initial_ended' WHERE id = ?"
  ).run(id);
  db.close();

  paymentConflicts.length = 0;
  const result = await extendBooking(id, 6, 9000, 'cs_renewal_ended');
  assert.strictEqual(result.extended, false, 'an ended booking must never be extended');
  assert.strictEqual(result.booking.status, 'ended');
  assert.strictEqual(result.booking.lease_months, 1, 'no extension applied');
  assert.strictEqual(paymentConflicts.length, 1, 'the operator is paged');
  assert.strictEqual(paymentConflicts[0].reason, 'renewal_on_ineligible_booking');
});

test('createBookingRequest rejects a code whose free months reach the lease', async () => {
  const slotId = getSlotId(__filename, 'hermes', 11);
  await discountService.createCode(
    { code: 'TRIAL-TOO-LONG', kind: 'trial_extension', freeMonths: 1, appliesTo: 'hermes' },
    null
  );
  const token = await makeVerifiedEmail('trial-too-long@example.com');
  try {
    await createBookingRequest({
      slotId,
      email: 'trial-too-long@example.com',
      companyName: 'Trial Co',
      leaseMonths: 1,
      trialMonths: 0,
      verificationToken: token,
      discountCode: 'TRIAL-TOO-LONG',
    });
    assert.fail('expected a 400 BookingError');
  } catch (err) {
    assert.strictEqual(err.status, 400);
    assert.match(err.message, /Effective trial/);
  }
  const db = new Database(getTestDbPath(__filename), { readonly: true });
  const slot = db
    .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
    .get(slotId);
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM bookings WHERE email = ?')
    .get('trial-too-long@example.com');
  db.close();
  assert.strictEqual(slot.status, 'available', 'the violating code must not reserve the slot');
  assert.strictEqual(slot.current_booking_id, null);
  assert.strictEqual(row.c, 0, 'no booking row left behind');
});

test('sweepStaleReservations cancels a stale reservation with an ISO cutoff', async () => {
  const slotId = getSlotId(__filename, 'hermes', 12);
  const { id } = await createBooking({
    slotId,
    email: 'iso-sweep@example.com',
    companyName: 'Sweep Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'hermes',
    status: 'pending_payment',
  });
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET created_at = datetime('now', '-72 hours') WHERE id = ?").run(id);
  db.close();

  const result = await sweepStaleReservations({ olderThanHours: 48 });
  assert.ok(result.canceled >= 1, 'the stale reservation was swept');

  const after = new Database(getTestDbPath(__filename), { readonly: true });
  const booking = after.prepare('SELECT status FROM bookings WHERE id = ?').get(id);
  const slot = after
    .prepare('SELECT status, current_booking_id FROM ad_slots WHERE id = ?')
    .get(slotId);
  after.close();
  assert.strictEqual(booking.status, 'cancelled');
  assert.strictEqual(slot.status, 'available');
  assert.strictEqual(slot.current_booking_id, null);
});

test('verify-send cooldown: shared helper enforces the 60s per-email window', async () => {
  const {
    verifySendCooldownRemaining,
    stampVerifySend,
  } = require('../platform/api/verified-sessions.js');
  const email = 'cooldown-battle@example.com';
  assert.strictEqual(await verifySendCooldownRemaining(email), 0, 'no row yet — send allowed');
  // Real flow: sendVerification upserts the row, then the route stamps it.
  await sendVerification(email);
  await stampVerifySend(email);
  const remaining = await verifySendCooldownRemaining(email);
  assert.ok(remaining > 0 && remaining <= 60000, `cooldown active (${remaining}ms left)`);
  assert.strictEqual(
    await verifySendCooldownRemaining('cooldown-other@example.com'),
    0,
    'cooldown is per-email, not global'
  );
});

const discountService = require('../platform/api/discount-service.js');

run();
