/**
 * Membership Automation Tests
 *
 * Weekly sponsor/patron digests with ISO-week dedup, patron expiry
 * reminders, traffic-spike admin alerts (per-temple + site-wide, ratio +
 * floor), patron self-service cancellation (ownership, Stripe parity, the
 * /api/account route), and cron-secret enforcement on the new cron
 * endpoints. Email is captured at the sendEmail boundary and the Stripe SDK
 * is stubbed through the require cache before the services load.
 */

const assert = require('node:assert');

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.CRON_SECRET = 'test-membership-cron-secret';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
// Exercise the documented admin inbox fallback (punicodex@gmail.com).
delete process.env.ADMIN_EMAIL;

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Capture outbound email at the sendEmail boundary: every membership
// automation email routes through module.exports.sendEmail.
const sentEmails = [];
const emailModulePath = require.resolve('../platform/api/email.js');
const emailModule = require(emailModulePath);
emailModule.sendEmail = async (message) => {
  sentEmails.push(message);
  return { success: true, mocked: true };
};

// Stub the Stripe SDK before digest-service loads it.
const cancelledSubscriptions = [];
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    subscriptions: {
      cancel: async (id) => {
        cancelledSubscriptions.push(id);
        return { id, status: 'canceled' };
      },
    },
  }),
};

const { invoke } = require('./helpers/http.js');
const { getDb } = require('../platform/db/connection.js');
const { get, run } = require('../platform/db/operational.js');
const digestMigration = require('../platform/db/migrate-digest.js');
const digestService = require('../platform/api/digest-service.js');
const alertsService = require('../platform/api/alerts-service.js');
const tenantPortal = require('../platform/api/tenant-portal.js');
const { createBooking, setBookingStatus, recordEvent } = require('../platform/api/bookings.js');
const {
  createPatronCheckoutRecord,
  markPatronPaid,
  getPatronById,
} = require('../platform/api/patron-service.js');
const accountHandler = require('../api/account/[[...slug]].js');
const weeklyDigestCron = require('../api/cron/weekly-digest/index.js');
const spikeCheckCron = require('../api/cron/spike-check/index.js');
const patronExpiryCron = require('../api/cron/patron-expiry/index.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n▸ Membership Automation Tests\n');
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
  console.log(`\nMembership Automation: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// ── Shared fixtures (created lazily by the tests that need them) ──

const SPONSOR_EMAIL = 'digest-sponsor@example.com';
const PATRON_EMAIL = 'digest-patron@example.com';
const DIGEST_NOW = new Date();
let digestPatronId = null;

async function createLiveSponsorBooking() {
  const { id } = await createBooking({
    slotId: 2, // Victory Box I (nike) in the golden DB
    email: SPONSOR_EMAIL,
    companyName: 'Acme Analytics',
    leaseMonths: 1,
    siteSlug: 'nike',
  });
  await setBookingStatus(id, 'live');
  for (let i = 0; i < 2; i++) {
    await recordEvent({ bookingId: id, eventType: 'impression', userAgent: 'Mozilla/5.0' });
  }
  await recordEvent({ bookingId: id, eventType: 'click', userAgent: 'Mozilla/5.0' });
  return id;
}

async function createActivePatron({ email, displayName, subscriptionId, endsAt = null }) {
  const record = await createPatronCheckoutRecord({
    templeId: 'nike',
    email,
    displayName,
    amountCents: 700,
  });
  await markPatronPaid(record.id, subscriptionId, `cus_${record.id}`, 700);
  if (endsAt) {
    await run('UPDATE patrons SET ends_at = $1 WHERE id = $2', [endsAt.toISOString(), record.id]);
  }
  return record.id;
}

async function digestLogCount(kind) {
  const row = await get('SELECT COUNT(*) AS count FROM digest_log WHERE kind = $1', [kind]);
  return Number(row?.count ?? 0);
}

// ── Migration ──

test('migration creates the digest_log table', () => {
  digestMigration.migrate(getDb());
  const table = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'digest_log'")
    .get();
  assert.ok(table, 'digest_log table should exist');
  const columns = getDb()
    .prepare('PRAGMA table_info(digest_log)')
    .all()
    .map((c) => c.name);
  for (const col of ['kind', 'target', 'detail', 'sent_at']) {
    assert.ok(columns.includes(col), `digest_log should have column ${col}`);
  }
});

// ── Weekly digest ──

test('weekly digest emails the live sponsor and the active patron, logging both', async () => {
  await createLiveSponsorBooking();
  digestPatronId = await createActivePatron({
    email: PATRON_EMAIL,
    displayName: 'Ada Lovelace',
    subscriptionId: 'sub_digest_1',
  });

  sentEmails.length = 0;
  const result = await digestService.sendWeeklyDigest({ now: DIGEST_NOW });

  assert.strictEqual(result.sent, 2);
  assert.strictEqual(result.failed, 0);
  assert.strictEqual(sentEmails.length, 2);

  const recipients = sentEmails.map((m) => m.to).sort();
  assert.deepStrictEqual(recipients, [PATRON_EMAIL, SPONSOR_EMAIL].sort());
  for (const message of sentEmails) {
    assert.ok(message.subject.startsWith('Your week on PuniCodex'), 'digest subject prefix');
  }
  const sponsorMail = sentEmails.find((m) => m.to === SPONSOR_EMAIL);
  assert.ok(sponsorMail.subject.includes('Victory Box I'), 'sponsor subject names the slot');
  assert.ok(sponsorMail.html.includes('Victory Box I'), 'sponsor body names the slot');
  assert.ok(sponsorMail.html.includes('Viewability'), 'sponsor body has slot performance');
  assert.ok(sponsorMail.html.includes('Temple traffic'), 'sponsor body has temple traffic');
  const patronMail = sentEmails.find((m) => m.to === PATRON_EMAIL);
  assert.ok(patronMail.html.includes('Ada Lovelace'), 'patron body greets the patron');
  assert.ok(!patronMail.html.includes('Viewability'), 'patron body has no slot performance');

  assert.strictEqual(await digestLogCount('weekly-digest'), 2);
});

test('weekly digest dedups within the same ISO week', async () => {
  sentEmails.length = 0;
  const result = await digestService.sendWeeklyDigest({ now: DIGEST_NOW });
  assert.strictEqual(result.sent, 0);
  assert.strictEqual(result.skipped, 2);
  assert.strictEqual(sentEmails.length, 0);
  assert.strictEqual(await digestLogCount('weekly-digest'), 2);
});

// ── Expiry reminders ──

test('expiry reminder fires only within 7 days and respects dedup', async () => {
  const soon = new Date(DIGEST_NOW.getTime() + 3 * 86400000);
  const far = new Date(DIGEST_NOW.getTime() + 10 * 86400000);
  await createActivePatron({
    email: 'expiry-soon@example.com',
    displayName: 'Ending Soon',
    subscriptionId: 'sub_expiry_soon',
    endsAt: soon,
  });
  await createActivePatron({
    email: 'expiry-far@example.com',
    displayName: 'Ending Far',
    subscriptionId: 'sub_expiry_far',
    endsAt: far,
  });

  sentEmails.length = 0;
  const first = await digestService.sendExpiryReminders({ now: DIGEST_NOW });
  assert.strictEqual(first.sent, 1);
  assert.strictEqual(first.failed, 0);
  assert.strictEqual(sentEmails.length, 1);
  assert.strictEqual(sentEmails[0].to, 'expiry-soon@example.com');
  assert.ok(sentEmails[0].subject.includes('3 days'), 'subject carries the days left');
  assert.ok(sentEmails[0].html.includes('cancel anytime'), 'reminder notes cancel-anytime');

  const second = await digestService.sendExpiryReminders({ now: DIGEST_NOW });
  assert.strictEqual(second.sent, 0);
  assert.strictEqual(second.skipped, 1);
  assert.strictEqual(sentEmails.length, 1);
});

// ── Traffic spikes ──

const SPIKE_NOW = new Date('2027-01-15T05:43:00.000Z');

async function seedDailyViews(day, templeId, views) {
  await run(
    'INSERT INTO site_analytics_daily (day, temple_id, human_views, bot_views) VALUES ($1, $2, $3, 0)',
    [day, templeId, views]
  );
}

test('spike check alerts once per temple per day and stays silent below the ratio', async () => {
  // Trailing 7 days: nike 10/day, hermes 10/day, zeus 2/day, apollo 40/day.
  for (let i = 2; i <= 8; i++) {
    const day = new Date(SPIKE_NOW.getTime() - i * 86400000).toISOString().slice(0, 10);
    await seedDailyViews(day, 'nike', 10);
    await seedDailyViews(day, 'hermes', 10);
    await seedDailyViews(day, 'zeus', 2);
    await seedDailyViews(day, 'apollo', 40);
  }
  // Yesterday (2027-01-14): nike 3.3×+floor spike, hermes 2.5×, zeus above
  // ratio but below the 20-view floor, apollo flat.
  await seedDailyViews('2027-01-14', 'nike', 100);
  await seedDailyViews('2027-01-14', 'hermes', 25);
  await seedDailyViews('2027-01-14', 'zeus', 15);
  await seedDailyViews('2027-01-14', 'apollo', 40);

  sentEmails.length = 0;
  const first = await alertsService.runSpikeCheck({ now: SPIKE_NOW });
  assert.strictEqual(first.spiked, 1);
  assert.strictEqual(first.sent, 1);
  assert.strictEqual(sentEmails.length, 1);
  assert.strictEqual(sentEmails[0].to, 'punicodex@gmail.com');
  assert.ok(sentEmails[0].subject.includes('Traffic spike'), 'spike subject');
  assert.ok(sentEmails[0].subject.includes('100 views'), 'spike subject carries the count');

  const second = await alertsService.runSpikeCheck({ now: SPIKE_NOW });
  assert.strictEqual(second.sent, 0);
  assert.strictEqual(second.skipped, 1);
  assert.strictEqual(sentEmails.length, 1);
  assert.strictEqual(await digestLogCount('spike'), 1);
});

test('spike check also fires a site-wide alert', async () => {
  // A brand-new temple with 300 views on 2027-01-15: temple spike (no
  // history) and the site total clears 3× the trailing site average.
  await seedDailyViews('2027-01-15', 'athena', 300);

  sentEmails.length = 0;
  const result = await alertsService.runSpikeCheck({ now: new Date('2027-01-16T05:43:00.000Z') });
  assert.strictEqual(result.spiked, 2);
  assert.strictEqual(result.sent, 2);
  assert.strictEqual(sentEmails.length, 2);
  const subjects = sentEmails.map((m) => m.subject).join('\n');
  assert.ok(subjects.includes('Entire site'), 'site-wide spike alert fired');
  assert.strictEqual(await digestLogCount('spike'), 3);
});

// ── Patron cancellation (service) ──

test('cancelPatron rejects the wrong owner, unknown ids, and non-active rows', async () => {
  await assert.rejects(
    digestService.cancelPatron({ patronId: digestPatronId, email: 'nope@example.com' }),
    (err) => err.status === 403
  );
  await assert.rejects(
    digestService.cancelPatron({ patronId: 999999, email: PATRON_EMAIL }),
    (err) => err.status === 404
  );
  await assert.rejects(
    digestService.cancelPatron({ patronId: 'abc', email: PATRON_EMAIL }),
    (err) => err.status === 400
  );
});

test('cancelPatron cancels Stripe, flips status, and confirms by email', async () => {
  sentEmails.length = 0;
  const result = await digestService.cancelPatron({
    patronId: digestPatronId,
    email: PATRON_EMAIL,
  });
  assert.deepStrictEqual(result, { ok: true, status: 'cancelled' });
  assert.ok(cancelledSubscriptions.includes('sub_digest_1'), 'Stripe subscription cancelled');
  const patron = await getPatronById(digestPatronId);
  assert.strictEqual(patron.status, 'cancelled');
  assert.ok(patron.ends_at, 'ends_at recorded');
  assert.strictEqual(sentEmails.length, 1);
  assert.strictEqual(sentEmails[0].to, PATRON_EMAIL);
  assert.ok(sentEmails[0].subject.includes('cancelled'), 'confirmation subject');

  await assert.rejects(
    digestService.cancelPatron({ patronId: digestPatronId, email: PATRON_EMAIL }),
    (err) => err.status === 400
  );
});

// ── Patron cancellation (account route) ──

test('account cancel route rejects unauthenticated requests', async () => {
  const res = await invoke(accountHandler, 'POST', '/api/account/patrons/1/cancel', {
    params: { slug: ['patrons', '1', 'cancel'] },
  });
  assert.strictEqual(res.status, 401);
});

test('account cancel route cancels for the authenticated owner only', async () => {
  const routePatronId = await createActivePatron({
    email: 'route-patron@example.com',
    displayName: 'Route Patron',
    subscriptionId: 'sub_route_1',
  });
  const otherPatronId = await createActivePatron({
    email: 'other-patron@example.com',
    displayName: 'Other Patron',
    subscriptionId: 'sub_route_2',
  });

  const { token: setupToken } = await tenantPortal.provisionTenantAccount(
    'route-patron@example.com',
    { kind: 'patron' }
  );
  const { token: session } = await tenantPortal.setPassword({
    token: setupToken,
    password: 'test-password-123',
  });
  const headers = { authorization: `Bearer ${session}` };

  const forbidden = await invoke(
    accountHandler,
    'POST',
    `/api/account/patrons/${otherPatronId}/cancel`,
    { headers, params: { slug: ['patrons', String(otherPatronId), 'cancel'] } }
  );
  assert.strictEqual(forbidden.status, 403);

  const res = await invoke(accountHandler, 'POST', `/api/account/patrons/${routePatronId}/cancel`, {
    headers,
    params: { slug: ['patrons', String(routePatronId), 'cancel'] },
  });
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { ok: true, status: 'cancelled' });
  assert.ok(cancelledSubscriptions.includes('sub_route_1'), 'Stripe subscription cancelled');
  assert.strictEqual((await getPatronById(routePatronId)).status, 'cancelled');
  assert.strictEqual((await getPatronById(otherPatronId)).status, 'active');
});

// ── Cron endpoints ──

test('cron endpoints reject requests without the cron secret', async () => {
  for (const [name, handler] of [
    ['weekly-digest', weeklyDigestCron],
    ['spike-check', spikeCheckCron],
    ['patron-expiry', patronExpiryCron],
  ]) {
    const res = await invoke(handler, 'GET', `/api/cron/${name}`);
    assert.strictEqual(res.status, 401, `${name} should require the cron secret`);
  }
});

test('spike-check cron runs clean for a day with no spikes', async () => {
  sentEmails.length = 0;
  const res = await invoke(spikeCheckCron, 'GET', '/api/cron/spike-check', {
    headers: { 'x-cron-secret': process.env.CRON_SECRET },
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.spiked, 0);
  assert.strictEqual(sentEmails.length, 0);
});

runTests();
