/**
 * Unicode Web Index Protocol Tests (Phase 10)
 */

const assert = require('node:assert');
const http = require('node:http');
const { URL } = require('node:url');
const { getProtocolSpec } = require('../platform/api/protocol-service.js');

const handler = require('../api/protocol/index.js');

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
  console.log('\n▸ Protocol Tests\n');

  await test('getProtocolSpec returns protocol document', () => {
    const spec = getProtocolSpec();
    assert.strictEqual(spec.name, 'Unicode Web Index Protocol (UWIP)');
    assert.ok(spec.dataset);
    assert.ok(spec.resources);
    assert.ok(Array.isArray(spec.trustTiers));
    assert.ok(Array.isArray(spec.extensions));
  });

  await test('GET /api/protocol returns spec', async () => {
    const { status, body } = await invoke('GET', '/api/protocol');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.name, 'Unicode Web Index Protocol (UWIP)');
  });

  await test('non-GET method is rejected', async () => {
    const { status } = await invoke('POST', '/api/protocol');
    assert.strictEqual(status, 405);
  });

  console.log(`\nProtocol: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
