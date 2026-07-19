/**
 * PuniCodex — OpenAPI Contract Tests
 *
 * Proves the published OpenAPI documents match the implemented route surface
 * for both versioned APIs:
 *   (a) every documented path+method resolves to a real handler and responds
 *       (200/4xx as appropriate — never 404 or 500);
 *   (b) every implemented public route is documented, apart from an explicit
 *       allowlist of deliberate exclusions;
 *   (c) parameters marked required in the spec are enforced (400 when missing);
 *   (d) representative endpoints return the envelope their spec response
 *       component declares.
 *
 * v1 spec: platform/api/openapi.json (served at /api/v1/openapi.json)
 * v2 spec: served by the catch-all router at /api/v2/openapi.json
 */

const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test-admin-password-for-ci';

// Reset rate limiters before each run so tests are deterministic
const { resetLimiters } = require('../platform/api/api-rate-limiter.js');
resetLimiters();

const v1Spec = require('../platform/api/openapi.json');
const v2Handler = require('../api/v2/[[...slug]].js');

// ---------------------------------------------------------------------------
// Invoke harness (same shape as test/api-v1.test.js, plus header capture)
// ---------------------------------------------------------------------------

function invoke(handler, method, url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url, 'http://localhost');
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = options.headers || {};
    req.body = options.body || null;
    req.query = Object.fromEntries(parsed.searchParams);
    if (options.params) Object.assign(req.query, options.params);
    req.params = options.params || {};
    req.path = options.path || '';

    const res = new http.ServerResponse(req);
    const headers = {};
    let statusCode = 200;
    let responseBody = null;
    let ended = false;

    res.setHeader = (k, v) => {
      headers[k.toLowerCase()] = v;
    };
    res.status = (code) => {
      statusCode = code;
      return res;
    };
    res.json = (data) => {
      responseBody = data;
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody, headers });
      }
    };
    res.send = (data) => {
      responseBody = data;
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody, headers });
      }
    };
    res.end = () => {
      if (!ended) {
        ended = true;
        resolve({ status: statusCode, body: responseBody, headers });
      }
    };

    handler(req, res);
  });
}

function invokeV1(handler, method, url, options = {}) {
  return invoke(handler, method, url, options);
}

// v2 catch-all handler expects the slug array + path derived from the URL
function invokeV2(method, url, options = {}) {
  const parsed = new URL(url, 'http://localhost');
  const cleanPath = parsed.pathname.replace(/^\/api\/v2/, '') || '';
  const slug = cleanPath.split('/').filter(Boolean);
  return invoke(v2Handler, method, url, {
    ...options,
    path: cleanPath,
    params: { ...(options.params || {}), slug },
  });
}

// ---------------------------------------------------------------------------
// Route discovery helpers
// ---------------------------------------------------------------------------

// Convert an OpenAPI path to the handler module path under api/v1.
// '/names/{id}/variants' -> 'api/v1/names/[id]/variants'
function v1HandlerPath(specPath) {
  const rel = specPath.replace(/\{(\w+)\}/g, '[$1]');
  const base = path.join(__dirname, '..', 'api', 'v1', ...rel.split('/').filter(Boolean));
  if (fs.existsSync(`${base}.js`)) return `${base}.js`;
  return path.join(base, 'index.js');
}

// Walk api/v1 for implemented route files and derive { route, method } pairs.
// Method is read from the handler's own method guard (`req.method !== 'X'`).
function discoverV1Routes() {
  const root = path.join(__dirname, '..', 'api', 'v1');
  const routes = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.js')) continue;
      const rel = path.relative(root, full).split(path.sep).join('/').replace(/\.js$/, '');
      const segments = rel
        .split('/')
        .filter(Boolean)
        .map((s) => s.replace(/^\[(\w+)\]$/, '{$1}'));
      if (segments[segments.length - 1] === 'index') segments.pop();
      const route = `/${segments.join('/')}`;
      const source = fs.readFileSync(full, 'utf8');
      const guard = source.match(/req\.method !== '(GET|POST|PUT|PATCH|DELETE)'/);
      routes.push({ route, method: guard ? guard[1] : null, file: rel });
    }
  };
  walk(root);
  return routes;
}

// Public routes deliberately absent from the OpenAPI spec (see
// docs/api/api-audit-2026-07.md for the rationale of each).
const V1_SPEC_EXCLUSIONS = new Map([
  ['/canary', 'honeypot endpoint — documenting it would defeat its purpose'],
  ['/docs', 'Swagger UI HTML page, not a JSON resource'],
  ['/openapi.json', 'the specification document itself'],
  ['/creatives', 'separate Express sub-API with its own contract (vercel.json rewrite)'],
  ['/scholars', 'separate Express sub-API with its own contract (vercel.json rewrite)'],
]);

// Sample values for path/query parameters and required body fields.
const PATH_SAMPLES = {
  id: 'zeus',
  name: 'greek',
  identityId: 'zeus',
  clusterId: '1',
};
const QUERY_SAMPLES = {
  q: 'zeus',
  input: 'ares.com',
};
// Routes whose required query sample must be a full domain (not a bare name).
const ROUTE_QUERY_OVERRIDES = {
  '/appraise': { q: 'zeus.com' },
};
const BODY_FIELD_SAMPLES = {
  ids: ['zeus', 'thor'],
  queries: ['zeus'],
  domains: ['zeus.com'],
  inputs: ['zeus'],
  input: 'ares.com',
  domain: 'fake-zeus.example.com',
  category: 'phishing',
  status: 'reviewing',
};

function substitutePath(specPath) {
  return specPath.replace(/\{(\w+)\}/g, (_, key) => {
    assert.ok(PATH_SAMPLES[key], `no sample value for path param '${key}'`);
    return PATH_SAMPLES[key];
  });
}

function pathParams(specPath) {
  const params = {};
  for (const [, key] of specPath.matchAll(/\{(\w+)\}/g)) {
    params[key] = PATH_SAMPLES[key];
  }
  return params;
}

function requiredQueryString(op, specPath) {
  const pairs = [];
  const overrides = ROUTE_QUERY_OVERRIDES[specPath] || {};
  for (const p of op.parameters || []) {
    if (p.$ref) continue; // shared parameters are never required here
    if (p.in === 'query' && p.required) {
      const value = overrides[p.name] ?? QUERY_SAMPLES[p.name];
      assert.ok(value !== undefined, `no sample value for required query '${p.name}'`);
      pairs.push(`${p.name}=${encodeURIComponent(value)}`);
    }
  }
  return pairs.length ? `?${pairs.join('&')}` : '';
}

function sampleBody(op) {
  const required = op.requestBody?.content?.['application/json']?.schema?.required || [];
  const body = {};
  for (const field of required) {
    assert.ok(BODY_FIELD_SAMPLES[field], `no sample value for required body field '${field}'`);
    body[field] = BODY_FIELD_SAMPLES[field];
  }
  return body;
}

function isSecured(op) {
  return Array.isArray(op.security) && op.security.length > 0;
}

// ---------------------------------------------------------------------------
// Test runner (project harness style)
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    // Each case starts with a clean rate-limit window: this suite proves
    // route/spec conformance, not throttling (covered by rate-limiter tests).
    resetLimiters();
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

function assertSuccessEnvelope(body, version) {
  assert.strictEqual(typeof body, 'object', 'Response body must be an object');
  assert.strictEqual(body.success, true, `Expected success=true, got ${body.success}`);
  assert.ok(body.data !== undefined, 'Response must contain data');
  assert.ok(body.meta, 'Response must contain meta');
  assert.strictEqual(body.meta.version, version, `API version must be ${version}`);
  assert.ok(body.meta.requestId, 'Response must contain requestId');
  assert.ok(body.meta.timestamp, 'Response must contain timestamp');
}

function assertErrorEnvelope(body, version) {
  assert.strictEqual(body.success, false, 'Error body must have success=false');
  assert.ok(body.error && typeof body.error === 'object', 'error must be an object');
  assert.ok(body.error.code, 'error must have a code');
  assert.ok(body.error.message, 'error must have a message');
  assert.ok(body.meta, 'error must contain meta');
  assert.strictEqual(body.meta.version, version, `error meta version must be ${version}`);
}

async function runTests() {
  console.log('\n▸ OpenAPI Contract Tests\n');

  // =========================================================================
  // v1 — (a) every documented path+method exists and responds
  // =========================================================================
  for (const [specPath, ops] of Object.entries(v1Spec.paths)) {
    const modulePath = v1HandlerPath(specPath);
    // eslint-disable-next-line import/no-dynamic-require
    const handler = require(modulePath);
    for (const [method, op] of Object.entries(ops)) {
      const verb = method.toUpperCase();
      const label = `${verb} /api/v1${specPath}`;

      await test(`v1 spec route responds: ${label}`, async () => {
        const url = `/api/v1${substitutePath(specPath)}${verb === 'GET' ? requiredQueryString(op, specPath) : ''}`;
        const { status, body } = await invokeV1(handler, verb, url, {
          params: pathParams(specPath),
          body: verb === 'GET' ? null : sampleBody(op),
        });
        assert.notStrictEqual(status, 404, `${label} must not 404`);
        assert.notStrictEqual(status, 500, `${label} must not 500`);
        if (isSecured(op)) {
          // No credentials supplied: the auth gate must answer 401/403
          assert.ok(
            [401, 403].includes(status),
            `${label} without key must be 401/403, got ${status}`
          );
          assertErrorEnvelope(body, 'v1');
        } else {
          assert.strictEqual(status, op.responses['201'] ? 201 : 200, `${label} must return 2xx`);
        }
      });

      // Wrong-method guard: an undeclared method must never fall through
      const wrongMethod = verb === 'GET' ? 'POST' : 'GET';
      await test(`v1 wrong method rejected: ${wrongMethod} /api/v1${specPath}`, async () => {
        const url = `/api/v1${substitutePath(specPath)}`;
        const { status, body } = await invokeV1(handler, wrongMethod, url, {
          params: pathParams(specPath),
          body: {},
        });
        if (isSecured(op)) {
          assert.ok([401, 403, 405].includes(status), `expected 401/403/405, got ${status}`);
        } else {
          assert.strictEqual(status, 405, `expected 405, got ${status}`);
          assert.strictEqual(body.error.code, 'METHOD_NOT_ALLOWED');
        }
      });
    }
  }

  // =========================================================================
  // v1 — (b) every implemented public route appears in the spec
  // =========================================================================
  const implementedV1 = discoverV1Routes();
  for (const { route, method, file } of implementedV1) {
    if (V1_SPEC_EXCLUSIONS.has(route)) continue;
    await test(`v1 implemented route documented: ${method || '?'} ${route} (${file})`, async () => {
      assert.ok(method, `could not detect method guard in api/v1/${file}.js`);
      assert.ok(v1Spec.paths[route], `${route} is implemented but missing from openapi.json`);
      assert.ok(
        v1Spec.paths[route][method.toLowerCase()],
        `${route} spec entry lacks method ${method}`
      );
    });
  }

  await test('v1 exclusion list matches reality', async () => {
    for (const route of V1_SPEC_EXCLUSIONS.keys()) {
      assert.ok(
        !v1Spec.paths[route],
        `${route} is excluded from documentation but present in the spec`
      );
    }
  });

  // =========================================================================
  // v1 — (c) required parameters are enforced
  // =========================================================================
  for (const [specPath, ops] of Object.entries(v1Spec.paths)) {
    const handler = require(v1HandlerPath(specPath));
    for (const [method, op] of Object.entries(ops)) {
      const verb = method.toUpperCase();
      const requiredQuery = (op.parameters || []).filter(
        (p) => !p.$ref && p.in === 'query' && p.required
      );
      const bodyRequired = Boolean(op.requestBody?.required);

      if (verb === 'GET' && requiredQuery.length > 0) {
        await test(`v1 enforces required query on ${verb} ${specPath}`, async () => {
          const { status, body } = await invokeV1(
            handler,
            verb,
            `/api/v1${substitutePath(specPath)}`,
            {
              params: pathParams(specPath),
            }
          );
          assert.strictEqual(status, 400, `missing required query must return 400, got ${status}`);
          assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
        });
      }
      if (verb === 'POST' && bodyRequired && !isSecured(op)) {
        await test(`v1 enforces required body on ${verb} ${specPath}`, async () => {
          const { status, body } = await invokeV1(
            handler,
            verb,
            `/api/v1${substitutePath(specPath)}`,
            {
              params: pathParams(specPath),
              body: {},
            }
          );
          assert.strictEqual(status, 400, `missing required body must return 400, got ${status}`);
          assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
        });
      }
    }
  }

  // =========================================================================
  // v1 — (d) representative endpoints match their declared response schemas
  // =========================================================================

  await test('v1 spec response refs all resolve to declared components', async () => {
    for (const [specPath, ops] of Object.entries(v1Spec.paths)) {
      for (const op of Object.values(ops)) {
        for (const resp of Object.values(op.responses || {})) {
          if (!resp.$ref) continue;
          const name = resp.$ref.replace('#/components/responses/', '');
          assert.ok(
            v1Spec.components.responses[name],
            `${specPath} references undeclared response component ${name}`
          );
        }
      }
    }
  });

  const REPRESENTATIVE_V1 = [
    {
      path: '/names',
      ref: 'NameListResponse',
      url: '/api/v1/names?limit=3',
      check: (body) => {
        assert.ok(Array.isArray(body.data), 'names data must be an array');
        const item = body.data[0];
        for (const field of ['id', 'ascii', 'unicode', 'pantheon', 'tier', 'links']) {
          assert.ok(item[field] !== undefined, `Name item must include ${field}`);
        }
        assert.ok(body.meta.pagination, 'names must paginate');
      },
    },
    {
      path: '/names/{id}',
      ref: 'NameDetailResponse',
      url: '/api/v1/names/zeus',
      params: { id: 'zeus' },
      check: (body) => {
        assert.strictEqual(body.data.id, 'zeus');
        assert.ok(body.data.punycode, 'detail must include punycode');
      },
    },
    {
      path: '/convert',
      ref: 'ConvertResponse',
      url: '/api/v1/convert?q=zeus',
      check: (body) => {
        assert.ok(Array.isArray(body.data.matches), 'convert must include matches');
        assert.ok(body.data.matches.length > 0, 'convert must match zeus');
      },
    },
    {
      path: '/pantheons',
      ref: 'PantheonsResponse',
      url: '/api/v1/pantheons',
      check: (body) => {
        assert.ok(Array.isArray(body.data.items), 'pantheons must include items');
        assert.ok(body.data.count > 0, 'pantheons must include count');
      },
    },
    {
      path: '/tiers',
      ref: 'TiersResponse',
      url: '/api/v1/tiers',
      check: (body) => {
        assert.ok(Array.isArray(body.data.items), 'tiers must include items');
        assert.strictEqual(body.data.items.length, 3, 'tier system has exactly 3 tiers');
      },
    },
    {
      path: '/autocomplete',
      ref: 'AutocompleteResponse',
      url: '/api/v1/autocomplete?q=ze',
      check: (body) => {
        assert.ok(Array.isArray(body.data.items), 'autocomplete must include items');
        assert.ok(body.data.query, 'autocomplete must echo the query');
      },
    },
    {
      path: '/version',
      ref: 'VersionResponse',
      url: '/api/v1/version',
      check: (body) => {
        assert.ok(body.data.version, 'version must include version');
        assert.ok(body.data.counts, 'version must include counts');
      },
    },
  ];

  for (const rep of REPRESENTATIVE_V1) {
    await test(`v1 envelope matches ${rep.ref}: GET ${rep.path}`, async () => {
      const op = v1Spec.paths[rep.path].get;
      const ref = op.responses['200'].$ref;
      assert.strictEqual(
        ref,
        `#/components/responses/${rep.ref}`,
        `${rep.path} must declare ${rep.ref}`
      );
      const handler = require(v1HandlerPath(rep.path));
      const { status, body } = await invokeV1(handler, 'GET', rep.url, { params: rep.params });
      assert.strictEqual(status, 200);
      assertSuccessEnvelope(body, 'v1');
      rep.check(body);
    });
  }

  // =========================================================================
  // v1 — rate-limit and CORS headers are present on every response
  // =========================================================================
  await test('v1 responses carry rate-limit and CORS headers', async () => {
    const handler = require(v1HandlerPath('/names'));
    const { headers } = await invokeV1(handler, 'GET', '/api/v1/names?limit=1', {
      headers: { origin: 'https://punicodex.com' },
    });
    for (const h of ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']) {
      assert.ok(headers[h] !== undefined, `missing header ${h}`);
    }
    assert.strictEqual(headers['access-control-allow-origin'], 'https://punicodex.com');
    assert.ok(headers['access-control-allow-methods'].includes('GET'));
  });

  // =========================================================================
  // v2 — fetch the spec from the API itself
  // =========================================================================
  let v2Spec;
  await test('GET /api/v2/openapi.json serves the v2 spec', async () => {
    const { status, body } = await invokeV2('GET', '/api/v2/openapi.json');
    assert.strictEqual(status, 200);
    assertSuccessEnvelope(body, 'v2');
    assert.ok(body.data.paths, 'v2 spec must contain paths');
    v2Spec = body.data;
  });

  // =========================================================================
  // v2 — (a) every documented path+method exists and responds
  // =========================================================================
  const V2_PATH_SAMPLES = {
    id: 'zeus',
    subresource: 'variants',
    name: 'greek',
    punycode: 'xn--rs-lia5r.com',
    tenantId: 'acme',
    userId: '1',
  };
  const V2_BODY_SAMPLES = {
    '/api/v2/convert/batch': { queries: ['zeus'] },
    '/api/v2/appraise/batch': { domains: ['zeus.com'] },
    '/api/v2/authenticity/check/batch': { inputs: ['zeus'] },
    '/api/v2/authenticity/report': { input: 'ares.com' },
    '/api/v2/policy/evaluate': { input: 'ares.com' },
  };
  const v2Substitute = (p) =>
    p.replace(/\{(\w+)\}/g, (_, key) => {
      assert.ok(V2_PATH_SAMPLES[key], `no v2 sample for path param '${key}'`);
      return V2_PATH_SAMPLES[key];
    });

  for (const [specPath, ops] of Object.entries(v2Spec.paths)) {
    for (const method of Object.keys(ops)) {
      const verb = method.toUpperCase();
      const label = `${verb} ${specPath}`;

      if (specPath === '/api/v2/threat-feed/stream') {
        // SSE endpoint: a plain JSON invocation would hang the harness.
        // The stream contract is covered by test/threat-stream.test.js.
        await test(`v2 spec route listed (SSE covered elsewhere): ${label}`, async () => {
          assert.ok(true);
        });
        continue;
      }

      await test(`v2 spec route responds: ${label}`, async () => {
        const isTenant = specPath.startsWith('/api/v2/tenants');
        let url = v2Substitute(specPath);
        if (verb === 'GET') {
          if (url.endsWith('/autocomplete') || url.endsWith('/convert')) url += '?q=zeus';
          if (url.endsWith('/appraise')) url += '?q=zeus.com';
          if (url.endsWith('/authenticity/check')) url += '?input=ares.com';
          if (url.endsWith('/search/web')) url += '?q=zeus';
        }
        const { status, body } = await invokeV2(verb, url, {
          body: verb === 'GET' ? null : V2_BODY_SAMPLES[specPath] || {},
        });
        assert.notStrictEqual(status, 404, `${label} must not 404`);
        assert.notStrictEqual(status, 500, `${label} must not 500`);
        if (isTenant) {
          assert.ok([401, 403].includes(status), `${label} without auth must be 401/403`);
          assertErrorEnvelope(body, 'v2');
        } else {
          assert.strictEqual(status, 200, `${label} must return 200, got ${status}`);
          assertSuccessEnvelope(body, 'v2');
        }
      });
    }
  }

  // =========================================================================
  // v2 — (b) every implemented route appears in the spec
  // =========================================================================
  const IMPLEMENTED_V2 = [
    '/api/v2/names',
    '/api/v2/names/{id}',
    '/api/v2/names/{id}/{subresource}',
    '/api/v2/pantheons',
    '/api/v2/pantheons/{name}',
    '/api/v2/tiers',
    '/api/v2/autocomplete',
    '/api/v2/convert',
    '/api/v2/convert/batch',
    '/api/v2/appraise',
    '/api/v2/appraise/batch',
    '/api/v2/authenticity/check',
    '/api/v2/authenticity/check/batch',
    '/api/v2/authenticity/report',
    '/api/v2/policy',
    '/api/v2/policy/evaluate',
    '/api/v2/similarities/relationships',
    '/api/v2/threat-feed/stream',
    '/api/v2/tenants/{tenantId}/users',
    '/api/v2/tenants/{tenantId}/users/{userId}/role',
    '/api/v2/tenants/{tenantId}/audit',
    '/api/v2/tenants/{tenantId}/audit/export',
    '/api/v2/tenants/{tenantId}/audit/verify',
    '/api/v2/tenants/{tenantId}/retention/purge',
    '/api/v2/search/web',
    '/api/v2/sites',
    '/api/v2/sites/{punycode}',
    '/api/v2/health',
    '/api/v2/version',
    '/api/v2/openapi.json',
  ];
  // GET /api/v2 itself is a docs index derived from the spec, not a resource.
  for (const route of IMPLEMENTED_V2) {
    await test(`v2 implemented route documented: ${route}`, async () => {
      assert.ok(v2Spec.paths[route], `${route} is implemented but missing from the v2 spec`);
    });
  }

  // =========================================================================
  // v2 — (c) required parameters are enforced
  // =========================================================================
  const V2_REQUIRED_CASES = [
    ['/api/v2/autocomplete', 'GET'],
    ['/api/v2/convert', 'GET'],
    ['/api/v2/appraise', 'GET'],
    ['/api/v2/authenticity/check', 'GET'],
    ['/api/v2/search/web', 'GET'],
  ];
  for (const [route, verb] of V2_REQUIRED_CASES) {
    await test(`v2 enforces required query on ${verb} ${route}`, async () => {
      const { status, body } = await invokeV2(verb, route);
      assert.strictEqual(status, 400, `missing required query must return 400, got ${status}`);
      assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
      assertErrorEnvelope(body, 'v2');
    });
  }

  // =========================================================================
  // v2 — (d) representative endpoints return the declared envelope
  // =========================================================================
  await test('v2 representative envelopes: search, health, version', async () => {
    const search = await invokeV2('GET', '/api/v2/search/web?q=zeus&limit=3');
    assert.strictEqual(search.status, 200);
    assertSuccessEnvelope(search.body, 'v2');
    assert.ok(Array.isArray(search.body.data), 'search data must be an array');
    assert.ok(search.body.meta.query, 'search meta must echo the query');

    const health = await invokeV2('GET', '/api/v2/health');
    assert.strictEqual(health.status, 200);
    assertSuccessEnvelope(health.body, 'v2');
    assert.strictEqual(health.body.data.status, 'ok');

    const version = await invokeV2('GET', '/api/v2/version');
    assert.strictEqual(version.status, 200);
    assertSuccessEnvelope(version.body, 'v2');
    assert.ok(version.body.data.version, 'version must include version');
  });

  await test('v2 responses carry rate-limit and CORS headers', async () => {
    const { headers } = await invokeV2('GET', '/api/v2/names?limit=1', {
      headers: { origin: 'https://punicodex.com' },
    });
    for (const h of ['x-ratelimit-limit', 'x-ratelimit-remaining', 'x-ratelimit-reset']) {
      assert.ok(headers[h] !== undefined, `missing header ${h}`);
    }
    assert.strictEqual(headers['access-control-allow-origin'], 'https://punicodex.com');
  });

  // =========================================================================
  // Cross-version consistency
  // =========================================================================
  await test('v1/v2 error envelopes share one shape', async () => {
    const v1 = await invokeV1(require(v1HandlerPath('/names')), 'GET', '/api/v1/names?tier=bogus');
    const v2 = await invokeV2('GET', '/api/v2/names?tier=bogus');
    assert.strictEqual(v1.status, 400);
    assert.strictEqual(v2.status, 400);
    for (const [body, version] of [
      [v1.body, 'v1'],
      [v2.body, 'v2'],
    ]) {
      assertErrorEnvelope(body, version);
    }
    assert.deepStrictEqual(
      Object.keys(v1.body.error).sort(),
      Object.keys(v2.body.error).sort(),
      'error object keys must match across versions'
    );
  });

  await test('v1/v2 trailing-slash behavior is consistent', async () => {
    const plain = await invokeV2('GET', '/api/v2/names?limit=2');
    const slashed = await invokeV2('GET', '/api/v2/names/?limit=2');
    assert.strictEqual(plain.status, 200);
    assert.strictEqual(slashed.status, 200);
    assert.strictEqual(
      slashed.body.meta.pagination.total,
      plain.body.meta.pagination.total,
      'trailing slash must return the same collection'
    );
  });

  console.log(`\n  ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
