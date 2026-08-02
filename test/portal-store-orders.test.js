/**
 * Portal Store Orders Tests — admin visibility + fulfillment recovery.
 *
 * Covers:
 * - listStoreOrders service: ordering, status filter, totals, stats math
 *   (revenue excludes pending/cancelled/refunded; 30d window).
 * - Admin routes: 401 without a portal token; list shape; detail 400/404/200.
 * - Retry guard: 409 for any non-failed status, 404 unknown id.
 * - Retry happy path: a fulfillment_failed order is re-fulfilled end to end
 *   with the Printful client mocked, landing on sent_to_fulfillment with the
 *   Printful order id recorded.
 * - Printful client self-heal: a duplicate external_id create recovers the
 *   pre-existing order via the @external_id lookup and confirms drafts;
 *   non-duplicate create errors rethrow; 404 lookup → null.
 * - toRecipient: incomplete shipping → null.
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-store-orders-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.PRINTFUL_API_KEY = 'test-printful-key';

const { prepareTestDb } = require('./helpers/test-db.js');
const testDb = prepareTestDb(__filename);

{
  const Database = require('better-sqlite3');
  const tmpDb = new Database(testDb);
  require('../platform/db/migrate-store-orders.js').migrate(tmpDb);
  tmpDb.close();
}

const { invoke, adminHeader } = require('./helpers/http.js');
const {
  createStoreOrder,
  markStoreOrderPaid,
  setStoreOrderStatus,
  listStoreOrders,
  getStoreOrderById,
} = require('../platform/api/store-orders.js');
const PRODUCT_CATALOG = require('../store/products.json');

const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const listHandler = require('../platform/api-handlers/admin/portal/store-orders/index.js');
const detailHandler = require('../platform/api-handlers/admin/portal/store-orders/[id]/index.js');
const retryHandler = require('../platform/api-handlers/admin/portal/store-orders/[id]/retry-fulfillment/index.js');

// A catalog product with a live variant map for order creation.
PRODUCT_CATALOG.products.push({
  id: 'test-hoodie',
  temple: 'test',
  name: 'Test Temple Hoodie',
  category: 'apparel',
  price: 58.0,
  blurb: 'test',
  image: '/sites/test/assets/test_mascot.webp',
  assets: { mascot: '/sites/test/assets/test_mascot.webp' },
  templeUrl: '/sites/test/',
  design: { placements: [{ area: 'front', asset: 'mascot' }] },
  printfulProductId: 999002,
  printfulVariants: { 'Black / M': 201, 'Black / L': 202 },
  variantPricing: { 'Black / M': 5800, 'Black / L': 5800 },
});

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

let superToken = null;
const seeded = {};
let baseline = null;

const PAID_SESSION = {
  shipping_details: {
    name: 'Test Buyer',
    address: {
      line1: '1 Temple Way',
      city: 'Athens',
      state: 'AT',
      country: 'GR',
      postal_code: '10000',
    },
  },
  customer_details: { email: 'buyer@example.com' },
};

function seedOrder(status, extra = {}) {
  const { order } = createStoreOrder({
    productId: 'test-hoodie',
    variantLabel: 'Black / M',
    quantity: 1,
    email: 'buyer@example.com',
  });
  if (status !== 'pending_payment') {
    markStoreOrderPaid({
      orderRef: order.order_ref,
      stripeSessionId: `cs_test_${order.order_ref}`,
      stripePaymentIntent: `pi_${order.order_ref}`,
      session: PAID_SESSION,
    });
  }
  let current = getStoreOrderById(order.id);
  if (status !== 'pending_payment' && status !== 'paid') {
    current = setStoreOrderStatus(order.id, status, extra);
  }
  return current;
}

test('setup: bootstrap superadmin portal token', async () => {
  const boot = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
    body: { email: 'admin@punicodex.com', password: process.env.ADMIN_PASSWORD },
    headers: { 'x-forwarded-for': '10.99.0.1' },
  });
  assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
  superToken = boot.body.token;
  assert.ok(superToken);
});

test('setup: seed orders across the status ladder', () => {
  baseline = listStoreOrders({ limit: 50, offset: 0 });
  seeded.pending = seedOrder('pending_payment');
  seeded.paid = seedOrder('paid');
  seeded.sent = seedOrder('sent_to_fulfillment', {
    printfulOrderId: 777001,
    printfulStatus: 'confirmed',
  });
  seeded.failed = seedOrder('fulfillment_failed', { error: 'simulated printful outage' });
  seeded.shipped = seedOrder('shipped', {
    printfulOrderId: 777002,
    printfulStatus: 'shipped',
    trackingUrl: 'https://track.example/1',
    carrier: 'DHL',
  });
  for (const key of ['pending', 'paid', 'sent', 'failed', 'shipped']) {
    assert.ok(seeded[key].id, `seeded ${key}`);
  }
});

test('service: list orders newest-first with totals and stats', () => {
  const res = listStoreOrders({ limit: 50, offset: 0 });
  assert.strictEqual(res.total, baseline.total + 5);
  assert.strictEqual(res.items.length, res.total);
  for (let i = 1; i < res.items.length; i++) {
    assert.ok(res.items[i - 1].id >= res.items[i].id, 'ordered by id DESC');
  }
  // Revenue excludes the pending checkout; the four paid orders at $58 each.
  assert.strictEqual(res.stats.revenueCents, baseline.stats.revenueCents + 4 * 5800);
  assert.strictEqual(res.stats.totalOrders, baseline.stats.totalOrders + 4);
  assert.strictEqual(res.stats.orders30d, baseline.stats.orders30d + 4);
  assert.strictEqual(
    res.stats.byStatus.fulfillment_failed.count,
    (baseline.stats.byStatus.fulfillment_failed?.count || 0) + 1
  );
  assert.strictEqual(
    res.stats.byStatus.sent_to_fulfillment.count,
    (baseline.stats.byStatus.sent_to_fulfillment?.count || 0) + 1
  );
});

test('service: status filter narrows the roster', () => {
  const res = listStoreOrders({ limit: 50, offset: 0, status: 'fulfillment_failed' });
  assert.strictEqual(res.total, (baseline.stats.byStatus.fulfillment_failed?.count || 0) + 1);
  assert.strictEqual(res.items[0].id, seeded.failed.id);
  assert.strictEqual(res.items[0].error, 'simulated printful outage');
});

test('routes: 401 without a portal token on every route', async () => {
  for (const [handler, method, url] of [
    [listHandler, 'GET', '/api/admin/portal/store-orders/'],
    [detailHandler, 'GET', '/api/admin/portal/store-orders/1/'],
    [retryHandler, 'POST', '/api/admin/portal/store-orders/1/retry-fulfillment/'],
  ]) {
    const res = await invoke(handler, method, url, {
      headers: { 'x-forwarded-for': '10.99.0.2' },
      params: { id: '1' },
    });
    assert.strictEqual(res.status, 401, `${method} ${url} → ${res.status}`);
  }
});

test('routes: list envelope shape + status filter', async () => {
  const res = await invoke(listHandler, 'GET', '/api/admin/portal/store-orders/?status=paid', {
    headers: { ...adminHeader(superToken), 'x-forwarded-for': '10.99.0.3' },
  });
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body.items));
  assert.strictEqual(res.body.total, (baseline.stats.byStatus.paid?.count || 0) + 1);
  assert.strictEqual(res.body.items[0].status, 'paid');
  assert.ok(res.body.stats.revenueCents > 0);

  const bogus = await invoke(
    listHandler,
    'GET',
    '/api/admin/portal/store-orders/?status=nonsense',
    {
      headers: { ...adminHeader(superToken), 'x-forwarded-for': '10.99.0.3' },
    }
  );
  assert.strictEqual(bogus.status, 200);
  // An unrecognised status falls back to the unfiltered roster.
  assert.strictEqual(bogus.body.total, listStoreOrders({ limit: 50, offset: 0 }).total);
});

test('routes: detail 400 on bad id, 404 on unknown, 200 with order', async () => {
  const headers = { ...adminHeader(superToken), 'x-forwarded-for': '10.99.0.4' };
  const bad = await invoke(detailHandler, 'GET', '/api/admin/portal/store-orders/abc/', {
    headers,
    params: { id: 'abc' },
  });
  assert.strictEqual(bad.status, 400);
  const missing = await invoke(detailHandler, 'GET', '/api/admin/portal/store-orders/999999/', {
    headers,
    params: { id: '999999' },
  });
  assert.strictEqual(missing.status, 404);
  const ok = await invoke(
    detailHandler,
    'GET',
    `/api/admin/portal/store-orders/${seeded.shipped.id}/`,
    {
      headers,
      params: { id: String(seeded.shipped.id) },
    }
  );
  assert.strictEqual(ok.status, 200);
  assert.strictEqual(ok.body.order.tracking_url, 'https://track.example/1');
  assert.strictEqual(ok.body.order.carrier, 'DHL');
  assert.strictEqual(ok.body.order.printful_order_id, 777002);
});

test('routes: retry 404 unknown, 409 for any non-failed status', async () => {
  const headers = { ...adminHeader(superToken), 'x-forwarded-for': '10.99.0.5' };
  const missing = await invoke(
    retryHandler,
    'POST',
    '/api/admin/portal/store-orders/999999/retry-fulfillment/',
    {
      headers,
      params: { id: '999999' },
    }
  );
  assert.strictEqual(missing.status, 404);
  for (const key of ['pending', 'paid', 'sent', 'shipped']) {
    const res = await invoke(
      retryHandler,
      'POST',
      `/api/admin/portal/store-orders/${seeded[key].id}/retry-fulfillment/`,
      { headers, params: { id: String(seeded[key].id) } }
    );
    assert.strictEqual(res.status, 409, `${key} → ${res.status}`);
  }
});

test('routes: retry re-fulfills a failed order (Printful mocked)', async () => {
  const printfulPath = require.resolve('../platform/api/printful-orders.js');
  const calls = [];
  require.cache[printfulPath] = {
    id: printfulPath,
    filename: printfulPath,
    loaded: true,
    exports: {
      createAndConfirmOrder: async (order, syncVariantId) => {
        calls.push({ ref: order.order_ref, syncVariantId });
        return { id: 888001, status: 'confirmed' };
      },
    },
  };
  try {
    const res = await invoke(
      retryHandler,
      'POST',
      `/api/admin/portal/store-orders/${seeded.failed.id}/retry-fulfillment/`,
      {
        headers: { ...adminHeader(superToken), 'x-forwarded-for': '10.99.0.6' },
        params: { id: String(seeded.failed.id) },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.order.status, 'sent_to_fulfillment');
    assert.strictEqual(res.body.order.printful_order_id, 888001);
    assert.deepStrictEqual(calls, [{ ref: seeded.failed.order_ref, syncVariantId: 201 }]);
    // A second retry is now refused — no double fulfillment.
    const again = await invoke(
      retryHandler,
      'POST',
      `/api/admin/portal/store-orders/${seeded.failed.id}/retry-fulfillment/`,
      {
        headers: { ...adminHeader(superToken), 'x-forwarded-for': '10.99.0.6' },
        params: { id: String(seeded.failed.id) },
      }
    );
    assert.strictEqual(again.status, 409);
  } finally {
    delete require.cache[printfulPath];
  }
});

test('printful client: duplicate external_id self-heals via lookup + confirm', async () => {
  delete require.cache[require.resolve('../platform/api/printful-orders.js')];
  const { createAndConfirmOrder } = require('../platform/api/printful-orders.js');
  const originalFetch = global.fetch;
  const seen = [];
  global.fetch = async (url, opts = {}) => {
    seen.push(`${opts.method || 'GET'} ${url}`);
    if (url.endsWith('/orders') && opts.method === 'POST') {
      return {
        ok: false,
        status: 400,
        headers: new Map(),
        json: async () => ({ error: { message: 'external_id already exists' } }),
      };
    }
    if (url.includes('/orders/@SO-')) {
      return {
        ok: true,
        status: 200,
        headers: new Map(),
        json: async () => ({ result: { id: 555001, status: 'draft' } }),
      };
    }
    if (url.endsWith('/orders/555001/confirm')) {
      return {
        ok: true,
        status: 200,
        headers: new Map(),
        json: async () => ({ result: { id: 555001, status: 'confirmed' } }),
      };
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  try {
    const order = {
      order_ref: 'SO-20990101-ABCDEF12',
      quantity: 1,
      shipping_name: 'Test Buyer',
      shipping_address: JSON.stringify(PAID_SESSION.shipping_details.address),
    };
    const result = await createAndConfirmOrder(order, 201);
    assert.deepStrictEqual(result, { id: 555001, status: 'confirmed' });
    assert.strictEqual(seen.length, 3);
    assert.ok(seen[1].includes('/orders/@SO-20990101-ABCDEF12'));
  } finally {
    global.fetch = originalFetch;
  }
});

test('printful client: non-duplicate create errors rethrow; 404 lookup → null', async () => {
  const {
    createAndConfirmOrder,
    getOrderByExternalId,
  } = require('../platform/api/printful-orders.js');
  const originalFetch = global.fetch;
  global.fetch = async (url, opts = {}) => {
    if (url.endsWith('/orders') && opts.method === 'POST') {
      return {
        ok: false,
        status: 500,
        headers: new Map(),
        json: async () => ({ error: { message: 'upstream exploded' } }),
      };
    }
    if (url.includes('/orders/@')) {
      return {
        ok: false,
        status: 404,
        headers: new Map(),
        json: async () => ({ error: { message: 'not found' } }),
      };
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  try {
    await assert.rejects(
      () =>
        createAndConfirmOrder(
          {
            order_ref: 'SO-20990102-ABCDEF12',
            quantity: 1,
            shipping_name: 'Test Buyer',
            shipping_address: JSON.stringify(PAID_SESSION.shipping_details.address),
          },
          201
        ),
      /upstream exploded/
    );
    assert.strictEqual(await getOrderByExternalId('SO-nope'), null);
  } finally {
    global.fetch = originalFetch;
  }
});

test('printful client: toRecipient rejects incomplete shipping', () => {
  const { toRecipient } = require('../platform/api/printful-orders.js');
  assert.strictEqual(toRecipient({ name: null, address: '{}' }), null);
  assert.strictEqual(toRecipient({ name: 'X', address: JSON.stringify({ line1: '1 Way' }) }), null);
  const ok = toRecipient({ name: 'X', address: PAID_SESSION.shipping_details.address });
  assert.strictEqual(ok.country_code, 'GR');
  assert.strictEqual(ok.address1, '1 Temple Way');
});

(async () => {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
  if (failures) {
    console.error(`\n${failures} test(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${tests.length} portal store orders tests passed`);
})();
