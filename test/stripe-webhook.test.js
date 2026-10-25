/**
 * Stripe Webhook Handler Tests
 *
 * Mocks the stripe SDK so we can verify checkout.session.completed handling
 * for claims, bookings, and renewals without live keys.
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Inject a minimal stripe mock before the handler loads the real SDK.
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: (/* secretKey */) => ({
    webhooks: {
      constructEvent: (payload /* signature */) => {
        if (typeof payload === 'string') return JSON.parse(payload);
        return payload;
      },
    },
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

const { handleWebhook } = require('../platform/api/stripe.js');
const { createBooking, updateBookingStripeSession } = require('../platform/api/bookings.js');
const { createClaim, updateClaimStripeSession } = require('../platform/api/claims.js');
const { getSlotId } = require('./helpers/slots.js');

// Spy on the operator-alert and renewal-receipt senders (mutating the shared
// module exports, which bookings.js reads at call time).
const emailModule = require('../platform/api/email.js');
const paymentConflicts = [];
const renewalConfirmations = [];
const paymentFailureNotices = [];
const revokedNotices = [];
emailModule.notifyAdminPaymentConflict = async (payload) => {
  paymentConflicts.push(payload);
  return { success: true, mocked: true };
};
emailModule.notifyRenewalConfirmed = async (payload) => {
  renewalConfirmations.push(payload);
  return { success: true, mocked: true };
};
emailModule.notifyPaymentFailed = async (email, payload) => {
  paymentFailureNotices.push({ email, ...payload });
  return { success: true, mocked: true };
};
emailModule.notifyRevoked = async (payload) => {
  revokedNotices.push(payload);
  return { success: true, mocked: true };
};

function liveBookingFixture(slotOrder, email) {
  return createBooking({
    slotId: getSlotId(__filename, 'nike', slotOrder),
    email,
    companyName: 'Webhook Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
    status: 'live',
  }).then(({ id }) => {
    const db = new Database(getTestDbPath(__filename));
    db.prepare(
      "UPDATE bookings SET stripe_session_id = ?, ends_at = '2030-01-01T00:00:00.000Z' WHERE id = ?"
    ).run(`cs_initial_${id}`, id);
    db.close();
    return id;
  });
}

function makeEvent(type, object) {
  return { type, data: { object } };
}

function bookingFromDb(id) {
  const db = new Database(getTestDbPath(__filename));
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  db.close();
  return row;
}

function claimFromDb(id) {
  const db = new Database(getTestDbPath(__filename));
  const row = db.prepare('SELECT * FROM claims WHERE id = ?').get(id);
  db.close();
  return row;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n▸ Stripe Webhook Tests\n');
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
  console.log(`\nStripe Webhook: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('handleWebhook throws without webhook secret', async () => {
  const original = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  try {
    await handleWebhook('{}', 'sig');
    assert.fail('expected error');
  } catch (err) {
    assert.ok(err.message.includes('STRIPE_WEBHOOK_SECRET'));
  } finally {
    process.env.STRIPE_WEBHOOK_SECRET = original;
  }
});

test('handleWebhook returns event type for unrelated events', async () => {
  const result = await handleWebhook(
    JSON.stringify(makeEvent('invoice.payment_failed', { id: 'inv_1' })),
    'sig'
  );
  assert.strictEqual(result.event, 'invoice.payment_failed');
  assert.strictEqual(result.booking, null);
  assert.strictEqual(result.claim, null);
});

test('handleWebhook marks a booking as pending_upload after payment', async () => {
  const { id } = await createBooking({
    slotId: getSlotId(__filename, 'nike', 1),
    email: 'stripebooking@example.com',
    companyName: 'Stripe Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  const sessionId = 'cs_booking_123';
  await updateBookingStripeSession(id, sessionId);

  const event = makeEvent('checkout.session.completed', {
    id: sessionId,
    mode: 'payment',
    payment_intent: 'pi_123',
    amount_total: 15000,
    metadata: { type: 'booking', booking_id: String(id) },
  });

  const result = await handleWebhook(JSON.stringify(event), 'sig');
  assert.strictEqual(result.event, 'payment.success');
  assert.strictEqual(result.type, 'booking');
  assert.ok(result.booking);
  assert.strictEqual(result.booking.status, 'pending_upload');
  assert.strictEqual(result.booking.amount_paid_cents, 15000);
  assert.strictEqual(bookingFromDb(id).status, 'pending_upload');
});

test('handleWebhook extends booking for renewal payments', async () => {
  // Renewal webhooks only apply to bookings that can still run, and the
  // session id must differ from the one already stored (a matching id is a
  // replay). The booking is live with its own initial payment session.
  const id = await liveBookingFixture(2, 'renewal@example.com');

  const event = makeEvent('checkout.session.completed', {
    id: 'cs_renewal_123',
    mode: 'payment',
    payment_intent: 'pi_renew',
    amount_total: 9000,
    metadata: { type: 'booking_renewal', booking_id: String(id), extension_months: '6' },
  });

  const before = bookingFromDb(id);
  const result = await handleWebhook(JSON.stringify(event), 'sig');
  assert.strictEqual(result.type, 'booking_renewal');
  assert.ok(result.booking);
  const after = bookingFromDb(id);
  assert.strictEqual(after.lease_months, before.lease_months + 6);
  assert.strictEqual(after.amount_paid_cents, 9000);
  assert.strictEqual(
    after.stripe_session_id,
    'cs_renewal_123',
    'the renewal session id replaces the initial one'
  );
  assert.strictEqual(renewalConfirmations.length, 1, 'the sponsor gets a renewal receipt');
  assert.strictEqual(renewalConfirmations[0].slotName, result.booking.slot_name);
});

test('handleWebhook renewal replay with the same session id is a no-op', async () => {
  const id = await liveBookingFixture(3, 'renewal-replay@example.com');
  const event = makeEvent('checkout.session.completed', {
    id: 'cs_renewal_replay_1',
    mode: 'payment',
    payment_intent: 'pi_replay',
    amount_total: 9000,
    metadata: { type: 'booking_renewal', booking_id: String(id), extension_months: '6' },
  });

  const first = await handleWebhook(JSON.stringify(event), 'sig');
  assert.ok(first.booking);
  const afterFirst = bookingFromDb(id);

  renewalConfirmations.length = 0;
  await handleWebhook(JSON.stringify(event), 'sig');
  const afterReplay = bookingFromDb(id);
  assert.strictEqual(afterReplay.lease_months, afterFirst.lease_months, 'no second extension');
  assert.strictEqual(
    afterReplay.amount_paid_cents,
    afterFirst.amount_paid_cents,
    'no second amount recorded'
  );
  assert.strictEqual(
    afterReplay.ends_at,
    afterFirst.ends_at,
    'the lease window is unchanged by the replay'
  );
  assert.strictEqual(renewalConfirmations.length, 0, 'no duplicate receipt on replay');
});

test('handleWebhook renewal on an ended booking refuses and pages the admin', async () => {
  const id = await liveBookingFixture(4, 'renewal-ended@example.com');
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET status = 'ended' WHERE id = ?").run(id);
  db.close();

  paymentConflicts.length = 0;
  const event = makeEvent('checkout.session.completed', {
    id: 'cs_renewal_ended_1',
    mode: 'payment',
    payment_intent: 'pi_ended',
    amount_total: 9000,
    metadata: { type: 'booking_renewal', booking_id: String(id), extension_months: '6' },
  });
  const result = await handleWebhook(JSON.stringify(event), 'sig');
  assert.strictEqual(result.type, 'booking_renewal');
  const after = bookingFromDb(id);
  assert.strictEqual(after.status, 'ended');
  assert.strictEqual(after.lease_months, 1, 'no extension applied');
  assert.strictEqual(paymentConflicts.length, 1, 'the operator is paged');
  assert.strictEqual(paymentConflicts[0].reason, 'renewal_on_ineligible_booking');
  assert.strictEqual(paymentConflicts[0].sessionId, 'cs_renewal_ended_1');
});

test('handleWebhook reconciles a payment that arrives after the sweep cancelled the booking', async () => {
  const { id } = await createBooking({
    slotId: getSlotId(__filename, 'nike', 5),
    email: 'late-payment@example.com',
    companyName: 'Late Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  const sessionId = 'cs_late_payment_1';
  await updateBookingStripeSession(id, sessionId);
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(id);
  db.close();

  paymentConflicts.length = 0;
  const event = makeEvent('checkout.session.completed', {
    id: sessionId,
    mode: 'payment',
    payment_intent: 'pi_late',
    amount_total: 15000,
    metadata: { type: 'booking', booking_id: String(id) },
  });
  const result = await handleWebhook(JSON.stringify(event), 'sig');
  assert.strictEqual(result.type, 'booking');
  const after = bookingFromDb(id);
  assert.strictEqual(
    after.status,
    'pending_upload',
    'the paid booking is reconciled instead of silently dropped'
  );
  assert.strictEqual(after.amount_paid_cents, 15000);
  assert.strictEqual(paymentConflicts.length, 1, 'the anomaly is paged to the operator');
  assert.strictEqual(paymentConflicts[0].reason, 'paid_after_cancellation');
});

test('invoice.payment_failed for a booking subscription marks it past_due and emails the sponsor', async () => {
  const id = await liveBookingFixture(6, 'dunning@example.com');
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET stripe_subscription_id = 'sub_dunning_1' WHERE id = ?").run(id);
  db.close();

  paymentFailureNotices.length = 0;
  const event = makeEvent('invoice.payment_failed', {
    id: 'inv_dunning_1',
    subscription: 'sub_dunning_1',
  });
  const result = await handleWebhook(JSON.stringify(event), 'sig');
  assert.strictEqual(result.event, 'invoice.payment_failed');
  assert.strictEqual(result.type, 'booking');
  assert.strictEqual(bookingFromDb(id).billing_status, 'past_due');
  assert.strictEqual(paymentFailureNotices.length, 1, 'the sponsor is told their card failed');
  assert.strictEqual(paymentFailureNotices[0].email, 'dunning@example.com');
  assert.strictEqual(paymentFailureNotices[0].slotName, result.booking.slot_name);
  assert.ok(
    paymentFailureNotices[0].dashboardUrl.includes('/dashboard/'),
    'the notice links the dashboard so they can update the payment method'
  );
});

test('customer.subscription.deleted for a live booking ends the placement and notifies the sponsor', async () => {
  const id = await liveBookingFixture(7, 'portal-cancel@example.com');
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET stripe_subscription_id = 'sub_portal_cancel_1' WHERE id = ?").run(
    id
  );
  db.close();

  revokedNotices.length = 0;
  const event = makeEvent('customer.subscription.deleted', {
    id: 'sub_portal_cancel_1',
    object: 'subscription',
  });
  const result = await handleWebhook(JSON.stringify(event), 'sig');
  assert.strictEqual(result.event, 'subscription.cancelled');
  assert.strictEqual(result.type, 'booking');
  assert.strictEqual(bookingFromDb(id).status, 'ended', 'the placement ends immediately');
  assert.strictEqual(bookingFromDb(id).billing_status, 'cancelled');
  assert.strictEqual(revokedNotices.length, 1, 'the sponsor is told their placement ended');
  assert.strictEqual(revokedNotices[0].email, 'portal-cancel@example.com');
});

test('customer.subscription.deleted for an already-ended booking is a no-op', async () => {
  const id = await liveBookingFixture(8, 'already-ended@example.com');
  const db = new Database(getTestDbPath(__filename));
  db.prepare(
    "UPDATE bookings SET status = 'ended', stripe_subscription_id = 'sub_already_ended_1' WHERE id = ?"
  ).run(id);
  db.close();

  revokedNotices.length = 0;
  const event = makeEvent('customer.subscription.deleted', {
    id: 'sub_already_ended_1',
    object: 'subscription',
  });
  const result = await handleWebhook(JSON.stringify(event), 'sig');
  assert.strictEqual(result.event, 'customer.subscription.deleted');
  assert.strictEqual(result.booking, null, 'no booking action for an ended placement');
  assert.strictEqual(revokedNotices.length, 0, 'no duplicate revocation email');
});

test('handleWebhook marks a claim as paid', async () => {
  const { id: claimId } = await createClaim({
    entryId: 'zeus',
    email: 'claim@example.com',
    unicodeVariant: 'Zeus',
    amount: 1500,
  });
  const sessionId = 'cs_claim_123';
  await updateClaimStripeSession(claimId, sessionId);

  const event = makeEvent('checkout.session.completed', {
    id: sessionId,
    mode: 'payment',
    payment_intent: 'pi_claim',
    amount_total: 1500,
    metadata: { type: 'claim' },
  });

  const result = await handleWebhook(JSON.stringify(event), 'sig');
  assert.strictEqual(result.event, 'payment.success');
  assert.strictEqual(result.type, 'claim');
  assert.ok(result.claim);
  assert.strictEqual(result.claim.status, 'paid');
  assert.strictEqual(claimFromDb(claimId).status, 'paid');
});

run();
