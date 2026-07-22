/**
 * Printful webhook endpoint tests
 *
 * Covers: token gating (401 without/with wrong token), method enforcement,
 * unknown-order acknowledgement (no retry storm), package_shipped updating
 * the order with tracking + carrier, order_failed recording the reason,
 * and order_cancelled flipping the order to cancelled.
 */

const assert = require('node:assert');
const { setupTestDb } = require('../platform/scholars/test-helpers');

setupTestDb('printful-webhook');

process.env.PRINTFUL_WEBHOOK_TOKEN = 'test-token-abc';
delete process.env.RESEND_API_KEY;

const { getDb } = require('../platform/db/connection');
const { migrate: migrateStoreOrders } = require('../platform/db/migrate-store-orders');
migrateStoreOrders(getDb());

const handler = require('../api/webhook/printful');
const {
  createStoreOrder,
  setStoreOrderStatus,
  getStoreOrderByRef,
} = require('../platform/api/store-orders');
const PRODUCT_CATALOG = require('../store/products.json');

PRODUCT_CATALOG.products.push({
  id: 'pw-tee',
  name: 'Printful Webhook Tee',
  category: 'apparel',
  price: 38,
  blurb: '',
  image: '/x.webp',
  assets: {},
  templeUrl: null,
  design: { placements: [] },
  printfulProductId: 999005,
  printfulVariants: { M: 601 },
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

function req(body, token = 'test-token-abc', method = 'POST') {
  return { method, headers: {}, body, query: { token } };
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('missing or wrong token is 401', async () => {
  const resNoToken = createMockRes();
  await handler(req({}, null), resNoToken);
  assert.strictEqual(resNoToken.statusCode, 401);

  const resWrong = createMockRes();
  await handler(req({}, 'nope'), resWrong);
  assert.strictEqual(resWrong.statusCode, 401);
});

test('GET is refused with 405', async () => {
  const res = createMockRes();
  await handler(req({}, 'test-token-abc', 'GET'), res);
  assert.strictEqual(res.statusCode, 405);
});

test('unknown order is acknowledged without error', async () => {
  const res = createMockRes();
  await handler(req({ type: 'package_shipped', data: { order: { id: 1 }, shipment: {} } }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.matched, false);
});

test('package_shipped marks the order shipped with tracking', async () => {
  const { order } = createStoreOrder({ productId: 'pw-tee', variantLabel: 'M', quantity: 1 });
  setStoreOrderStatus(order.id, 'sent_to_fulfillment', { printfulOrderId: 8181 });
  const res = createMockRes();
  await handler(
    req({
      type: 'package_shipped',
      data: {
        order: { id: 8181, external_id: order.order_ref },
        shipment: { carrier: 'DHL', tracking_url: 'https://track.example/123' },
      },
    }),
    res
  );
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.status, 'shipped');
  const updated = getStoreOrderByRef(order.order_ref);
  assert.strictEqual(updated.status, 'shipped');
  assert.strictEqual(updated.tracking_url, 'https://track.example/123');
  assert.strictEqual(updated.carrier, 'DHL');
});

test('order_failed records fulfillment failure with the reason', async () => {
  const { order } = createStoreOrder({ productId: 'pw-tee', variantLabel: 'M', quantity: 1 });
  setStoreOrderStatus(order.id, 'sent_to_fulfillment', { printfulOrderId: 8282 });
  const res = createMockRes();
  await handler(
    req({ type: 'order_failed', data: { order: { id: 8282 }, reason: 'address invalid' } }),
    res
  );
  assert.strictEqual(res.statusCode, 200);
  const updated = getStoreOrderByRef(order.order_ref);
  assert.strictEqual(updated.status, 'fulfillment_failed');
  assert.strictEqual(updated.error, 'address invalid');
});

test('order_cancelled flips the order to cancelled', async () => {
  const { order } = createStoreOrder({ productId: 'pw-tee', variantLabel: 'M', quantity: 1 });
  setStoreOrderStatus(order.id, 'sent_to_fulfillment', { printfulOrderId: 8383 });
  const res = createMockRes();
  await handler(req({ type: 'order_cancelled', data: { order: { id: 8383 } } }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(getStoreOrderByRef(order.order_ref).status, 'cancelled');
});

test('unhandled event types are acknowledged gracefully', async () => {
  const { order } = createStoreOrder({ productId: 'pw-tee', variantLabel: 'M', quantity: 1 });
  setStoreOrderStatus(order.id, 'sent_to_fulfillment', { printfulOrderId: 8484 });
  const res = createMockRes();
  await handler(req({ type: 'stock_updated', data: { order: { id: 8484 } } }), res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.ignored, 'stock_updated');
  // …and an event for an unknown order is simply acknowledged.
  const resUnknown = createMockRes();
  await handler(req({ type: 'stock_updated', data: {} }), resUnknown);
  assert.strictEqual(resUnknown.statusCode, 200);
  assert.strictEqual(resUnknown.body.matched, false);
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
  console.log(`\nPrintful Webhook: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
