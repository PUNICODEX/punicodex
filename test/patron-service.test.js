/**
 * Patron Service Tests
 *
 * Covers patron record creation, active listing, payment marking, and
 * cancellation with a mocked Stripe SDK.
 */

const assert = require('node:assert');

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock stripe SDK before stripe.js loads.
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_patron',
          url: 'https://checkout.stripe.com/patron-mock',
          mode: config.mode || 'subscription',
          subscription: 'sub_test_123',
          customer: 'cus_test_123',
          amount_total: config.line_items?.[0]?.price_data?.unit_amount || 700,
        }),
      },
    },
    webhooks: {
      constructEvent: (payload, _signature, secret) => {
        if (!secret) throw new Error('missing secret');
        return JSON.parse(payload);
      },
    },
  }),
};

const {
  createPatronCheckoutRecord,
  listActivePatronsByTemple,
  markPatronPaid,
  cancelPatronBySubscriptionId,
  getPatronById,
  PATRON_TIER_DEFAULT_CENTS,
  PATRON_TIER_MIN_CENTS,
  PATRON_TIER_MAX_CENTS,
  PATRON_LIMIT_PER_TEMPLE,
  isPatronLimitReached,
} = require('../platform/api/patron-service.js');
const { createPatronCheckoutSession, handleWebhook } = require('../platform/api/stripe.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n▸ Patron Service Tests\n');
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
  console.log(`\nPatron Service: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('default patron amount is 700 cents', () => {
  assert.strictEqual(PATRON_TIER_DEFAULT_CENTS, 700);
  assert.strictEqual(PATRON_TIER_MIN_CENTS, 500);
  assert.strictEqual(PATRON_TIER_MAX_CENTS, 1000);
});

test('createPatronCheckoutRecord stores a pending patron', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'patron@example.com',
    displayName: 'Alexandra',
    title: 'Friend of the Sky',
    message: 'For the thunder.',
    amountCents: 700,
  });
  assert.ok(patron.id);
  assert.strictEqual(patron.templeId, 'zeus');
  assert.strictEqual(patron.displayName, 'Alexandra');
  assert.strictEqual(patron.amountCents, 700);

  const fromDb = await getPatronById(patron.id);
  assert.strictEqual(fromDb.status, 'pending_payment');
});

test('amount is clamped to $5–$10 range', async () => {
  const low = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'low@example.com',
    displayName: 'Low',
    amountCents: 100,
  });
  assert.strictEqual(low.amountCents, 500);

  const high = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'high@example.com',
    displayName: 'High',
    amountCents: 9999,
  });
  assert.strictEqual(high.amountCents, 1000);
});

test('markPatronPaid activates the patron', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'ares',
    email: 'warrior@example.com',
    displayName: 'Ares Fan',
    amountCents: 700,
  });
  const paid = await markPatronPaid(patron.id, 'sub_ares_1', 'cus_ares_1', 700);
  assert.strictEqual(paid.status, 'active');
  assert.strictEqual(paid.stripe_subscription_id, 'sub_ares_1');

  const active = await listActivePatronsByTemple('ares');
  assert.strictEqual(active.length, 1);
  assert.strictEqual(active[0].display_name, 'Ares Fan');
});

test('cancelPatronBySubscriptionId ends the subscription', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'aphrodite',
    email: 'love@example.com',
    displayName: 'Romantic',
    amountCents: 700,
  });
  await markPatronPaid(patron.id, 'sub_aphro_1', 'cus_aphro_1', 700);
  const cancelled = await cancelPatronBySubscriptionId('sub_aphro_1');
  assert.strictEqual(cancelled.status, 'cancelled');

  const active = await listActivePatronsByTemple('aphrodite');
  assert.strictEqual(active.length, 0);
});

test('createPatronCheckoutSession returns a Stripe URL', async () => {
  const result = await createPatronCheckoutSession({
    templeId: 'nike',
    email: 'nike.patron@example.com',
    displayName: 'Victory Supporter',
    amountCents: 700,
    siteName: 'Níkē',
  });
  assert.ok(result.sessionUrl);
  assert.ok(result.sessionId);
  assert.ok(result.patronId);
});

test('webhook handler activates a patron on checkout completion', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'hermes',
    email: 'swift@example.com',
    displayName: 'Mercurial',
    amountCents: 700,
  });

  const payload = JSON.stringify({
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_hermes',
        mode: 'subscription',
        subscription: 'sub_hermes_1',
        customer: 'cus_hermes_1',
        amount_total: 700,
        metadata: { type: 'patron', patron_id: String(patron.id) },
      },
    },
  });

  const result = await handleWebhook(payload, 'sig');
  assert.strictEqual(result.type, 'patron');
  assert.strictEqual(result.patron.status, 'active');
});

test('webhook handler cancels a patron subscription', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'hades',
    email: 'dark@example.com',
    displayName: 'Underworld Patron',
    amountCents: 700,
  });
  await markPatronPaid(patron.id, 'sub_hades_1', 'cus_hades_1', 700);

  const payload = JSON.stringify({
    type: 'customer.subscription.deleted',
    data: { object: { id: 'sub_hades_1' } },
  });

  const result = await handleWebhook(payload, 'sig');
  assert.strictEqual(result.type, 'patron');
  assert.strictEqual(result.patron.status, 'cancelled');
});

test('invalid email is rejected', async () => {
  try {
    await createPatronCheckoutRecord({
      templeId: 'zeus',
      email: 'not-an-email',
      displayName: 'Bad Email',
    });
    assert.fail('expected validation error');
  } catch (err) {
    assert.strictEqual(err.status, 400);
  }
});

test('valid X social link is stored', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'x@example.com',
    displayName: 'X Patron',
    socialPlatform: 'x',
    socialUrl: 'https://x.com/punicodex',
  });
  assert.strictEqual(patron.socialPlatform, 'x');
  assert.strictEqual(patron.socialUrl, 'https://x.com/punicodex');
});

test('valid Instagram social link is stored', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'ig@example.com',
    displayName: 'IG Patron',
    socialPlatform: 'instagram',
    socialUrl: 'https://www.instagram.com/punicodex/',
  });
  assert.strictEqual(patron.socialPlatform, 'instagram');
  assert.strictEqual(patron.socialUrl, 'https://www.instagram.com/punicodex/');
});

test('valid LinkedIn social link is stored', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'linkedin@example.com',
    displayName: 'LinkedIn Patron',
    socialPlatform: 'linkedin',
    socialUrl: 'https://www.linkedin.com/in/punicodex/',
  });
  assert.strictEqual(patron.socialPlatform, 'linkedin');
  assert.strictEqual(patron.socialUrl, 'https://www.linkedin.com/in/punicodex/');
});

test('valid TikTok social link is stored', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'tiktok@example.com',
    displayName: 'TikTok Patron',
    socialPlatform: 'tiktok',
    socialUrl: 'https://www.tiktok.com/@punicodex',
  });
  assert.strictEqual(patron.socialPlatform, 'tiktok');
  assert.strictEqual(patron.socialUrl, 'https://www.tiktok.com/@punicodex');
});

test('valid YouTube social link is stored', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'youtube@example.com',
    displayName: 'YouTube Patron',
    socialPlatform: 'youtube',
    socialUrl: 'https://www.youtube.com/@punicodex',
  });
  assert.strictEqual(patron.socialPlatform, 'youtube');
  assert.strictEqual(patron.socialUrl, 'https://www.youtube.com/@punicodex');
});

test('valid GitHub social link is stored', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'github@example.com',
    displayName: 'GitHub Patron',
    socialPlatform: 'github',
    socialUrl: 'https://github.com/punicodex',
  });
  assert.strictEqual(patron.socialPlatform, 'github');
  assert.strictEqual(patron.socialUrl, 'https://github.com/punicodex');
});

test('valid website social link is stored', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'web@example.com',
    displayName: 'Web Patron',
    socialPlatform: 'website',
    socialUrl: 'https://punicodex.com/',
  });
  assert.strictEqual(patron.socialPlatform, 'website');
  assert.strictEqual(patron.socialUrl, 'https://punicodex.com/');
});

test('non-https social URL is rejected', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'http@example.com',
    displayName: 'HTTP Patron',
    socialPlatform: 'x',
    socialUrl: 'http://x.com/punicodex',
  });
  assert.strictEqual(patron.socialPlatform, 'x');
  assert.strictEqual(patron.socialUrl, null);
});

test('malformed social URL is rejected', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'bad@example.com',
    displayName: 'Bad URL Patron',
    socialPlatform: 'x',
    socialUrl: 'https://example.com/punicodex',
  });
  assert.strictEqual(patron.socialPlatform, 'x');
  assert.strictEqual(patron.socialUrl, null);
});

test('unsupported social platform is rejected', async () => {
  const patron = await createPatronCheckoutRecord({
    templeId: 'zeus',
    email: 'unknown@example.com',
    displayName: 'Unknown Platform Patron',
    socialPlatform: 'myspace',
    socialUrl: 'https://myspace.com/punicodex',
  });
  assert.strictEqual(patron.socialPlatform, null);
  assert.strictEqual(patron.socialUrl, null);
});

test('PATRON_LIMIT_PER_TEMPLE is 20', () => {
  assert.strictEqual(PATRON_LIMIT_PER_TEMPLE, 20);
});

test('isPatronLimitReached returns true when 20 active patrons exist', async () => {
  const templeId = 'limit-test-temple';
  for (let i = 0; i < PATRON_LIMIT_PER_TEMPLE; i++) {
    const patron = await createPatronCheckoutRecord({
      templeId,
      email: `limit${i}@example.com`,
      displayName: `Limit Patron ${i}`,
      amountCents: 700,
    });
    await markPatronPaid(patron.id, `sub_limit_${i}`, `cus_limit_${i}`, 700);
  }

  const full = await isPatronLimitReached(templeId);
  assert.strictEqual(full, true);

  const active = await listActivePatronsByTemple(templeId);
  assert.strictEqual(active.length, PATRON_LIMIT_PER_TEMPLE);
});

test('createPatronCheckoutRecord rejects new patrons when limit is reached', async () => {
  const templeId = 'limit-reject-temple';
  for (let i = 0; i < PATRON_LIMIT_PER_TEMPLE; i++) {
    const patron = await createPatronCheckoutRecord({
      templeId,
      email: `reject${i}@example.com`,
      displayName: `Reject Patron ${i}`,
      amountCents: 700,
    });
    await markPatronPaid(patron.id, `sub_reject_${i}`, `cus_reject_${i}`, 700);
  }

  try {
    await createPatronCheckoutRecord({
      templeId,
      email: 'too-many@example.com',
      displayName: 'Too Many',
      amountCents: 700,
    });
    assert.fail('expected 409 limit error');
  } catch (err) {
    assert.strictEqual(err.status, 409);
    assert.ok(err.message.includes('20'), 'error message should mention the limit');
  }
});

run();
