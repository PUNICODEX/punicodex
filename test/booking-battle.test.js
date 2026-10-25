/**
 * Booking Battle Tests — adversarial post-condition suite for the sponsorship
 * booking platform.
 *
 * Unlike the example-driven service tests, every scenario here ends with
 * assertSlotIntegrity(): a whole-database audit of the slot/booking invariants
 * (available ⇒ unclaimed; reserved/live ⇒ coherent booking; no dangling
 * claims; money coherence). Concurrency battles, abuse matrices, webhook
 * replays, and boundary sweeps all assert the invariants that must hold no
 * matter what an attacker (or a race, or a redelivered webhook) throws at the
 * system.
 *
 * Stripe is mocked via require.cache before any production module loads; all
 * timestamps are manipulated with SQL — no real timers, no network.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// ── Stripe mock ──────────────────────────────────────────────────────────────
// Every checkout session gets a UNIQUE id so renewal sessions are
// distinguishable from initial-payment sessions (extendBooking keys its
// replay detection on the session id). Session configs land in
// `sessionsCreated` for term assertions (trial days, cancel_at, amounts).
const stripeModulePath = require.resolve('stripe');
const sessionsCreated = [];
const subscriptionCancels = [];
let sessionCounter = 0;
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: (/* secretKey */) => ({
    checkout: {
      sessions: {
        create: async (config) => {
          sessionsCreated.push(config);
          const id = `cs_battle_${++sessionCounter}`;
          return {
            id,
            url: `https://checkout.stripe.com/mock/${id}`,
            mode: config.mode || 'payment',
          };
        },
        retrieve: async () => ({ payment_status: 'unpaid' }),
      },
    },
    subscriptions: {
      cancel: async (subscriptionId) => {
        subscriptionCancels.push(subscriptionId);
        return { id: subscriptionId, status: 'canceled' };
      },
    },
    webhooks: {
      constructEvent: (payload, signature) => {
        // Deterministic bad-signature simulation for the adversarial webhook
        // tests — any other signature "verifies" and parses the payload.
        if (signature === 'bad_sig') throw new Error('No signatures matched expected signature');
        return typeof payload === 'string' ? JSON.parse(payload) : payload;
      },
    },
  }),
};

// ── Email spy ────────────────────────────────────────────────────────────────
// Records every sender call in delivery order (senders are invoked
// synchronously up to their first await, so call order === record order when
// each lifecycle step is awaited before the next begins).
const emailModulePath = require.resolve('../platform/api/email.js');
const realEmail = require(emailModulePath);
const emailsSent = [];
const deliveredCodes = new Map();

function recordingSpy(type) {
  return async (payloadOrEmail, maybePayload) => {
    const email = typeof payloadOrEmail === 'string' ? payloadOrEmail : payloadOrEmail?.email;
    const payload = typeof payloadOrEmail === 'string' ? maybePayload : payloadOrEmail;
    emailsSent.push({ type, email, payload });
    return { success: true, mocked: true };
  };
}

require.cache[emailModulePath].exports = {
  ...realEmail,
  sendVerificationCode: async ({ email, code }) => {
    emailsSent.push({ type: 'verification', email });
    deliveredCodes.set(email, code);
    return { success: true, mocked: true };
  },
  sendBookingConfirmation: recordingSpy('confirmation'),
  notifyUploadReady: recordingSpy('upload-ready'),
  notifyApplicationApproved: recordingSpy('application-approved'),
  notifyApproved: recordingSpy('approved'),
  notifyLive: recordingSpy('live'),
  notifyTrialStarted: recordingSpy('trial-started'),
  notifyRenewalConfirmed: recordingSpy('renewal-confirmed'),
  notifyRevoked: recordingSpy('revoked'),
  notifyPaymentFailed: recordingSpy('payment-failed'),
  notifyRejected: recordingSpy('rejected'),
  notifyAdminApplication: recordingSpy('admin-application'),
  notifyAdminPending: recordingSpy('admin-pending'),
  notifyAdminPaymentConflict: recordingSpy('admin-payment-conflict'),
  sendDashboardLinks: recordingSpy('dashboard-links'),
};

const {
  BookingError,
  createBookingRequest,
  applyBookingRequest,
  sendVerification,
  checkVerification,
  getBookingByTokenSafe,
  getAllBookingsByToken,
  updateBookingMeta,
  cancelBooking,
  uncancelBooking,
  renewBooking,
  recoverBookings,
  checkBookingPayment,
} = require('../platform/api/booking-service.js');
const bookings = require('../platform/api/bookings.js');
const adminBookings = require('../platform/api/admin-booking-service.js');
const { runLeaseExpiry } = require('../platform/scripts/lease-expiry.js');
const { handleWebhook } = require('../platform/api/stripe.js');
const { processWebhook } = require('../platform/api/webhook-handler.js');
const { uploadBookingCreative, uploadSlotCreative } = require('../platform/api/booking-upload.js');
const discountService = require('../platform/api/discount-service.js');
const { all } = require('../platform/db/operational.js');
const { invoke } = require('./helpers/http.js');
const pixelHandler = require('../platform/api-handlers/analytics/pixel.gif/index.js');
const { getSlotId, getBundleSlotId } = require('./helpers/slots.js');

// ── Shared helpers ───────────────────────────────────────────────────────────

function openDb() {
  return new Database(getTestDbPath(__filename));
}

async function makeVerifiedEmail(email) {
  await sendVerification(email);
  const code = deliveredCodes.get(email);
  const result = await checkVerification(email, code);
  return result.verificationToken;
}

function makeEvent(type, object) {
  return { type, data: { object } };
}

function bookingFromDb(id) {
  const db = openDb();
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
  db.close();
  return row;
}

function slotFromDb(slotId) {
  const db = openDb();
  const row = db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(slotId);
  db.close();
  return row;
}

function sqlUpdate(sql, ...params) {
  const db = openDb();
  db.prepare(sql).run(...params);
  db.close();
}

// SQLite CURRENT_TIMESTAMP is 'YYYY-MM-DD HH:MM:SS' (space, no millis, UTC).
// Timestamps that SQL compares against CURRENT_TIMESTAMP must use the same
// lexical format — an ISO 'T' string sorts AFTER any same-day space string,
// which silently breaks `ends_at <= CURRENT_TIMESTAMP` cutoffs.
function toSqlUtc(date) {
  return date
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

async function makeImageDataUri() {
  const sharp = require('sharp');
  const buf = await sharp({
    create: { width: 120, height: 80, channels: 3, background: { r: 180, g: 40, b: 90 } },
  })
    .png()
    .toBuffer();
  return `data:image/png;base64,${buf.toString('base64')}`;
}

function cleanupUploads(bookingId) {
  try {
    fs.rmSync(path.join('platform', 'api', 'public', 'uploads', String(bookingId)), {
      recursive: true,
      force: true,
    });
  } catch {
    // best effort — the shared uploads dir survives in dev either way
  }
}

/**
 * The heart of the suite: a whole-database audit run after EVERY scenario.
 * Returns a list of invariant violations (empty when the world is coherent).
 */
async function collectSlotIntegrityViolations() {
  const violations = [];
  const slots = await all('SELECT id, status, current_booking_id FROM ad_slots');
  const bookingRows = await all('SELECT id, status, slot_id, amount_paid_cents FROM bookings');
  const bookingById = new Map(bookingRows.map((b) => [b.id, b]));
  const slotIds = new Set(slots.map((s) => s.id));

  const RESERVED_OK = [
    'pending_payment',
    'pending_application',
    'pending_upload',
    'pending_approval',
    'approved',
  ];
  const LIVE_OK = ['live', 'approved'];
  const TERMINAL = ['ended', 'rejected', 'cancelled'];

  for (const slot of slots) {
    const owner = slot.current_booking_id == null ? null : bookingById.get(slot.current_booking_id);
    if (slot.status === 'available' && slot.current_booking_id != null) {
      violations.push(`slot ${slot.id} available but claims booking ${slot.current_booking_id}`);
    }
    if (slot.status === 'reserved') {
      if (!owner) {
        violations.push(`slot ${slot.id} reserved but current_booking_id has no booking row`);
      } else if (!RESERVED_OK.includes(owner.status)) {
        violations.push(
          `slot ${slot.id} reserved by booking ${owner.id} in incoherent status ${owner.status}`
        );
      }
    }
    if (slot.status === 'live') {
      if (!owner) {
        violations.push(`slot ${slot.id} live but current_booking_id has no booking row`);
      } else if (!LIVE_OK.includes(owner.status)) {
        violations.push(
          `slot ${slot.id} live by booking ${owner.id} in incoherent status ${owner.status}`
        );
      }
    }
    if (owner && TERMINAL.includes(owner.status)) {
      violations.push(
        `terminal booking ${owner.id} (${owner.status}) still owns slot ${slot.id} (${slot.status})`
      );
    }
  }

  // No dangling slot references.
  for (const b of bookingRows) {
    if (!slotIds.has(b.slot_id))
      violations.push(`booking ${b.id} references missing slot ${b.slot_id}`);
  }

  // Money coherence: only the PRE-payment pending states must carry a zero
  // balance. (pending_upload/pending_approval are POST-payment states — a
  // paid creative in review legitimately has amount_paid_cents > 0. The
  // column default is NULL — treated as 0.)
  for (const b of bookingRows) {
    if (
      ['pending_payment', 'pending_application'].includes(b.status) &&
      (b.amount_paid_cents ?? 0) !== 0
    ) {
      violations.push(
        `unpaid-state booking ${b.id} (${b.status}) has amount_paid_cents=${b.amount_paid_cents}`
      );
    }
  }

  return violations;
}

async function assertSlotIntegrity(context) {
  const violations = await collectSlotIntegrityViolations();
  assert.deepStrictEqual(violations, [], `slot integrity violated (${context})`);
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n▸ Booking Battle Tests\n');
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
  console.log(`\nBooking Battle: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// ─── A. CONCURRENCY BATTLES ─────────────────────────────────────────────────

test('A1: two concurrent createBookingRequest for the same slot — exactly one wins', async () => {
  const slotId = getSlotId(__filename, 'ab', 1);
  const tokenA = await makeVerifiedEmail('a1-winner@example.com');
  const tokenB = await makeVerifiedEmail('a1-loser@example.com');
  const sessionsBefore = sessionsCreated.length;

  const attempt = (email, verificationToken) =>
    createBookingRequest({
      slotId,
      email,
      companyName: 'Race Co',
      leaseMonths: 1,
      trialMonths: 0,
      verificationToken,
    });
  const results = await Promise.allSettled([
    attempt('a1-winner@example.com', tokenA),
    attempt('a1-loser@example.com', tokenB),
  ]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');
  assert.strictEqual(fulfilled.length, 1, 'exactly one concurrent booking succeeds');
  assert.strictEqual(rejected.length, 1, 'exactly one concurrent booking loses');
  assert.ok(rejected[0].reason instanceof BookingError, 'the loser gets a BookingError');
  assert.strictEqual(rejected[0].reason.status, 409, 'the loser is rejected with a conflict');
  assert.strictEqual(
    sessionsCreated.length,
    sessionsBefore + 1,
    'exactly one Stripe checkout session is created'
  );
  await assertSlotIntegrity('A1 same-slot race');
});

test('A2: max_uses=1 code under two concurrent approveApplication — exactly one redemption', async () => {
  await discountService.createCode(
    { code: 'BATTLE-ONE', kind: 'percent_off', percent: 25, appliesTo: 'all', maxUses: 1 },
    null
  );
  const zeusBundle = getBundleSlotId(__filename, 'zeus');
  const athenaBundle = getBundleSlotId(__filename, 'athena');
  const t1 = await makeVerifiedEmail('a2-alpha@example.com');
  const t2 = await makeVerifiedEmail('a2-beta@example.com');
  const app1 = await applyBookingRequest({
    slotId: zeusBundle,
    email: 'a2-alpha@example.com',
    companyName: 'Alpha Co',
    leaseMonths: 12,
    trialMonths: 0,
    applicationNote: 'first',
    discountCode: 'BATTLE-ONE',
    verificationToken: t1,
  });
  const app2 = await applyBookingRequest({
    slotId: athenaBundle,
    email: 'a2-beta@example.com',
    companyName: 'Beta Co',
    leaseMonths: 12,
    trialMonths: 0,
    applicationNote: 'second',
    discountCode: 'BATTLE-ONE',
    verificationToken: t2,
  });

  const results = await Promise.allSettled([
    adminBookings.approveApplication(app1.bookingId, 'battle-admin'),
    adminBookings.approveApplication(app2.bookingId, 'battle-admin'),
  ]);
  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');
  assert.strictEqual(fulfilled.length, 1, 'exactly one approval succeeds');
  assert.strictEqual(rejected.length, 1, 'the other approval aborts');
  // SQLITE_BUSY under real concurrency now maps to a clean 409 conflict
  // (was: raw 'database is locked' 500). On Windows the WAL deadlock can
  // still stall the winner ≈5s — the invariant below is the real guard.
  assert.strictEqual(
    rejected[0].reason.status,
    409,
    'the loser gets a clean 409 conflict, not a raw 500'
  );

  const db = openDb();
  const code = db.prepare('SELECT * FROM discount_codes WHERE code = ?').get('BATTLE-ONE');
  const redemptions = db
    .prepare('SELECT * FROM discount_redemptions WHERE code_id = ?')
    .all(code.id);
  db.close();
  assert.strictEqual(code.used_count, 1, 'the code was redeemed exactly once');
  assert.strictEqual(redemptions.length, 1, 'exactly one redemption row exists');

  const loserId = results[0].status === 'rejected' ? app1.bookingId : app2.bookingId;
  const loserBooking = bookingFromDb(loserId);
  assert.strictEqual(
    loserBooking.status,
    'pending_application',
    'the loser stays an untouched application'
  );
  await assertSlotIntegrity('A2 single-use code race');
});

test('A3: the same verification token consumed by two concurrent applications', async () => {
  const aresBundle = getBundleSlotId(__filename, 'ares');
  const hermesBundle = getBundleSlotId(__filename, 'hermes');
  const token = await makeVerifiedEmail('a3-shared@example.com');

  const attempt = (slotId) =>
    applyBookingRequest({
      slotId,
      email: 'a3-shared@example.com',
      companyName: 'Shared Token Co',
      leaseMonths: 12,
      trialMonths: 0,
      verificationToken: token,
    });
  const results = await Promise.allSettled([attempt(aresBundle), attempt(hermesBundle)]);

  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');
  // The verified-session token is now consumed atomically (DELETE …
  // RETURNING), so a concurrent pair cannot both spend it — exactly one
  // application lands and the loser gets a clean 400/409, never a silent
  // double-spend or a raw 'database is locked'.
  assert.strictEqual(
    fulfilled.length,
    1,
    'exactly one application succeeds — the token is spent once'
  );
  assert.strictEqual(rejected.length, 1, 'the other application is refused');
  assert.ok(
    [400, 409].includes(rejected[0].reason.status),
    `clean refusal, got status ${rejected[0].reason.status}`
  );
  await assertSlotIntegrity('A3 verification-token double spend');
});

// ─── B. FULL LIFECYCLE WALK ─────────────────────────────────────────────────

test('B: apply → pay → upload → approve → live → analytics → renew → end, emails in order', async () => {
  const email = 'battle-lifecycle@example.com';
  const slotId = getSlotId(__filename, 'aphrodite', 1);
  const priceCents = slotFromDb(slotId).price_cents;
  const emailStart = emailsSent.length;

  // verify → booking request (confirmation email)
  const vToken = await makeVerifiedEmail(email);
  const created = await createBookingRequest({
    slotId,
    email,
    companyName: 'Lifecycle Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: vToken,
  });
  assert.strictEqual(bookingFromDb(created.bookingId).status, 'pending_payment');
  await assertSlotIntegrity('B after booking request');

  // webhook: initial payment (upload-ready email)
  const row = bookingFromDb(created.bookingId);
  await processWebhook(
    JSON.stringify(
      makeEvent('checkout.session.completed', {
        id: row.stripe_session_id,
        mode: 'payment',
        payment_intent: 'pi_battle_1',
        amount_total: priceCents,
        metadata: { type: 'booking', booking_id: String(created.bookingId) },
      })
    ),
    'sig'
  );
  assert.strictEqual(bookingFromDb(created.bookingId).status, 'pending_upload');
  await assertSlotIntegrity('B after payment webhook');

  // creative upload → back into review
  const image = await makeImageDataUri();
  const upload = await uploadBookingCreative(
    created.token,
    { image, filename: 'lifecycle.png' },
    { notifyAdminPending: async () => ({ success: true }) }
  );
  assert.strictEqual(upload.status, 200, `upload accepted: ${JSON.stringify(upload.body)}`);
  assert.strictEqual(bookingFromDb(created.bookingId).status, 'pending_approval');
  await assertSlotIntegrity('B after creative upload');
  cleanupUploads(created.bookingId);

  // admin approve (approved email)
  await adminBookings.approveBooking(created.bookingId, 'creative approved', 'battle-admin');
  assert.strictEqual(bookingFromDb(created.bookingId).status, 'approved');
  await assertSlotIntegrity('B after admin approve');

  // go live (live email; frames flip to live)
  await adminBookings.goLiveBooking(created.bookingId, 'battle-admin');
  const liveRow = bookingFromDb(created.bookingId);
  assert.strictEqual(liveRow.status, 'live');
  assert.ok(liveRow.started_at && liveRow.ends_at, 'lease window stamped at go-live');
  assert.strictEqual(slotFromDb(slotId).status, 'live');
  await assertSlotIntegrity('B after go-live');

  // analytics event through the public_id pixel path (never the analytics_token)
  const publicId = bookingFromDb(created.bookingId).public_id;
  assert.ok(
    publicId && publicId !== created.token,
    'public_id is distinct from the management token'
  );
  const pixel = await invoke(pixelHandler, 'GET', `/api/analytics/pixel.gif?b=${publicId}`);
  assert.strictEqual(pixel.status, 200, 'tracking pixel responds');
  const db = openDb();
  const events = db
    .prepare('SELECT * FROM analytics_events WHERE booking_id = ?')
    .all(created.bookingId);
  db.close();
  assert.strictEqual(events.length, 1, 'exactly one impression recorded via public_id');
  assert.strictEqual(events[0].event_type, 'impression');

  // renewal: checkout created, then the renewal webhook extends the lease once
  const beforeRenew = bookingFromDb(created.bookingId);
  const renewal = await renewBooking(created.token, 12);
  assert.strictEqual(renewal.success, true);
  const renewalConfig = sessionsCreated[sessionsCreated.length - 1];
  assert.strictEqual(renewalConfig.metadata.type, 'booking_renewal');
  const renewalSessionId = `cs_battle_${sessionCounter}`;
  await processWebhook(
    JSON.stringify(
      makeEvent('checkout.session.completed', {
        id: renewalSessionId,
        mode: 'payment',
        payment_intent: 'pi_battle_renew',
        amount_total: renewalConfig.line_items[0].price_data.unit_amount,
        metadata: {
          type: 'booking_renewal',
          booking_id: String(created.bookingId),
          extension_months: '12',
        },
      })
    ),
    'sig'
  );
  const afterRenew = bookingFromDb(created.bookingId);
  assert.strictEqual(
    afterRenew.lease_months,
    beforeRenew.lease_months + 12,
    'lease extended by 12 months'
  );
  assert.ok(
    new Date(afterRenew.ends_at).getTime() > new Date(beforeRenew.ends_at).getTime(),
    'lease window pushed out'
  );
  await assertSlotIntegrity('B after renewal');

  // admin end (revoked email; frame freed)
  await adminBookings.endBookingAdmin(created.bookingId, 'battle-admin');
  assert.strictEqual(bookingFromDb(created.bookingId).status, 'ended');
  assert.strictEqual(slotFromDb(slotId).status, 'available');
  assert.strictEqual(slotFromDb(slotId).current_booking_id, null);
  await assertSlotIntegrity('B after admin end');

  // Email ORDER: verification → confirmation → upload-ready → approved → live
  // → renewal-confirmed → revoked.
  const order = emailsSent
    .slice(emailStart)
    .filter((e) =>
      [
        'verification',
        'confirmation',
        'upload-ready',
        'approved',
        'live',
        'renewal-confirmed',
        'revoked',
      ].includes(e.type)
    )
    .map((e) => e.type);
  assert.deepStrictEqual(
    order,
    [
      'verification',
      'confirmation',
      'upload-ready',
      'approved',
      'live',
      'renewal-confirmed',
      'revoked',
    ],
    `lifecycle emails fired out of order: ${order.join(' → ')}`
  );
  assert.ok(
    emailsSent.some((e) => e.type === 'renewal-confirmed' && e.email === email),
    'the renewal receipt (notifyRenewalConfirmed) is present'
  );
});

// ─── C. ABUSE MATRIX ────────────────────────────────────────────────────────

test('C: abuse matrix — every status × every action refuses cleanly and integrity holds', async () => {
  const image = await makeImageDataUri();
  const statuses = [
    'pending_payment',
    'pending_application',
    'pending_upload',
    'pending_approval',
    'approved',
    'live',
    'ended',
    'rejected',
    'cancelled',
  ];
  const noopNotify = async () => ({ success: true });
  const actionFns = {
    cancel: (b) => cancelBooking(b.token),
    uncancel: (b) => uncancelBooking(b.token),
    renew: (b) => renewBooking(b.token, 12),
    goLive: (b) => bookings.goLive(b.id),
    pause: (b) => bookings.pause(b.id),
    reject: (b) => adminBookings.rejectBooking(b.id, 'matrix rejection', 'matrix-admin'),
    end: (b) => adminBookings.endBookingAdmin(b.id, 'matrix-admin'),
    upload: (b) =>
      uploadBookingCreative(
        b.token,
        { image, filename: 'm.png' },
        { notifyAdminPending: noopNotify }
      ),
  };
  const actionNames = Object.keys(actionFns);

  // Every cell gets a FRESH booking in the pristine status — destructive
  // actions must never see a state an earlier action left behind. Notable
  // refusals the current spec pins down; anything else succeeds or refuses
  // with any 4xx.
  const EXPECTED = {
    'pending_payment×renew': { status: 400 },
    'pending_application×renew': { status: 400 },
    'pending_upload×renew': { status: 400 },
    // NOTE: renew from pending_approval SUCCEEDS by current design — it is a
    // PAID state (creative in review), and renewBooking deliberately allows
    // live/approved/pending_approval. Only the UNPAID pending states refuse.
    'pending_approval×renew': { ok: true },
    'pending_upload×goLive': { status: 409 }, // no creative yet
    'pending_approval×goLive': { status: 409 }, // no creative yet
    'approved×goLive': { status: 409 }, // no creative yet
    'live×reject': { status: 400 }, // never reject a paid, serving placement
    'live×upload': { status: 403 }, // token path is view-only on live — use the panel
    'ended×uncancel': { status: 400 },
    'ended×renew': { status: 400 },
    'ended×end': { status: 400 }, // already ended
    'rejected×renew': { status: 400 },
    'rejected×upload': { ok: true }, // resubmission after rejection is allowed
    'cancelled×uncancel': { status: 400 },
    'cancelled×renew': { status: 400 },
  };

  // Slot pool: 6 untouched temples × 13 individual slots = 78 ≥ 9 statuses ×
  // 8 actions. Each cell consumes exactly one slot.
  const poolSites = ['amaterasu', 'ambika', 'ameretat', 'amida', 'amitabha', 'amoghasiddhi'];
  const pool = [];
  for (const site of poolSites) {
    for (let order = 1; order <= 13; order++) pool.push([site, order]);
  }
  let poolIndex = 0;
  const nextSlot = () => {
    const [site, order] = pool[poolIndex++];
    return { site, slotId: getSlotId(__filename, site, order) };
  };

  for (const status of statuses) {
    for (const action of actionNames) {
      const { site, slotId } = nextSlot();
      const b = await bookings.createBooking({
        slotId,
        email: `matrix-${status}-${action}@example.com`,
        companyName: 'Matrix Co',
        leaseMonths: 1,
        trialMonths: 0,
        siteSlug: site,
        status: 'pending_payment',
      });
      const booking = { id: b.id, token: b.token, slotId };
      // Minimal pristine-status setup (terminal states free their frame so the
      // pre-action world already satisfies the invariants).
      const future = toSqlUtc(new Date(Date.now() + 30 * 24 * 3600e3));
      if (status === 'pending_application') {
        sqlUpdate('UPDATE bookings SET status = ? WHERE id = ?', status, b.id);
      } else if (['pending_upload', 'pending_approval', 'approved'].includes(status)) {
        sqlUpdate('UPDATE bookings SET status = ? WHERE id = ?', status, b.id);
      } else if (status === 'live') {
        sqlUpdate(
          "UPDATE bookings SET status = 'live', started_at = ?, ends_at = ? WHERE id = ?",
          new Date().toISOString(),
          future,
          b.id
        );
        sqlUpdate("UPDATE ad_slots SET status = 'live' WHERE id = ?", slotId);
      } else if (['ended', 'rejected', 'cancelled'].includes(status)) {
        sqlUpdate('UPDATE bookings SET status = ? WHERE id = ?', status, b.id);
        sqlUpdate(
          "UPDATE ad_slots SET status = 'available', current_booking_id = NULL WHERE id = ?",
          slotId
        );
      }

      let outcome;
      try {
        const result = await actionFns[action](booking);
        outcome =
          typeof result?.status === 'number' && result.body !== undefined
            ? { status: result.status } // upload-style {status, body} envelope
            : { ok: true };
        if (outcome.status === 200) outcome = { ok: true };
      } catch (err) {
        outcome = { status: err.status };
      }
      const key = `${status}×${action}`;
      const expected = EXPECTED[key];
      if (expected?.ok) {
        assert.ok(outcome.ok, `${key}: expected success, got ${JSON.stringify(outcome)}`);
      } else if (expected) {
        assert.strictEqual(outcome.status, expected.status, `${key}: wrong refusal`);
      } else if (!outcome.ok) {
        assert.ok(
          Number.isInteger(outcome.status) && outcome.status >= 400 && outcome.status < 500,
          `${key}: unexpected non-4xx refusal ${JSON.stringify(outcome)}`
        );
      }
      await assertSlotIntegrity(`matrix ${key}`);
      if (action === 'upload' && outcome.ok) cleanupUploads(b.id);
    }
  }
});

test('C: go-live on an expired lease is refused', async () => {
  const slotId = getSlotId(__filename, 'aphrodite', 12);
  const { id } = await bookings.createBooking({
    slotId,
    email: 'expired-lease@example.com',
    companyName: 'Expired Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'aphrodite',
    status: 'approved',
  });
  // A paused placement whose lease window elapsed while off the air. It needs
  // a creative on file — goLive checks the empty-placement guard BEFORE the
  // expired-lease guard.
  sqlUpdate(
    "UPDATE bookings SET started_at = '2020-01-01 00:00:00', ends_at = '2020-02-01 00:00:00', creative_path = '/uploads/expired-lease.png' WHERE id = ?",
    id
  );
  await assert.rejects(() => bookings.goLive(id), /lease has expired/i);
  assert.strictEqual(bookingFromDb(id).status, 'approved', 'the booking is unchanged');
  await assertSlotIntegrity('expired-lease go-live refusal');
});

// ─── D. BOUNDARY SWEEPS ─────────────────────────────────────────────────────

test('D1: sweepStaleReservations boundary — 47h59m untouched, 48h01m cancelled', async () => {
  const freshSlotId = getSlotId(__filename, 'aphrodite', 13);
  const staleSlotId = getSlotId(__filename, 'apollon', 1);
  const fresh = await bookings.createBooking({
    slotId: freshSlotId,
    email: 'sweep-fresh@example.com',
    companyName: 'Fresh Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'aphrodite',
    status: 'pending_payment',
  });
  const stale = await bookings.createBooking({
    slotId: staleSlotId,
    email: 'sweep-stale@example.com',
    companyName: 'Stale Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'apollon',
    status: 'pending_payment',
  });
  // The sweep cutoff is computed in JS as an ISO string — the manipulated
  // timestamps must use the SAME lexical format or same-day comparisons go
  // wrong (' ' < 'T' at index 10 swallows the 60-second margin).
  sqlUpdate(
    'UPDATE bookings SET created_at = ? WHERE id = ?',
    new Date(Date.now() - (47 * 3600e3 + 59 * 60e3)).toISOString(),
    fresh.id
  );
  sqlUpdate(
    'UPDATE bookings SET created_at = ? WHERE id = ?',
    new Date(Date.now() - (48 * 3600e3 + 60e3)).toISOString(),
    stale.id
  );

  const result = await bookings.sweepStaleReservations({ olderThanHours: 48 });
  assert.strictEqual(result.canceled, 1, 'exactly one reservation is past the cutoff');

  assert.strictEqual(bookingFromDb(fresh.id).status, 'pending_payment', '47h59m is untouched');
  assert.strictEqual(slotFromDb(freshSlotId).status, 'reserved', 'fresh slot stays reserved');
  assert.strictEqual(bookingFromDb(stale.id).status, 'cancelled', '48h01m is cancelled');
  assert.strictEqual(slotFromDb(staleSlotId).status, 'available', 'stale slot is released');
  assert.strictEqual(slotFromDb(staleSlotId).current_booking_id, null);
  await assertSlotIntegrity('D1 sweep boundary');
});

test('D2: runLeaseExpiry — future lease survives, past lease ends with subscription cancel + revoked email', async () => {
  const futureSlotId = getSlotId(__filename, 'apollon', 3);
  const pastSlotId = getSlotId(__filename, 'apollon', 4);
  const future = await bookings.createBooking({
    slotId: futureSlotId,
    email: 'expiry-future@example.com',
    companyName: 'Future Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'apollon',
    status: 'live',
  });
  const past = await bookings.createBooking({
    slotId: pastSlotId,
    email: 'expiry-past@example.com',
    companyName: 'Past Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'apollon',
    status: 'live',
  });
  sqlUpdate(
    'UPDATE bookings SET started_at = ?, ends_at = ? WHERE id = ?',
    toSqlUtc(new Date(Date.now() - 3600e3)),
    toSqlUtc(new Date(Date.now() + 60e3)),
    future.id
  );
  sqlUpdate("UPDATE ad_slots SET status = 'live' WHERE id = ?", futureSlotId);
  sqlUpdate(
    "UPDATE bookings SET started_at = ?, ends_at = ?, cancel_at_end = 1, stripe_subscription_id = 'sub_d2_past' WHERE id = ?",
    toSqlUtc(new Date(Date.now() - 40 * 24 * 3600e3)),
    toSqlUtc(new Date(Date.now() - 60e3)),
    past.id
  );
  sqlUpdate("UPDATE ad_slots SET status = 'live' WHERE id = ?", pastSlotId);

  const cancelsBefore = subscriptionCancels.length;
  const revokedBefore = emailsSent.filter((e) => e.type === 'revoked').length;
  const result = await runLeaseExpiry();

  assert.strictEqual(bookingFromDb(future.id).status, 'live', 'the future lease is untouched');
  assert.strictEqual(slotFromDb(futureSlotId).status, 'live', 'its frame stays live');
  assert.strictEqual(bookingFromDb(past.id).status, 'ended', 'the past lease is ended');
  assert.strictEqual(slotFromDb(pastSlotId).status, 'available', 'its frame is freed');
  assert.ok(
    subscriptionCancels.length > cancelsBefore && subscriptionCancels.includes('sub_d2_past'),
    'subscriptions.cancel attempted for the subscription-mode booking'
  );
  assert.ok(
    emailsSent.filter((e) => e.type === 'revoked').length > revokedBefore,
    'notifyRevoked attempted for the cancel-at-end sponsor'
  );
  assert.ok(result.ended >= 1);
  await assertSlotIntegrity('D2 lease expiry boundary');
});

// ─── E. TOKEN ISOLATION ─────────────────────────────────────────────────────

test('E1: an unknown token is a uniform 404 across every token endpoint, mutating nothing', async () => {
  const ghost = 'f'.repeat(48);
  const attempts = [
    () => getBookingByTokenSafe(ghost),
    () => getAllBookingsByToken(ghost),
    () => updateBookingMeta(ghost, { customHeading: 'x' }),
    () => cancelBooking(ghost),
    () => uncancelBooking(ghost),
    () => renewBooking(ghost, 12),
    () => checkBookingPayment(ghost),
  ];
  for (const attempt of attempts) {
    await assert.rejects(attempt, (err) => {
      assert.ok(err instanceof BookingError, ' BookingError expected');
      assert.strictEqual(err.status, 404, 'uniform 404');
      return true;
    });
  }
  const upload = await uploadBookingCreative(ghost, { image: 'x', filename: 'x.png' }, {});
  assert.strictEqual(upload.status, 404, 'upload endpoint 404s too');
  await assertSlotIntegrity('E1 ghost token');
});

test('E1b: token A on site X never exposes or mutates booking B on site Y', async () => {
  const tA = await makeVerifiedEmail('iso-alice@example.com');
  const bookingA = await createBookingRequest({
    slotId: getSlotId(__filename, 'artemis', 1),
    email: 'iso-alice@example.com',
    companyName: 'Alice Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: tA,
  });
  const tB = await makeVerifiedEmail('iso-bob@example.com');
  const bookingB = await createBookingRequest({
    slotId: getSlotId(__filename, 'artemis', 2),
    email: 'iso-bob@example.com',
    companyName: 'Bob Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: tB,
  });

  // Alice's token must not surface Bob's booking or his management token.
  const aliceView = await getAllBookingsByToken(bookingA.token);
  assert.ok(
    aliceView.bookings.every((b) => b.id !== bookingB.bookingId),
    'token A must never list booking B'
  );
  assert.ok(
    aliceView.bookings.every((b) => !JSON.stringify(b).includes(bookingB.token)),
    'token A must never leak token B'
  );
  for (const b of aliceView.bookings) {
    assert.ok(!('token' in b) && !('analytics_token' in b), 'no raw management token fields');
    assert.match(b.dashboard_url, /\/dashboard\/\?token=/, 'opaque dashboard URL only');
  }
  await assertSlotIntegrity('E1b token isolation');
});

test('E2: the token-authed read never returns stripe ids / admin_note / email', async () => {
  const t = await makeVerifiedEmail('safe-read-battle@example.com');
  const created = await createBookingRequest({
    slotId: getSlotId(__filename, 'artemis', 3),
    email: 'safe-read-battle@example.com',
    companyName: 'Safe Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: t,
  });
  sqlUpdate(
    "UPDATE bookings SET stripe_session_id = 'cs_secret_b', stripe_payment_intent = 'pi_secret_b', stripe_subscription_id = 'sub_secret_b', admin_note = 'internal only', status = 'rejected' WHERE id = ?",
    created.bookingId
  );
  sqlUpdate(
    "UPDATE ad_slots SET status = 'available', current_booking_id = NULL WHERE current_booking_id = ?",
    created.bookingId
  );

  const safe = await getBookingByTokenSafe(created.token);
  for (const forbidden of [
    'stripe_session_id',
    'stripe_payment_intent',
    'stripe_subscription_id',
    'admin_note',
    'email',
  ]) {
    assert.ok(!(forbidden in safe), `${forbidden} must not appear in the token-authed read`);
  }

  // Deliberate exception: the REJECTED-step payment check surfaces the
  // sponsor-facing rejection note and nothing else.
  const paymentCheck = await checkBookingPayment(created.token);
  assert.strictEqual(paymentCheck.status, 'rejected');
  assert.strictEqual(paymentCheck.booking.admin_note, 'internal only');
  assert.ok(!('stripe_session_id' in paymentCheck.booking), 'stripe ids stay hidden even here');
  await assertSlotIntegrity('E2 read-surface hygiene');
});

// ─── F. BUNDLE CHAOS ────────────────────────────────────────────────────────

test('F1: booking the Full Page Takeover reserves the bundle and every member slot', async () => {
  const bundleId = getBundleSlotId(__filename, 'nike');
  const vToken = await makeVerifiedEmail('bundle-f1@example.com');
  const created = await createBookingRequest({
    slotId: bundleId,
    email: 'bundle-f1@example.com',
    companyName: 'Takeover Co',
    leaseMonths: 12,
    trialMonths: 0,
    verificationToken: vToken,
  });

  const db = openDb();
  const memberIds = db
    .prepare('SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = ?')
    .all(bundleId)
    .map((r) => r.member_slot_id);
  const held = db
    .prepare(
      `SELECT id, status, current_booking_id FROM ad_slots
       WHERE id = ? OR id IN (SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = ?)`
    )
    .all(bundleId, bundleId);
  db.close();
  assert.strictEqual(memberIds.length, 13, 'the takeover bundle has 13 member slots');
  assert.strictEqual(held.length, 14, 'bundle slot + 13 member slots');
  for (const slot of held) {
    assert.strictEqual(slot.status, 'reserved', `slot ${slot.id} reserved`);
    assert.strictEqual(
      slot.current_booking_id,
      created.bookingId,
      `slot ${slot.id} claimed by the bundle booking`
    );
  }
  await assertSlotIntegrity('F1 bundle reservation');
});

test('F2: applying for a member slot while the bundle is held — 409 conflict', async () => {
  const bundleId = getBundleSlotId(__filename, 'nike');
  const db = openDb();
  const memberId = db
    .prepare('SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = ? LIMIT 1')
    .get(bundleId).member_slot_id;
  db.close();

  // The low-level create path is the atomic guard createBookingRequest wraps:
  // the member is no longer available, so the booking itself must conflict.
  await assert.rejects(
    () =>
      bookings.createBooking({
        slotId: memberId,
        email: 'bundle-f2@example.com',
        companyName: 'Squatter Co',
        leaseMonths: 1,
        trialMonths: 0,
        siteSlug: 'nike',
      }),
    (err) => {
      assert.strictEqual(err.status, 409, 'member slot conflict is a 409');
      return true;
    }
  );
  await assertSlotIntegrity('F2 member slot conflict');
});

test('F3/F4: per-slot upload refuses a non-member slotId; ending the bundle frees every member', async () => {
  const bundleId = getBundleSlotId(__filename, 'nike');
  const db = openDb();
  const bundleBooking = db
    .prepare('SELECT id, analytics_token FROM bookings WHERE slot_id = ? ORDER BY id DESC LIMIT 1')
    .get(bundleId);
  const outsiderSlot = getSlotId(__filename, 'artemis', 4);
  db.close();
  assert.ok(bundleBooking, 'the F1 bundle booking exists');

  // Upload-eligible state, then a slotId that is not a bundle member.
  sqlUpdate("UPDATE bookings SET status = 'approved' WHERE id = ?", bundleBooking.id);
  const image = await makeImageDataUri();
  const upload = await uploadSlotCreative(bundleBooking.analytics_token, outsiderSlot, {
    image,
    filename: 'f3.png',
  });
  assert.strictEqual(upload.status, 400, 'non-member slotId refused');
  assert.match(upload.body.error, /Invalid slot for this bundle/);

  // End the bundle: every member frame goes back on the market.
  await adminBookings.endBookingAdmin(bundleBooking.id, 'battle-admin');
  const after = openDb();
  const held = after
    .prepare(
      `SELECT COUNT(*) AS c FROM ad_slots
       WHERE (id = ? OR id IN (SELECT member_slot_id FROM bundle_members WHERE bundle_slot_id = ?))
         AND (status != 'available' OR current_booking_id IS NOT NULL)`
    )
    .get(bundleId, bundleId);
  after.close();
  assert.strictEqual(held.c, 0, 'bundle slot and all 13 members are freed');
  await assertSlotIntegrity('F3/F4 bundle teardown');
});

// ─── G. TRIAL & DISCOUNT MATH ───────────────────────────────────────────────

test('G1: trial 3 + lease 12 → Stripe session carries trial_period_days 90 and cancel_at ≈ now+12mo', async () => {
  const slotId = getSlotId(__filename, 'adad', 1);
  const vToken = await makeVerifiedEmail('g1-trial@example.com');
  await createBookingRequest({
    slotId,
    email: 'g1-trial@example.com',
    companyName: 'Trial Co',
    leaseMonths: 12,
    trialMonths: 3,
    verificationToken: vToken,
  });
  const config = sessionsCreated[sessionsCreated.length - 1];
  assert.strictEqual(config.mode, 'subscription', 'a trial booking is a subscription');
  assert.strictEqual(config.subscription_data.trial_period_days, 90, '3-month trial = 90 days');
  const expectedCancel = Math.floor(
    new Date(new Date().setUTCMonth(new Date().getUTCMonth() + 12)).getTime() / 1000
  );
  assert.ok(
    Math.abs(config.subscription_data.cancel_at - expectedCancel) <= 24 * 3600,
    'cancel_at lands within a day of now+12 months'
  );
  await assertSlotIntegrity('G1 trial session terms');
});

test('G2: trial 3 + a free_months 3 code → 400 (effective trial would equal the lease)', async () => {
  await discountService.createCode(
    { code: 'BATTLE-FREE3', kind: 'free_months', freeMonths: 3, appliesTo: 'adad' },
    null
  );
  const slotId = getSlotId(__filename, 'adad', 2);
  const vToken = await makeVerifiedEmail('g2-clash@example.com');
  await assert.rejects(
    () =>
      createBookingRequest({
        slotId,
        email: 'g2-clash@example.com',
        companyName: 'Clash Co',
        leaseMonths: 12,
        trialMonths: 3,
        discountCode: 'BATTLE-FREE3',
        verificationToken: vToken,
      }),
    (err) => {
      assert.strictEqual(err.status, 400);
      assert.match(err.message, /Effective trial/);
      return true;
    }
  );
  assert.strictEqual(
    slotFromDb(slotId).status,
    'available',
    'the violating attempt reserves nothing'
  );
  const db = openDb();
  const leftover = db
    .prepare('SELECT COUNT(*) AS c FROM bookings WHERE email = ?')
    .get('g2-clash@example.com');
  db.close();
  assert.strictEqual(leftover.c, 0, 'no booking row left behind');
  await assertSlotIntegrity('G2 trial/code clash');
});

test('G3: free_months 3 + trial 0 + lease 12 → complimentary, no Stripe session, trial stored 0', async () => {
  const slotId = getSlotId(__filename, 'adad', 3);
  const vToken = await makeVerifiedEmail('g3-comp@example.com');
  const sessionsBefore = sessionsCreated.length;
  const result = await createBookingRequest({
    slotId,
    email: 'g3-comp@example.com',
    companyName: 'Complimentary Co',
    leaseMonths: 12,
    trialMonths: 0,
    discountCode: 'BATTLE-FREE3',
    verificationToken: vToken,
  });
  assert.strictEqual(result.complimentary, true);
  assert.strictEqual(result.totalCents, 0);
  assert.strictEqual(sessionsCreated.length, sessionsBefore, 'a nil term never touches Stripe');
  const row = bookingFromDb(result.bookingId);
  assert.strictEqual(row.status, 'approved', 'goes straight to the post-payment state');
  assert.strictEqual(row.trial_months, 0, 'the row agrees with the complimentary confirmation');
  await assertSlotIntegrity('G3 complimentary path');
});

test('G4: 12-month renewal price is round(price × 12 × 0.9)', async () => {
  const slotId = getSlotId(__filename, 'adad', 4);
  const { id, token } = await bookings.createBooking({
    slotId,
    email: 'g4-renew@example.com',
    companyName: 'Renewal Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'adad',
  });
  sqlUpdate("UPDATE bookings SET status = 'approved' WHERE id = ?", id);
  await renewBooking(token, 12);
  const config = sessionsCreated[sessionsCreated.length - 1];
  const priceCents = slotFromDb(slotId).price_cents;
  assert.strictEqual(
    config.line_items[0].price_data.unit_amount,
    Math.round(priceCents * 12 * 0.9),
    'the renewal checkout charges the yearly rate'
  );
  await assertSlotIntegrity('G4 renewal pricing');
});

// ─── H. WEBHOOK ADVERSARIAL ─────────────────────────────────────────────────

test('H1: initial-payment webhook redelivered ×3 — paid once', async () => {
  const { id } = await bookings.createBooking({
    slotId: getSlotId(__filename, 'aengus', 1),
    email: 'h1-replay@example.com',
    companyName: 'Replay Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'aengus',
  });
  await bookings.updateBookingStripeSession(id, 'cs_h1');
  const event = makeEvent('checkout.session.completed', {
    id: 'cs_h1',
    mode: 'payment',
    payment_intent: 'pi_h1',
    amount_total: 75000,
    metadata: { type: 'booking', booking_id: String(id) },
  });

  const uploadReadyBefore = emailsSent.filter((e) => e.type === 'upload-ready').length;
  for (let i = 0; i < 3; i++) {
    await processWebhook(JSON.stringify(event), 'sig');
  }
  const row = bookingFromDb(id);
  assert.strictEqual(row.status, 'pending_upload', 'paid exactly once');
  assert.strictEqual(row.amount_paid_cents, 75000, 'the amount is not double-recorded');
  const uploadReady =
    emailsSent.filter((e) => e.type === 'upload-ready').length - uploadReadyBefore;
  // markBookingPaid now flags replays (`replayed: true`) and webhook-handler
  // skips the notify — one upload-ready email no matter how many times
  // Stripe redelivers the event.
  assert.strictEqual(uploadReady, 1, 'exactly one upload-ready email across all redeliveries');
  await assertSlotIntegrity('H1 payment replay');
});

test('H2: renewal webhook redelivered ×3 — extended exactly once, one receipt', async () => {
  const h2SlotId = getSlotId(__filename, 'aer', 1);
  const { id } = await bookings.createBooking({
    slotId: h2SlotId,
    email: 'h2-replay@example.com',
    companyName: 'Renew Replay Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'aer',
    status: 'live',
  });
  sqlUpdate(
    "UPDATE bookings SET stripe_session_id = 'cs_h2_init', ends_at = '2030-01-01T00:00:00.000Z' WHERE id = ?",
    id
  );
  sqlUpdate("UPDATE ad_slots SET status = 'live' WHERE id = ?", h2SlotId);
  const event = makeEvent('checkout.session.completed', {
    id: 'cs_h2_renew',
    mode: 'payment',
    payment_intent: 'pi_h2',
    amount_total: 90000,
    metadata: { type: 'booking_renewal', booking_id: String(id), extension_months: '12' },
  });

  const receiptsBefore = emailsSent.filter((e) => e.type === 'renewal-confirmed').length;
  await processWebhook(JSON.stringify(event), 'sig');
  const once = bookingFromDb(id);
  for (let i = 0; i < 2; i++) {
    await processWebhook(JSON.stringify(event), 'sig');
  }
  const thrice = bookingFromDb(id);
  assert.strictEqual(thrice.lease_months, once.lease_months, 'lease months extended exactly once');
  assert.strictEqual(
    thrice.amount_paid_cents,
    once.amount_paid_cents,
    'amount increased exactly once'
  );
  assert.strictEqual(thrice.ends_at, once.ends_at, 'the lease window is unchanged by replays');
  const receipts = emailsSent.filter((e) => e.type === 'renewal-confirmed').length - receiptsBefore;
  assert.strictEqual(receipts, 1, 'exactly one renewal receipt');
  await assertSlotIntegrity('H2 renewal replay');
});

test('H3: renewal paid after the booking ended — refused, operator paged, no state change', async () => {
  const { id } = await bookings.createBooking({
    slotId: getSlotId(__filename, 'ahriman', 1),
    email: 'h3-ended@example.com',
    companyName: 'Late Renewal Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'ahriman',
    status: 'live',
  });
  sqlUpdate(
    "UPDATE bookings SET status = 'ended', stripe_session_id = 'cs_h3_init' WHERE id = ?",
    id
  );
  sqlUpdate(
    "UPDATE ad_slots SET status = 'available', current_booking_id = NULL WHERE current_booking_id = ?",
    id
  );

  const conflictsBefore = emailsSent.filter((e) => e.type === 'admin-payment-conflict').length;
  const result = await processWebhook(
    JSON.stringify(
      makeEvent('checkout.session.completed', {
        id: 'cs_h3_renew',
        mode: 'payment',
        payment_intent: 'pi_h3',
        amount_total: 90000,
        metadata: { type: 'booking_renewal', booking_id: String(id), extension_months: '12' },
      })
    ),
    'sig'
  );
  assert.strictEqual(result.type, 'booking_renewal');
  const row = bookingFromDb(id);
  assert.strictEqual(row.status, 'ended', 'no resurrection');
  assert.strictEqual(row.lease_months, 1, 'no extension applied');
  const conflicts =
    emailsSent.filter((e) => e.type === 'admin-payment-conflict').length - conflictsBefore;
  assert.strictEqual(conflicts, 1, 'the operator is paged exactly once');
  const conflictEntry = emailsSent
    .filter((e) => e.type === 'admin-payment-conflict')
    .find((e) => e.payload?.reason === 'renewal_on_ineligible_booking');
  assert.ok(conflictEntry, 'the conflict email names the renewal_on_ineligible_booking reason');
  await assertSlotIntegrity('H3 renewal after end');
});

test('H4: unknown metadata.type ignored cleanly; bad signature rejected', async () => {
  const result = await handleWebhook(
    JSON.stringify(
      makeEvent('checkout.session.completed', {
        id: 'cs_h4_mystery',
        mode: 'payment',
        payment_intent: 'pi_h4',
        amount_total: 100,
        metadata: { type: 'something_new' },
      })
    ),
    'sig'
  );
  assert.strictEqual(result.type, 'claim', 'unknown types fall through to the claim handler');
  assert.ok(!result.booking, 'no booking is touched');
  await assert.rejects(
    () => handleWebhook(JSON.stringify(makeEvent('checkout.session.completed', {})), 'bad_sig'),
    /signature verification failed/i
  );
  await assertSlotIntegrity('H4 unknown type / bad signature');
});

test('H5: invoice.payment_failed dunning + customer.subscription.deleted (live and already-ended)', async () => {
  // (a) dunning
  const dunningSlotId = getSlotId(__filename, 'aigyptos', 1);
  const dunning = await bookings.createBooking({
    slotId: dunningSlotId,
    email: 'h5-dunning@example.com',
    companyName: 'Dunning Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'aigyptos',
    status: 'live',
  });
  sqlUpdate(
    "UPDATE bookings SET stripe_subscription_id = 'sub_h5_dunning' WHERE id = ?",
    dunning.id
  );
  sqlUpdate("UPDATE ad_slots SET status = 'live' WHERE id = ?", dunningSlotId);
  const failedBefore = emailsSent.filter((e) => e.type === 'payment-failed').length;
  const dunningResult = await handleWebhook(
    JSON.stringify(
      makeEvent('invoice.payment_failed', { id: 'inv_h5', subscription: 'sub_h5_dunning' })
    ),
    'sig'
  );
  assert.strictEqual(dunningResult.type, 'booking');
  assert.strictEqual(bookingFromDb(dunning.id).billing_status, 'past_due');
  assert.strictEqual(
    emailsSent.filter((e) => e.type === 'payment-failed').length - failedBefore,
    1,
    'notifyPaymentFailed attempted'
  );

  // (b) portal cancel of a live placement
  const portalSlotId = getSlotId(__filename, 'aither', 1);
  const portal = await bookings.createBooking({
    slotId: portalSlotId,
    email: 'h5-portal@example.com',
    companyName: 'Portal Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'aither',
    status: 'live',
  });
  sqlUpdate("UPDATE bookings SET stripe_subscription_id = 'sub_h5_portal' WHERE id = ?", portal.id);
  sqlUpdate("UPDATE ad_slots SET status = 'live' WHERE id = ?", portalSlotId);
  const revokedBefore = emailsSent.filter((e) => e.type === 'revoked').length;
  const portalResult = await handleWebhook(
    JSON.stringify(
      makeEvent('customer.subscription.deleted', { id: 'sub_h5_portal', object: 'subscription' })
    ),
    'sig'
  );
  assert.strictEqual(portalResult.type, 'booking');
  assert.strictEqual(bookingFromDb(portal.id).status, 'ended', 'the placement ends immediately');
  assert.strictEqual(slotFromDb(portalSlotId).status, 'available');
  assert.strictEqual(
    emailsSent.filter((e) => e.type === 'revoked').length - revokedBefore,
    1,
    'notifyRevoked attempted'
  );

  // (c) portal cancel of an already-ended placement — strict no-op
  const gone = await bookings.createBooking({
    slotId: getSlotId(__filename, 'ajax', 1),
    email: 'h5-gone@example.com',
    companyName: 'Gone Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'ajax',
    status: 'ended',
  });
  sqlUpdate("UPDATE bookings SET stripe_subscription_id = 'sub_h5_gone' WHERE id = ?", gone.id);
  sqlUpdate(
    "UPDATE ad_slots SET status = 'available', current_booking_id = NULL WHERE current_booking_id = ?",
    gone.id
  );
  const revokedStable = emailsSent.filter((e) => e.type === 'revoked').length;
  const goneResult = await handleWebhook(
    JSON.stringify(
      makeEvent('customer.subscription.deleted', { id: 'sub_h5_gone', object: 'subscription' })
    ),
    'sig'
  );
  assert.strictEqual(goneResult.booking, null, 'no booking action for an ended placement');
  assert.strictEqual(
    emailsSent.filter((e) => e.type === 'revoked').length,
    revokedStable,
    'no duplicate revocation email'
  );
  await assertSlotIntegrity('H5 dunning + portal cancels');
});

// ─── I. CANCEL SEMANTICS ────────────────────────────────────────────────────

test('I1: cancel pending_payment → cancelled, frame released immediately', async () => {
  const slotId = getSlotId(__filename, 'ab', 2);
  const vToken = await makeVerifiedEmail('i1-cancel@example.com');
  const created = await createBookingRequest({
    slotId,
    email: 'i1-cancel@example.com',
    companyName: 'Cancel Co',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: vToken,
  });
  const result = await cancelBooking(created.token);
  assert.strictEqual(result.status, 'cancelled');
  assert.strictEqual(bookingFromDb(created.bookingId).status, 'cancelled');
  assert.strictEqual(slotFromDb(slotId).status, 'available', 'the frame is resellable immediately');
  assert.strictEqual(slotFromDb(slotId).current_booking_id, null);
  await assertSlotIntegrity('I1 unpaid cancel');
});

test('I2: cancel live → cancel_at_end; cron past the lease ends it, cancels the subscription, emails', async () => {
  const slotId = getSlotId(__filename, 'ab', 3);
  const { id, token } = await bookings.createBooking({
    slotId,
    email: 'i2-cancel@example.com',
    companyName: 'Cancel Live Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'ab',
    status: 'live',
  });
  sqlUpdate(
    "UPDATE bookings SET started_at = ?, ends_at = ?, stripe_subscription_id = 'sub_i2' WHERE id = ?",
    toSqlUtc(new Date(Date.now() - 40 * 24 * 3600e3)),
    toSqlUtc(new Date(Date.now() + 24 * 3600e3)),
    id
  );
  sqlUpdate("UPDATE ad_slots SET status = 'live' WHERE id = ?", slotId);

  const flagged = await cancelBooking(token);
  assert.strictEqual(flagged.cancelAtEnd, true, 'live placements wind down at term end');
  assert.strictEqual(bookingFromDb(id).cancel_at_end, 1);
  assert.strictEqual(bookingFromDb(id).status, 'live', 'still serving until the lease ends');

  // Wind the clock past the lease end and run the cron.
  sqlUpdate(
    'UPDATE bookings SET ends_at = ? WHERE id = ?',
    toSqlUtc(new Date(Date.now() - 60e3)),
    id
  );
  const cancelsBefore = subscriptionCancels.length;
  const revokedBefore = emailsSent.filter((e) => e.type === 'revoked').length;
  await runLeaseExpiry();

  assert.strictEqual(bookingFromDb(id).status, 'ended');
  assert.ok(subscriptionCancels.includes('sub_i2'), 'subscriptions.cancel attempted');
  assert.strictEqual(subscriptionCancels.length - cancelsBefore, 1, 'cancelled exactly once');
  assert.ok(
    emailsSent.filter((e) => e.type === 'revoked').length > revokedBefore,
    'the sponsor is told their placement ended'
  );
  assert.strictEqual(slotFromDb(slotId).status, 'available');
  await assertSlotIntegrity('I2 live cancel at end');
});

test('I3: uncancel before the lease end — flag cleared, the booking survives the cron', async () => {
  const slotId = getSlotId(__filename, 'ab', 4);
  const { id, token } = await bookings.createBooking({
    slotId,
    email: 'i3-uncancel@example.com',
    companyName: 'Uncancel Co',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'ab',
    status: 'live',
  });
  sqlUpdate(
    'UPDATE bookings SET started_at = ?, ends_at = ? WHERE id = ?',
    toSqlUtc(new Date(Date.now() - 3600e3)),
    toSqlUtc(new Date(Date.now() + 30 * 24 * 3600e3)),
    id
  );
  sqlUpdate("UPDATE ad_slots SET status = 'live' WHERE id = ?", slotId);

  await cancelBooking(token);
  assert.strictEqual(bookingFromDb(id).cancel_at_end, 1);
  const uncancelled = await uncancelBooking(token);
  assert.strictEqual(uncancelled.cancelAtEnd, false);
  assert.strictEqual(bookingFromDb(id).cancel_at_end, 0, 'the flag is cleared');
  assert.strictEqual(bookingFromDb(id).canceled_at, null, 'the cancel stamp is cleared too');

  await runLeaseExpiry();
  assert.strictEqual(bookingFromDb(id).status, 'live', 'the placement survives the cron');
  assert.strictEqual(slotFromDb(slotId).status, 'live');
  await assertSlotIntegrity('I3 uncancel survives cron');
});

test('I4: recovery is non-enumerating and hands out dashboard links, never raw sibling tokens', async () => {
  const t1 = await makeVerifiedEmail('i4-recover@example.com');
  const b1 = await createBookingRequest({
    slotId: getSlotId(__filename, 'ab', 5),
    email: 'i4-recover@example.com',
    companyName: 'Recover One',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: t1,
  });
  const t2 = await makeVerifiedEmail('i4-recover@example.com');
  const b2 = await createBookingRequest({
    slotId: getSlotId(__filename, 'ab', 6),
    email: 'i4-recover@example.com',
    companyName: 'Recover Two',
    leaseMonths: 1,
    trialMonths: 0,
    verificationToken: t2,
  });

  // Unknown email: neutral success, no oracle about existence.
  const ghost = await recoverBookings('nobody-by-this-name@example.com');
  assert.strictEqual(ghost.sent, true);
  assert.match(ghost.message, /If bookings exist/i, 'neutral wording — no enumeration');

  // Known email: links sent; the sibling listing carries dashboard URLs only.
  const known = await recoverBookings('i4-recover@example.com');
  assert.strictEqual(known.sent, true);
  assert.match(known.message, /Dashboard links sent/i);
  const { bookings: siblings } = await getAllBookingsByToken(b1.token);
  assert.strictEqual(siblings.length, 2);
  for (const b of siblings) {
    assert.ok(
      !('token' in b) && !('analytics_token' in b),
      'no raw sibling tokens in the response'
    );
    assert.match(
      b.dashboard_url,
      /\/dashboard\/\?token=/,
      'each sibling gets an opaque dashboard URL'
    );
  }
  const b2Sibling = siblings.find((b) => b.id === b2.bookingId);
  assert.ok(b2Sibling, 'the second placement is listed');
  assert.ok(
    !JSON.stringify(b2Sibling).includes(b1.token),
    'the caller token does not unlock sibling management'
  );
  await assertSlotIntegrity('I4 recovery');
});

run();
