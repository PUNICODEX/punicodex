/**
 * Store Checkout endpoint tests
 *
 * Covers: method enforcement, rate-limit bucket, product/variant/quantity
 * validation over HTTP, successful session creation with a stubbed Stripe
 * SDK (order persisted + linked to the session), and creator-product
 * checkout. No network calls are made — the stripe module is replaced in
 * the require cache before the platform stripe module loads.
 */

const assert = require('node:assert');
const { setupTestDb } = require('../platform/scholars/test-helpers');

setupTestDb('store-checkout');

process.env.STRIPE_SECRET_KEY = 'sk_test_stub';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_stub';

// Stub the stripe SDK before anything requires it.
const createdSessions = [];
require.cache[require.resolve('stripe')] = {
  exports: function StripeStub() {
    return {
      checkout: {
        sessions: {
          create: async (params) => {
            createdSessions.push(params);
            return {
              id: `cs_stub_${createdSessions.length}`,
              url: 'https://checkout.stripe.test/session',
            };
          },
        },
      },
      webhooks: { constructEvent: () => null },
    };
  },
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

const checkoutHandler = require('../platform/api-handlers/root/store/checkout');
const PRODUCT_CATALOG = require('../store/products.json');

PRODUCT_CATALOG.products.push({
  id: 'co-tee',
  temple: 'test',
  name: 'Checkout Test Tee',
  category: 'apparel',
  price: 38.0,
  blurb: 'test',
  image: '/x.webp',
  assets: {},
  templeUrl: null,
  design: { placements: [] },
  printfulProductId: 999002,
  printfulVariants: { M: 201, L: 202 },
});

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
}

function req(overrides = {}) {
  return {
    method: 'POST',
    headers: { 'x-forwarded-for': '203.0.113.9' },
    body: {},
    query: {},
    ...overrides,
  };
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('GET is refused with 405', async () => {
  const res = createMockRes();
  await checkoutHandler(req({ method: 'GET' }), res);
  assert.strictEqual(res.statusCode, 405);
});

test('unknown product is a 404, unsynced product a 409', async () => {
  const res404 = createMockRes();
  await checkoutHandler(req({ body: { productId: 'ghost-product' } }), res404);
  assert.strictEqual(res404.statusCode, 404);

  PRODUCT_CATALOG.products.push({
    id: 'co-unsynced',
    name: 'Unsynced',
    category: 'apparel',
    price: 10,
    blurb: '',
    image: '/x.webp',
    assets: {},
    templeUrl: null,
    design: { placements: [] },
    printfulProductId: null,
  });
  const res409 = createMockRes();
  await checkoutHandler(req({ body: { productId: 'co-unsynced' } }), res409);
  assert.strictEqual(res409.statusCode, 409);
});

test('bad variant and bad quantity are 400s', async () => {
  const resBadVariant = createMockRes();
  await checkoutHandler(
    req({ body: { productId: 'co-tee', variantLabel: 'XXXL' } }),
    resBadVariant
  );
  assert.strictEqual(resBadVariant.statusCode, 400);

  const resBadQty = createMockRes();
  await checkoutHandler(
    req({ body: { productId: 'co-tee', variantLabel: 'M', quantity: 42 } }),
    resBadQty
  );
  assert.strictEqual(resBadQty.statusCode, 400);
});

test('successful checkout creates order, session, and links them', async () => {
  const res = createMockRes();
  await checkoutHandler(
    req({
      body: { productId: 'co-tee', variantLabel: 'M', quantity: 2, email: 'buyer@example.com' },
    }),
    res
  );
  assert.strictEqual(res.statusCode, 200);
  assert.ok(res.body.sessionUrl.startsWith('https://checkout.stripe.test'));
  assert.match(res.body.orderRef, /^SO-/);

  // The pending order exists and carries the Stripe session id.
  const order = getDb()
    .prepare('SELECT * FROM store_orders WHERE order_ref = ?')
    .get(res.body.orderRef);
  assert.ok(order, 'order row exists');
  assert.strictEqual(order.status, 'pending_payment');
  assert.strictEqual(order.stripe_session_id, res.body.sessionId);
  assert.strictEqual(order.gross_cents, 7600);
  assert.strictEqual(order.customer_email, 'buyer@example.com');

  // The Stripe session was built for merch with shipping + metadata.
  const params = createdSessions.at(-1);
  assert.strictEqual(params.mode, 'payment');
  assert.strictEqual(params.metadata.type, 'store_order');
  assert.strictEqual(params.metadata.order_ref, res.body.orderRef);
  assert.strictEqual(params.line_items[0].price_data.unit_amount, 3800);
  assert.strictEqual(params.line_items[0].quantity, 2);
  assert.ok(params.shipping_address_collection.allowed_countries.length > 0);
  assert.match(params.success_url, /order=SO-/);
});

test('rate limit headers are set on checkout responses', async () => {
  const res = createMockRes();
  await checkoutHandler(req({ body: { productId: 'co-tee', variantLabel: 'L' } }), res);
  assert.ok(res.headers['X-RateLimit-Limit'], 'limit header present');
  assert.ok(res.headers['X-RateLimit-Remaining'], 'remaining header present');
});

test('creator product checkout works end to end', async () => {
  const db = getDb();
  db.prepare(
    "INSERT INTO scholars_institutions (name, slug, status, sponsorship_status) VALUES ('Checkout U', 'checkout-u', 'active', 'active')"
  ).run();
  const instId = db
    .prepare('SELECT id FROM scholars_institutions WHERE slug = ?')
    .get('checkout-u').id;
  db.prepare(
    "INSERT INTO scholars_users (email, institution_id, role, status, account_status) VALUES ('c@checkout.edu', ?, 'student', 'active', 'active')"
  ).run(instId);
  const creatorId = db
    .prepare('SELECT id FROM scholars_users WHERE email = ?')
    .get('c@checkout.edu').id;
  db.prepare(
    "INSERT INTO creative_assets (creator_id, institution_id, title, department, status) VALUES (?, ?, 'Moon Print', 'Classics', 'approved')"
  ).run(creatorId, instId);
  const assetId = db.prepare('SELECT id FROM creative_assets WHERE title = ?').get('Moon Print').id;
  db.prepare(
    `INSERT INTO creator_products
       (creative_asset_id, creator_id, creator_name, creator_university, title,
        image_path, product_type, price_cents, base_cost_cents, status)
     VALUES (?, ?, 'Moon Creator', 'Checkout U', 'Moon Print', '/x.png', 'poster', 2900, 1100, 'live')`
  ).run(assetId, creatorId);
  const product = db.prepare('SELECT * FROM creator_products WHERE title = ?').get('Moon Print');

  const res = createMockRes();
  await checkoutHandler(
    req({
      headers: { 'x-forwarded-for': '203.0.113.77' },
      body: { productId: `creator-${product.id}`, quantity: 1 },
    }),
    res
  );
  assert.strictEqual(res.statusCode, 200);
  const order = getDb()
    .prepare('SELECT * FROM store_orders WHERE order_ref = ?')
    .get(res.body.orderRef);
  assert.strictEqual(order.creator_product_id, product.id);
  assert.strictEqual(order.variant_label, 'One size');
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
  console.log(`\nStore Checkout: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
