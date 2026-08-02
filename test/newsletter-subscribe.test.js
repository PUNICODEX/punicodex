/**
 * Newsletter subscribe endpoint tests.
 *
 * Covers validation, honeypot, per-IP rate limiting, dedup, phone optionality,
 * storage shape, and the best-effort welcome email (send failure must not fail
 * the subscription). Invokes the real Vercel handler with a mock req/res.
 */

const assert = require('node:assert');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

process.env.PUNICODEX_TEST_DB_PATH = path.join(os.tmpdir(), `newsletter-test-${process.pid}.db`);

// Capture outgoing email at the boundary.
const emailModulePath = require.resolve('../platform/api/email.js');
const realEmail = require(emailModulePath);
const sent = [];
let emailShouldThrow = false;
require.cache[emailModulePath].exports = {
  ...realEmail,
  sendEmail: async (msg) => {
    if (emailShouldThrow) throw new Error('resend down');
    sent.push(msg);
    return { success: true, mocked: true };
  },
};

const handler = require('../platform/api-handlers/root/newsletter/subscribe.js');

let passed = 0;
let failed = 0;
let ipCounter = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

function invoke(body, ip) {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage(null);
    req.method = 'POST';
    req.url = '/api/newsletter/subscribe/';
    req.headers = { 'x-forwarded-for': ip || `10.0.0.${++ipCounter}` };
    req.body = body;
    const res = new http.ServerResponse(req);
    let statusCode = 200;
    let responseBody = null;
    res.setHeader = () => {};
    res.status = (code) => {
      statusCode = code;
      return res;
    };
    res.json = (data) => {
      responseBody = data;
      resolve({ status: statusCode, body: responseBody });
    };
    res.end = () => resolve({ status: statusCode, body: responseBody });
    handler(req, res).catch(reject);
  });
}

async function run() {
  console.log('\n▸ Newsletter Subscribe Tests\n');

  // Direct table assertions run before any request triggers ensureDb().
  const { getDb } = require('../platform/db/connection.js');
  require('../platform/db/migrate-newsletter.js')(getDb());

  await test('rejects invalid email and oversized phone with 400', async () => {
    const bad = await invoke({ email: 'not-an-email' });
    assert.strictEqual(bad.status, 400);
    const shortPhone = await invoke({ email: 'a@b.co', phone: '123' });
    assert.strictEqual(shortPhone.status, 400);
  });

  await test('honeypot returns 200 silently and stores nothing', async () => {
    const res = await invoke({ _hp: 'spammy', email: 'bot@example.com' });
    assert.strictEqual(res.status, 200);
    const { getDb } = require('../platform/db/connection.js');
    const row = getDb()
      .prepare('SELECT id FROM newsletter_subscribers WHERE email = ?')
      .get('bot@example.com');
    assert.strictEqual(row, undefined);
  });

  await test('valid subscription stores normalized row and sends welcome email', async () => {
    const res = await invoke({
      email: '  Fan@Example.COM ',
      phone: '+61 400 123 456',
      source: 'test-suite',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    const { getDb } = require('../platform/db/connection.js');
    const row = getDb()
      .prepare('SELECT * FROM newsletter_subscribers WHERE email = ?')
      .get('fan@example.com');
    assert.ok(row, 'row must exist');
    assert.strictEqual(row.email, 'fan@example.com', 'email lowercased/trimmed');
    assert.strictEqual(row.phone, '+61 400 123 456');
    assert.strictEqual(row.source, 'test-suite');
    assert.strictEqual(row.confirmed, 1);
    assert.ok(row.ip_hash && row.ip_hash.length === 16, 'ip stored only as hash');
    assert.strictEqual(sent.length, 1);
    assert.strictEqual(sent[0].to, 'fan@example.com');
    assert.ok(sent[0].subject.includes('Herald'));
  });

  await test('duplicate subscription is idempotent and sends no second email', async () => {
    const before = sent.length;
    const res = await invoke({ email: 'fan@example.com' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.alreadySubscribed, true);
    assert.strictEqual(sent.length, before, 'no duplicate welcome email');
  });

  await test('welcome-email failure still returns ok (subscription is primary)', async () => {
    emailShouldThrow = true;
    const res = await invoke({ email: 'resilient@example.com' });
    emailShouldThrow = false;
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    const { getDb } = require('../platform/db/connection.js');
    assert.ok(
      getDb()
        .prepare('SELECT id FROM newsletter_subscribers WHERE email = ?')
        .get('resilient@example.com'),
      'row persisted despite email failure'
    );
  });

  await test('per-IP fixed-window rate limit kicks in at 5th request', async () => {
    const ip = '203.0.113.9';
    let last;
    for (let i = 0; i < 5; i++) {
      last = await invoke({ email: `rl${i}@example.com` }, ip);
    }
    assert.strictEqual(last.status, 429);
  });

  await test('GET is refused with 405', async () => {
    const res = await new Promise((resolve) => {
      const req = new http.IncomingMessage(null);
      req.method = 'GET';
      req.url = '/api/newsletter/subscribe/';
      req.headers = {};
      const res = new http.ServerResponse(req);
      let statusCode = 200;
      res.setHeader = () => {};
      res.status = (code) => {
        statusCode = code;
        return res;
      };
      res.json = (data) => resolve({ status: statusCode, body: data });
      res.end = () => resolve({ status: statusCode, body: null });
      handler(req, res);
    });
    assert.strictEqual(res.status, 405);
  });

  console.log(`\nNewsletter Subscribe: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
