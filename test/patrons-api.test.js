/**
 * Patrons API Tests (Vercel catch-all)
 *
 * Covers the /api/patrons serverless API: public patron wall shape, checkout
 * validation + trailing-slash variant, rate limits, admin subroutes, and
 * Stripe webhook patron activation through the raw-body HTTP handler.
 */

const assert = require('node:assert');
const http = require('node:http');

process.env.ADMIN_PASSWORD = 'test-patrons-admin-password';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.PLATFORM_URL = 'https://punycodex.com';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PUNYCODEX_BCRYPT_ROUNDS = '4';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock the Stripe SDK before the handlers load it.
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_patron_api',
          url: 'https://checkout.stripe.com/patron-api-mock',
          mode: config.mode || 'subscription',
        }),
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

const { invoke, adminHeader } = require('./helpers/http.js');
const { login: legacyAdminLogin } = require('../platform/api/admin.js');
const { createPatronCheckoutRecord, markPatronPaid } = require('../platform/api/patron-service.js');

const patronsHandler = require('../api/patrons/[[...slug]].js');
const webhookHandler = require('../api/webhook/index.js');

// The shared http.invoke harness never emits request body stream events, so
// the webhook handler (which reads the raw body) needs a raw-capable invoke.
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
  return `10.88.0.${ipCounter}`;
}

function publicHeaders() {
  return { 'x-forwarded-for': nextIp() };
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

async function runTests() {
  console.log('\n▸ Patrons API Tests\n');

  await test('GET /api/patrons/:templeId returns the empty wall shape', async () => {
    const res = await invoke(patronsHandler, 'GET', '/api/patrons/no-such-temple/', {
      headers: publicHeaders(),
      params: { slug: ['no-such-temple'] },
    });
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, {
      patrons: [],
      limit: 20,
      activeCount: 0,
      remaining: 20,
      isFull: false,
    });
  });

  await test('wall lists active patrons sorted by amount DESC, without emails', async () => {
    const low = await createPatronCheckoutRecord({
      templeId: 'wall-test',
      email: 'low@wall.test',
      displayName: 'Low Tier',
      title: 'Friend',
      message: 'Keep it up',
      amountCents: 500,
    });
    await markPatronPaid(low.id, 'sub_wall_low', 'cus_wall_low', 500);
    const high = await createPatronCheckoutRecord({
      templeId: 'wall-test',
      email: 'high@wall.test',
      displayName: 'High Tier',
      amountCents: 1000,
    });
    await markPatronPaid(high.id, 'sub_wall_high', 'cus_wall_high', 1000);
    // A pending patron must not appear on the wall.
    await createPatronCheckoutRecord({
      templeId: 'wall-test',
      email: 'pending@wall.test',
      displayName: 'Pending Patron',
      amountCents: 700,
    });

    const res = await invoke(patronsHandler, 'GET', '/api/patrons/wall-test/', {
      headers: publicHeaders(),
      params: { slug: ['wall-test'] },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.limit, 20);
    assert.strictEqual(res.body.activeCount, 2);
    assert.strictEqual(res.body.remaining, 18);
    assert.strictEqual(res.body.isFull, false);
    assert.strictEqual(res.body.patrons.length, 2);
    assert.strictEqual(res.body.patrons[0].display_name, 'High Tier');
    assert.strictEqual(res.body.patrons[0].amount_cents, 1000);
    assert.strictEqual(res.body.patrons[1].display_name, 'Low Tier');
    assert.strictEqual(res.body.patrons[0].email, undefined);
  });

  await test('POST /api/patrons/checkout creates a Stripe session', async () => {
    const res = await invoke(patronsHandler, 'POST', '/api/patrons/checkout', {
      headers: publicHeaders(),
      params: { slug: ['checkout'] },
      body: {
        templeId: 'checkout-test',
        email: 'buyer@checkout.test',
        displayName: 'Checkout Buyer',
        amountCents: 700,
      },
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.sessionUrl, 'https://checkout.stripe.com/patron-api-mock');
    assert.ok(res.body.sessionId);
    assert.ok(res.body.patronId);
  });

  await test('POST /api/patrons/checkout/ (trailing slash) also works', async () => {
    const res = await invoke(patronsHandler, 'POST', '/api/patrons/checkout/', {
      headers: publicHeaders(),
      params: { slug: ['checkout'] },
      body: {
        templeId: 'checkout-test',
        email: 'buyer2@checkout.test',
        displayName: 'Slash Buyer',
        amountCents: 700,
      },
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.sessionUrl);
  });

  await test('checkout validates templeId and email', async () => {
    const noTemple = await invoke(patronsHandler, 'POST', '/api/patrons/checkout/', {
      headers: publicHeaders(),
      params: { slug: ['checkout'] },
      body: { email: 'buyer@checkout.test', displayName: 'No Temple' },
    });
    assert.strictEqual(noTemple.status, 400);

    const badEmail = await invoke(patronsHandler, 'POST', '/api/patrons/checkout/', {
      headers: publicHeaders(),
      params: { slug: ['checkout'] },
      body: { templeId: 'checkout-test', email: 'not-an-email', displayName: 'Bad Email' },
    });
    assert.strictEqual(badEmail.status, 400);
  });

  await test('checkout is rate limited (public-strict: 5/min per IP)', async () => {
    const ip = nextIp();
    let last;
    for (let i = 0; i < 6; i++) {
      last = await invoke(patronsHandler, 'POST', '/api/patrons/checkout/', {
        headers: { 'x-forwarded-for': ip },
        params: { slug: ['checkout'] },
        body: { templeId: '', email: '', displayName: 'Rate Limited' },
      });
    }
    assert.strictEqual(last.status, 429);
    assert.ok(last.body.retryAfter >= 1);
    assert.ok(last.headers['retry-after']);
  });

  await test('patron wall reads are rate limited (public: 10/min per IP)', async () => {
    const ip = nextIp();
    let last;
    for (let i = 0; i < 11; i++) {
      last = await invoke(patronsHandler, 'GET', '/api/patrons/wall-test/', {
        headers: { 'x-forwarded-for': ip },
        params: { slug: ['wall-test'] },
      });
    }
    assert.strictEqual(last.status, 429);
  });

  // ── Admin subroutes ──────────────────────────────────────────
  let adminToken;
  await test('admin subroutes require an admin token', async () => {
    const list = await invoke(patronsHandler, 'GET', '/api/patrons/', {
      headers: publicHeaders(),
      params: { slug: [] },
    });
    assert.strictEqual(list.status, 401);

    const patch = await invoke(patronsHandler, 'PATCH', '/api/patrons/1', {
      headers: publicHeaders(),
      params: { slug: ['1'] },
      body: { status: 'cancelled' },
    });
    assert.strictEqual(patch.status, 401);

    adminToken = (await legacyAdminLogin(process.env.ADMIN_PASSWORD)).token;
    assert.ok(adminToken);
  });

  await test('GET /api/patrons lists patrons with filters (admin)', async () => {
    const res = await invoke(patronsHandler, 'GET', '/api/patrons/', {
      headers: { ...adminHeader(adminToken), 'x-forwarded-for': nextIp() },
      params: { slug: [] },
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.total >= 1);
    assert.ok(Array.isArray(res.body.items));

    const filtered = await invoke(
      patronsHandler,
      'GET',
      '/api/patrons/?temple=wall-test&status=active',
      {
        headers: { ...adminHeader(adminToken), 'x-forwarded-for': nextIp() },
        params: { slug: [] },
      }
    );
    assert.strictEqual(filtered.status, 200);
    assert.strictEqual(filtered.body.items.length, 2);
    assert.ok(filtered.body.items.every((p) => p.temple_id === 'wall-test'));

    const badStatus = await invoke(patronsHandler, 'GET', '/api/patrons/?status=frozen', {
      headers: { ...adminHeader(adminToken), 'x-forwarded-for': nextIp() },
      params: { slug: [] },
    });
    assert.strictEqual(badStatus.status, 400);
  });

  await test('PATCH /api/patrons/:id cancels and expires patrons (admin)', async () => {
    const target = await createPatronCheckoutRecord({
      templeId: 'admin-test',
      email: 'cancel@admin.test',
      displayName: 'Cancel Me',
      amountCents: 700,
    });
    await markPatronPaid(target.id, 'sub_admin_cancel', 'cus_admin_cancel', 700);

    const res = await invoke(patronsHandler, 'PATCH', `/api/patrons/${target.id}`, {
      headers: { ...adminHeader(adminToken), 'x-forwarded-for': nextIp() },
      params: { slug: [String(target.id)] },
      body: { status: 'cancelled' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.patron.status, 'cancelled');

    const badStatus = await invoke(patronsHandler, 'PATCH', `/api/patrons/${target.id}`, {
      headers: { ...adminHeader(adminToken), 'x-forwarded-for': nextIp() },
      params: { slug: [String(target.id)] },
      body: { status: 'active' },
    });
    assert.strictEqual(badStatus.status, 400);

    const missing = await invoke(patronsHandler, 'PATCH', '/api/patrons/999999', {
      headers: { ...adminHeader(adminToken), 'x-forwarded-for': nextIp() },
      params: { slug: ['999999'] },
      body: { status: 'expired' },
    });
    assert.strictEqual(missing.status, 404);
  });

  // ── Webhook patron activation ────────────────────────────────
  await test('webhook requires POST and a stripe-signature header', async () => {
    const get = await invokeRaw(webhookHandler, 'GET', '/api/webhook', {});
    assert.strictEqual(get.status, 405);

    const noSig = await invokeRaw(webhookHandler, 'POST', '/api/webhook', {
      rawBody: JSON.stringify({ type: 'checkout.session.completed', data: { object: {} } }),
    });
    assert.strictEqual(noSig.status, 400);
  });

  await test('checkout.session.completed activates the patron (raw-body handler)', async () => {
    const patron = await createPatronCheckoutRecord({
      templeId: 'webhook-test',
      email: 'hook@webhook.test',
      displayName: 'Webhook Patron',
      amountCents: 700,
    });

    const payload = JSON.stringify({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_hook_patron',
          mode: 'subscription',
          subscription: 'sub_hook_1',
          customer: 'cus_hook_1',
          amount_total: 700,
          metadata: { type: 'patron', patron_id: String(patron.id), temple_id: 'webhook-test' },
        },
      },
    });

    const res = await invokeRaw(webhookHandler, 'POST', '/api/webhook', {
      headers: { 'stripe-signature': 'sig_test' },
      rawBody: payload,
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.received, true);

    const wall = await invoke(patronsHandler, 'GET', '/api/patrons/webhook-test/', {
      headers: publicHeaders(),
      params: { slug: ['webhook-test'] },
    });
    assert.strictEqual(wall.body.activeCount, 1);
    assert.strictEqual(wall.body.patrons[0].display_name, 'Webhook Patron');
  });

  await test('customer.subscription.deleted cancels the patron', async () => {
    const payload = JSON.stringify({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_hook_1' } },
    });
    const res = await invokeRaw(webhookHandler, 'POST', '/api/webhook', {
      headers: { 'stripe-signature': 'sig_test' },
      rawBody: payload,
    });
    assert.strictEqual(res.status, 200);

    const wall = await invoke(patronsHandler, 'GET', '/api/patrons/webhook-test/', {
      headers: publicHeaders(),
      params: { slug: ['webhook-test'] },
    });
    assert.strictEqual(wall.body.activeCount, 0);
  });

  console.log('\nPatrons API: all tests passed');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
