/**
 * Store webhook pipeline tests
 *
 * Covers the Stripe webhook 'store_order' branch and the fulfillment
 * orchestration behind it: catalog orders go to Printful (mocked fetch)
 * and land in sent_to_fulfillment with ids recorded; Printful failures
 * degrade to fulfillment_failed with the reason; creator merch queues for
 * operator fulfillment with the royalty ledger settled exactly once; the
 * confirmation email falls back to the console mock when RESEND_API_KEY
 * is unset.
 */

const assert = require('node:assert');
const { setupTestDb } = require('../platform/scholars/test-helpers');

setupTestDb('store-webhook');

process.env.STRIPE_SECRET_KEY = 'sk_test_stub';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_stub';
process.env.PRINTFUL_API_KEY = 'pf_test_stub';
delete process.env.RESEND_API_KEY; // console-mock email fallback

let stripeEvent = null;
require.cache[require.resolve('stripe')] = {
  exports: function StripeStub() {
    return {
      checkout: { sessions: { create: async () => ({ id: 'cs_x', url: 'https://x' }) } },
      webhooks: { constructEvent: () => stripeEvent },
    };
  },
};

// Mock Printful Orders API.
const printfulCalls = [];
let printfulBehavior = 'ok';
const realFetch = global.fetch;
global.fetch = async (url, opts = {}) => {
  if (String(url).startsWith('https://api.printful.com/orders')) {
    printfulCalls.push({ url: String(url), body: opts.body ? JSON.parse(opts.body) : null });
    if (printfulBehavior === 'fail') {
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: 'print house down' }),
        headers: new Map(),
      };
    }
    if (String(url).endsWith('/confirm')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ result: { id: 4242, status: 'confirmed' } }),
        headers: new Map(),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ result: { id: 4242, status: 'draft' } }),
      headers: new Map(),
    };
  }
  return realFetch(url, opts);
};

const { getDb } = require('../platform/db/connection');
const { migrate: migrateScholars } = require('../platform/db/migrate-scholars');
const { migrate: migrateScholarsCreatives } = require('../platform/db/migrate-scholars-creatives');
const { migrate: migrateCreatorMerch } = require('../platform/db/migrate-creator-merch');
const { migrate: migrateStoreOrders } = require('../platform/db/migrate-store-orders');
migrateScholars(getDb());
migrateScholarsCreatives(getDb());
migrateCreatorMerch(getDb());
migrateStoreOrders(getDb());

const { handleWebhook } = require('../platform/api/stripe');
const { processWebhook } = require('../platform/api/webhook-handler');
const {
  createStoreOrder,
  getStoreOrderByRef,
  setStoreOrderStatus,
} = require('../platform/api/store-orders');
const PRODUCT_CATALOG = require('../store/products.json');

PRODUCT_CATALOG.products.push({
  id: 'wh-tee',
  temple: 'test',
  name: 'Webhook Test Tee',
  category: 'apparel',
  price: 38.0,
  blurb: 'test',
  image: '/x.webp',
  assets: { mascot: '/sites/test/assets/test_mascot.webp' },
  templeUrl: null,
  design: { placements: [{ area: 'front', asset: 'mascot' }] },
  printfulProductId: 999003,
  printfulVariants: { M: 555 },
});

function storeOrderEvent(orderRef) {
  return {
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_wh_1',
        payment_intent: 'pi_wh_1',
        metadata: { type: 'store_order', order_ref: orderRef },
        customer_details: { email: 'webhook-buyer@example.com' },
        shipping_details: {
          name: 'Webhook Buyer',
          address: { line1: '9 Pantheon Rd', city: 'Olympia', country: 'GR', postal_code: '27065' },
        },
      },
    },
  };
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('store_order webhook marks paid and fulfills via Printful', async () => {
  const { order } = createStoreOrder({ productId: 'wh-tee', variantLabel: 'M', quantity: 1 });
  stripeEvent = storeOrderEvent(order.order_ref);

  const result = await processWebhook('{}', 'sig');
  assert.strictEqual(result.type, 'store_order');
  assert.strictEqual(result.order.status, 'paid');
  assert.strictEqual(result.order.customer_email, 'webhook-buyer@example.com');

  // Fulfillment ran inline: draft create + confirm with our variant + ref.
  assert.strictEqual(printfulCalls.length, 2);
  assert.strictEqual(printfulCalls[0].body.external_id, order.order_ref);
  assert.strictEqual(printfulCalls[0].body.items[0].sync_variant_id, 555);
  assert.strictEqual(printfulCalls[0].body.recipient.country_code, 'GR');
  assert.ok(printfulCalls[1].url.endsWith('/confirm'));

  const updated = getStoreOrderByRef(order.order_ref);
  assert.strictEqual(updated.status, 'sent_to_fulfillment');
  assert.strictEqual(updated.printful_order_id, 4242);
});

test('Printful failure degrades to fulfillment_failed with the reason', async () => {
  printfulBehavior = 'fail';
  printfulCalls.length = 0;
  const { order } = createStoreOrder({ productId: 'wh-tee', variantLabel: 'M', quantity: 1 });
  stripeEvent = storeOrderEvent(order.order_ref);
  await processWebhook('{}', 'sig');
  const updated = getStoreOrderByRef(order.order_ref);
  assert.strictEqual(updated.status, 'fulfillment_failed');
  assert.match(updated.error, /print house down|500/);
  printfulBehavior = 'ok';
});

test('missing variant mapping also fails safely, never throws', async () => {
  PRODUCT_CATALOG.products.push({
    id: 'wh-novariant',
    name: 'No Variant Tee',
    category: 'apparel',
    price: 38,
    blurb: '',
    image: '/x.webp',
    assets: {},
    templeUrl: null,
    design: { placements: [] },
    printfulProductId: 999004,
    printfulVariants: { L: 556 },
  });
  const { order } = createStoreOrder({ productId: 'wh-novariant', variantLabel: 'L', quantity: 1 });
  // Simulate the variant map disappearing between checkout and webhook.
  PRODUCT_CATALOG.products.find((p) => p.id === 'wh-novariant').printfulVariants = {};
  stripeEvent = storeOrderEvent(order.order_ref);
  await processWebhook('{}', 'sig');
  const updated = getStoreOrderByRef(order.order_ref);
  assert.strictEqual(updated.status, 'fulfillment_failed');
  assert.match(updated.error, /no Printful sync variant/);
});

test('creator merch order queues fulfillment and settles the ledger once', async () => {
  const db = getDb();
  db.prepare(
    "INSERT INTO scholars_institutions (name, slug, status, sponsorship_status) VALUES ('Webhook U', 'webhook-u', 'active', 'active')"
  ).run();
  const instId = db
    .prepare('SELECT id FROM scholars_institutions WHERE slug = ?')
    .get('webhook-u').id;
  db.prepare(
    "INSERT INTO scholars_users (email, institution_id, role, status, account_status) VALUES ('w@webhook.edu', ?, 'student', 'active', 'active')"
  ).run(instId);
  const creatorId = db
    .prepare('SELECT id FROM scholars_users WHERE email = ?')
    .get('w@webhook.edu').id;
  db.prepare(
    "INSERT INTO creative_assets (creator_id, institution_id, title, department, status) VALUES (?, ?, 'River Seal', 'Classics', 'approved')"
  ).run(creatorId, instId);
  const assetId = db.prepare('SELECT id FROM creative_assets WHERE title = ?').get('River Seal').id;
  db.prepare(
    `INSERT INTO creator_products
       (creative_asset_id, creator_id, creator_name, creator_university, title,
        image_path, product_type, price_cents, base_cost_cents, status)
     VALUES (?, ?, 'River Creator', 'Webhook U', 'River Seal', '/x.png', 'poster', 2900, 1100, 'live')`
  ).run(assetId, creatorId);
  const product = db.prepare('SELECT * FROM creator_products WHERE title = ?').get('River Seal');

  const { order } = createStoreOrder({ productId: `creator-${product.id}`, quantity: 1 });
  stripeEvent = storeOrderEvent(order.order_ref);
  await processWebhook('{}', 'sig');

  const updated = getStoreOrderByRef(order.order_ref);
  assert.strictEqual(updated.status, 'fulfillment_queued');
  assert.strictEqual(updated.printful_order_id, null);

  const ledger = db
    .prepare('SELECT * FROM creator_order_ledger WHERE order_ref = ?')
    .get(order.order_ref);
  assert.ok(ledger, 'ledger settled');
  assert.strictEqual(ledger.gross_cents, 2900);

  // Replay: still one ledger row, status stays queued.
  await processWebhook('{}', 'sig');
  const rows = db
    .prepare('SELECT COUNT(*) AS c FROM creator_order_ledger WHERE order_ref = ?')
    .get(order.order_ref);
  assert.strictEqual(rows.c, 1);
});

test('duplicate delivery against an already-shipped order changes nothing', async () => {
  const { order } = createStoreOrder({ productId: 'wh-tee', variantLabel: 'M', quantity: 1 });
  stripeEvent = storeOrderEvent(order.order_ref);
  await processWebhook('{}', 'sig');
  assert.strictEqual(getStoreOrderByRef(order.order_ref).status, 'sent_to_fulfillment');

  // Printful subsequently shipped the order (via its own webhook).
  setStoreOrderStatus(order.id, 'shipped', {
    trackingUrl: 'https://track.example/dup1',
    carrier: 'DHL',
  });

  // Spy the confirmation email and count further Printful calls: a
  // duplicate checkout.session.completed must not regress the status,
  // re-email the customer, or re-create the fulfillment order.
  const emailApi = require('../platform/api/email');
  const originalNotify = emailApi.notifyStoreOrderConfirmation;
  let confirmationEmails = 0;
  emailApi.notifyStoreOrderConfirmation = async () => {
    confirmationEmails += 1;
    return { mocked: true };
  };
  printfulCalls.length = 0;
  try {
    stripeEvent = storeOrderEvent(order.order_ref);
    await processWebhook('{}', 'sig');
  } finally {
    emailApi.notifyStoreOrderConfirmation = originalNotify;
  }

  const after = getStoreOrderByRef(order.order_ref);
  assert.strictEqual(after.status, 'shipped', 'status must not regress');
  assert.strictEqual(after.tracking_url, 'https://track.example/dup1');
  assert.strictEqual(confirmationEmails, 0, 'no second confirmation email');
  assert.strictEqual(printfulCalls.length, 0, 'no second Printful order');
});

test('handleWebhook returns the store_order branch payload', async () => {
  const { order } = createStoreOrder({ productId: 'wh-tee', variantLabel: 'M', quantity: 1 });
  stripeEvent = storeOrderEvent(order.order_ref);
  const result = await handleWebhook('{}', 'sig');
  assert.strictEqual(result.event, 'payment.success');
  assert.strictEqual(result.type, 'store_order');
  assert.strictEqual(result.order.order_ref, order.order_ref);
});

async function run() {
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
      console.error(
        `    ${String(err.message || err)
          .split('\n')
          .slice(0, 6)
          .join('\n    ')}`
      );
    }
  }
  console.log(`\nStore Webhook: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
