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

// Require a fresh copy of a module with selected dependencies stubbed through
// the require cache, then restore the cache. Used to simulate Postgres-only
// failure modes (e.g. SQLSTATE 42P01 unknown relation) that cannot occur
// against the fully-migrated local SQLite test database.
function requireFreshWithStubs(moduleRel, stubs) {
  const target = require.resolve(moduleRel);
  const saved = new Map();
  for (const [rel, exports] of Object.entries(stubs)) {
    const p = require.resolve(rel);
    saved.set(p, require.cache[p]);
    require.cache[p] = { id: p, filename: p, loaded: true, exports };
  }
  saved.set(target, require.cache[target]);
  delete require.cache[target];
  const mod = require(target);
  for (const [p, orig] of saved) {
    if (orig) require.cache[p] = orig;
    else delete require.cache[p];
  }
  return mod;
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

  await test('getHealthSummary tolerates a missing indexed_sites relation (PG 42P01)', async () => {
    // Regression: on the production Postgres the crawler tables are not
    // provisioned; the indexed_sites probe threw 42P01 and 500'd the portal
    // dashboard. The probe must degrade to activeSites = 0 instead.
    const operationalStub = {
      isPostgres: () => true,
      get: (sql) => {
        if (sql.includes('indexed_sites')) {
          return Promise.reject(
            Object.assign(new Error('relation "indexed_sites" does not exist'), {
              code: '42P01',
            })
          );
        }
        return Promise.resolve({ requests: 3, unique_ips: 2 });
      },
      all: () => Promise.resolve([]),
    };
    const svc = requireFreshWithStubs('../platform/api/observability-service.js', {
      '../platform/db/operational.js': operationalStub,
    });
    const summary = await svc.getHealthSummary();
    assert.strictEqual(summary.activeSites, 0);
    assert.strictEqual(summary.lastHour.requests, 3);

    // A 42P01 on any OTHER relation must still propagate (no blanket swallow).
    const strictStub = {
      ...operationalStub,
      get: () =>
        Promise.reject(
          Object.assign(new Error('relation "api_request_log" does not exist'), {
            code: '42P01',
          })
        ),
    };
    const svc2 = requireFreshWithStubs('../platform/api/observability-service.js', {
      '../platform/db/operational.js': strictStub,
    });
    await assert.rejects(() => svc2.getHealthSummary(), /api_request_log/);
  });

  await test('portal dashboard degrades to zeroed widgets when a source fails', async () => {
    // Regression: one failing aggregate (missing relation on Postgres, a
    // transient upstream error) must not 500 the whole portal landing page.
    const svc = requireFreshWithStubs('../platform/api/admin-portal-service.js', {
      '../platform/api/observability-service.js': {
        getMetrics: () => Promise.reject(new Error('api_request_log unavailable')),
        getHealthSummary: () =>
          Promise.reject(
            Object.assign(new Error('relation "indexed_sites" does not exist'), {
              code: '42P01',
            })
          ),
      },
      '../platform/api/admin.js': {
        getRevenueStats: () => Promise.reject(new Error('revenue unavailable')),
      },
      '../platform/api/patron-service.js': {
        getPatronStats: () => Promise.reject(new Error('patrons unavailable')),
      },
    });
    const dash = await svc.getDashboard();
    assert.ok(dash.generatedAt);
    assert.ok(typeof dash.applications.businessPending === 'number');
    assert.strictEqual(dash.revenue.last30dCents, 0);
    assert.strictEqual(dash.traffic.requests, 0);
    assert.strictEqual(dash.traffic.errorCount, 0);
    assert.strictEqual(dash.patrons.active, 0);
    assert.strictEqual(dash.patrons.estimatedMrrDollars, '0.00');
    assert.strictEqual(dash.indexedSites, 0);
  });

  await test('getRecentRequests returns recent log rows', async () => {
    const result = await getRecentRequests({ limit: 5, hours: 24 });
    assert.ok(Array.isArray(result.items));
    assert.ok(result.items.length <= 5);
  });

  await test('GET /api/admin/observability requires admin token', async () => {
    const handler = require('../platform/api-handlers/admin/observability/index.js');
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
