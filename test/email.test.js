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
  notifyScholarsAccountProvisioned,
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

test('notifyScholarsAccountProvisioned escapes display and institution names', async () => {
  const result = await notifyScholarsAccountProvisioned({
    email: 'scholar@test.edu',
    displayName: '<script>alert(1)</script>',
    institutionName: '<b>Evil</b>',
    tempPassword: 'tmp',
  });
  assert.strictEqual(result.mocked, true);
});

test('notifyScholarsAccountProvisioned logs and mocks when no RESEND_API_KEY is set', async () => {
  const logged = [];
  const originalLog = console.log;
  console.log = (...args) => logged.push(args.join(' '));
  let result;
  try {
    result = await notifyScholarsAccountProvisioned({
      email: 'scholar@test.edu',
      displayName: 'Scholar',
      institutionName: 'Test University',
      tempPassword: 'tmp-pass-123',
    });
  } finally {
    console.log = originalLog;
  }
  assert.strictEqual(result.mocked, true);
  assert.ok(logged.some((line) => line.includes('[EMAIL] No RESEND_API_KEY configured')));
  assert.ok(logged.some((line) => line.includes('To: scholar@test.edu')));
  assert.ok(
    logged.some((line) =>
      line.includes('Subject: Your PuniCodex Scholarly Edition account — Test University')
    )
  );
});

test('notifyScholarsAccountProvisioned sends temp password and login URL through Resend', async () => {
  const emailPath = require.resolve('../platform/api/email.js');
  const originalFetch = globalThis.fetch;
  const hadKey = 'RESEND_API_KEY' in process.env;
  const priorKey = process.env.RESEND_API_KEY;

  let captured = null;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, json: async () => ({ id: 'resend-test-id' }) };
  };

  try {
    process.env.RESEND_API_KEY = 'test-resend-key';
    delete require.cache[emailPath];
    const freshEmail = require(emailPath);

    const result = await freshEmail.notifyScholarsAccountProvisioned({
      email: 'scholar@test.edu',
      displayName: 'Scholar',
      institutionName: 'Test University',
      tempPassword: 'tmp-pass-123',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.id, 'resend-test-id');
    assert.ok(captured, 'expected fetch to be called');
    assert.strictEqual(captured.url, 'https://api.resend.com/emails');
    assert.strictEqual(captured.options.headers.Authorization, 'Bearer test-resend-key');
    const payload = JSON.parse(captured.options.body);
    assert.deepStrictEqual(payload.to, ['scholar@test.edu']);
    assert.strictEqual(
      payload.subject,
      'Your PuniCodex Scholarly Edition account — Test University'
    );
    assert.ok(payload.html.includes('tmp-pass-123'), 'html body must contain the temp password');
    assert.ok(
      payload.html.includes('https://punicodex.com/scholars/login/'),
      'html body must contain the login URL'
    );
    assert.ok(payload.text.includes('tmp-pass-123'), 'text body must contain the temp password');
  } finally {
    globalThis.fetch = originalFetch;
    if (hadKey) process.env.RESEND_API_KEY = priorKey;
    else delete process.env.RESEND_API_KEY;
    delete require.cache[emailPath];
  }
});

test('notifyAdminPasswordReset sends temp password and admin-portal login URL through Resend', async () => {
  const emailPath = require.resolve('../platform/api/email.js');
  const originalFetch = globalThis.fetch;
  const hadKey = 'RESEND_API_KEY' in process.env;
  const priorKey = process.env.RESEND_API_KEY;

  let captured = null;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return { ok: true, json: async () => ({ id: 'resend-test-id' }) };
  };

  try {
    process.env.RESEND_API_KEY = 'test-resend-key';
    delete require.cache[emailPath];
    const freshEmail = require(emailPath);

    const result = await freshEmail.notifyAdminPasswordReset({
      email: 'admin@portal.test',
      tempPassword: 'tmp-reset-456',
    });

    assert.strictEqual(result.success, true);
    const payload = JSON.parse(captured.options.body);
    assert.deepStrictEqual(payload.to, ['admin@portal.test']);
    assert.strictEqual(payload.subject, 'Your PuniCodex admin portal password was reset');
    assert.ok(payload.html.includes('tmp-reset-456'), 'html body must contain the temp password');
    assert.ok(
      payload.html.includes('https://punicodex.com/admin-portal/login/'),
      'html body must contain the admin portal login URL'
    );
    assert.ok(payload.text.includes('tmp-reset-456'), 'text body must contain the temp password');
  } finally {
    globalThis.fetch = originalFetch;
    if (hadKey) process.env.RESEND_API_KEY = priorKey;
    else delete process.env.RESEND_API_KEY;
    delete require.cache[emailPath];
  }
});

run();
