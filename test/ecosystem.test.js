/**
 * Ecosystem Service Tests (Phase 9)
 */

const assert = require('node:assert');
const http = require('node:http');
const { URL } = require('node:url');
const partners = require('../platform/api/partners.js');
const ecosystem = require('../platform/api/ecosystem-service.js');

const handler = require('../api/ecosystem/index.js');

function invoke(method, url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url, 'http://localhost');
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = options.headers || {};
    req.body = options.body || null;
    req.query = Object.fromEntries(parsed.searchParams);

    const res = new http.ServerResponse(req);
    let statusCode = 200;
    let responseBody = null;
    let ended = false;

    res.setHeader = () => {};
    res.status = (code) => {
      statusCode = code;
      return res;
    };
    res.json = (data) => {
      responseBody = data;
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody });
      }
    };
    res.send = (data) => {
      responseBody = data;
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody });
      }
    };
    res.end = () => {
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody });
      }
    };

    handler(req, res);
  });
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 3).join('\n'));
  }
}

async function runTests() {
  console.log('\n▸ Ecosystem Tests\n');

  const partner = partners.registerPartner({
    name: 'Ecosystem Test Partner',
    tier: 'free',
    scopes: ['read'],
  });

  await test('GET /api/ecosystem returns directory', async () => {
    const { status, body } = await invoke('GET', '/api/ecosystem');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(typeof body.data.count === 'number');
    assert.ok(Array.isArray(body.data.items));
  });

  await test('POST /api/ecosystem/usage records usage', async () => {
    const { status, body } = await invoke('POST', '/api/ecosystem/usage', {
      headers: { authorization: `Bearer ${partner.apiKey}` },
      body: { endpoint: '/api/v2/names' },
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.endpoint, '/api/v2/names');
  });

  await test('POST usage rejects invalid key', async () => {
    const { status } = await invoke('POST', '/api/ecosystem/usage', {
      headers: { authorization: 'Bearer invalid-key' },
      body: { endpoint: '/api/v2/names' },
    });
    assert.strictEqual(status, 401);
  });

  await test('getUsageSummary aggregates usage', async () => {
    const summary = ecosystem.getUsageSummary(partner.id);
    assert.ok(summary.totalRequests >= 1);
    assert.ok(summary.byEndpoint.some((r) => r.endpoint === '/api/v2/names'));
  });

  console.log(`\nEcosystem: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
