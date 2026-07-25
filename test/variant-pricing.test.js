/**
 * Variant pricing tests
 *
 * Covers the store's per-variant pricing contract:
 *  - the pricing rule math in scripts/build-variant-pricing.js (delta
 *    pass-through, base never exceeds the variant price, whole-dollar
 *    rounding, { label: cents } shape),
 *  - the variantPricing map written into store/products.json,
 *  - the generated product page contract ("from $X" + baked price map +
 *    colour/size split for "Black / M" labels), and
 *  - the checkout server pricing from the per-variant map (400 on unknown
 *    labels, flat-price fallback for unmapped labels).
 *
 * Stripe is stubbed through the require cache; no network calls are made.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { setupTestDb } = require('../platform/scholars/test-helpers');

setupTestDb('variant-pricing');

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

const ROOT = path.join(__dirname, '..');
const { computeVariantPricing, variantLabel } = require('../scripts/build-variant-pricing');
const { parseVariants } = require('../scripts/generate-store-pages');
const { getDb } = require('../platform/db/connection');
const { migrate: migrateScholars } = require('../platform/db/migrate-scholars');
const { migrate: migrateScholarsCreatives } = require('../platform/db/migrate-scholars-creatives');
const { migrate: migrateCreatorMerch } = require('../platform/db/migrate-creator-merch');
const { migrate: migrateStoreOrders } = require('../platform/db/migrate-store-orders');
migrateScholars(getDb());
migrateScholarsCreatives(getDb());
migrateCreatorMerch(getDb());
migrateStoreOrders(getDb());

const checkoutHandler = require('../api/store/checkout');
const PRODUCT_CATALOG = require('../store/products.json');

PRODUCT_CATALOG.products.push({
  id: 'vp-canvas',
  temple: 'testvp',
  name: 'Variant Pricing Test Canvas',
  category: 'wall',
  price: 49,
  blurb: 'test',
  image: '/x.webp',
  assets: {},
  templeUrl: null,
  design: { placements: [] },
  printfulProductId: 999014,
  printfulVariants: { '10″×10″': 301, '12″×36″': 302, '16″×24″': 303 },
  variantPricing: { '10″×10″': 4900, '12″×36″': 9300 },
});

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

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

let ipSuffix = 10;
function req(overrides = {}) {
  return {
    method: 'POST',
    headers: { 'x-forwarded-for': `203.0.113.${ipSuffix++}` },
    body: {},
    query: {},
    ...overrides,
  };
}

test('pricing rule: delta pass-through, base floor, whole-dollar rounding', () => {
  const map = computeVariantPricing(38, [
    { color: 'Black', size: 'M', price: 21.0 },
    { color: 'White', size: 'M', price: 21.0 },
    { color: 'Black', size: '2XL', price: 24.5 },
  ]);
  // cheapest variant is $21.00 → base sizes stay at the flat $38; the 2XL
  // passes its $3.50 Printful delta through (38 + 3.50 = 41.50 → 42).
  assert.deepStrictEqual(map, { 'Black / M': 3800, 'White / M': 3800, 'Black / 2XL': 4200 });
  for (const cents of Object.values(map)) {
    assert.ok(cents >= 3800, 'variant price below the flat base');
    assert.strictEqual(cents % 100, 0, 'price not rounded to whole dollars');
  }
});

test('pricing rule: cheapest variant rides at exactly the flat price', () => {
  const map = computeVariantPricing(49, [
    { size: '10″×10″', price: 24.5 },
    { size: '12″×36″', price: 68.95 },
  ]);
  // 49 + (68.95 − 24.50) = 93.45 → 93.
  assert.deepStrictEqual(map, { '10″×10″': 4900, '12″×36″': 9300 });
});

test('pricing rule: output shape is { label: cents } per kind', () => {
  const map = computeVariantPricing(22, [
    { color: 'Black', size: '11 oz', price: 11.75 },
    { color: 'Black', size: '15 oz', price: 13.25 },
  ]);
  assert.deepStrictEqual(Object.keys(map).sort(), ['Black / 11 oz', 'Black / 15 oz']);
  for (const [label, cents] of Object.entries(map)) {
    assert.ok(label.length > 0, 'empty label');
    assert.ok(Number.isInteger(cents) && cents > 0, `${label}: bad cents`);
  }
});

test('variantLabel keeps the colour verbatim ("Black / M", never "M")', () => {
  assert.strictEqual(variantLabel({ color: 'Black', size: 'M' }), 'Black / M');
  assert.strictEqual(variantLabel({ color: 'White', size: '2XL' }), 'White / 2XL');
  assert.strictEqual(variantLabel({ color: 'Camel', size: 'One size' }), 'Camel');
  assert.strictEqual(variantLabel({ color: null, size: '10″×10″' }), '10″×10″');
  assert.strictEqual(variantLabel({ color: null, size: 'One size' }), 'One size');
  assert.strictEqual(variantLabel({}), 'One size');
});

test('products.json carries a sound variantPricing map on every product', () => {
  for (const p of PRODUCT_CATALOG.products) {
    if (p.id === 'vp-canvas') continue; // the fixture pushed above
    assert.ok(p.variantPricing, `${p.id}: variantPricing missing`);
    for (const [label, cents] of Object.entries(p.variantPricing)) {
      assert.ok(Number.isInteger(cents) && cents > 0, `${p.id}: "${label}" bad cents`);
      assert.strictEqual(cents % 100, 0, `${p.id}: "${label}" not whole-dollar`);
      assert.ok(cents >= Math.round(p.price * 100), `${p.id}: "${label}" below flat price`);
    }
  }
});

test('size-only kinds price every sellable label (canvas, print)', () => {
  for (const kind of ['canvas', 'print']) {
    const p = PRODUCT_CATALOG.products.find((x) => x.id.endsWith(`-${kind}`) && x.printfulVariants);
    assert.ok(p, `no ${kind} product found`);
    for (const label of Object.keys(p.printfulVariants)) {
      assert.ok(
        Number.isInteger(p.variantPricing[label]),
        `${p.id}: variant "${label}" has no price in the map`
      );
    }
    const cents = Object.values(p.variantPricing);
    assert.ok(Math.max(...cents) > Math.min(...cents), `${p.id}: expected a price spread`);
  }
});

test('parseVariants splits the colour dimension of "Black / M" labels', () => {
  const v = parseVariants({
    printfulVariants: { 'Black / M': 1, 'Black / L': 2, 'White / M': 3, 'White / L': 4 },
  });
  assert.deepStrictEqual(v.colors, ['Black', 'White']);
  assert.deepStrictEqual(v.sizes, ['M', 'L']);
  assert.strictEqual(v.hasColorDimension, true);
  assert.strictEqual(v.labelFor('White', 'L'), 'White / L');
  assert.strictEqual(v.labelFor('Black', 'M'), 'Black / M');

  const sizeOnly = parseVariants({ printfulVariants: { M: 1, L: 2 } });
  assert.deepStrictEqual(sizeOnly.colors, []);
  assert.strictEqual(sizeOnly.hasColorDimension, false);
});

test('a canvas product page shows "from $" with the baked variant map', () => {
  const p = PRODUCT_CATALOG.products.find(
    (x) => x.id.endsWith('-canvas') && x.variantPricing && x.printfulVariants
  );
  assert.ok(p, 'no priced canvas product in the catalog');
  const temple = p.temple || 'punicodex';
  const html = fs.readFileSync(path.join(ROOT, 'store', temple, 'canvas', 'index.html'), 'utf8');
  const pricedLabels = Object.keys(p.variantPricing).filter((l) =>
    Object.keys(p.printfulVariants).includes(l)
  );
  assert.ok(pricedLabels.length > 0, `${p.id}: no sellable priced labels`);
  const lo = Math.min(...pricedLabels.map((l) => p.variantPricing[l]));
  assert.ok(html.includes(`id="pdp-price"`), `${p.id}: price element missing`);
  assert.ok(html.includes(`from $${(lo / 100).toFixed(2)}`), `${p.id}: no "from $" price`);
  for (const label of pricedLabels) {
    assert.ok(
      html.includes(`${JSON.stringify(label)}:${p.variantPricing[label]}`),
      `${p.id}: baked map missing ${label}`
    );
  }
  assert.ok(html.includes('function updatePrice()'), `${p.id}: no client price updater`);
});

test('checkout prices a known variant from the map (never the client)', async () => {
  const res = createMockRes();
  await checkoutHandler(
    req({ body: { productId: 'vp-canvas', variantLabel: '12″×36″', quantity: 2 } }),
    res
  );
  assert.strictEqual(res.statusCode, 200);
  const order = getDb()
    .prepare('SELECT * FROM store_orders WHERE order_ref = ?')
    .get(res.body.orderRef);
  assert.strictEqual(order.unit_price_cents, 9300);
  assert.strictEqual(order.gross_cents, 18600);
  const params = createdSessions.at(-1);
  assert.strictEqual(params.line_items[0].price_data.unit_amount, 9300);
  assert.strictEqual(params.line_items[0].quantity, 2);
});

test('checkout rejects an unknown variantLabel with 400', async () => {
  const res = createMockRes();
  await checkoutHandler(req({ body: { productId: 'vp-canvas', variantLabel: '20″×30″' } }), res);
  assert.strictEqual(res.statusCode, 400);
  assert.match(res.body.error, /variant must be one of/);
});

test('checkout falls back to the flat price for labels outside the map', async () => {
  // '16″×24″' is a real sync variant but has no entry in variantPricing.
  const res = createMockRes();
  await checkoutHandler(
    req({ body: { productId: 'vp-canvas', variantLabel: '16″×24″', quantity: 1 } }),
    res
  );
  assert.strictEqual(res.statusCode, 200);
  const order = getDb()
    .prepare('SELECT * FROM store_orders WHERE order_ref = ?')
    .get(res.body.orderRef);
  assert.strictEqual(order.unit_price_cents, 4900);
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
  console.log(`\nVariant Pricing: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
