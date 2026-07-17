/**
 * Security Hardening Tests
 *
 * Regression coverage for the 2026-07 security audit fixes:
 *  - rate limiting on previously unauthenticated write endpoints
 *    (crawl/events, gamification, agents, workspace)
 *  - priority clamping + payload validation on the public crawl-event webhook
 *  - generic 500 bodies in production (no internal error leakage)
 *  - async (Redis-backed when configured, in-memory otherwise) scholars
 *    login credential-stuffing limiter
 *  - hashed-at-rest email verification codes with constant-time comparison
 *
 * Runs fully offline: no network, no Redis, mocked Stripe and email.
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-admin-password-for-ci';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock stripe SDK before booking-service loads.
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: (/* secretKey */) => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_mock',
          url: 'https://checkout.stripe.com/mock',
          mode: config.mode || 'payment',
        }),
      },
    },
  }),
};

// Capture verification codes at the email boundary. Codes are stored hashed
// in the DB, so tests observe them where they are delivered: the email.
const emailModulePath = require.resolve('../platform/api/email.js');
const realEmail = require(emailModulePath);
const deliveredCodes = new Map();
require.cache[emailModulePath].exports = {
  ...realEmail,
  sendVerificationCode: async ({ email, code }) => {
    deliveredCodes.set(email, code);
    return { success: true, mocked: true };
  },
};

const { invoke, jsonBody } = require('./helpers/http.js');
const { resetLimiters } = require('../platform/api/api-rate-limiter.js');
const crawlEventsHandler = require('../api/crawl/events/index.js');
const gamificationHandler = require('../api/gamification/index.js');
const agentsHandler = require('../api/agents/index.js');
const workspaceHandler = require('../api/workspace/index.js');
const bookingService = require('../platform/api/booking-service.js');
const { handleError } = require('../api/_utils.js');
const { handleApiError } = require('../platform/api/api-response.js');
const { createLoginRateLimit } = require('../platform/scholars/security.js');

const SESSION_HEADER = { 'x-session-token': 'sec-hardening-session' };

function postJson(body) {
  return { body, headers: { 'content-type': 'application/json', ...SESSION_HEADER } };
}

function mockRes() {
  const res = { headers: {}, statusCode: 200, body: undefined };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.setHeader = (k, v) => {
    res.headers[k] = v;
  };
  res.json = (data) => {
    res.body = data;
    return res;
  };
  return res;
}

// handleError/handleApiError log the full error server-side; silence that
// expected noise while exercising them.
async function withSilencedConsole(fn) {
  const original = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = original;
  }
}

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n▸ Security Hardening Tests\n');
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
  console.log(`\nSecurity Hardening: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

// ── HIGH 1: crawl/events ────────────────────────────────────────────────

test('crawl/events POST allows 10 requests then returns 429', async () => {
  resetLimiters();
  const payload = { source: 'webhook', domain: 'xn--ratelimit-test.com' };
  for (let i = 0; i < 10; i++) {
    const res = await invoke(crawlEventsHandler, 'POST', '/api/crawl/events', jsonBody(payload));
    assert.strictEqual(res.status, 202, `request ${i + 1} should be accepted`);
  }
  const res = await invoke(crawlEventsHandler, 'POST', '/api/crawl/events', jsonBody(payload));
  assert.strictEqual(res.status, 429);
  assert.ok(res.body.retryAfter >= 1);
  assert.ok(res.headers['retry-after']);
  assert.strictEqual(res.headers['x-ratelimit-limit'], '10');
});

test('crawl/events clamps priority into the 1-10 range', async () => {
  resetLimiters();
  const high = await invoke(
    crawlEventsHandler,
    'POST',
    '/api/crawl/events',
    jsonBody({ source: 'webhook', domain: 'xn--prio-high.com', priority: 999 })
  );
  assert.strictEqual(high.status, 202);
  const low = await invoke(
    crawlEventsHandler,
    'POST',
    '/api/crawl/events',
    jsonBody({ source: 'webhook', domain: 'xn--prio-low.com', priority: -50 })
  );
  assert.strictEqual(low.status, 202);
  const db = new Database(getTestDbPath(__filename));
  const highRow = db.prepare('SELECT priority FROM crawl_events WHERE id = ?').get(high.body.id);
  const lowRow = db.prepare('SELECT priority FROM crawl_events WHERE id = ?').get(low.body.id);
  db.close();
  assert.strictEqual(highRow.priority, 10);
  assert.strictEqual(lowRow.priority, 1);
});

test('crawl/events defaults priority to 5 when omitted', async () => {
  resetLimiters();
  const res = await invoke(
    crawlEventsHandler,
    'POST',
    '/api/crawl/events',
    jsonBody({ source: 'webhook', domain: 'xn--prio-default.com' })
  );
  assert.strictEqual(res.status, 202);
  const db = new Database(getTestDbPath(__filename));
  const row = db.prepare('SELECT priority FROM crawl_events WHERE id = ?').get(res.body.id);
  db.close();
  assert.strictEqual(row.priority, 5);
});

test('crawl/events rejects malformed payloads with 400', async () => {
  resetLimiters();
  const cases = [
    { source: 'webhook', domain: 'example.com', priority: 'urgent' },
    { source: 'webhook' },
    { source: 'webhook', domain: 42 },
    { domain: 'example.com' },
    ['not', 'an', 'object'],
  ];
  for (const body of cases) {
    const res = await invoke(crawlEventsHandler, 'POST', '/api/crawl/events', jsonBody(body));
    assert.strictEqual(res.status, 400, `expected 400 for ${JSON.stringify(body)}`);
  }
});

// ── HIGH 2: anonymous-session write endpoints ───────────────────────────

test('gamification POST is rate limited after 10 writes; GET is unaffected', async () => {
  resetLimiters();
  const opts = postJson({ action: 'xp', eventType: 'search', payload: { query: 'zeus' } });
  for (let i = 0; i < 10; i++) {
    const res = await invoke(gamificationHandler, 'POST', '/api/gamification', opts);
    assert.strictEqual(res.status, 200, `request ${i + 1} should be accepted`);
  }
  const blocked = await invoke(gamificationHandler, 'POST', '/api/gamification', opts);
  assert.strictEqual(blocked.status, 429);
  const get = await invoke(gamificationHandler, 'GET', '/api/gamification', {
    headers: SESSION_HEADER,
  });
  assert.strictEqual(get.status, 200);
});

test('agents POST uses the stricter 5/min bucket', async () => {
  resetLimiters();
  const opts = postJson({ topic: 'Zeus' });
  for (let i = 0; i < 5; i++) {
    const res = await invoke(agentsHandler, 'POST', '/api/agents?agent=research', opts);
    assert.strictEqual(res.status, 200, `request ${i + 1} should be accepted`);
  }
  const blocked = await invoke(agentsHandler, 'POST', '/api/agents?agent=research', opts);
  assert.strictEqual(blocked.status, 429);
  assert.strictEqual(blocked.headers['x-ratelimit-limit'], '5');
});

test('agents sentinel rejects a non-numeric batchSize with 400', async () => {
  resetLimiters();
  const res = await invoke(
    agentsHandler,
    'POST',
    '/api/agents?agent=sentinel',
    postJson({ batchSize: 'abc' })
  );
  assert.strictEqual(res.status, 400);
});

test('workspace POST, PATCH and DELETE share one 10/min write bucket', async () => {
  resetLimiters();
  const opts = postJson({ action: 'timeline', eventType: 'sec_hardening_test' });
  for (let i = 0; i < 10; i++) {
    const res = await invoke(workspaceHandler, 'POST', '/api/workspace', opts);
    assert.strictEqual(res.status, 200, `request ${i + 1} should be accepted`);
  }
  const postBlocked = await invoke(workspaceHandler, 'POST', '/api/workspace', opts);
  assert.strictEqual(postBlocked.status, 429);
  const patchBlocked = await invoke(
    workspaceHandler,
    'PATCH',
    '/api/workspace',
    postJson({ id: 1, updates: { note: 'x' } })
  );
  assert.strictEqual(patchBlocked.status, 429);
  const deleteBlocked = await invoke(
    workspaceHandler,
    'DELETE',
    '/api/workspace',
    postJson({ id: 1 })
  );
  assert.strictEqual(deleteBlocked.status, 429);
});

// ── MED 3: scholars login credential-stuffing limiter ───────────────────

test('scholars login limiter blocks the 11th attempt for one IP+email', async () => {
  const middleware = createLoginRateLimit();
  const email = 'login-limit@example.com';
  let nextCalls = 0;
  const next = () => {
    nextCalls++;
  };
  for (let i = 0; i < 10; i++) {
    const res = mockRes();
    await middleware({ body: { email }, headers: {} }, res, next);
    assert.strictEqual(res.statusCode, 200, `attempt ${i + 1} should pass through`);
  }
  const blocked = mockRes();
  await middleware({ body: { email }, headers: {} }, blocked, next);
  assert.strictEqual(blocked.statusCode, 429);
  assert.strictEqual(blocked.body.success, false);
  assert.strictEqual(nextCalls, 10);
});

test('scholars login limiter honors the PUNICODEX_SCHOLARS_DISABLE_RATE_LIMIT escape hatch', async () => {
  process.env.PUNICODEX_SCHOLARS_DISABLE_RATE_LIMIT = '1';
  try {
    const middleware = createLoginRateLimit();
    let nextCalls = 0;
    const res = mockRes();
    await middleware({ body: { email: 'escape@example.com' }, headers: {} }, res, () => {
      nextCalls++;
    });
    assert.strictEqual(nextCalls, 1);
    assert.strictEqual(res.headers['X-RateLimit-Limit'], undefined);
  } finally {
    delete process.env.PUNICODEX_SCHOLARS_DISABLE_RATE_LIMIT;
  }
});

// ── MED 4: generic 500 bodies in production ─────────────────────────────

test('handleError leaks the internal message outside production', async () => {
  await withSilencedConsole(() => {
    const res = mockRes();
    handleError(res, new Error('detailed internal cause'));
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body.error, 'detailed internal cause');
  });
});

test('handleError returns a generic 500 body when NODE_ENV=production', async () => {
  process.env.NODE_ENV = 'production';
  try {
    await withSilencedConsole(() => {
      const res = mockRes();
      handleError(res, new Error('sensitive db path /var/lib/punicodex.db'));
      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body.error, 'Internal server error');
    });
  } finally {
    delete process.env.NODE_ENV;
  }
});

test('handleError returns a generic 500 body when VERCEL is set', async () => {
  process.env.VERCEL = '1';
  try {
    await withSilencedConsole(() => {
      const res = mockRes();
      handleError(res, new Error('sensitive detail'));
      assert.strictEqual(res.body.error, 'Internal server error');
    });
  } finally {
    delete process.env.VERCEL;
  }
});

test('handleApiError returns a generic 500 body when NODE_ENV=production', async () => {
  process.env.NODE_ENV = 'production';
  try {
    await withSilencedConsole(() => {
      const res = mockRes();
      handleApiError(res, new Error('sensitive detail'));
      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.body.success, false);
      assert.strictEqual(res.body.error.code, 'INTERNAL_ERROR');
      assert.strictEqual(res.body.error.message, 'Internal server error');
    });
  } finally {
    delete process.env.NODE_ENV;
  }
});

// ── LOW 5: hashed email verification codes ──────────────────────────────

test('verification codes are hashed at rest and accepted exactly once', async () => {
  const email = 'sec-hardening-verify@example.com';
  await bookingService.sendVerification(email);
  const delivered = deliveredCodes.get(email);
  assert.ok(/^\d{6}$/.test(delivered), 'delivered code should be 6 digits');

  const db = new Database(getTestDbPath(__filename));
  const stored = db.prepare('SELECT code FROM email_verifications WHERE email = ?').get(email);
  db.close();
  assert.notStrictEqual(stored.code, delivered, 'code must not be stored in plaintext');
  assert.strictEqual(
    stored.code,
    crypto.createHash('sha256').update(delivered).digest('hex'),
    'stored value should be the sha256 hash of the delivered code'
  );

  await assert.rejects(bookingService.checkVerification(email, '000000'), (err) => {
    assert.strictEqual(err.status, 400);
    return true;
  });

  const ok = await bookingService.checkVerification(email, delivered);
  assert.strictEqual(ok.verified, true);
  assert.ok(ok.verificationToken);

  // Codes are single-use: the row is deleted after a successful check.
  await assert.rejects(bookingService.checkVerification(email, delivered), (err) => {
    assert.strictEqual(err.status, 400);
    return true;
  });
});

run();
