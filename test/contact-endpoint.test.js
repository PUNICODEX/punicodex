/**
 * Contact endpoint tests.
 *
 * Covers validation, dual honeypot fields, per-IP rate limiting, HTML escaping
 * of user content in the outgoing email, and method gating. Invokes the real
 * Vercel handler with a mock req/res.
 */

const assert = require('node:assert');
const http = require('node:http');

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

const handler = require('../api/contact.js');

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
    req.url = '/api/contact/';
    req.headers = { 'x-forwarded-for': ip || `10.1.0.${++ipCounter}` };
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
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  subject: 'Sponsorship',
  message: 'I would like to talk about sponsoring a temple.',
};

async function run() {
  console.log('\n▸ Contact Endpoint Tests\n');

  await test('rejects incomplete/invalid submissions with 400', async () => {
    for (const body of [
      { ...VALID, name: '' },
      { ...VALID, email: 'not-an-email' },
      { ...VALID, message: 'short' },
      { ...VALID, message: undefined },
    ]) {
      const res = await invoke(body);
      assert.strictEqual(res.status, 400, JSON.stringify(body));
    }
  });

  await test('honeypot fields return 200 silently and send nothing', async () => {
    const before = sent.length;
    for (const body of [
      { ...VALID, _hp: 'x' },
      { ...VALID, company: 'spam inc' },
    ]) {
      const res = await invoke(body);
      assert.strictEqual(res.status, 200);
    }
    assert.strictEqual(sent.length, before, 'no email for honeypot hits');
  });

  await test('valid message is emailed with user content HTML-escaped', async () => {
    const res = await invoke({
      ...VALID,
      name: '<script>alert(1)</script>',
      message: 'Hello <b>team</b>, "quotes" & ampersands.',
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    const msg = sent[sent.length - 1];
    assert.ok(msg.to.length > 3);
    assert.ok(!msg.html.includes('<script>alert(1)</script>'), 'name escaped');
    assert.ok(msg.html.includes('&lt;script&gt;'), 'escaped form present');
    assert.ok(msg.html.includes('&lt;b&gt;'), 'message markup escaped');
    assert.ok(msg.html.includes('&quot;'), 'quotes escaped');
    assert.ok(msg.subject.includes('[PuniCodex Contact]'));
  });

  await test('subject defaults when omitted', async () => {
    const res = await invoke({ ...VALID, subject: undefined });
    assert.strictEqual(res.status, 200);
    assert.ok(sent[sent.length - 1].subject.includes('General Inquiry'));
  });

  await test('per-IP fixed-window rate limit kicks in at 6th message', async () => {
    const ip = '198.51.100.7';
    let last;
    for (let i = 0; i < 6; i++) last = await invoke(VALID, ip);
    assert.strictEqual(last.status, 429);
  });

  await test('GET is refused with 405', async () => {
    const res = await invoke(null, undefined, 'GET');
    assert.strictEqual(res.status, 405);
  });

  console.log(`\nContact Endpoint: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
