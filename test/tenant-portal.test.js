/**
 * Tenant Portal Tests
 *
 * Full lifecycle of the sponsor/patron self-service portal:
 * provisioning on Stripe activation (raw-body webhook), one-time
 * set-password tokens, login/logout/revocation, ownership scoping,
 * analytics exactness, the change-request approval queue (admin applies
 * the change to the real record), role gating, and validation errors.
 */

const assert = require('node:assert');
const http = require('node:http');

process.env.ADMIN_PASSWORD = 'test-tenant-portal-admin-password';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock the Stripe SDK before the webhook handler loads it.
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async () => ({
          id: 'cs_test_tenant_mock',
          url: 'https://checkout.stripe.com/tenant-mock',
        }),
        retrieve: async () => ({ payment_status: 'unpaid' }),
      },
    },
    webhooks: {
      constructEvent: (payload) => {
        if (typeof payload === 'string') return JSON.parse(payload);
        return JSON.parse(payload.toString('utf8'));
      },
    },
  }),
};

const { invoke } = require('./helpers/http.js');
const tenantPortal = require('../platform/api/tenant-portal.js');
const portalAuth = require('../platform/api/admin-portal-auth.js');
const {
  createBooking,
  updateBookingStripeSession,
  setBookingStatus,
  getBookingById,
  recordEvent,
} = require('../platform/api/bookings.js');
const {
  createPatronCheckoutRecord,
  markPatronPaid,
  getPatronById,
} = require('../platform/api/patron-service.js');
const { run } = require('../platform/db/operational.js');

const accountHandler = require('../api/account/[[...slug]].js');
const webhookHandler = require('../api/webhook/index.js');
const adminListHandler = require('../platform/api-handlers/admin/portal/tenant-requests/index.js');
const adminApproveHandler = require('../platform/api-handlers/admin/portal/tenant-requests/[id]/approve/index.js');
const adminRejectHandler = require('../platform/api-handlers/admin/portal/tenant-requests/[id]/reject/index.js');

// Raw-body invoke for the webhook handler (same rationale as patrons-api tests).
function invokeRaw(handler, method, url, { headers = {}, rawBody } = {}) {
  return new Promise((resolve) => {
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = headers;
    req.query = {};

    const res = new http.ServerResponse(req);
    let statusCode = 200;
    const responseHeaders = {};
    let responseBody = null;
    let ended = false;

    res.setHeader = (name, value) => {
      responseHeaders[name.toLowerCase()] = String(value);
      return res;
    };
    res.status = (code) => {
      statusCode = code;
      return res;
    };
    res.json = (data) => {
      responseBody = data;
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody, headers: responseHeaders });
      }
    };
    res.end = () => {
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody, headers: responseHeaders });
      }
    };

    const result = handler(req, res);
    if (result && typeof result.then === 'function') {
      result.catch((err) => {
        if (!ended) {
          ended = true;
          resolve({ status: 500, body: { error: err.message }, headers: responseHeaders });
        }
      });
    }

    if (rawBody !== undefined) {
      process.nextTick(() => {
        req.emit('data', Buffer.from(rawBody));
        req.emit('end');
      });
    }
  });
}

let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `10.99.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}

function ipHeaders() {
  return { 'x-forwarded-for': nextIp() };
}

function bearerHeaders(token) {
  return { authorization: `Bearer ${token}`, 'x-forwarded-for': nextIp() };
}

// 1×1 transparent PNG (ratio 1.0 — passes the 600×600 slot aspect check).
const PNG_1X1 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const HUMAN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0';
const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
    process.exit(1);
  }
}

// ── Shared fixtures ────────────────────────────────────────
const SPONSOR_A = 'sponsor-a@tenant.test';
const PATRON_A = 'patron-a@tenant.test';
const SPONSOR_B = 'sponsor-b@tenant.test';
const WEBHOOK_SPONSOR = 'hook-sponsor@tenant.test';
const WEBHOOK_PATRON = 'hook-patron@tenant.test';

let bookingA; // sponsor A: nike slot 2 (600×600), status live
let bookingB; // sponsor B: hermes slot, status live
let patronA; // patron A: active on temple 'nike'
let tokenA; // session for sponsor A
let tokenB; // session for sponsor B
let tokenPatronA; // session for patron A
let superToken;
let opsToken;
let viewerToken;

async function createLiveBooking(slotId, email) {
  const { id } = await createBooking({ slotId, email, companyName: 'Tenant Test Co' });
  await setBookingStatus(id, 'live');
  return getBookingById(id);
}

async function loginAs(email, password) {
  const res = await invoke(accountHandler, 'POST', '/api/account/auth/login/', {
    headers: ipHeaders(),
    params: { slug: ['auth', 'login'] },
    body: { email, password },
  });
  assert.strictEqual(res.status, 200, `login for ${email}: ${JSON.stringify(res.body)}`);
  return res.body.token;
}

async function runTests() {
  console.log('\n▸ Tenant Portal Tests\n');

  // ── Provisioning ─────────────────────────────────────────
  await test('booking payment webhook provisions a sponsor tenant account', async () => {
    const { id } = await createBooking({ slotId: 1, email: WEBHOOK_SPONSOR });
    await updateBookingStripeSession(id, 'cs_tenant_hook_booking');
    const payload = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_tenant_hook_booking',
          mode: 'payment',
          payment_intent: 'pi_tenant_hook',
          amount_total: 75000,
          metadata: { type: 'booking', booking_id: String(id) },
        },
      },
    });
    const res = await invokeRaw(webhookHandler, 'POST', '/api/webhook', {
      headers: { 'stripe-signature': 'sig_test' },
      rawBody: payload,
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));

    const account = await tenantPortal.getAccountByEmail(WEBHOOK_SPONSOR);
    assert.ok(account, 'tenant account created for the booking contact email');
    assert.strictEqual(account.is_sponsor, 1);
    assert.strictEqual(
      account.password_hash,
      null,
      'password stays unset until the setup link is used'
    );
  });

  await test('patron payment webhook provisions a patron tenant account', async () => {
    const patron = await createPatronCheckoutRecord({
      templeId: 'nike',
      email: WEBHOOK_PATRON,
      displayName: 'Webhook Patron',
      amountCents: 700,
    });
    const payload = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_tenant_hook_patron',
          mode: 'subscription',
          subscription: 'sub_tenant_hook',
          customer: 'cus_tenant_hook',
          amount_total: 700,
          metadata: { type: 'patron', patron_id: String(patron.id), temple_id: 'nike' },
        },
      },
    });
    const res = await invokeRaw(webhookHandler, 'POST', '/api/webhook', {
      headers: { 'stripe-signature': 'sig_test' },
      rawBody: payload,
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));

    const account = await tenantPortal.getAccountByEmail(WEBHOOK_PATRON);
    assert.ok(account, 'tenant account created for the patron email');
    assert.strictEqual(account.is_patron, 1);
  });

  await test('provisioning is idempotent and emails a token only until password is set', async () => {
    const first = await tenantPortal.provisionTenantAccount(SPONSOR_A, { kind: 'sponsor' });
    assert.ok(first.created);
    assert.ok(first.token, 'first provisioning issues a set-password token');
    const second = await tenantPortal.provisionTenantAccount(SPONSOR_A, { kind: 'sponsor' });
    assert.ok(!second.created);
    assert.ok(second.token, 'still no password → fresh token');
  });

  // ── Set-password / login / logout ────────────────────────
  let provisionA;
  await test('set-password activates the account and returns a session', async () => {
    bookingA = await createLiveBooking(2, SPONSOR_A);
    provisionA = await tenantPortal.provisionTenantAccount(SPONSOR_A, { kind: 'sponsor' });

    const res = await invoke(accountHandler, 'POST', '/api/account/auth/set-password/', {
      headers: ipHeaders(),
      params: { slug: ['auth', 'set-password'] },
      body: { token: provisionA.token, password: 'correct-horse-9' },
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.token);
    assert.strictEqual(res.body.account.email, SPONSOR_A);
    assert.strictEqual(res.body.account.hasPassword, true);
    tokenA = res.body.token;
  });

  await test('set-password token is single-use', async () => {
    const res = await invoke(accountHandler, 'POST', '/api/account/auth/set-password/', {
      headers: ipHeaders(),
      params: { slug: ['auth', 'set-password'] },
      body: { token: provisionA.token, password: 'another-password-1' },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'invalid_token');
  });

  await test('expired set-password tokens are rejected', async () => {
    const expired = await tenantPortal.issueToken(provisionA.account.id, 'set_password');
    await run("UPDATE tenant_tokens SET expires_at = '2000-01-01T00:00:00.000Z' WHERE token = ?", [
      require('node:crypto').createHash('sha256').update(expired).digest('hex'),
    ]);
    const res = await invoke(accountHandler, 'POST', '/api/account/auth/set-password/', {
      headers: ipHeaders(),
      params: { slug: ['auth', 'set-password'] },
      body: { token: expired, password: 'whatever-pass-1' },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.code, 'invalid_token');
  });

  await test('login uses generic errors and succeeds with valid credentials', async () => {
    const wrong = await invoke(accountHandler, 'POST', '/api/account/auth/login/', {
      headers: ipHeaders(),
      params: { slug: ['auth', 'login'] },
      body: { email: SPONSOR_A, password: 'not-the-password' },
    });
    assert.strictEqual(wrong.status, 401);
    assert.strictEqual(wrong.body.error, 'Invalid email or password');

    const unknown = await invoke(accountHandler, 'POST', '/api/account/auth/login/', {
      headers: ipHeaders(),
      params: { slug: ['auth', 'login'] },
      body: { email: 'nobody@tenant.test', password: 'not-the-password' },
    });
    assert.strictEqual(unknown.status, 401);
    assert.strictEqual(unknown.body.error, wrong.body.error, 'identical generic error');

    tokenA = await loginAs(SPONSOR_A, 'correct-horse-9');
    assert.ok(tokenA);
  });

  await test('GET /me returns the profile and owned resources only', async () => {
    const res = await invoke(accountHandler, 'GET', '/api/account/me/', {
      headers: bearerHeaders(tokenA),
      params: { slug: ['me'] },
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.account.email, SPONSOR_A);
    assert.strictEqual(res.body.account.isSponsor, true);
    assert.strictEqual(res.body.resources.bookings.length, 1);
    assert.strictEqual(res.body.resources.bookings[0].id, bookingA.id);
    assert.strictEqual(res.body.resources.bookings[0].slotName, bookingA.slot_name);
  });

  await test('logout revokes the session immediately', async () => {
    const tempToken = await loginAs(SPONSOR_A, 'correct-horse-9');
    const out = await invoke(accountHandler, 'POST', '/api/account/auth/logout/', {
      headers: bearerHeaders(tempToken),
      params: { slug: ['auth', 'logout'] },
      body: {},
    });
    assert.strictEqual(out.status, 200);
    const me = await invoke(accountHandler, 'GET', '/api/account/me/', {
      headers: bearerHeaders(tempToken),
      params: { slug: ['me'] },
    });
    assert.strictEqual(me.status, 401);
  });

  await test('disabled accounts lose access on the next request', async () => {
    const tempToken = await loginAs(SPONSOR_A, 'correct-horse-9');
    await run("UPDATE tenant_accounts SET status = 'disabled' WHERE email = ?", [SPONSOR_A]);
    const me = await invoke(accountHandler, 'GET', '/api/account/me/', {
      headers: bearerHeaders(tempToken),
      params: { slug: ['me'] },
    });
    assert.strictEqual(me.status, 401);
    await run("UPDATE tenant_accounts SET status = 'active' WHERE email = ?", [SPONSOR_A]);
  });

  await test('forgot always succeeds and reset tokens redeem like set-password', async () => {
    const res = await invoke(accountHandler, 'POST', '/api/account/auth/forgot/', {
      headers: ipHeaders(),
      params: { slug: ['auth', 'forgot'] },
      body: { email: SPONSOR_A },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message.includes('If an account exists'));

    const unknown = await invoke(accountHandler, 'POST', '/api/account/auth/forgot/', {
      headers: ipHeaders(),
      params: { slug: ['auth', 'forgot'] },
      body: { email: 'nobody@tenant.test' },
    });
    assert.strictEqual(unknown.status, 200);
    assert.strictEqual(unknown.body.message, res.body.message);

    const resetToken = await tenantPortal.issueToken(provisionA.account.id, 'reset');
    const set = await invoke(accountHandler, 'POST', '/api/account/auth/set-password/', {
      headers: ipHeaders(),
      params: { slug: ['auth', 'set-password'] },
      body: { token: resetToken, password: 'reset-password-7' },
    });
    assert.strictEqual(set.status, 200, JSON.stringify(set.body));
    tokenA = await loginAs(SPONSOR_A, 'reset-password-7');
  });

  // ── Second account + scoping ─────────────────────────────
  await test('account B cannot read or change account A resources', async () => {
    bookingB = await createLiveBooking(3, SPONSOR_B);
    const provisionB = await tenantPortal.provisionTenantAccount(SPONSOR_B, { kind: 'sponsor' });
    const setB = await invoke(accountHandler, 'POST', '/api/account/auth/set-password/', {
      headers: ipHeaders(),
      params: { slug: ['auth', 'set-password'] },
      body: { token: provisionB.token, password: 'b-password-123' },
    });
    tokenB = setB.body.token;

    // B reads analytics for a temple neither account owns → 403
    const temple = await invoke(accountHandler, 'GET', '/api/account/analytics/temple/apollon/', {
      headers: bearerHeaders(tokenB),
      params: { slug: ['analytics', 'temple', 'apollon'] },
    });
    assert.strictEqual(temple.status, 403);

    // B requests a creative swap on A's booking
    const reqRes = await invoke(accountHandler, 'POST', '/api/account/requests/', {
      headers: bearerHeaders(tokenB),
      params: { slug: ['requests'] },
      body: { type: 'image', target: bookingA.id, payload: { image: PNG_1X1, filename: 'x.png' } },
    });
    assert.strictEqual(reqRes.status, 403);

    // B requests social-link changes on A's patron spot
    patronA = await createPatronCheckoutRecord({
      templeId: 'nike',
      email: PATRON_A,
      displayName: 'Patron A',
      amountCents: 700,
    });
    await markPatronPaid(patronA.id, 'sub_patron_a', 'cus_patron_a', 700);
    const linkRes = await invoke(accountHandler, 'POST', '/api/account/requests/', {
      headers: bearerHeaders(tokenB),
      params: { slug: ['requests'] },
      body: {
        type: 'social_links',
        target: patronA.id,
        payload: { socialPlatform: 'github', socialUrl: 'https://github.com/someone' },
      },
    });
    assert.strictEqual(linkRes.status, 403);

    // B's own space analytics show only B's booking
    const space = await invoke(accountHandler, 'GET', '/api/account/analytics/space/', {
      headers: bearerHeaders(tokenB),
      params: { slug: ['analytics', 'space'] },
    });
    assert.strictEqual(space.status, 200);
    assert.strictEqual(space.body.slots.length, 1);
    assert.strictEqual(space.body.slots[0].bookingId, bookingB.id);
  });

  // ── Analytics exactness ──────────────────────────────────
  await test('space analytics return exact event counts and zeros when empty', async () => {
    for (let i = 0; i < 5; i++) {
      await recordEvent({
        bookingId: bookingA.id,
        eventType: 'impression',
        ip: `1.1.1.${i}`,
        userAgent: HUMAN_UA,
      });
    }
    for (let i = 0; i < 2; i++) {
      await recordEvent({
        bookingId: bookingA.id,
        eventType: 'click',
        ip: `2.2.2.${i}`,
        userAgent: HUMAN_UA,
      });
    }
    await recordEvent({
      bookingId: bookingA.id,
      eventType: 'impression',
      ip: '3.3.3.3',
      userAgent: BOT_UA,
    });

    const res = await invoke(accountHandler, 'GET', '/api/account/analytics/space/', {
      headers: bearerHeaders(tokenA),
      params: { slug: ['analytics', 'space'] },
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    const slot = res.body.slots.find((s) => s.bookingId === bookingA.id);
    assert.ok(slot);
    assert.strictEqual(slot.impressions, 5, 'bot impressions are excluded');
    assert.strictEqual(slot.clicks, 2);
    assert.strictEqual(slot.ctr, ((2 / 5) * 100).toFixed(2));
    assert.ok(Array.isArray(slot.daily));
    const todayImpressions = slot.daily.reduce((sum, d) => sum + d.impressions, 0);
    assert.strictEqual(todayImpressions, 5);

    const empty = res.body.slots.length === 1; // A owns one booking
    assert.ok(empty);
    const emptyB = await invoke(accountHandler, 'GET', '/api/account/analytics/space/', {
      headers: bearerHeaders(tokenB),
      params: { slug: ['analytics', 'space'] },
    });
    assert.strictEqual(emptyB.body.slots[0].impressions, 0);
    assert.strictEqual(emptyB.body.slots[0].clicks, 0);
    assert.strictEqual(emptyB.body.slots[0].ctr, '0.00');
    assert.deepStrictEqual(emptyB.body.slots[0].daily, []);
  });

  await test('patron spots report zeros with tracking: none (never fabricated)', async () => {
    const provisionP = await tenantPortal.provisionTenantAccount(PATRON_A, { kind: 'patron' });
    const setP = await invoke(accountHandler, 'POST', '/api/account/auth/set-password/', {
      headers: ipHeaders(),
      params: { slug: ['auth', 'set-password'] },
      body: { token: provisionP.token, password: 'patron-pass-9' },
    });
    tokenPatronA = setP.body.token;

    const res = await invoke(accountHandler, 'GET', '/api/account/analytics/space/', {
      headers: bearerHeaders(tokenPatronA),
      params: { slug: ['analytics', 'space'] },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.patrons.length, 1);
    assert.strictEqual(res.body.patrons[0].tracking, 'none');
    assert.strictEqual(res.body.patrons[0].impressions, 0);
  });

  await test('temple analytics are served to owners and site analytics are aggregate', async () => {
    const temple = await invoke(accountHandler, 'GET', '/api/account/analytics/temple/nike/', {
      headers: bearerHeaders(tokenA),
      params: { slug: ['analytics', 'temple', 'nike'] },
    });
    assert.strictEqual(temple.status, 200, JSON.stringify(temple.body));
    assert.strictEqual(temple.body.templeId, 'nike');
    assert.ok(temple.body.totals);
    assert.ok(Array.isArray(temple.body.byDay));

    const invalid = await invoke(accountHandler, 'GET', '/api/account/analytics/temple/Nope_Id!/', {
      headers: bearerHeaders(tokenA),
      params: { slug: ['analytics', 'temple', 'Nope_Id!'] },
    });
    assert.strictEqual(invalid.status, 400);

    const site = await invoke(accountHandler, 'GET', '/api/account/analytics/site/', {
      headers: bearerHeaders(tokenA),
      params: { slug: ['analytics', 'site'] },
    });
    assert.strictEqual(site.status, 200, JSON.stringify(site.body));
    assert.ok(site.body.totals);
    assert.ok(site.body.content.entries > 0, 'lexicon counts present');
    assert.strictEqual(typeof site.body.totals.humanViews, 'number');
  });

  // ── Change requests ──────────────────────────────────────
  let imageRequestId;
  await test('sponsor creates an image change request (staged, pending)', async () => {
    const res = await invoke(accountHandler, 'POST', '/api/account/requests/', {
      headers: bearerHeaders(tokenA),
      params: { slug: ['requests'] },
      body: {
        type: 'image',
        target: bookingA.id,
        payload: { image: PNG_1X1, filename: 'new-creative.png' },
      },
    });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
    assert.strictEqual(res.body.request.status, 'pending');
    assert.strictEqual(res.body.request.targetKind, 'booking');
    assert.ok(res.body.request.payload.creativePath.startsWith('/uploads/tenant-requests/'));
    imageRequestId = res.body.request.id;

    const list = await invoke(accountHandler, 'GET', '/api/account/requests/', {
      headers: bearerHeaders(tokenA),
      params: { slug: ['requests'] },
    });
    assert.strictEqual(list.status, 200);
    assert.strictEqual(list.body.items.length, 1);
    assert.strictEqual(list.body.items[0].id, imageRequestId);
  });

  await test('request validation rejects bad payloads', async () => {
    const badType = await invoke(accountHandler, 'POST', '/api/account/requests/', {
      headers: bearerHeaders(tokenA),
      params: { slug: ['requests'] },
      body: { type: 'rename', target: bookingA.id, payload: {} },
    });
    assert.strictEqual(badType.status, 400);

    const badImage = await invoke(accountHandler, 'POST', '/api/account/requests/', {
      headers: bearerHeaders(tokenA),
      params: { slug: ['requests'] },
      body: {
        type: 'image',
        target: bookingA.id,
        payload: { image: 'not-a-data-uri', filename: 'x.png' },
      },
    });
    assert.strictEqual(badImage.status, 400);

    const missing = await invoke(accountHandler, 'POST', '/api/account/requests/', {
      headers: bearerHeaders(tokenA),
      params: { slug: ['requests'] },
      body: { type: 'image', target: 999999, payload: { image: PNG_1X1, filename: 'x.png' } },
    });
    assert.strictEqual(missing.status, 404);

    const badLinks = await invoke(accountHandler, 'POST', '/api/account/requests/', {
      headers: bearerHeaders(tokenPatronA),
      params: { slug: ['requests'] },
      body: {
        type: 'social_links',
        target: patronA.id,
        payload: { socialPlatform: 'github', socialUrl: 'http://insecure.example.com' },
      },
    });
    assert.strictEqual(badLinks.status, 400);
  });

  // ── Admin approval queue ─────────────────────────────────
  await test('admin queue enforces portal auth and role gating', async () => {
    const noAuth = await invoke(adminListHandler, 'GET', '/api/admin/portal/tenant-requests/', {
      headers: ipHeaders(),
    });
    assert.strictEqual(noAuth.status, 401);

    const superLogin = await portalAuth.login('admin@punicodex.com', process.env.ADMIN_PASSWORD);
    assert.ok(superLogin.success, JSON.stringify(superLogin));
    superToken = superLogin.token;

    await portalAuth.createUser(
      { email: 'viewer@tenant.test', password: 'viewer-pass-123', role: 'viewer' },
      { user: superLogin.user }
    );
    const viewerLogin = await portalAuth.login('viewer@tenant.test', 'viewer-pass-123');
    viewerToken = viewerLogin.token;

    await portalAuth.createUser(
      { email: 'ops@tenant.test', password: 'ops-pass-12345', role: 'ops' },
      { user: superLogin.user }
    );
    const opsLogin = await portalAuth.login('ops@tenant.test', 'ops-pass-12345');
    opsToken = opsLogin.token;

    const viewer = await invoke(adminListHandler, 'GET', '/api/admin/portal/tenant-requests/', {
      headers: { 'x-admin-token': viewerToken, 'x-forwarded-for': nextIp() },
    });
    assert.strictEqual(viewer.status, 403);

    const viewerApprove = await invoke(
      adminApproveHandler,
      'POST',
      `/api/admin/portal/tenant-requests/${imageRequestId}/approve/`,
      {
        headers: { 'x-admin-token': viewerToken, 'x-forwarded-for': nextIp() },
        params: { id: String(imageRequestId) },
        body: {},
      }
    );
    assert.strictEqual(viewerApprove.status, 403);

    await portalAuth.createUser(
      { email: 'leasing@tenant.test', password: 'leasing-pass-1', role: 'leasing' },
      { user: superLogin.user }
    );
    const leasingLogin = await portalAuth.login('leasing@tenant.test', 'leasing-pass-1');
    const leasingList = await invoke(
      adminListHandler,
      'GET',
      '/api/admin/portal/tenant-requests/',
      {
        headers: { 'x-admin-token': leasingLogin.token, 'x-forwarded-for': nextIp() },
      }
    );
    assert.strictEqual(leasingList.status, 403, 'leasing role has no ops permission');

    const opsList = await invoke(adminListHandler, 'GET', '/api/admin/portal/tenant-requests/', {
      headers: { 'x-admin-token': opsToken, 'x-forwarded-for': nextIp() },
    });
    assert.strictEqual(opsList.status, 200, 'ops role may review the queue');
  });

  await test('superadmin lists the pending queue with account + target context', async () => {
    const res = await invoke(adminListHandler, 'GET', '/api/admin/portal/tenant-requests/', {
      headers: { 'x-admin-token': superToken, 'x-forwarded-for': nextIp() },
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.total >= 1);
    const item = res.body.items.find((i) => i.id === imageRequestId);
    assert.ok(item);
    assert.strictEqual(item.accountEmail, SPONSOR_A);
    assert.strictEqual(item.target.slot_name, bookingA.slot_name);
  });

  await test('approval applies the creative swap to the real booking', async () => {
    const res = await invoke(
      adminApproveHandler,
      'POST',
      `/api/admin/portal/tenant-requests/${imageRequestId}/approve/`,
      {
        headers: { 'x-admin-token': superToken, 'x-forwarded-for': nextIp() },
        params: { id: String(imageRequestId) },
        body: { note: 'Looks good' },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.request.status, 'approved');
    assert.strictEqual(res.body.request.reviewerNote, 'Looks good');
    assert.ok(res.body.request.reviewedAt);
    assert.ok(res.body.request.reviewedBy, 'reviewed_by recorded');

    const updated = await getBookingById(bookingA.id);
    assert.ok(
      updated.creative_path.startsWith('/uploads/tenant-requests/'),
      `creative_path now points at the staged file: ${updated.creative_path}`
    );
    assert.strictEqual(updated.creative_original_name, 'new-creative.png');
    assert.strictEqual(updated.status, 'live', 'live booking stays live');
  });

  await test('double review is rejected with 409', async () => {
    const res = await invoke(
      adminApproveHandler,
      'POST',
      `/api/admin/portal/tenant-requests/${imageRequestId}/approve/`,
      {
        headers: { 'x-admin-token': superToken, 'x-forwarded-for': nextIp() },
        params: { id: String(imageRequestId) },
        body: {},
      }
    );
    assert.strictEqual(res.status, 409);
  });

  await test('rejection leaves the target record untouched', async () => {
    const create = await invoke(accountHandler, 'POST', '/api/account/requests/', {
      headers: bearerHeaders(tokenA),
      params: { slug: ['requests'] },
      body: {
        type: 'image',
        target: bookingA.id,
        payload: { image: PNG_1X1, filename: 'second.png' },
      },
    });
    const requestId = create.body.request.id;
    const before = await getBookingById(bookingA.id);

    const res = await invoke(
      adminRejectHandler,
      'POST',
      `/api/admin/portal/tenant-requests/${requestId}/reject/`,
      {
        headers: { 'x-admin-token': superToken, 'x-forwarded-for': nextIp() },
        params: { id: String(requestId) },
        body: { note: 'Off-brand colors' },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.request.status, 'rejected');
    assert.strictEqual(res.body.request.reviewerNote, 'Off-brand colors');

    const after = await getBookingById(bookingA.id);
    assert.strictEqual(after.creative_path, before.creative_path);
    assert.strictEqual(after.creative_original_name, before.creative_original_name);
  });

  await test('patron social-link approval updates the patron row', async () => {
    const create = await invoke(accountHandler, 'POST', '/api/account/requests/', {
      headers: bearerHeaders(tokenPatronA),
      params: { slug: ['requests'] },
      body: {
        type: 'social_links',
        target: patronA.id,
        payload: { socialPlatform: 'github', socialUrl: 'https://github.com/patron-a' },
      },
    });
    assert.strictEqual(create.status, 201, JSON.stringify(create.body));
    const requestId = create.body.request.id;

    const res = await invoke(
      adminApproveHandler,
      'POST',
      `/api/admin/portal/tenant-requests/${requestId}/approve/`,
      {
        headers: { 'x-admin-token': superToken, 'x-forwarded-for': nextIp() },
        params: { id: String(requestId) },
        body: {},
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));

    const patron = await getPatronById(patronA.id);
    assert.strictEqual(patron.social_platform, 'github');
    assert.strictEqual(patron.social_url, 'https://github.com/patron-a');
  });

  await test('audit trail recorded the reviews', async () => {
    const { all } = require('../platform/db/operational.js');
    const rows = await all(
      "SELECT * FROM admin_actions WHERE action LIKE 'portal.tenant-request.%' ORDER BY id ASC"
    );
    assert.ok(rows.length >= 3, `expected ≥3 audit rows, got ${rows.length}`);
    assert.ok(rows.some((r) => r.action === 'portal.tenant-request.approve'));
    assert.ok(rows.some((r) => r.action === 'portal.tenant-request.reject'));
  });

  console.log('\nTenant Portal: all tests passed');
}

runTests()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => {
    // Best-effort cleanup of staged creative files written into the repo's
    // uploads tree by image change requests (mirrors booking-upload storage).
    try {
      require('node:fs').rmSync(
        require('node:path').join(
          __dirname,
          '..',
          'platform',
          'api',
          'public',
          'uploads',
          'tenant-requests'
        ),
        { recursive: true, force: true }
      );
    } catch {
      /* best effort */
    }
  });
