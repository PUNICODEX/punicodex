/**
 * Careers endpoint tests.
 *
 * Covers role validation, dual honeypot fields, per-IP rate limiting, HTML
 * escaping of user content in the outgoing email, SQLite persistence with a
 * hashed IP, and method gating. Invokes the real Vercel handler with a mock
 * req/res against an isolated database file.
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

process.env.PUNICODEX_TEST_DB_PATH = path.join(os.tmpdir(), `careers-test-${process.pid}.db`);

// Capture outgoing email at the boundary.
const emailModulePath = require.resolve('../platform/api/email.js');
const realEmail = require(emailModulePath);
const sent = [];
require.cache[emailModulePath].exports = {
  ...realEmail,
  sendEmail: async (msg) => {
    sent.push(msg);
    return { success: true, mocked: true };
  },
};

const handler = require('../api/careers/apply/index.js');
const { getDb } = require('../platform/db/connection.js');

// Direct table assertions run before any request triggers ensureDb().
require('../platform/db/migrate-careers.js').migrate(getDb());

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

function invoke(body, ip, method = 'POST') {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = '/api/careers/apply/';
    req.headers = { 'x-forwarded-for': ip || `10.3.0.${++ipCounter}` };
    req.body = body;
    const res = new http.ServerResponse(req);
    let statusCode = 200;
    res.setHeader = () => {};
    res.status = (code) => {
      statusCode = code;
      return res;
    };
    res.json = (data) => resolve({ status: statusCode, body: data });
    res.end = () => resolve({ status: statusCode, body: null });
    handler(req, res).catch(reject);
  });
}

const VALID = {
  role: 'social-media-marketer',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  links: 'https://example.com/portfolio',
  message: 'I have grown three accounts past 100k and I can prove it.',
};

function applicationCount(email) {
  return getDb().prepare('SELECT COUNT(*) AS n FROM career_applications WHERE email = ?').get(email)
    .n;
}

async function run() {
  console.log('\n▸ Careers Endpoint Tests\n');

  await test('OPTIONS preflight returns 204', async () => {
    const res = await invoke(null, undefined, 'OPTIONS');
    assert.strictEqual(res.status, 204);
  });

  await test('GET is refused with 405', async () => {
    const res = await invoke(null, undefined, 'GET');
    assert.strictEqual(res.status, 405);
  });

  await test('honeypot fields return 200 silently — no email, no row', async () => {
    const before = sent.length;
    for (const body of [
      { ...VALID, _hp: 'x' },
      { ...VALID, company: 'spam inc' },
    ]) {
      const res = await invoke(body);
      assert.strictEqual(res.status, 200);
    }
    assert.strictEqual(sent.length, before, 'no email for honeypot hits');
    assert.strictEqual(applicationCount(VALID.email), 0, 'no row for honeypot hits');
  });

  await test('unknown or missing role is refused with 400', async () => {
    const bad = await invoke({ ...VALID, role: 'chief-vibes-officer' });
    assert.strictEqual(bad.status, 400);
    const missing = await invoke({ ...VALID, role: undefined });
    assert.strictEqual(missing.status, 400);
  });

  await test('missing name/email/message are refused with 400', async () => {
    for (const body of [
      { ...VALID, name: '' },
      { ...VALID, name: undefined },
      { ...VALID, email: undefined },
      { ...VALID, message: undefined },
    ]) {
      const res = await invoke(body);
      assert.strictEqual(res.status, 400, JSON.stringify(body));
    }
  });

  await test('message under 20 characters is refused with 400', async () => {
    const res = await invoke({ ...VALID, message: 'too short' });
    assert.strictEqual(res.status, 400);
  });

  await test('invalid email is refused with 400', async () => {
    const res = await invoke({ ...VALID, email: 'not-an-email' });
    assert.strictEqual(res.status, 400);
  });

  await test('valid application is emailed, escaped, and persisted with hashed IP', async () => {
    const ip = '10.3.0.200';
    const res = await invoke(
      {
        ...VALID,
        role: 'video-generation-expert',
        name: '<script>alert(1)</script>',
        email: 'director@example.com',
        message: 'I think in shots. Here is a reel: <b>vimeo.com/x</b>',
      },
      ip
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    const msg = sent[sent.length - 1];
    assert.ok(msg.to.length > 3);
    assert.ok(msg.subject.includes('[PuniCodex Careers]'));
    assert.ok(msg.subject.includes('video-generation-expert'), 'role in subject');
    assert.ok(!msg.html.includes('<script>alert(1)</script>'), 'name escaped');
    assert.ok(msg.html.includes('&lt;script&gt;'), 'escaped form present');
    assert.ok(msg.html.includes('&lt;b&gt;'), 'message markup escaped');
    const row = getDb()
      .prepare('SELECT * FROM career_applications WHERE email = ?')
      .get('director@example.com');
    assert.ok(row, 'row persisted');
    assert.strictEqual(row.role, 'video-generation-expert');
    assert.strictEqual(row.name, '<script>alert(1)</script>', 'row stores the raw name');
    assert.strictEqual(row.status, 'pending');
    const expectedHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    assert.strictEqual(row.ip_hash, expectedHash, 'only the hashed IP is stored');
    assert.ok(!String(row.ip_hash).includes(ip), 'raw IP never stored');
  });

  await test('per-IP fixed-window rate limit kicks in at 6th application', async () => {
    const ip = '198.51.100.9';
    let last;
    for (let i = 0; i < 6; i++) last = await invoke({ ...VALID, email: `rl${i}@example.com` }, ip);
    assert.strictEqual(last.status, 429);
  });

  console.log(`\nCareers Endpoint: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
