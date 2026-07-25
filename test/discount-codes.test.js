/**
 * Discount Codes Tests — sponsorship (booking) discount codes; never patrons.
 *
 * Covers:
 * - Migration: discount_codes + discount_redemptions tables, NOCASE unique
 *   code, and the bookings.discount_code column.
 * - computePrice term math for every kind (percent with cents rounding,
 *   fixed with zero clamp, free months, free-then-price, trial extension).
 * - validateCode: temple scoping (zeus code rejects athena), expiry,
 *   inactive, unknown, max_uses, patron-context rejection.
 * - redeem: atomic max_uses guard (second redeem fails).
 * - Admin endpoints: 401 without a portal token; create validation errors
 *   (percent 0/100, then_price ≥ temple price); list/create happy path.
 * - Public validate endpoint: 400 on bad input, 404 unknown temple, envelope
 *   shape on success, identical invalid shape, no internals leaked.
 * - approveApplication: a valid free-months code produces trial terms and a
 *   redemption row; a dead code falls back to full price with an admin note.
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-discount-codes-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
const testDb = prepareTestDb(__filename);

// The golden DB predates the discount migration; the isolated copy gets the
// same treatment production cold starts get via the lazy schema ensure.
{
  const Database = require('better-sqlite3');
  const tmpDb = new Database(testDb);
  require('../platform/db/migrate-discount-codes.js').migrate(tmpDb);
  tmpDb.close();
}

// Mock the Stripe SDK before any service loads it; capture session configs
// so the approval tests can assert the exact trial/payment terms.
const sessionsCreated = [];
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => {
          sessionsCreated.push(config);
          return {
            id: `cs_test_discount_${sessionsCreated.length}`,
            url: 'https://checkout.stripe.com/discount-mock',
            mode: config.mode || 'payment',
          };
        },
      },
    },
    webhooks: {
      constructEvent: (payload) => JSON.parse(payload),
    },
  }),
};

const Database = require('better-sqlite3');
const { invoke, adminHeader } = require('./helpers/http.js');
const { getBundleSlotId } = require('./helpers/slots.js');
const discountService = require('../platform/api/discount-service.js');
const { createBooking, getBookingById } = require('../platform/api/bookings.js');
const { approveApplication } = require('../platform/api/admin-booking-service.js');

const loginHandler = require('../api/admin/portal/login/index.js');
const discountsHandler = require('../api/admin/portal/discounts/index.js');
const discountByIdHandler = require('../api/admin/portal/discounts/[id]/index.js');
const redemptionsHandler = require('../api/admin/portal/discounts/[id]/redemptions/index.js');
const validateHandler = require('../api/discount/validate/index.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

// Rotating source IPs so login + public-strict rate buckets never trip.
let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `10.88.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 4).join('\n'));
    process.exit(1);
  }
}

let superToken = null;
const seeded = {};

async function runTests() {
  console.log('\n▸ Discount Codes Tests\n');

  // ── Migration ────────────────────────────────────────────────
  await test('migration creates both tables, the bookings.discount_code column, and NOCASE-unique codes', async () => {
    const conn = db();
    const tables = conn
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('discount_codes', 'discount_redemptions')"
      )
      .all()
      .map((r) => r.name);
    assert.deepStrictEqual(tables.sort(), ['discount_codes', 'discount_redemptions']);

    const bookingCols = conn
      .prepare('PRAGMA table_info(bookings)')
      .all()
      .map((c) => c.name);
    assert.ok(bookingCols.includes('discount_code'), 'bookings.discount_code exists');

    conn
      .prepare(
        "INSERT INTO discount_codes (code, kind, percent) VALUES ('Nocase10', 'percent_off', 10)"
      )
      .run();
    assert.throws(
      () =>
        conn
          .prepare(
            "INSERT INTO discount_codes (code, kind, percent) VALUES ('NOCASE10', 'percent_off', 10)"
          )
          .run(),
      /UNIQUE/,
      'code uniqueness is case-insensitive'
    );

    const indexes = conn
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'discount_redemptions'"
      )
      .all()
      .map((r) => r.name);
    assert.ok(indexes.includes('idx_discount_redemptions_code'));
    assert.ok(indexes.includes('idx_discount_redemptions_booking'));
    conn.close();
  });

  // ── computePrice term math ───────────────────────────────────
  await test('computePrice: percent_off scales the price with cents rounding', async () => {
    const p = discountService.computePrice({
      priceCents: 250000,
      kind: 'percent_off',
      percent: 20,
    });
    assert.strictEqual(p.finalCents, 200000);
    assert.strictEqual(p.originalCents, 250000);
    // 33% off 3333 cents: 3333 × 0.67 = 2233.11 → 2233
    const rounded = discountService.computePrice({
      priceCents: 3333,
      kind: 'percent_off',
      percent: 33,
    });
    assert.strictEqual(rounded.finalCents, 2233);
    assert.strictEqual(
      discountService.computePrice({ priceCents: 5000, kind: 'percent_off', percent: 0 }),
      null
    );
    assert.strictEqual(
      discountService.computePrice({ priceCents: 5000, kind: 'percent_off', percent: 100 }),
      null
    );
  });

  await test('computePrice: fixed_off subtracts and clamps at zero', async () => {
    const p = discountService.computePrice({
      priceCents: 250000,
      kind: 'fixed_off',
      fixedCents: 50000,
    });
    assert.strictEqual(p.finalCents, 200000);
    const clamped = discountService.computePrice({
      priceCents: 5000,
      kind: 'fixed_off',
      fixedCents: 9999,
    });
    assert.strictEqual(clamped.finalCents, 0);
    assert.strictEqual(
      discountService.computePrice({ priceCents: 5000, kind: 'fixed_off', fixedCents: 0 }),
      null
    );
  });

  await test('computePrice: free_months keeps the price and carries the free period', async () => {
    const p = discountService.computePrice({
      priceCents: 250000,
      kind: 'free_months',
      freeMonths: 3,
    });
    assert.strictEqual(p.finalCents, 250000);
    assert.strictEqual(p.freeMonths, 3);
    const t = discountService.computePrice({
      priceCents: 250000,
      kind: 'trial_extension',
      freeMonths: 6,
    });
    assert.strictEqual(t.finalCents, 250000);
    assert.strictEqual(t.freeMonths, 6);
  });

  await test('computePrice: free_months_then_price requires then_price below the price', async () => {
    const p = discountService.computePrice({
      priceCents: 50000,
      kind: 'free_months_then_price',
      freeMonths: 6,
      thenPriceCents: 4900,
    });
    assert.strictEqual(p.finalCents, 4900);
    assert.strictEqual(p.freeMonths, 6);
    assert.strictEqual(p.thenPriceCents, 4900);
    assert.strictEqual(
      discountService.computePrice({
        priceCents: 50000,
        kind: 'free_months_then_price',
        freeMonths: 6,
        thenPriceCents: 50000,
      }),
      null,
      'then_price ≥ price rejected'
    );
  });

  // ── Admin endpoint auth sweep ────────────────────────────────
  await test('admin endpoints: 401 without a portal token on every route', async () => {
    const checks = [
      ['GET', '/api/admin/portal/discounts/', discountsHandler, {}],
      ['POST', '/api/admin/portal/discounts/', discountsHandler, { body: {} }],
      [
        'PATCH',
        '/api/admin/portal/discounts/1/',
        discountByIdHandler,
        { params: { id: '1' }, body: { active: false } },
      ],
      ['DELETE', '/api/admin/portal/discounts/1/', discountByIdHandler, { params: { id: '1' } }],
      [
        'GET',
        '/api/admin/portal/discounts/1/redemptions/',
        redemptionsHandler,
        { params: { id: '1' } },
      ],
    ];
    for (const [method, url, handler, opts] of checks) {
      const res = await invoke(handler, method, url, opts);
      assert.strictEqual(res.status, 401, `${method} ${url} → ${res.status}`);
    }
  });

  // ── Portal bootstrap ─────────────────────────────────────────
  await test('setup: bootstrap superadmin portal token', async () => {
    const boot = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
      headers: { 'x-forwarded-for': nextIp() },
      body: { email: 'admin@punicodex.com', password: process.env.ADMIN_PASSWORD },
    });
    assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
    superToken = boot.body.token;
  });

  // ── Admin create validation ──────────────────────────────────
  await test('admin create rejects percent 0 and percent 100', async () => {
    for (const percent of [0, 100]) {
      const res = await invoke(discountsHandler, 'POST', '/api/admin/portal/discounts/', {
        headers: adminHeader(superToken),
        body: { code: `PCT${percent}`, kind: 'percent_off', percent },
      });
      assert.strictEqual(
        res.status,
        400,
        `percent ${percent} → ${res.status}: ${JSON.stringify(res.body)}`
      );
    }
  });

  await test('admin create rejects then_price ≥ the temple price', async () => {
    // zeus bundle sponsorship price is 250000¢.
    const res = await invoke(discountsHandler, 'POST', '/api/admin/portal/discounts/', {
      headers: adminHeader(superToken),
      body: {
        code: 'ZEUS-THEN',
        kind: 'free_months_then_price',
        freeMonths: 3,
        thenPriceCents: 250000,
        appliesTo: 'zeus',
      },
    });
    assert.strictEqual(res.status, 400, JSON.stringify(res.body));

    const bad = await invoke(discountsHandler, 'POST', '/api/admin/portal/discounts/', {
      headers: adminHeader(superToken),
      body: { code: 'NOPE-KIND', kind: 'half_off' },
    });
    assert.strictEqual(bad.status, 400);
  });

  await test('admin create + list happy path returns the roster envelope and stats', async () => {
    const created = await invoke(discountsHandler, 'POST', '/api/admin/portal/discounts/', {
      headers: adminHeader(superToken),
      body: {
        code: 'LAUNCH25',
        kind: 'percent_off',
        percent: 25,
        appliesTo: 'zeus',
        note: 'launch',
      },
    });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    assert.strictEqual(created.body.code, 'LAUNCH25');
    assert.strictEqual(created.body.kind, 'percent_off');
    assert.strictEqual(created.body.used_count, 0);
    seeded.launchId = created.body.id;

    const dupe = await invoke(discountsHandler, 'POST', '/api/admin/portal/discounts/', {
      headers: adminHeader(superToken),
      body: { code: 'launch25', kind: 'percent_off', percent: 10 },
    });
    assert.strictEqual(dupe.status, 409, 'duplicate (case-insensitive) rejected');

    const list = await invoke(discountsHandler, 'GET', '/api/admin/portal/discounts/', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(list.status, 200);
    assert.ok(Array.isArray(list.body.items));
    assert.ok(list.body.items.some((c) => c.code === 'LAUNCH25'));
    assert.ok(list.body.stats && typeof list.body.stats.activeCodes === 'number');
    assert.ok('redemptions30d' in list.body.stats && 'usesRemaining' in list.body.stats);
  });

  // ── validateCode behaviour ───────────────────────────────────
  await test('validateCode: temple scoping — a zeus code rejects athena', async () => {
    const ok = await discountService.validateCode({
      code: 'LAUNCH25',
      siteSlug: 'zeus',
      leaseMonths: 1,
      priceCents: 250000,
    });
    assert.strictEqual(ok.valid, true);
    assert.strictEqual(ok.terms.kind, 'percent_off');
    assert.strictEqual(ok.terms.percent, 25);
    assert.strictEqual(ok.pricing.originalCents, 250000);
    assert.strictEqual(ok.pricing.finalCents, 187500);

    const wrong = await discountService.validateCode({
      code: 'LAUNCH25',
      siteSlug: 'athena',
      leaseMonths: 1,
      priceCents: 50000,
    });
    assert.strictEqual(wrong.valid, false);
    assert.strictEqual(wrong.reason, 'temple_mismatch');
  });

  await test('validateCode: expiry, inactive, unknown, and patron context are rejected', async () => {
    const expired = await discountService.createCode(
      {
        code: 'OLD-CODE',
        kind: 'percent_off',
        percent: 10,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      },
      null
    );
    const exp = await discountService.validateCode({
      code: 'OLD-CODE',
      siteSlug: 'nike',
      leaseMonths: 1,
      priceCents: 250000,
    });
    assert.deepStrictEqual(
      { valid: exp.valid, reason: exp.reason },
      { valid: false, reason: 'expired' }
    );

    await discountService.setCodeActive(expired.id, false, null);
    const ina = await discountService.validateCode({
      code: 'OLD-CODE',
      siteSlug: 'nike',
      leaseMonths: 1,
      priceCents: 250000,
    });
    assert.deepStrictEqual(
      { valid: ina.valid, reason: ina.reason },
      { valid: false, reason: 'inactive' }
    );

    const unk = await discountService.validateCode({
      code: 'NO-SUCH-CODE',
      siteSlug: 'nike',
      leaseMonths: 1,
      priceCents: 250000,
    });
    assert.deepStrictEqual(
      { valid: unk.valid, reason: unk.reason },
      { valid: false, reason: 'unknown_code' }
    );

    // This system never touches patrons.
    const patron = await discountService.validateCode({
      code: 'LAUNCH25',
      siteSlug: 'zeus',
      leaseMonths: 1,
      priceCents: 250000,
      context: 'patron',
    });
    assert.deepStrictEqual(
      { valid: patron.valid, reason: patron.reason },
      { valid: false, reason: 'patron_context' }
    );
  });

  await test('redeem: the max_uses guard is atomic — the second redeem fails', async () => {
    const code = await discountService.createCode(
      { code: 'ONE-SHOT', kind: 'fixed_off', fixedCents: 1000, maxUses: 1, appliesTo: 'zeus' },
      null
    );
    const first = await discountService.redeem({
      codeId: code.id,
      bookingId: 900001,
      email: 'first@example.com',
      originalCents: 250000,
      finalCents: 249000,
    });
    assert.strictEqual(first.ok, true);
    assert.ok(first.redemptionId > 0);

    const second = await discountService.redeem({
      codeId: code.id,
      bookingId: 900002,
      email: 'second@example.com',
      originalCents: 250000,
      finalCents: 249000,
    });
    assert.deepStrictEqual(second, { ok: false, reason: 'max_uses_reached' });

    const rows = db().prepare('SELECT * FROM discount_redemptions WHERE code_id = ?').all(code.id);
    assert.strictEqual(rows.length, 1, 'exactly one redemption recorded');
    const after = db().prepare('SELECT used_count FROM discount_codes WHERE id = ?').get(code.id);
    assert.strictEqual(after.used_count, 1);

    const exhausted = await discountService.validateCode({
      code: 'ONE-SHOT',
      siteSlug: 'zeus',
      leaseMonths: 1,
      priceCents: 250000,
    });
    assert.deepStrictEqual(
      { valid: exhausted.valid, reason: exhausted.reason },
      { valid: false, reason: 'max_uses_reached' }
    );
  });

  await test('admin toggle/delete rules: delete blocked once used, toggle flips active', async () => {
    const toggle = await invoke(
      discountByIdHandler,
      'PATCH',
      `/api/admin/portal/discounts/${seeded.launchId}/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(seeded.launchId) },
        body: { active: false },
      }
    );
    assert.strictEqual(toggle.status, 200, JSON.stringify(toggle.body));
    assert.strictEqual(toggle.body.active, 0);
    await invoke(discountByIdHandler, 'PATCH', `/api/admin/portal/discounts/${seeded.launchId}/`, {
      headers: adminHeader(superToken),
      params: { id: String(seeded.launchId) },
      body: { active: true },
    });

    const used = await discountService.createCode(
      { code: 'USED-ONCE', kind: 'percent_off', percent: 5 },
      null
    );
    await discountService.redeem({
      codeId: used.id,
      bookingId: 900003,
      originalCents: 100,
      finalCents: 95,
    });
    const delUsed = await invoke(
      discountByIdHandler,
      'DELETE',
      `/api/admin/portal/discounts/${used.id}/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(used.id) },
      }
    );
    assert.strictEqual(delUsed.status, 409, 'used code cannot be deleted');

    const fresh = await discountService.createCode(
      { code: 'DELETE-ME', kind: 'percent_off', percent: 5 },
      null
    );
    const del = await invoke(
      discountByIdHandler,
      'DELETE',
      `/api/admin/portal/discounts/${fresh.id}/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(fresh.id) },
      }
    );
    assert.strictEqual(del.status, 200);
    assert.strictEqual(del.body.deleted, true);

    const reds = await invoke(
      redemptionsHandler,
      'GET',
      `/api/admin/portal/discounts/${used.id}/redemptions/`,
      { headers: adminHeader(superToken), params: { id: String(used.id) } }
    );
    assert.strictEqual(reds.status, 200);
    assert.strictEqual(reds.body.total, 1);
    assert.strictEqual(reds.body.items[0].booking_id, 900003);
  });

  // ── Public validate endpoint ─────────────────────────────────
  await test('validate endpoint: 400 on bad input, 404 on an unknown temple', async () => {
    const missing = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
      headers: { 'x-forwarded-for': nextIp() },
      body: { temple: 'zeus', leaseMonths: 1 },
    });
    assert.strictEqual(missing.status, 400);

    const badLease = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
      headers: { 'x-forwarded-for': nextIp() },
      body: { code: 'LAUNCH25', temple: 'zeus', leaseMonths: 7 },
    });
    assert.strictEqual(badLease.status, 400);

    const badTemple = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
      headers: { 'x-forwarded-for': nextIp() },
      body: { code: 'LAUNCH25', temple: 'zeus!!', leaseMonths: 1 },
    });
    assert.strictEqual(badTemple.status, 400);

    const unknown = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
      headers: { 'x-forwarded-for': nextIp() },
      body: { code: 'LAUNCH25', temple: 'narnia', leaseMonths: 1 },
    });
    assert.strictEqual(unknown.status, 404);
  });

  await test('validate endpoint: envelope shape on success, identical failure shape, no internals', async () => {
    const ok = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
      headers: { 'x-forwarded-for': nextIp() },
      body: { code: 'LAUNCH25', temple: 'zeus', leaseMonths: 1 },
    });
    assert.strictEqual(ok.status, 200, JSON.stringify(ok.body));
    assert.strictEqual(ok.headers['x-ratelimit-limit'], '5', 'public-strict bucket');
    assert.strictEqual(ok.body.valid, true);
    assert.strictEqual(ok.body.code, 'LAUNCH25');
    assert.deepStrictEqual(Object.keys(ok.body).sort(), ['code', 'pricing', 'terms', 'valid']);
    assert.deepStrictEqual(Object.keys(ok.body.terms).sort(), [
      'fixedCents',
      'freeMonths',
      'kind',
      'percent',
      'thenPriceCents',
    ]);
    assert.deepStrictEqual(Object.keys(ok.body.pricing).sort(), [
      'finalCents',
      'freeMonths',
      'originalCents',
      'thenPriceCents',
    ]);
    assert.strictEqual(
      ok.body.pricing.originalCents,
      250000,
      'zeus bundle price resolved server-side'
    );
    assert.strictEqual(ok.body.pricing.finalCents, 187500);
    const payload = JSON.stringify(ok.body);
    for (const internal of ['max_uses', 'used_count', 'created_by', 'note', 'maxUses']) {
      assert.ok(!payload.includes(internal), `no internal field leaked: ${internal}`);
    }

    // Wrong temple and unknown code return the identical generic shape.
    const mismatch = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
      headers: { 'x-forwarded-for': nextIp() },
      body: { code: 'LAUNCH25', temple: 'athena', leaseMonths: 1 },
    });
    assert.strictEqual(mismatch.status, 200);
    assert.deepStrictEqual(mismatch.body, { valid: false, reason: 'invalid_code' });

    const ghost = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
      headers: { 'x-forwarded-for': nextIp() },
      body: { code: 'DEFINITELY-NOT-A-CODE', temple: 'zeus', leaseMonths: 1 },
    });
    assert.strictEqual(ghost.status, 200);
    assert.deepStrictEqual(ghost.body, { valid: false, reason: 'invalid_code' });

    const expired = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
      headers: { 'x-forwarded-for': nextIp() },
      body: { code: 'OLD-CODE', temple: 'nike', leaseMonths: 1 },
    });
    assert.deepStrictEqual(
      expired.body,
      { valid: false, reason: 'invalid_code' },
      'no expiry leak'
    );
  });

  // ── approveApplication integration ───────────────────────────
  await test('approveApplication: a valid free-months code produces trial terms and a redemption', async () => {
    const code = await discountService.createCode(
      { code: 'SPRING-FREE', kind: 'free_months', freeMonths: 2, appliesTo: 'nike' },
      null
    );
    const slotId = getBundleSlotId(__filename, 'nike');
    const slot = db().prepare('SELECT price_cents FROM ad_slots WHERE id = ?').get(slotId);

    const { id: bookingId } = await createBooking({
      slotId,
      email: 'spring@example.com',
      companyName: 'Spring Co',
      leaseMonths: 12,
      trialMonths: 3,
      siteSlug: 'nike',
      status: 'pending_application',
      discountCode: '  SPRING-FREE  ',
    });
    const stored = await getBookingById(bookingId);
    assert.strictEqual(stored.discount_code, 'SPRING-FREE', 'stored trimmed (≤40 chars)');

    const before = sessionsCreated.length;
    const result = await approveApplication(bookingId, 'test-admin-token');
    assert.strictEqual(result.success, true);
    assert.ok(result.discount, 'discount block returned');
    assert.strictEqual(result.discount.code, 'SPRING-FREE');
    assert.strictEqual(result.discount.kind, 'free_months');
    assert.strictEqual(result.discount.freeMonths, 2);

    const config = sessionsCreated[sessionsCreated.length - 1];
    assert.ok(sessionsCreated.length > before, 'stripe session created');
    assert.strictEqual(config.mode, 'subscription', 'free-month terms become a subscription');
    assert.strictEqual(
      config.subscription_data.trial_period_days,
      (3 + 2) * 30,
      'trial extended by the free months'
    );
    assert.strictEqual(
      config.line_items[0].price_data.unit_amount,
      slot.price_cents,
      'recurring amount stays the slot price'
    );
    assert.strictEqual(config.line_items[0].price_data.recurring.interval, 'month');

    const redemption = db()
      .prepare('SELECT * FROM discount_redemptions WHERE booking_id = ?')
      .get(bookingId);
    assert.ok(redemption, 'redemption row recorded');
    assert.strictEqual(redemption.code_id, code.id);
    assert.strictEqual(redemption.email, 'spring@example.com');
    assert.strictEqual(redemption.original_cents, slot.price_cents);
    assert.strictEqual(redemption.final_cents, slot.price_cents);

    const updated = await getBookingById(bookingId);
    assert.strictEqual(updated.status, 'pending_payment');
    assert.strictEqual(updated.trial_months, 5, 'adjusted trial persisted on the booking');

    const used = db().prepare('SELECT used_count FROM discount_codes WHERE id = ?').get(code.id);
    assert.strictEqual(used.used_count, 1);
    seeded.approvedBookingId = bookingId;
  });

  await test('approveApplication: a dead code falls back to full price with an admin note', async () => {
    // zeus bundle (the nike bundle is reserved by the previous test).
    const slotId = getBundleSlotId(__filename, 'zeus');
    const slot = db().prepare('SELECT price_cents FROM ad_slots WHERE id = ?').get(slotId);
    const expectedFull = Math.round(slot.price_cents * 12 * 0.9);

    const { id: bookingId } = await createBooking({
      slotId,
      email: 'ghost@example.com',
      companyName: 'Ghost Co',
      leaseMonths: 12,
      trialMonths: 0,
      siteSlug: 'zeus',
      status: 'pending_application',
      discountCode: 'GHOST-CODE',
    });

    const result = await approveApplication(bookingId, 'test-admin-token');
    assert.strictEqual(result.success, true, 'a dead code never blocks approval');
    assert.strictEqual(result.discount, undefined);

    const config = sessionsCreated[sessionsCreated.length - 1];
    assert.strictEqual(config.mode, 'payment');
    assert.strictEqual(
      config.line_items[0].price_data.unit_amount,
      expectedFull,
      'full yearly price charged'
    );

    const updated = await getBookingById(bookingId);
    assert.strictEqual(updated.status, 'pending_payment');
    assert.ok(updated.admin_note, 'admin note recorded');
    assert.ok(updated.admin_note.includes('GHOST-CODE'), 'note names the code');
    assert.ok(updated.admin_note.includes('not applied'), 'note explains the fallback');

    const redemption = db()
      .prepare('SELECT * FROM discount_redemptions WHERE booking_id = ?')
      .get(bookingId);
    assert.strictEqual(redemption, undefined, 'no redemption for a dead code');
  });

  await test('approveApplication: expired code stored on the booking also falls back', async () => {
    await discountService.createCode(
      {
        code: 'LAPSED',
        kind: 'percent_off',
        percent: 50,
        expiresAt: new Date(Date.now() - 60 * 1000).toISOString(),
      },
      null
    );
    const slotId = getBundleSlotId(__filename, 'hermes');
    const slot = db().prepare('SELECT price_cents FROM ad_slots WHERE id = ?').get(slotId);

    const { id: bookingId } = await createBooking({
      slotId,
      email: 'lapsed@example.com',
      companyName: 'Lapsed Co',
      leaseMonths: 1,
      trialMonths: 0,
      siteSlug: 'hermes',
      status: 'pending_application',
      discountCode: 'LAPSED',
    });
    const result = await approveApplication(bookingId, 'test-admin-token');
    assert.strictEqual(result.success, true);
    const config = sessionsCreated[sessionsCreated.length - 1];
    assert.strictEqual(config.line_items[0].price_data.unit_amount, slot.price_cents);
    const updated = await getBookingById(bookingId);
    assert.ok(updated.admin_note.includes('not applied (expired)'));
  });

  console.log('\n✓ All discount codes tests passed');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
