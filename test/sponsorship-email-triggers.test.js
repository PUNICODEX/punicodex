/**
 * Sponsorship Email Trigger Tests
 *
 * Every booking state transition must fire exactly the right notification —
 * and the silent ones (pause, meta edit) must stay silent. The transport is
 * stubbed the way test/portal-leasing.test.js does it: RESEND_API_KEY is set
 * before platform/api/email.js loads (the key is captured at module load),
 * and globalThis.fetch captures the Resend payloads.
 *
 * Covered transitions:
 *   approveApplication   → payment-link mail with the Stripe checkout URL
 *   approveBooking       → publish-hint mail (approval ≠ publish)
 *   approveAndGoLive     → exactly ONE mail: the live/trial notice
 *   rejectBooking        → rejection mail carrying the admin's reason
 *   goLiveBooking        → notifyLive, or notifyTrialStarted when trialing
 *   publishOwnBooking    → notifyLive (sponsor's own publish switch)
 *   pauseOwnBooking      → NO email
 *   updateOwnBookingMeta → NO email (the edit re-enters review silently)
 *   endBookingAdmin      → revocation notice
 *
 * DB bootstrap mirrors test/booking-publish-pause.test.js: an isolated copy
 * of the golden SQLite DB via prepareTestDb(__filename). Stripe is mocked at
 * the module boundary (same idiom as sponsorship-state-machine.test.js).
 */

const assert = require('node:assert');

process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.RESEND_API_KEY = 'test-resend-key';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';

// ── Transport stub: capture every Resend payload ──
const sent = [];
globalThis.fetch = async (_url, options) => {
  sent.push(JSON.parse(options.body));
  return { ok: true, json: async () => ({ id: 'resend-trigger-test' }) };
};

// ── Stripe mock (unique session id per call) ──
let sessionCounter = 0;
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async () => ({
          id: `cs_test_email_triggers_${++sessionCounter}`,
          url: 'https://checkout.stripe.com/email-triggers-mock',
        }),
      },
    },
    webhooks: {
      constructEvent: (p) => JSON.parse(typeof p === 'string' ? p : p.toString('utf8')),
    },
  }),
};

const Database = require('better-sqlite3');
const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const {
  createBooking,
  saveCreative,
  getBookingById,
  goLive,
} = require('../platform/api/bookings.js');
const {
  approveApplication,
  approveBooking,
  approveAndGoLive,
  rejectBooking,
  goLiveBooking,
  endBookingAdmin,
} = require('../platform/api/admin-booking-service.js');
const {
  publishOwnBooking,
  pauseOwnBooking,
  updateOwnBookingMeta,
} = require('../platform/api/tenant-portal.js');
const { getIndividualSlotIds } = require('./helpers/slots.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

const slotIds = getIndividualSlotIds(__filename, 'nike');
let slotCursor = 0;
let emailCounter = 0;
function nextEmail() {
  emailCounter += 1;
  return `trigger-${emailCounter}@emails.test`;
}

async function makeBooking({ status = 'pending_payment', creative = false, trialMonths = 0 } = {}) {
  const email = nextEmail();
  const { id, token } = await createBooking({
    slotId: slotIds[slotCursor++],
    email,
    companyName: 'Trigger Test Co',
    leaseMonths: trialMonths > 0 ? 12 : 1,
    trialMonths,
    siteSlug: 'nike',
  });
  if (creative) {
    await saveCreative(id, '/uploads/test/trigger-creative.png', 'trigger-creative.png');
    // saveCreative stages pending_approval; some callers need 'approved'.
    if (status === 'approved') {
      const d = db();
      d.prepare("UPDATE bookings SET status = 'approved' WHERE id = ?").run(id);
      d.close();
    }
  } else if (status !== 'pending_payment') {
    const d = db();
    d.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(status, id);
    d.close();
  }
  return { id, token, email };
}

function lastMail() {
  return sent[sent.length - 1];
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('approveApplication sends the payment-link mail with the Stripe checkout URL', async () => {
  const { id, email } = await makeBooking({ status: 'pending_application' });
  sent.length = 0;
  const result = await approveApplication(id, 'test-admin-token');
  assert.strictEqual(result.status, 'pending_payment');
  assert.strictEqual(sent.length, 1, 'exactly one mail');
  assert.strictEqual(lastMail().to[0], email);
  assert.match(lastMail().subject, /application for .+ is approved/i);
  assert.ok(
    lastMail().html.includes('https://checkout.stripe.com/email-triggers-mock'),
    'mail carries the checkout URL'
  );
});

test('approveBooking sends the publish-hint mail (approval is not publish)', async () => {
  const { id, email, token } = await makeBooking({ creative: true }); // → pending_approval
  sent.length = 0;
  const result = await approveBooking(id, null, 'test-admin-token');
  assert.strictEqual(result.status, 'approved');
  assert.strictEqual(sent.length, 1, 'exactly one mail');
  assert.strictEqual(lastMail().to[0], email);
  assert.match(lastMail().subject, /ad for .+ is approved/i);
  assert.match(lastMail().html, /until you publish/i, 'html explains nothing shows until publish');
  assert.ok(
    lastMail().html.includes('https://punicodex.com/account/'),
    'mail points at the advertiser panel'
  );
  assert.ok(
    lastMail().html.includes(`/nike/dashboard/?token=${token}`),
    'mail carries the dashboard snapshot link'
  );
  assert.ok(!/going live shortly/i.test(lastMail().html), 'no stale auto-live promise');
});

test('rejectBooking includes the admin reason in the mail', async () => {
  const { id, email } = await makeBooking({ creative: true });
  sent.length = 0;
  await rejectBooking(id, 'Low contrast against the temple theme', 'test-admin-token');
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(lastMail().to[0], email);
  assert.match(lastMail().subject, /needs changes/i);
  assert.ok(
    lastMail().html.includes('Low contrast against the temple theme'),
    'the rejection reason reaches the sponsor'
  );
});

test('rejectBooking without a note falls back to the default reason', async () => {
  const { id } = await makeBooking();
  sent.length = 0;
  await rejectBooking(id, undefined, 'test-admin-token');
  assert.strictEqual(sent.length, 1);
  assert.ok(lastMail().html.includes('Does not meet guidelines'), 'default reason present');
});

test('goLiveBooking on a paid lease sends notifyLive', async () => {
  const { id, email, token } = await makeBooking({ status: 'approved', creative: true });
  sent.length = 0;
  const result = await goLiveBooking(id, 'test-admin-token');
  assert.strictEqual(result.status, 'live');
  assert.strictEqual(result.trial, false);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(lastMail().to[0], email);
  assert.match(lastMail().subject, /now live on/i);
  assert.ok(lastMail().html.includes(`/nike/dashboard/?token=${token}`));
  assert.ok(!/free trial/i.test(lastMail().subject), 'no trial language on a paid go-live');
});

test('goLiveBooking on a trialing lease sends notifyTrialStarted instead', async () => {
  const { id, email } = await makeBooking({ status: 'approved', creative: true, trialMonths: 3 });
  sent.length = 0;
  const result = await goLiveBooking(id, 'test-admin-token');
  assert.strictEqual(result.status, 'live');
  assert.strictEqual(result.trial, true);
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(lastMail().to[0], email);
  assert.match(lastMail().subject, /3-month free trial .+ has started/i);
  assert.ok(!/now live on/i.test(lastMail().subject), 'trial go-live never sends the paid mail');
});

test('approveAndGoLive sends exactly ONE mail — the live notice, not the publish hint', async () => {
  const { id, email } = await makeBooking({ creative: true });
  sent.length = 0;
  const result = await approveAndGoLive(id, 'Reviewed in the queue', 'test-admin-token');
  assert.strictEqual(result.status, 'live');
  assert.strictEqual(sent.length, 1, 'the composite must send exactly one mail');
  assert.strictEqual(lastMail().to[0], email);
  assert.match(lastMail().subject, /now live on/i, 'the single mail is the go-live notice');
  assert.ok(!/is approved/i.test(lastMail().subject), 'no contradictory publish-hint mail');
});

test('approveBooking standalone still sends the publish-hint mail', async () => {
  const { id } = await makeBooking({ creative: true });
  sent.length = 0;
  await approveBooking(id, null, 'test-admin-token');
  assert.strictEqual(sent.length, 1);
  assert.match(lastMail().subject, /is approved/i);
  assert.match(lastMail().html, /until you publish/i, 'html explains nothing shows until publish');
});

test('sponsor publish (publishOwnBooking) sends notifyLive', async () => {
  const { id, email } = await makeBooking({ status: 'approved', creative: true });
  sent.length = 0;
  const result = await publishOwnBooking({ id: 1, email }, id);
  assert.strictEqual(result.status, 'live');
  assert.strictEqual(sent.length, 1);
  assert.match(lastMail().subject, /now live on/i);
});

test('pause sends NO email', async () => {
  const { id, email } = await makeBooking({ status: 'approved', creative: true });
  await goLive(id);
  sent.length = 0;
  const result = await pauseOwnBooking({ id: 1, email }, id);
  assert.strictEqual(result.status, 'approved');
  assert.strictEqual(sent.length, 0, 'pause must stay silent');
});

test('meta edit sends NO email', async () => {
  const { id, email } = await makeBooking({ status: 'approved', creative: true });
  sent.length = 0;
  await updateOwnBookingMeta({ id: 1, email }, id, { customHeading: 'Fresh heading' });
  assert.strictEqual(sent.length, 0, 'a copy edit re-enters review silently');
  const after = await getBookingById(id);
  assert.strictEqual(after.status, 'pending_approval', 'edit flipped the booking back to review');
});

test('endBookingAdmin sends the revocation notice', async () => {
  const { id, email } = await makeBooking({ status: 'approved', creative: true });
  await goLive(id);
  sent.length = 0;
  await endBookingAdmin(id, 'test-admin-token');
  assert.strictEqual(sent.length, 1);
  assert.strictEqual(lastMail().to[0], email);
  assert.match(lastMail().subject, /placement has ended/i);
});

async function run() {
  console.log('\n▸ Sponsorship Email Trigger Tests\n');
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
  console.log(`\nSponsorship Email Triggers: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
