/**
 * Store Orders service tests
 *
 * Covers: migration idempotency, product resolution (catalog / creator /
 * unknown / not-yet-purchasable), order validation (quantity clamps,
 * variant rules), order creation, paid-transition idempotency with
 * shipping capture, creator royalty ledger settlement (50/50, replay-safe),
 * and status transitions.
 */

const assert = require('node:assert');
const { setupTestDb } = require('../platform/scholars/test-helpers');

setupTestDb('store-orders');

const { getDb } = require('../platform/db/connection');
const { migrate: migrateStoreOrders } = require('../platform/db/migrate-store-orders');
const { migrate: migrateCreatorMerch } = require('../platform/db/migrate-creator-merch');
const { migrate: migrateScholars } = require('../platform/db/migrate-scholars');
const { migrate: migrateScholarsCreatives } = require('../platform/db/migrate-scholars-creatives');
const {
  createStoreOrder,
  resolveProduct,
  getStoreOrderByRef,
  markStoreOrderPaid,
  setStoreOrderStatus,
  estimateFeesCents,
} = require('../platform/api/store-orders');
const { getCreatorEarningsSummary } = require('../platform/api/creator-merch');
const PRODUCT_CATALOG = require('../store/products.json');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// A catalog product with a live variant map for variant-rule tests.
PRODUCT_CATALOG.products.push({
  id: 'test-tee',
  temple: 'test',
  name: 'Test Temple Tee',
  category: 'apparel',
  price: 38.0,
  blurb: 'test',
  image: '/sites/test/assets/test_mascot.webp',
  assets: { mascot: '/sites/test/assets/test_mascot.webp' },
  templeUrl: '/sites/test/',
  design: { placements: [{ area: 'front', asset: 'mascot' }] },
  printfulProductId: 999001,
  printfulVariants: { S: 101, M: 102, L: 103 },
});
// A catalog product not yet synced to Printful.
PRODUCT_CATALOG.products.push({
  id: 'test-unsynced',
  temple: 'test',
  name: 'Unsynced Tee',
  category: 'apparel',
  price: 38.0,
  blurb: 'test',
  image: '/x.webp',
  assets: {},
  templeUrl: null,
  design: { placements: [] },
  printfulProductId: null,
});

function seedCreatorProduct() {
  const db = getDb();
  db.prepare(
    "INSERT INTO scholars_institutions (name, slug, status, sponsorship_status) VALUES ('Test University', 'test-u', 'active', 'active')"
  ).run();
  const institutionId = db
    .prepare('SELECT id FROM scholars_institutions WHERE slug = ?')
    .get('test-u').id;
  db.prepare(
    "INSERT INTO scholars_users (email, institution_id, role, display_name, status, account_status) VALUES ('creator@test.edu', ?, 'student', 'Test Creator', 'active', 'active')"
  ).run(institutionId);
  const creatorId = db
    .prepare('SELECT id FROM scholars_users WHERE email = ?')
    .get('creator@test.edu').id;
  db.prepare(
    "INSERT INTO creative_assets (creator_id, institution_id, title, department, status) VALUES (?, ?, 'Student Sun Disk', 'Classics', 'approved')"
  ).run(creatorId, institutionId);
  const assetId = db
    .prepare('SELECT id FROM creative_assets WHERE title = ?')
    .get('Student Sun Disk').id;
  db.prepare(
    `INSERT INTO creator_products
       (creative_asset_id, creator_id, creator_name, creator_university, title,
        image_path, product_type, price_cents, base_cost_cents, status)
     VALUES (?, ?, 'Test Creator', 'Test University', 'Student Sun Disk',
             '/uploads/creatives/1/preview.png', 'poster', 2900, 1100, 'live')`
  ).run(assetId, creatorId);
  return db.prepare('SELECT * FROM creator_products WHERE title = ?').get('Student Sun Disk');
}

test('migration is idempotent and creates store_orders', () => {
  migrateScholars(getDb());
  migrateScholarsCreatives(getDb());
  migrateCreatorMerch(getDb());
  migrateStoreOrders(getDb());
  migrateStoreOrders(getDb());
  const cols = getDb()
    .prepare('PRAGMA table_info(store_orders)')
    .all()
    .map((c) => c.name);
  for (const expected of [
    'order_ref',
    'product_id',
    'gross_cents',
    'status',
    'printful_order_id',
  ]) {
    assert.ok(cols.includes(expected), `missing column ${expected}`);
  }
});

test('resolveProduct returns a catalog product with variants', () => {
  const p = resolveProduct('test-tee');
  assert.strictEqual(p.kind, 'catalog');
  assert.strictEqual(p.unitPriceCents, 3800);
  assert.deepStrictEqual(p.variantLabels.sort(), ['L', 'M', 'S']);
  assert.strictEqual(p.requiresVariant, true);
});

test('resolveProduct rejects unknown and unsynced products', () => {
  assert.throws(() => resolveProduct('nope-nope'), /Unknown product/);
  assert.throws(() => resolveProduct('test-unsynced'), /not purchasable yet/);
  try {
    resolveProduct('nope-nope');
  } catch (err) {
    assert.strictEqual(err.status, 404);
  }
});

test('resolveProduct returns a live creator product', () => {
  const seeded = seedCreatorProduct();
  const p = resolveProduct(`creator-${seeded.id}`);
  assert.strictEqual(p.kind, 'creator');
  assert.strictEqual(p.creatorProductId, seeded.id);
  assert.strictEqual(p.unitPriceCents, 2900);
  assert.strictEqual(p.baseCents, 1100);
  assert.strictEqual(p.requiresVariant, false);
});

test('createStoreOrder validates quantity and variant', () => {
  assert.throws(
    () => createStoreOrder({ productId: 'test-tee', variantLabel: 'M', quantity: 0 }),
    /quantity/
  );
  assert.throws(
    () => createStoreOrder({ productId: 'test-tee', variantLabel: 'M', quantity: 9 }),
    /quantity/
  );
  assert.throws(
    () => createStoreOrder({ productId: 'test-tee', variantLabel: 'XXL', quantity: 1 }),
    /variant/
  );
  assert.throws(() => createStoreOrder({ productId: 'test-tee', quantity: 1 }), /variant/);
});

test('createStoreOrder persists exact fields with unique refs', () => {
  const { order } = createStoreOrder({
    productId: 'test-tee',
    variantLabel: 'M',
    quantity: 2,
    email: 'buyer@example.com',
  });
  assert.match(order.order_ref, /^SO-\d{8}-[0-9A-F]{8}$/);
  assert.strictEqual(order.product_name, 'Test Temple Tee');
  assert.strictEqual(order.variant_label, 'M');
  assert.strictEqual(order.quantity, 2);
  assert.strictEqual(order.gross_cents, 7600);
  assert.strictEqual(order.status, 'pending_payment');
  const second = createStoreOrder({ productId: 'test-tee', variantLabel: 'M', quantity: 1 });
  assert.notStrictEqual(order.order_ref, second.order.order_ref);
});

test('markStoreOrderPaid flips to paid, captures shipping, is replay-safe', () => {
  const { order } = createStoreOrder({ productId: 'test-tee', variantLabel: 'L', quantity: 1 });
  const session = {
    id: 'cs_test_123',
    payment_intent: 'pi_test_123',
    customer_details: { email: 'stripe-buyer@example.com' },
    shipping_details: {
      name: 'Buyer Name',
      address: { line1: '1 Temple Way', city: 'Athens', country: 'GR', postal_code: '10001' },
    },
  };
  const paid = markStoreOrderPaid({
    orderRef: order.order_ref,
    stripeSessionId: session.id,
    stripePaymentIntent: session.payment_intent,
    session,
  });
  assert.strictEqual(paid.status, 'paid');
  assert.strictEqual(paid.stripe_session_id, 'cs_test_123');
  assert.strictEqual(paid.customer_email, 'stripe-buyer@example.com');
  assert.strictEqual(paid.shipping_name, 'Buyer Name');
  const addr = JSON.parse(paid.shipping_address);
  assert.strictEqual(addr.country, 'GR');
  // Replay the webhook — no duplicate state change, no error.
  const replay = markStoreOrderPaid({
    orderRef: order.order_ref,
    stripeSessionId: session.id,
    stripePaymentIntent: session.payment_intent,
    session,
  });
  assert.strictEqual(replay.status, 'paid');
});

test('creator order settles the 50/50 ledger exactly once', () => {
  const seeded = getDb().prepare('SELECT * FROM creator_products LIMIT 1').get();
  const { order } = createStoreOrder({ productId: `creator-${seeded.id}`, quantity: 2 });
  assert.strictEqual(order.gross_cents, 5800);
  const paid = markStoreOrderPaid({
    orderRef: order.order_ref,
    stripeSessionId: 'cs_creator_1',
    stripePaymentIntent: 'pi_1',
    session: {},
  });
  assert.strictEqual(paid.status, 'paid');

  const ledger = getDb()
    .prepare('SELECT * FROM creator_order_ledger WHERE order_ref = ?')
    .get(order.order_ref);
  assert.ok(ledger, 'ledger row written');
  assert.strictEqual(ledger.gross_cents, 5800);
  // base 1100 × 2, fees ≈ 2.9% + 30 → net split in half, odd cent to platform
  const fees = estimateFeesCents(5800);
  const net = 5800 - 2200 - fees;
  assert.strictEqual(ledger.creator_share_cents, Math.floor(net * 0.5));
  assert.strictEqual(ledger.platform_share_cents, net - Math.floor(net * 0.5));

  // Webhook replay does not double-count.
  markStoreOrderPaid({
    orderRef: order.order_ref,
    stripeSessionId: 'cs_creator_1',
    stripePaymentIntent: 'pi_1',
    session: {},
  });
  const rows = getDb()
    .prepare('SELECT COUNT(*) AS c FROM creator_order_ledger WHERE order_ref = ?')
    .get(order.order_ref);
  assert.strictEqual(rows.c, 1);

  const earnings = getCreatorEarningsSummary(seeded.creator_id);
  assert.strictEqual(earnings.totalEarnedCents, ledger.creator_share_cents);
});

test('setStoreOrderStatus records fulfillment extras and rejects bad status', () => {
  const { order } = createStoreOrder({ productId: 'test-tee', variantLabel: 'S', quantity: 1 });
  const updated = setStoreOrderStatus(order.id, 'sent_to_fulfillment', {
    printfulOrderId: 777,
    printfulStatus: 'confirmed',
  });
  assert.strictEqual(updated.status, 'sent_to_fulfillment');
  assert.strictEqual(updated.printful_order_id, 777);
  assert.throws(() => setStoreOrderStatus(order.id, 'nonsense'), /invalid status/);
});

test('getStoreOrderByRef and ByPrintfulId round-trip', () => {
  const { order } = createStoreOrder({ productId: 'test-tee', variantLabel: 'S', quantity: 1 });
  setStoreOrderStatus(order.id, 'sent_to_fulfillment', { printfulOrderId: 778 });
  assert.strictEqual(getStoreOrderByRef(order.order_ref).id, order.id);
  assert.strictEqual(
    require('../platform/api/store-orders').getStoreOrderByPrintfulId(778).id,
    order.id
  );
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
  console.log(`\nStore Orders: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
