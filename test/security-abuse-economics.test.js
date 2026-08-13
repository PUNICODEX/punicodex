/**
 * Abuse Economics Tests
 *
 * Abuse-of-function simulation: oracles, enumeration, floods, and free-resource
 * amplification. Asserts the system gives attackers nothing to work with —
 * uniform responses, no existence oracles, working rate limits.
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');

process.env.ADMIN_PASSWORD = 'test-abuse-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: { sessions: { create: async () => ({ id: 'cs_abuse', url: 'https://x.test' }) } },
    webhooks: { constructEvent: (p) => JSON.parse(typeof p === 'string' ? p : p.toString('utf8')) },
  }),
};

const { invoke } = require('./helpers/http.js');
const discountService = require('../platform/api/discount-service.js');
const bookingService = require('../platform/api/booking-service.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('discount validate gives the same answer for nonexistent, inactive, and exhausted codes', async () => {
  const inactive = await discountService.createCode(
    { code: 'ORACLE-OFF', kind: 'percent_off', percent: 10, appliesTo: 'nike' },
    null
  );
  await discountService.setCodeActive(inactive.id, false, null);
  const exhausted = await discountService.createCode(
    { code: 'ORACLE-SPENT', kind: 'percent_off', percent: 10, maxUses: 1, appliesTo: 'nike' },
    null
  );
  await discountService.redeem({
    codeId: exhausted.id,
    bookingId: 990001,
    email: 'spent@example.com',
    originalCents: 1000,
    finalCents: 900,
  });

  const validateHandler = require('../platform/api-handlers/root/discount/validate/index.js');
  const reasons = new Set();
  for (const code of ['NO-SUCH-CODE', 'ORACLE-OFF', 'ORACLE-SPENT']) {
    const res = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
      headers: { 'x-forwarded-for': '192.0.2.10' },
      body: { code, temple: 'nike', leaseMonths: 1 },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.valid, false);
    reasons.add(res.body.reason);
  }
  assert.strictEqual(reasons.size, 1, `oracle leak: reasons differ ${[...reasons]}`);
  assert.strictEqual([...reasons][0], 'invalid_code');
});

test('booking recovery never reveals whether an email has bookings', async () => {
  const resultA = await bookingService.recoverBookings('has-none@example.com');
  const d = db();
  const hasBooking = d
    .prepare("SELECT COUNT(*) c FROM bookings WHERE email = 'recover-probe@example.com'")
    .get().c;
  d.close();
  const resultB = await bookingService.recoverBookings('recover-probe@example.com');
  assert.deepStrictEqual(
    Object.keys(resultA).sort(),
    Object.keys(resultB).sort(),
    'response shape is identical whether or not bookings exist'
  );
  assert.notStrictEqual(
    JSON.stringify(resultA).includes('true'),
    hasBooking > 0 && JSON.stringify(resultB).includes('false'),
    'no existence boolean flip'
  );
  assert.deepStrictEqual(resultA, resultB, 'byte-identical response = no enumeration oracle');
});

test('CSP report collector floods hit the rate limit', async () => {
  const handler = require('../platform/api-handlers/root/security/csp-report/index.js');
  const report = JSON.stringify({
    'csp-report': { 'document-uri': 'https://punicodex.com/x', 'violated-directive': 'script-src' },
  });
  let saw429 = false;
  for (let i = 0; i < 40; i++) {
    const res = await invoke(handler, 'POST', '/api/security/csp-report/', {
      headers: { 'content-type': 'application/csp-report', 'x-forwarded-for': '192.0.2.99' },
      rawBody: report,
    });
    if (res.status === 429) {
      saw429 = true;
      break;
    }
  }
  assert.ok(saw429, 'collector must rate-limit a flood from one IP');
});

test('CSP report with a lying Content-Length / oversized body is refused at 413', async () => {
  const handler = require('../platform/api-handlers/root/security/csp-report/index.js');
  const big = JSON.stringify({ 'csp-report': { 'document-uri': `/sites/${'a'.repeat(20000)}/` } });
  const res = await invoke(handler, 'POST', '/api/security/csp-report/', {
    headers: { 'content-type': 'application/csp-report', 'x-forwarded-for': '192.0.2.100' },
    rawBody: big,
  });
  assert.strictEqual(res.status, 413);
});

test('free-resource amplification: booking creation requires a verified email session', async () => {
  const { getIndividualSlotIds } = require('./helpers/slots.js');
  const slotId = getIndividualSlotIds(__filename, 'nike')[0];
  await assert.rejects(
    () =>
      bookingService.createBookingRequest({
        slotId,
        email: 'unverified@example.com',
        companyName: 'No Verification Co',
        leaseMonths: 1,
        siteSlug: 'nike',
      }),
    (err) => [400, 401, 403].includes(err.status || err.statusCode),
    'unverified email must not create a booking (reservation spam)'
  );
});

test('redemption cannot be replayed beyond max_uses even concurrently', async () => {
  const code = await discountService.createCode(
    { code: 'RACE-ME', kind: 'percent_off', percent: 50, maxUses: 1, appliesTo: 'nike' },
    null
  );
  const attempts = await Promise.allSettled(
    [0, 1, 2, 3].map((i) =>
      discountService.redeem({
        codeId: code.id,
        bookingId: 991000 + i,
        email: `race${i}@example.com`,
        originalCents: 1000,
        finalCents: 500,
      })
    )
  );
  const succeeded = attempts.filter((a) => a.status === 'fulfilled').length;
  assert.strictEqual(succeeded, 1, `exactly one redemption may win the race, got ${succeeded}`);
  const after = await discountService.getCodeById(code.id);
  assert.strictEqual(after.used_count, 1);
});

async function run() {
  console.log('\n▸ Abuse Economics Tests\n');
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }
  console.log(`\nAbuse Economics: ${tests.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
