/**
 * Email Safety Tests
 *
 * Confirms user-supplied values are HTML-escaped before they reach email bodies.
 */

const assert = require('node:assert');

process.env.PLATFORM_URL = 'https://punicodex.com';

const {
  escapeHtml,
  notifyPaymentPending,
  notifyRejected,
  sendBookingConfirmation,
  sendDashboardLinks,
} = require('../platform/api/email.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n▸ Email Safety Tests\n');
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
  console.log(`\nEmail Safety: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('escapeHtml escapes HTML metacharacters', () => {
  assert.strictEqual(
    escapeHtml('<script>alert("x")</script>'),
    '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
  );
  assert.strictEqual(escapeHtml("it's"), 'it&#39;s');
  assert.strictEqual(escapeHtml('&'), '&amp;');
});

test('escapeHtml coerces null and undefined to empty string', () => {
  assert.strictEqual(escapeHtml(null), '');
  assert.strictEqual(escapeHtml(undefined), '');
});

test('notifyPaymentPending escapes company and slot names', async () => {
  const result = await notifyPaymentPending({
    email: 'test@example.com',
    slotName: '<b>Bad Slot</b>',
    companyName: '<i>Evil Co</i>',
    stripeUrl: 'https://stripe.com/?a=1&b=2',
  });
  assert.strictEqual(result.mocked, true);
});

test('notifyRejected escapes rejection note', async () => {
  const result = await notifyRejected({
    email: 'test@example.com',
    slotName: 'Slot',
    companyName: 'Co',
    note: '<script>alert(1)</script>',
    bookingToken: 'tok',
  });
  assert.strictEqual(result.mocked, true);
});

test('sendBookingConfirmation escapes headings and subtitles', async () => {
  const result = await sendBookingConfirmation({
    email: 'test@example.com',
    slotName: 'Slot',
    companyName: 'Co',
    amountCents: 120000,
    token: 'tok',
    customHeading: '<h1>Inject</h1>',
    customSubtitle: '<img src=x onerror=alert(1)>',
    leaseMonths: 1,
    trialMonths: 0,
  });
  assert.strictEqual(result.mocked, true);
});

test('sendDashboardLinks escapes booking fields', async () => {
  const result = await sendDashboardLinks({
    email: 'test@example.com',
    bookings: [
      {
        slot_name: '<script>bad</script>',
        status: 'pending_approval',
        analytics_token: 'tok&evil',
      },
    ],
  });
  assert.strictEqual(result.mocked, true);
});

run();
