/**
 * Sponsorship Flow Regression Tests
 *
 * Covers the 2026-08 founders-flow audit fixes end to end:
 *
 * - Go Live creative gate: a booking with no creative anywhere (neither the
 *   booking row nor any bundle slot_creatives row) cannot go live; one
 *   creative anywhere unlocks it.
 * - Case-insensitive email linkage: bookings/patrons stored with a
 *   mixed-case contact email (e.g. Martinkhoury98@gmail.com) are linked to
 *   the lowercase tenant account — the bug that emptied the advertiser
 *   panel in production.
 * - getMe sponsor/patron flag self-heal from the live linkage.
 * - Discount term edits (updateCode: maxUses/expiry/note) with guard rails,
 *   and resetCodeUses (counter rewind with history preserved).
 * - The PATCH /api/admin/portal/discounts/:id routing matrix
 *   (resetUses / edits / active / empty body) against the real service.
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-sponsorship-flow-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';

const Database = require('better-sqlite3');
const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async () => ({ id: 'cs_test_sponsorship_mock', url: 'https://checkout.stripe.com/x' }),
      },
    },
    webhooks: { constructEvent: (p) => JSON.parse(typeof p === 'string' ? p : p.toString('utf8')) },
  }),
};

const { invoke, adminHeader } = require('./helpers/http.js');
const { getIndividualSlotIds } = require('./helpers/slots.js');
const { createBooking, goLive, getBookingById } = require('../platform/api/bookings.js');
const tenantPortal = require('../platform/api/tenant-portal.js');
const discountService = require('../platform/api/discount-service.js');
const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const discountPatchHandler = require('../platform/api-handlers/admin/portal/discounts/[id]/index.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

const slotIds = getIndividualSlotIds(__filename, 'nike');
let slotCursor = 0;

async function makeApprovedBooking(email, { withCreative = false } = {}) {
  const { id } = await createBooking({
    slotId: slotIds[slotCursor++],
    email,
    companyName: 'Sponsorship Flow Test Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  const d = db();
  if (withCreative) {
    d.prepare(
      "UPDATE bookings SET status = 'approved', creative_path = '/uploads/test/sponsorship-creative.png' WHERE id = ?"
    ).run(id);
  } else {
    d.prepare("UPDATE bookings SET status = 'approved' WHERE id = ?").run(id);
  }
  d.close();
  return id;
}

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

// ── Go Live creative gate ───────────────────────────────────────

test('goLive rejects an approved booking with no creative anywhere', async () => {
  const id = await makeApprovedBooking('gate-empty@example.com');
  await assert.rejects(() => goLive(id), /creative is required before going live/);
  const after = await getBookingById(id);
  assert.strictEqual(after.status, 'approved', 'rejection must not move the booking');
});

test('goLive succeeds once the booking has a creative', async () => {
  const id = await makeApprovedBooking('gate-creative@example.com', { withCreative: true });
  await goLive(id);
  const after = await getBookingById(id);
  assert.strictEqual(after.status, 'live');
});

test('goLive succeeds for a bundle booking whose only creative is a slot creative', async () => {
  const id = await makeApprovedBooking('gate-bundle@example.com');
  const d = db();
  d.prepare(
    `INSERT INTO slot_creatives (booking_id, slot_id, creative_path) VALUES (?, ?, ?)`
  ).run(id, 1, '/uploads/test/slot-creative.png');
  d.close();
  await goLive(id);
  const after = await getBookingById(id);
  assert.strictEqual(after.status, 'live');
});

// ── Case-insensitive email linkage ─────────────────────────────

test('mixed-case booking emails link to the lowercase tenant account', async () => {
  const id = await makeApprovedBooking('MixedCase.Sponsor@Example.com', { withCreative: true });
  await tenantPortal.provisionTenantAccount('mixedcase.sponsor@example.com', { kind: 'sponsor' });
  const login = await tenantPortal.login({
    email: 'mixedcase.sponsor@example.com',
    password: 'unused',
  }).catch(() => null);
  assert.strictEqual(login, null, 'no password yet — login must fail');
  const account = await tenantPortal.getAccountByEmail('mixedcase.sponsor@example.com');
  const me = await tenantPortal.getMe(account);
  assert.ok(
    me.resources.bookings.some((b) => b.id === id),
    'booking stored with a mixed-case email must appear in the panel'
  );
});

test('getMe self-heals stale sponsor/patron flags from the live linkage', async () => {
  const d = db();
  d.prepare('UPDATE tenant_accounts SET is_sponsor = 0, is_patron = 0 WHERE email = ?').run(
    'mixedcase.sponsor@example.com'
  );
  d.close();
  const row = await tenantPortal.getAccountByEmail('mixedcase.sponsor@example.com');
  assert.strictEqual(Boolean(row.is_sponsor), false, 'fixture: flag starts stale');
  // resolveAccount() sanitizes before getMe in production; mirror that shape here.
  const sanitized = {
    ...row,
    isSponsor: Boolean(row.is_sponsor),
    isPatron: Boolean(row.is_patron),
  };
  const me = await tenantPortal.getMe(sanitized);
  assert.strictEqual(me.account.isSponsor, true, 'flag healed by the linkage');
  const healed = await tenantPortal.getAccountByEmail('mixedcase.sponsor@example.com');
  assert.strictEqual(Boolean(healed.is_sponsor), true, 'heal persists to the row');
});

// ── Discount term edits + reset uses ───────────────────────────

test('updateCode edits maxUses, expiry, and note with guard rails', async () => {
  const code = await discountService.createCode(
    { code: 'EDIT-ME', kind: 'percent_off', percent: 50, maxUses: 1, appliesTo: 'nike' },
    null
  );
  await discountService.redeem({
    codeId: code.id,
    bookingId: 950001,
    email: 'edit@example.com',
    originalCents: 100000,
    finalCents: 50000,
  });

  await assert.rejects(
    () => discountService.updateCode(code.id, { maxUses: 0 }, null),
    /positive integer/
  );
  await assert.rejects(
    () => discountService.updateCode(code.id, { maxUses: 0 }, null),
    (err) => err.status === 400 || err.statusCode === 400
  );
  await assert.rejects(
    () => discountService.updateCode(code.id, { expiresAt: 'not-a-date' }, null),
    /valid date/
  );

  const updated = await discountService.updateCode(
    code.id,
    { maxUses: 5, expiresAt: '2030-06-01', note: 're-offered to a second sponsor' },
    null
  );
  assert.strictEqual(updated.max_uses, 5);
  assert.ok(updated.expires_at.startsWith('2030-06-01'));
  assert.strictEqual(updated.note, 're-offered to a second sponsor');

  const cleared = await discountService.updateCode(code.id, { maxUses: null }, null);
  assert.strictEqual(cleared.max_uses, null, 'null restores unlimited');
});

test('updateCode refuses a maxUses below the current used_count', async () => {
  const code = await discountService.createCode(
    { code: 'USED-TWICE', kind: 'percent_off', percent: 10, appliesTo: 'nike' },
    null
  );
  for (let i = 0; i < 2; i++) {
    await discountService.redeem({
      codeId: code.id,
      bookingId: 950100 + i,
      email: `u${i}@example.com`,
      originalCents: 1000,
      finalCents: 900,
    });
  }
  await assert.rejects(() => discountService.updateCode(code.id, { maxUses: 1 }, null), /used_count/);
});

test('resetCodeUses rewinds the counter and keeps redemption history', async () => {
  const code = await discountService.createCode(
    { code: 'RESET-ME', kind: 'percent_off', percent: 100, maxUses: 1, appliesTo: 'nike' },
    null
  );
  await discountService.redeem({
    codeId: code.id,
    bookingId: 950200,
    email: 'reset@example.com',
    originalCents: 100000,
    finalCents: 0,
  });
  let current = await discountService.getCodeById(code.id);
  assert.strictEqual(current.used_count, 1, 'exhausted after one redeem');

  const reset = await discountService.resetCodeUses(code.id, null);
  assert.strictEqual(reset.used_count, 0);

  const d = db();
  const redemptions = d
    .prepare('SELECT COUNT(*) AS c FROM discount_redemptions WHERE code_id = ?')
    .get(code.id).c;
  const audit = d
    .prepare("SELECT COUNT(*) AS c FROM admin_actions WHERE action = 'portal.discount.reset-uses'")
    .get().c;
  d.close();
  assert.strictEqual(redemptions, 1, 'redemption rows preserved for audit');
  assert.ok(audit >= 1, 'reset is audit-logged');

  // The counter rewind makes the code redeemable again.
  await discountService.redeem({
    codeId: code.id,
    bookingId: 950201,
    email: 'second@example.com',
    originalCents: 100000,
    finalCents: 0,
  });
  current = await discountService.getCodeById(code.id);
  assert.strictEqual(current.used_count, 1, 'redeemable after reset');
});

// ── PATCH handler routing matrix ────────────────────────────────

test('PATCH /api/admin/portal/discounts/:id routes resetUses, edits, active, and rejects empty bodies', async () => {
  const boot = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
    headers: { 'x-forwarded-for': '10.88.0.1' },
    body: { email: 'admin@punicodex.com', password: process.env.ADMIN_PASSWORD },
  });
  assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
  const token = boot.body.token;

  const code = await discountService.createCode(
    { code: 'PATCH-ME', kind: 'percent_off', percent: 25, maxUses: 2, appliesTo: 'nike' },
    null
  );
  await discountService.redeem({
    codeId: code.id,
    bookingId: 950300,
    email: 'patch@example.com',
    originalCents: 1000,
    finalCents: 750,
  });

  const call = (body) =>
    invoke(discountPatchHandler, 'PATCH', `/api/admin/portal/discounts/${code.id}/`, {
      headers: adminHeader(token),
      params: { id: String(code.id) },
      body,
    });

  const reset = await call({ resetUses: true });
  assert.strictEqual(reset.status, 200, JSON.stringify(reset.body));
  assert.strictEqual(reset.body.used_count, 0);

  const edited = await call({ maxUses: 9, note: 'via handler' });
  assert.strictEqual(edited.status, 200, JSON.stringify(edited.body));
  assert.strictEqual(edited.body.max_uses, 9);
  assert.strictEqual(edited.body.note, 'via handler');

  const toggled = await call({ active: false });
  assert.strictEqual(toggled.status, 200);
  assert.strictEqual(toggled.body.active, 0);

  const empty = await call({});
  assert.strictEqual(empty.status, 400);
});

async function run() {
  console.log('\n▸ Sponsorship Flow Regression Tests\n');
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
      process.exitCode = 1;
    }
  }
  const failed = tests.length - (process.exitCode ? tests.length - tests.filter(() => false).length : 0);
  console.log(`\nSponsorship Flow: ${process.exitCode ? 'FAILURES' : 'all passed'}`);
}

run();
