/**
 * PuniCodex API v2 — Integration tests
 */

const assert = require('node:assert');
const http = require('node:http');
const { URL } = require('node:url');

const { resetLimiters } = require('../platform/api/api-rate-limiter.js');
resetLimiters();

const v2Handler = require('../api/v2/[[...slug]].js');

function invoke(method, url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url, 'http://localhost');
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = options.headers || {};
    req.body = options.body || null;
    req.query = Object.fromEntries(parsed.searchParams);
    if (options.params) {
      Object.assign(req.query, options.params);
    }
    req.path = options.path || parsed.pathname.replace('/api/v2', '') || '';
    // Build slug array for the catch-all handler used in tests
    req.query.slug = req.path.split('/').filter(Boolean);

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

    v2Handler(req, res);
  });
}

function assertEnvelope(body) {
  assert.strictEqual(typeof body, 'object', 'Response body must be an object');
  assert.strictEqual(body.success, true, `Expected success=true, got ${body.success}`);
  assert.ok(body.data !== undefined, 'Response must contain data');
  assert.ok(body.meta, 'Response must contain meta');
  assert.strictEqual(body.meta.version, 'v2', 'API version must be v2');
  assert.ok(body.meta.requestId, 'Response must contain requestId');
  assert.ok(body.meta.timestamp, 'Response must contain timestamp');
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
  console.log('\n▸ API v2 Integration Tests\n');

  await test('GET /api/v2 returns root docs', async () => {
    const { status, body } = await invoke('GET', '/api/v2');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.name, 'PuniCodex API v2');
  });

  await test('GET /api/v2/names returns paginated names', async () => {
    const { status, body } = await invoke('GET', '/api/v2/names?limit=5');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Array.isArray(body.data));
    assert.strictEqual(body.data.length, 5);
    assert.ok(body.meta.pagination);
    assert.ok(body.links.self.includes('/api/v2/names'));
  });

  await test('GET /api/v2/names/zeus returns detail', async () => {
    const { status, body } = await invoke('GET', '/api/v2/names/zeus', {
      params: { id: 'zeus' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.id, 'zeus');
    assert.ok(body.data.links.temple.includes('/sites/zeus/'));
  });

  await test('GET /api/v2/names/zeus/variants returns variants', async () => {
    const { status, body } = await invoke('GET', '/api/v2/names/zeus/variants', {
      params: { id: 'zeus', subresource: 'variants' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.id, 'zeus');
    assert.ok(Array.isArray(body.data.variants));
  });

  await test('GET /api/v2/names/unknown returns 404', async () => {
    const { status, body } = await invoke('GET', '/api/v2/names/unknown-xyz', {
      params: { id: 'unknown-xyz' },
    });
    assert.strictEqual(status, 404);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.meta.version, 'v2');
  });

  await test('GET /api/v2/pantheons lists pantheons', async () => {
    const { status, body } = await invoke('GET', '/api/v2/pantheons');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });

  await test('GET /api/v2/pantheons/greek returns entries', async () => {
    const { status, body } = await invoke('GET', '/api/v2/pantheons/greek', {
      params: { name: 'greek' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.id, 'greek');
    assert.ok(body.data.total > 0);
  });

  await test('GET /api/v2/tiers returns tier docs', async () => {
    const { status, body } = await invoke('GET', '/api/v2/tiers');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Array.isArray(body.data));
  });

  await test('GET /api/v2/autocomplete returns completions', async () => {
    const { status, body } = await invoke('GET', '/api/v2/autocomplete?q=zeu');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.some((i) => i.id === 'zeus'));
  });

  await test('GET /api/v2/convert returns matches', async () => {
    const { status, body } = await invoke('GET', '/api/v2/convert?q=zeus');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(body.data.matches.length > 0);
    assert.ok(body.data.queryTrust);
  });

  await test('POST /api/v2/convert/batch converts multiple', async () => {
    const { status, body } = await invoke('POST', '/api/v2/convert/batch', {
      body: { queries: ['zeus', 'thor'] },
      headers: { 'content-type': 'application/json' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.length, 2);
  });

  await test('GET /api/v2/search/web returns results', async () => {
    const { status, body } = await invoke('GET', '/api/v2/search/web?q=zeus&limit=5');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.meta.query);
  });

  await test('GET /api/v2/sites lists indexed sites', async () => {
    const { status, body } = await invoke('GET', '/api/v2/sites?limit=5');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Array.isArray(body.data));
  });

  await test('GET /api/v2/sites/xn--rs-lia5r.com returns site', async () => {
    const { status, body } = await invoke('GET', '/api/v2/sites/xn--rs-lia5r.com', {
      params: { punycode: 'xn--rs-lia5r.com' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.punycode, 'xn--rs-lia5r.com');
  });

  await test('GET /api/v2/health returns ok', async () => {
    const { status, body } = await invoke('GET', '/api/v2/health');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.status, 'ok');
  });

  await test('GET /api/v2/version returns dataset version', async () => {
    const { status, body } = await invoke('GET', '/api/v2/version');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(body.data.version);
  });

  await test('GET /api/v2/openapi.json returns spec', async () => {
    const { status, body } = await invoke('GET', '/api/v2/openapi.json');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(body.data.paths);
  });

  await test('GET /api/v2/authenticity/check classifies canonical term', async () => {
    const { status, body } = await invoke(
      'GET',
      '/api/v2/authenticity/check?input=Aphrod%C3%ADt%C4%93&type=term'
    );
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.verdict, 'canonical');
  });

  await test('GET /api/v2/authenticity/check flags homograph domain', async () => {
    const { status, body } = await invoke(
      'GET',
      '/api/v2/authenticity/check?input=%D0%B0res.com&type=domain'
    );
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(
      ['homograph-spoof', 'mixed-script-spoof', 'lookalike-domain'].includes(body.data.verdict)
    );
  });

  await test('POST /api/v2/authenticity/check/batch classifies batch', async () => {
    const { status, body } = await invoke('POST', '/api/v2/authenticity/check/batch', {
      body: { inputs: ['Zeus', 'ares.com'], type: 'auto' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.length, 2);
  });

  await test('POST /api/v2/authenticity/report records report', async () => {
    const { status, body } = await invoke('POST', '/api/v2/authenticity/report', {
      body: { input: 'fake-ares.example.com', type: 'domain', comment: 'v2 test' },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.reported, true);
  });

  await test('GET /api/v2/policy returns default policy', async () => {
    const { status, body } = await invoke('GET', '/api/v2/policy');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.tenantId, 'default');
    assert.ok(body.data.defaultAction);
    assert.ok(body.data.severityActions);
  });

  await test('POST /api/v2/policy/evaluate returns action and tier', async () => {
    const { status, body } = await invoke('POST', '/api/v2/policy/evaluate', {
      body: { input: 'аres.com', type: 'domain', policy: { defaultAction: 'warn' } },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(['block', 'warn'].includes(body.data.action));
    assert.ok(body.data.tier);
    assert.ok(body.data.policyId);
  });

  await test('POST /api/v2/policy/evaluate respects blocklist', async () => {
    const { status, body } = await invoke('POST', '/api/v2/policy/evaluate', {
      body: {
        input: 'safe-looking.example.com',
        type: 'domain',
        policy: { defaultAction: 'allow' },
        blocklist: ['safe-looking.example.com'],
      },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.action, 'block');
    assert.strictEqual(body.data.reason, 'blocklist');
  });

  await test('GET /api/v2/appraise returns appraisal envelope', async () => {
    const { status, body } = await invoke('GET', '/api/v2/appraise?q=apóllōn.com');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.appraisal.currency, 'USD');
    assert.ok(Number.isInteger(body.data.appraisal.unicodeValue));
    assert.strictEqual(body.data.lexiconMatch?.id, 'apollon');
  });

  await test('POST /api/v2/appraise/batch appraises multiple domains', async () => {
    const { status, body } = await invoke('POST', '/api/v2/appraise/batch', {
      body: { domains: ['zeus.com', 'apóllōn.com'] },
    });
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.length, 2);
    assert.ok(body.data.every((d) => d.appraisal?.currency === 'USD'));
  });

  // Consistency-audit regressions (see docs/api/api-audit-2026-07.md)
  await test('GET /api/v2/names/zeus/slots returns slot inventory', async () => {
    const { status, body } = await invoke('GET', '/api/v2/names/zeus/slots');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.strictEqual(body.data.id, 'zeus');
    assert.ok(Array.isArray(body.data.slots), 'slots must be an array');
  });

  await test('GET /api/v2/similarities/relationships lists relationship types', async () => {
    const { status, body } = await invoke('GET', '/api/v2/similarities/relationships');
    assert.strictEqual(status, 200);
    assertEnvelope(body);
    assert.ok(Array.isArray(body.data), 'data must be an array');
    assert.ok(body.meta.count > 0, 'must include count meta');
  });

  await test('GET /api/v2/tenants/:tenantId/users without auth returns 401, not 500', async () => {
    const { status, body } = await invoke('GET', '/api/v2/tenants/acme/users');
    assert.strictEqual(status, 401);
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
    assert.strictEqual(body.meta.version, 'v2');
  });

  await test('POST /api/v2/tenants/:tenantId/users without auth returns 401, not 500', async () => {
    const { status, body } = await invoke('POST', '/api/v2/tenants/acme/users', {
      body: { email: 'analyst@example.com', role: 'viewer' },
    });
    assert.strictEqual(status, 401);
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  });

  await test('GET /api/v2/tenants/:tenantId/audit without auth returns 401, not 500', async () => {
    const { status, body } = await invoke('GET', '/api/v2/tenants/acme/audit');
    assert.strictEqual(status, 401);
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  });

  await test('POST /api/v2/tenants/:tenantId/retention/purge without auth returns 401, not 500', async () => {
    const { status, body } = await invoke('POST', '/api/v2/tenants/acme/retention/purge', {
      body: { retentionDays: 90 },
    });
    assert.strictEqual(status, 401);
    assert.strictEqual(body.error.code, 'UNAUTHORIZED');
  });

  // The helper above pre-splits req.query.slug into an array. Vercel does NOT:
  // a catch-all rewrite delivers ONE slash-joined string. That gap is why the
  // whole of /api/v2 could be dead in production with every test green, so
  // these two drive the router with the real production shape.
  await test('the router resolves a string slug exactly like a pre-split array', async () => {
    const router = require('../platform/api/api-v2-router.js');
    const route = router.route || router;

    function capture() {
      const res = { statusCode: 200, body: null };
      res.status = (code) => {
        res.statusCode = code;
        return res;
      };
      res.setHeader = () => {};
      res.json = (data) => {
        res.body = data;
        return res;
      };
      res.end = () => res;
      return res;
    }

    async function call(slug) {
      const res = capture();
      await route({ method: 'GET', query: { slug }, headers: {}, url: '/api/v2/pantheons' }, res);
      return res;
    }

    const asString = await call('pantheons');
    const asArray = await call(['pantheons']);
    assert.strictEqual(asString.statusCode, 200, 'string slug must resolve');
    assert.strictEqual(asArray.statusCode, asString.statusCode, 'both shapes agree on status');
    assert.ok(asString.body && asString.body.data, 'string slug reached the pantheons resource');
    assert.deepStrictEqual(
      Object.keys(asString.body).sort(),
      Object.keys(asArray.body).sort(),
      'string and array slugs must produce the same response shape'
    );
  });

  await test('a multi-segment string slug is split, not treated as one segment', async () => {
    const router = require('../platform/api/api-v2-router.js');
    const route = router.route || router;
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader() {},
      json(data) {
        this.body = data;
        return this;
      },
      end() {
        return this;
      },
    };
    await route(
      {
        method: 'GET',
        query: { slug: 'tenants/acme/audit' },
        headers: {},
        url: '/api/v2/tenants/acme/audit',
      },
      res
    );
    // Reaching the auth check proves the three segments were parsed; an
    // unsplit slug would have fallen through to the root docs with a 200.
    assert.strictEqual(res.statusCode, 401, 'multi-segment string slug should reach the route');
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  });

  console.log(`\nAPI v2: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

runTests();
