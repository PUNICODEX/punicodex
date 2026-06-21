/**
 * Observability Service Tests (Phase 8)
 */

const assert = require('node:assert');
const http = require('node:http');
const { URL } = require('node:url');
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-admin-password-for-ci';

const {
  getMetrics,
  getTopSearches,
  getSlowEndpoints,
  getHealthSummary,
  getRecentRequests,
} = require('../platform/api/observability-service.js');
const { login: adminLogin } = require('../platform/api/admin.js');

let adminToken;

function invoke(handler, method, url, options = {}) {
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
  console.log('\n▸ Observability Tests\n');

  adminToken = (await adminLogin(process.env.ADMIN_PASSWORD)).token;

  await test('getMetrics returns request metrics', async () => {
    const metrics = await getMetrics({ hours: 24 });
    assert.ok(typeof metrics.totalRequests === 'number');
    assert.ok(typeof metrics.errorRate === 'number');
    assert.ok(metrics.latencyPercentiles);
    assert.ok(Array.isArray(metrics.topPaths));
    assert.ok(Array.isArray(metrics.statusCodes));
  });

  await test('getTopSearches returns search ranking', async () => {
    const result = await getTopSearches({ limit: 5, hours: 24 });
    assert.ok(Array.isArray(result.items));
    assert.ok(result.items.length <= 5);
  });

  await test('getSlowEndpoints returns slowest paths', async () => {
    const result = await getSlowEndpoints({ limit: 5, hours: 24 });
    assert.ok(Array.isArray(result.items));
    assert.ok(result.items.length <= 5);
    if (result.items.length > 0) {
      assert.ok(typeof result.items[0].avgDurationMs === 'number');
    }
  });

  await test('getHealthSummary reports database health', async () => {
    const result = await getHealthSummary();
    assert.ok(['healthy', 'degraded'].includes(result.status));
    assert.ok(result.database);
    assert.ok(typeof result.activeSites === 'number');
  });

  await test('getRecentRequests returns recent log rows', async () => {
    const result = await getRecentRequests({ limit: 5, hours: 24 });
    assert.ok(Array.isArray(result.items));
    assert.ok(result.items.length <= 5);
  });

  await test('GET /api/admin/observability requires admin token', async () => {
    const handler = require('../api/admin/observability/index.js');
    const noAuth = await invoke(handler, 'GET', '/api/admin/observability');
    assert.strictEqual(noAuth.status, 401);

    const authed = await invoke(handler, 'GET', '/api/admin/observability', {
      headers: { 'x-admin-token': adminToken },
    });
    assert.strictEqual(authed.status, 200);
    assert.strictEqual(authed.body.success, true);
    assert.ok(authed.body.data.health);
    assert.ok(authed.body.data.metrics);
  });

  console.log(`\nObservability: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
