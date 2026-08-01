/**
 * Arbitrage endpoint tests.
 *
 * Covers method gating, dual honeypot fields (fake 200, no email, no DB row),
 * strict validation, HTML escaping of user content in the outgoing email,
 * per-IP rate limiting, and persistence with the client IP stored only as a
 * truncated SHA-256 hash. Invokes the real Vercel handler with a mock req/res.
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

process.env.PUNICODEX_TEST_DB_PATH = path.join(os.tmpdir(), `arbitrage-test-${process.pid}.db`);

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

const handler = require('../platform/api-handlers/root/arbitrage/apply/index.js');

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
    req.url = '/api/arbitrage/apply/';
    req.headers = { 'x-forwarded-for': ip || `10.2.0.${++ipCounter}` };
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
  domain: 'athēnā.com',
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  budget: '500-2500',
  notes: 'First choice of a shortlist of three.',
};

function rowCount() {
  const { getDb } = require('../platform/db/connection.js');
  return getDb().prepare('SELECT COUNT(*) AS c FROM arbitrage_requests').get().c;
}

async function run() {
  console.log('\n▸ Arbitrage Endpoint Tests\n');

  // Direct table assertions run before any request triggers ensureDb().
  const { getDb } = require('../platform/db/connection.js');
  require('../platform/db/migrate-arbitrage.js').migrate(getDb());

  await test('OPTIONS preflight returns 204', async () => {
    const res = await invoke(null, undefined, 'OPTIONS');
    assert.strictEqual(res.status, 204);
  });

  await test('GET is refused with 405', async () => {
    const res = await invoke(null, undefined, 'GET');
    assert.strictEqual(res.status, 405);
  });

  await test('honeypot fields return 200 silently — no email, no DB row', async () => {
    const beforeRows = rowCount();
    const beforeSent = sent.length;
    for (const body of [
      { ...VALID, _hp: 'x' },
      { ...VALID, company: 'spam inc' },
    ]) {
      const res = await invoke(body);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.ok, true);
    }
    assert.strictEqual(sent.length, beforeSent, 'no email for honeypot hits');
    assert.strictEqual(rowCount(), beforeRows, 'no row for honeypot hits');
  });

  await test('rejects missing domain/name/email with 400', async () => {
    for (const body of [
      { ...VALID, domain: undefined },
      { ...VALID, domain: '' },
      { ...VALID, domain: 'not a domain' },
      { ...VALID, name: undefined },
      { ...VALID, name: '   ' },
      { ...VALID, email: undefined },
    ]) {
      const res = await invoke(body);
      assert.strictEqual(res.status, 400, JSON.stringify(body));
    }
  });

  await test('rejects a malformed email with 400', async () => {
    const res = await invoke({ ...VALID, email: 'not-an-email' });
    assert.strictEqual(res.status, 400);
  });

  await test('valid application is persisted (hashed IP only) and emailed escaped', async () => {
    const ip = '10.2.77.7';
    const res = await invoke(
      { ...VALID, name: '<script>alert(1)</script>', notes: 'Hello <b>team</b>.' },
      ip
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);

    const msg = sent[sent.length - 1];
    assert.ok(msg.to.length > 3);
    assert.ok(msg.subject.includes('[PuniCodex Arbitrage]'), 'house subject prefix');
    assert.ok(!msg.html.includes('<script>alert(1)</script>'), 'name escaped in html');
    assert.ok(msg.html.includes('&lt;script&gt;'), 'escaped form present');
    assert.ok(msg.html.includes('&lt;b&gt;'), 'notes markup escaped');

    const row = getDb()
      .prepare('SELECT * FROM arbitrage_requests WHERE domain = ?')
      .get('athēnā.com');
    assert.ok(row, 'row must exist');
    assert.strictEqual(row.name, '<script>alert(1)</script>', 'stored raw, escaped only on output');
    assert.strictEqual(row.email, 'ada@example.com');
    assert.strictEqual(row.budget, '500-2500');
    assert.strictEqual(row.status, 'pending');
    const expectedHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    assert.strictEqual(row.ip_hash, expectedHash, 'ip stored as truncated sha256');
    assert.ok(!String(row.ip_hash).includes(ip), 'raw ip never persisted');
  });

  await test('punycode domains are accepted too', async () => {
    const res = await invoke({ ...VALID, domain: 'xn--athn-9wa.com' });
    assert.strictEqual(res.status, 200);
  });

  await test('per-IP fixed-window rate limit kicks in at 6th application', async () => {
    const ip = '10.2.99.1';
    let last;
    for (let i = 0; i < 6; i++) last = await invoke(VALID, ip);
    assert.strictEqual(last.status, 429);
  });

  console.log(`\nArbitrage Endpoint: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
