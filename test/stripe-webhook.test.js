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
  const { id } = await createBooking({
    slotId: getSlotId(__filename, 'nike', 2),
    email: 'renewal@example.com',
    companyName: 'Renewal Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  const sessionId = 'cs_renewal_123';
  await updateBookingStripeSession(id, sessionId);

  const event = makeEvent('checkout.session.completed', {
    id: sessionId,
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
