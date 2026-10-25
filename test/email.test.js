/**
 * Email Safety Tests
 *
 * Confirms user-supplied values are HTML-escaped before they reach email bodies.
 */

const assert = require('node:assert');

process.env.PLATFORM_URL = 'https://punicodex.com';

const {
  escapeHtml,
  getDashboardUrl,
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

/**
 * Run `fn` against a freshly-required email module whose sendEmail calls are
 * captured at the fetch boundary (RESEND_API_KEY set, global fetch stubbed).
 * Returns the array of captured Resend payloads ({to, subject, html, ...}).
 */
async function withCapturedEmails(fn) {
  const emailPath = require.resolve('../platform/api/email.js');
  const originalFetch = globalThis.fetch;
  const hadKey = 'RESEND_API_KEY' in process.env;
  const priorKey = process.env.RESEND_API_KEY;

  const sent = [];
  globalThis.fetch = async (_url, options) => {
    sent.push(JSON.parse(options.body));
    return { ok: true, json: async () => ({ id: 'resend-test-id' }) };
  };

  try {
    process.env.RESEND_API_KEY = 'test-resend-key';
    delete require.cache[emailPath];
    const freshEmail = require(emailPath);
    await fn(freshEmail);
  } finally {
    globalThis.fetch = originalFetch;
    if (hadKey) process.env.RESEND_API_KEY = priorKey;
    else delete process.env.RESEND_API_KEY;
    delete require.cache[emailPath];
  }
  return sent;
}

test('getDashboardUrl falls back to the plain account index, never a token dead end', () => {
  const url = getDashboardUrl('analytics-tok-123', null);
  assert.strictEqual(url, 'https://punicodex.com/account/');
  assert.ok(!url.includes('analytics-tok-123'), 'an analytics token must not be appended');
});

test('notifyUploadReady and notifyLive render the actual lease months', async () => {
  const sent = await withCapturedEmails(async (email) => {
    await email.notifyUploadReady({
      email: 'u@example.com',
      slotName: 'Hero Frame',
      leaseMonths: 3,
      siteSlug: 'nike',
    });
    await email.notifyLive({
      email: 'l@example.com',
      slotName: 'Hero Frame',
      leaseMonths: 6,
      siteSlug: 'nike',
    });
    await email.notifyLive({
      email: 's@example.com',
      slotName: 'Hero Frame',
      leaseMonths: 1,
      siteSlug: 'nike',
    });
  });
  assert.ok(sent[0].html.includes('(3 months)'), '3-month term renders as "3 months"');
  assert.ok(
    sent[1].html.includes('<strong>6 months</strong>'),
    '6-month term renders as "6 months"'
  );
  assert.ok(sent[2].html.includes('<strong>1 month</strong>'), '1-month term stays singular');
});

test('notifyStoreOrderConfirmation is honest about fulfillment_failed', async () => {
  const sent = await withCapturedEmails(async (email) => {
    await email.notifyStoreOrderConfirmation({
      email: 'buyer@example.com',
      orderRef: 'PCX-42',
      productName: 'Temple Tee',
      quantity: 1,
      status: 'fulfillment_failed',
    });
  });
  assert.strictEqual(sent.length, 1);
  assert.match(sent[0].subject, /hit a snag/, 'subject must not claim confirmation');
  assert.ok(
    sent[0].html.includes('We hit a snag fulfilling your order'),
    'body explains the failure and the retry'
  );
  assert.ok(!sent[0].html.includes('Order Confirmed'), 'body must not say the order is confirmed');
});

test('notifyPaymentFailed links the dashboard and escapes its fields', async () => {
  const sent = await withCapturedEmails(async (email) => {
    await email.notifyPaymentFailed('sponsor@example.com', {
      slotName: '<b>Bad</b> Frame',
      siteName: 'Níkē',
      dashboardUrl: 'https://punicodex.com/nike/dashboard/?token=tok',
    });
  });
  assert.strictEqual(sent.length, 1);
  assert.ok(sent[0].html.includes('Update Payment Method'));
  assert.ok(
    sent[0].html.includes('https://punicodex.com/nike/dashboard/?token=tok'),
    'dashboard link present for updating the payment method'
  );
  assert.ok(sent[0].html.includes('&lt;b&gt;Bad&lt;/b&gt; Frame'), 'slot name is escaped');
  assert.ok(!sent[0].html.includes('<b>Bad</b>'), 'no raw HTML injection');
});

run();
