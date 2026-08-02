/**
 * Router Behavior Tests — the six table catch-all routers.
 *
 * Since the 2026-08 consolidation, six API namespaces are served by catch-all
 * routers: api/[[...slug]].js (root), api/v1, api/admin, api/search,
 * api/analytics, and api/crawler. Vercel delivers the `:slug*` rewrite capture
 * as ONE slash-joined string (?slug=names/zeus); each router splits it,
 * matches its route table (exact static paths win over [param] patterns,
 * mirroring Vercel's predefined > dynamic precedence), writes bracket captures
 * back to req.query under the original folder names, and answers unknown
 * paths with its own 404 shape. This suite pins those four contracts for
 * every router:
 *
 *   (a) string slugs resolve identically to pre-split array slugs;
 *   (b) static beats dynamic when both patterns match;
 *   (c) bracket captures land in req.query under their folder names;
 *   (d) unknown paths get the router's own 404 shape.
 *
 * Route tables are parsed from the router sources for the precedence sweep;
 * behavior is asserted through the exported matchRoute and by driving the
 * exported handlers with stubbed req/res.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const ROOT = path.join(__dirname, '..');

const ROUTERS = [
  { name: 'root', rel: 'api/[[...slug]].js' },
  { name: 'v1', rel: 'api/v1/[[...slug]].js' },
  { name: 'admin', rel: 'api/admin/[[...slug]].js' },
  { name: 'search', rel: 'api/search/[[...slug]].js' },
  { name: 'analytics', rel: 'api/analytics/[[...slug]].js' },
  { name: 'crawler', rel: 'api/crawler/[[...slug]].js' },
];

for (const r of ROUTERS) {
  r.handler = require(path.join(ROOT, r.rel));
}

// ── Route-table parsing (for the precedence sweep) ──────────────────────────

const BRACKET_RE = /^\[(.+)\]$/;

function parseRouteTable(rel) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const patterns = [];
  // The array closes at the first `]` followed by a comma — the `]` inside a
  // quoted bracket segment ('[id]') is always followed by a quote instead.
  const re = /segments:\s*\[([\s\S]*?)\]\s*,/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const inner = m[1].trim();
    if (!inner) {
      patterns.push([]);
      continue;
    }
    patterns.push([...inner.matchAll(/'([^']*)'/g)].map((x) => x[1]));
  }
  return patterns;
}

function isDynamicPattern(segments) {
  return segments.some((s) => BRACKET_RE.test(s));
}

/** Does dynamic pattern d match the concrete segments of s (same length)? */
function dynamicMatches(d, s) {
  if (d.length !== s.length) return false;
  for (let i = 0; i < d.length; i++) {
    if (BRACKET_RE.test(d[i])) continue;
    if (d[i] !== s[i]) return false;
  }
  return true;
}

/** Concrete parts for a pattern: bracket positions filled with a sample. */
function concreteParts(pattern, sample = 'sample-segment') {
  return pattern.map((s) => (BRACKET_RE.test(s) ? sample : s));
}

// ── HTTP harness (mirrors helpers/http.js, also resolves final req.query) ───

function call(handler, method, url, { slug } = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url, 'http://localhost');
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = url;
    req.headers = {};
    req.body = null;
    req.query = Object.fromEntries(parsed.searchParams);
    if (slug !== undefined) req.query.slug = slug;
    req.path = parsed.pathname.replace(/^\/api\/v\d+/, '') || '';

    const res = new http.ServerResponse(req);
    let statusCode = 200;
    let responseBody = null;
    let ended = false;
    res.setHeader = () => res;
    res.status = (code) => {
      statusCode = code;
      return res;
    };
    const finish = (data) => {
      if (ended) return;
      ended = true;
      if (data !== undefined) responseBody = data;
      resolve({ status: statusCode, body: responseBody, query: req.query });
    };
    res.json = finish;
    res.send = finish;
    res.end = () => finish();

    const result = handler(req, res);
    if (result && typeof result.then === 'function') {
      result.catch((err) => finish({ error: err.message }));
    }
  });
}

// ── Suite scaffolding ─────────────────────────────────────────────────────────

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ── Sanity: exports + dev self-check ─────────────────────────────────────────

test('all six catch-all routers export matchRoute and pass their self-check', () => {
  for (const r of ROUTERS) {
    assert.strictEqual(typeof r.handler.matchRoute, 'function', `${r.name} exports matchRoute`);
    assert.strictEqual(typeof r.handler.selfCheck, 'function', `${r.name} exports selfCheck`);
    assert.doesNotThrow(() => r.handler.selfCheck(), `${r.name} table covers its handler tree`);
  }
});

// ── (a) string slugs resolve identically to pre-split array slugs ────────────
// Vercel forwards the :slug* capture as one slash-joined string; the routers
// must split it so both forms reach the same handler with the same captures.

// One cheap, deterministic real route per router, driven both ways.
const PROBES = {
  root: {
    method: 'GET',
    slug: 'health',
    expect: (res) => res.status === 200 && res.body?.status === 'ok',
    normalize: (body) => body,
  },
  v1: {
    method: 'GET',
    slug: 'version',
    // The success envelope carries a volatile requestId/timestamp in meta.
    expect: (res) => res.status === 200 && res.body && res.body.success === true,
    normalize: (body) => ({ success: body.success, data: body.data }),
  },
  admin: {
    method: 'GET',
    slug: 'portal/login',
    expect: (res) => res.status === 405,
    normalize: (body) => body,
  },
  search: {
    method: 'GET',
    slug: 'suggest',
    expect: (res) => res.status === 200 && Array.isArray(res.body?.suggestions),
    normalize: (body) => body,
  },
  analytics: {
    method: 'GET',
    slug: 'collect',
    expect: (res) => res.status === 405,
    normalize: (body) => body,
  },
  crawler: {
    method: 'GET',
    slug: 'stats',
    expect: (res) => res.status === 200 && typeof res.body?.total_sites === 'number',
    normalize: (body) => body,
  },
};

// One dynamic route per router that has any, driven both ways; the capture
// must land identically from the joined string and the pre-split array.
const DYNAMIC_PROBES = {
  root: { method: 'GET', parts: ['entry', 'zeus'], captures: { id: 'zeus' } },
  v1: { method: 'GET', parts: ['names', 'zeus'], captures: { id: 'zeus' } },
  admin: { method: 'GET', parts: ['portal', 'patrons', 'abc123'], captures: { id: 'abc123' } },
};

test('(a) string slugs resolve identically to pre-split array slugs', async () => {
  for (const r of ROUTERS) {
    const probe = PROBES[r.name];
    const joined = probe.slug;
    const split = probe.slug.split('/');
    const asString = await call(r.handler, probe.method, `/api/${r.name}/x`, { slug: joined });
    const asArray = await call(r.handler, probe.method, `/api/${r.name}/x`, { slug: split });
    assert.ok(probe.expect(asString), `${r.name}: string slug did not reach the handler`);
    assert.ok(probe.expect(asArray), `${r.name}: array slug did not reach the handler`);
    assert.strictEqual(asString.status, asArray.status, `${r.name}: status differs by slug form`);
    assert.deepStrictEqual(
      probe.normalize(asString.body),
      probe.normalize(asArray.body),
      `${r.name}: response differs by slug form`
    );
  }

  for (const [name, probe] of Object.entries(DYNAMIC_PROBES)) {
    const r = ROUTERS.find((x) => x.name === name);
    const joined = probe.parts.join('/');
    const asString = await call(r.handler, probe.method, `/api/${name}/x`, { slug: joined });
    const asArray = await call(r.handler, probe.method, `/api/${name}/x`, { slug: probe.parts });
    assert.strictEqual(asString.status, asArray.status, `${name}: dynamic status differs`);
    for (const [key, value] of Object.entries(probe.captures)) {
      assert.strictEqual(asString.query[key], value, `${name}: string form lost capture ${key}`);
      assert.strictEqual(asArray.query[key], value, `${name}: array form lost capture ${key}`);
    }
  }
});

// ── (b) static beats dynamic ──────────────────────────────────────────────────

test('(b) every registered route resolves to itself; static routes resolve with empty params', () => {
  for (const r of ROUTERS) {
    const table = parseRouteTable(r.rel);
    assert.ok(table.length > 0, `${r.name}: route table parsed`);
    for (const pattern of table) {
      const parts = concreteParts(pattern);
      const match = r.handler.matchRoute(parts);
      assert.ok(match, `${r.name}: no match for ${pattern.join('/') || '(empty)'}`);
      assert.deepStrictEqual(
        match.route.segments,
        pattern,
        `${r.name}: ${parts.join('/') || '(empty)'} resolved to a different route`
      );
      if (!isDynamicPattern(pattern)) {
        assert.deepStrictEqual(
          match.params,
          {},
          `${r.name}: static route ${pattern.join('/') || '(empty)'} returned captures`
        );
      }
    }
  }
});

test('(b) static beats dynamic wherever a static path and a [param] pattern collide', () => {
  // Sweep: find every (static, dynamic) pair in the table where the dynamic
  // pattern also matches the static route's concrete segments, and assert the
  // static route wins. v1 and admin carry such pairs today (asserted by name
  // below); root/search/analytics/crawler currently have none, so the sweep
  // guards any pair introduced in the future.
  const collisions = {};
  for (const r of ROUTERS) {
    const table = parseRouteTable(r.rel);
    const statics = table.filter((p) => !isDynamicPattern(p));
    const dynamics = table.filter((p) => isDynamicPattern(p));
    collisions[r.name] = [];
    for (const s of statics) {
      for (const d of dynamics) {
        if (!dynamicMatches(d, s)) continue;
        collisions[r.name].push({ static: s.join('/'), dynamic: d.join('/') });
        const match = r.handler.matchRoute(s);
        assert.ok(match, `${r.name}: ${s.join('/')} did not resolve`);
        assert.deepStrictEqual(
          match.route.segments,
          s,
          `${r.name}: dynamic ${d.join('/')} shadowed static ${s.join('/')}`
        );
        assert.deepStrictEqual(
          match.params,
          {},
          `${r.name}: static ${s.join('/')} returned captures (dynamic ${d.join('/')} won)`
        );
      }
    }
  }

  // The canonical colliding pairs must stay in the table and resolve statically.
  assert.ok(
    collisions.v1.some((c) => c.static === 'names/batch' && c.dynamic === 'names/[id]'),
    'v1: names/batch vs names/[id] collision missing from the table'
  );
  assert.ok(
    collisions.admin.some(
      (c) => c.static === 'portal/patrons/stats' && c.dynamic === 'portal/patrons/[id]'
    ),
    'admin: portal/patrons/stats vs portal/patrons/[id] collision missing from the table'
  );

  // Explicitly: the dynamic interpretation still works for non-static values.
  const v1 = ROUTERS.find((r) => r.name === 'v1');
  const byId = v1.handler.matchRoute(['names', 'zeus']);
  assert.deepStrictEqual(byId.route.segments, ['names', '[id]']);
  assert.deepStrictEqual(byId.params, { id: 'zeus' });
  const admin = ROUTERS.find((r) => r.name === 'admin');
  const patron = admin.handler.matchRoute(['portal', 'patrons', '123']);
  assert.deepStrictEqual(patron.route.segments, ['portal', 'patrons', '[id]']);
  assert.deepStrictEqual(patron.params, { id: '123' });
});

test('(b) search, analytics, and crawler carry no [param] routes to collide with', () => {
  // These three tables are static-only today: no static-vs-dynamic case can
  // be constructed, and any path longer than a registered route must 404.
  // If a [param] route is ever added here, extend this suite with a collision
  // case like the v1/admin ones above.
  for (const name of ['search', 'analytics', 'crawler']) {
    const r = ROUTERS.find((x) => x.name === name);
    const dynamics = parseRouteTable(r.rel).filter((p) => isDynamicPattern(p));
    assert.deepStrictEqual(
      dynamics,
      [],
      `${name}: dynamic routes appeared — add a static-beats-dynamic case for them`
    );
  }
  const search = ROUTERS.find((r) => r.name === 'search');
  assert.strictEqual(search.handler.matchRoute(['suggest', 'anything']), null);
  const analytics = ROUTERS.find((r) => r.name === 'analytics');
  assert.strictEqual(analytics.handler.matchRoute(['collect', 'anything']), null);
  const crawler = ROUTERS.find((r) => r.name === 'crawler');
  assert.strictEqual(crawler.handler.matchRoute(['queue', 'anything-else']), null);
});

// ── (c) bracket captures land in req.query under their folder names ──────────

const MATCH_CAPTURE_CASES = {
  root: [
    { parts: ['entry', 'zeus'], params: { id: 'zeus' } },
    { parts: ['sites', 'xn--example-abc', 'spam'], params: { punycode: 'xn--example-abc' } },
    { parts: ['sites', 'xn--example-abc', 'keywords'], params: { punycode: 'xn--example-abc' } },
    { parts: ['tenant-ads', '42', 'analytics'], params: { id: '42' } },
  ],
  v1: [
    { parts: ['names', 'zeus'], params: { id: 'zeus' } },
    { parts: ['names', 'zeus', 'variants'], params: { id: 'zeus' } },
    { parts: ['pantheons', 'greek'], params: { name: 'greek' } },
    { parts: ['threat-feed', 'campaigns', 'id-9'], params: { identityId: 'id-9' } },
  ],
  admin: [
    {
      parts: ['portal', 'applications', 'business', '42', 'approve'],
      params: { kind: 'business', id: '42' },
    },
    { parts: ['api-keys', '7', 'revoke'], params: { id: '7' } },
    { parts: ['portal', 'discounts', '9', 'pitch'], params: { id: '9' } },
  ],
};

test('(c) matchRoute reports bracket captures under their folder names', () => {
  for (const [name, cases] of Object.entries(MATCH_CAPTURE_CASES)) {
    const r = ROUTERS.find((x) => x.name === name);
    for (const c of cases) {
      const match = r.handler.matchRoute(c.parts);
      assert.ok(match, `${name}: no match for ${c.parts.join('/')}`);
      assert.deepStrictEqual(
        match.params,
        c.params,
        `${name}: wrong captures for ${c.parts.join('/')}`
      );
    }
  }
});

// The router (not just matchRoute) must write the captures onto req.query
// before delegating — that is the contract the handlers were built against.
const HANDLER_CAPTURE_CASES = {
  root: [
    {
      method: 'GET',
      parts: ['entry', 'definitely-not-a-real-entry-xyz'],
      expectStatus: 404,
      captures: { id: 'definitely-not-a-real-entry-xyz' },
    },
    {
      method: 'GET',
      parts: ['sites', 'xn--not-real-abc', 'spam'],
      expectStatus: 405, // spam is POST-only; the capture is written before that check
      captures: { punycode: 'xn--not-real-abc' },
    },
  ],
  v1: [
    {
      method: 'GET',
      parts: ['names', 'definitely-not-a-real-entry-xyz'],
      expectStatus: 404,
      captures: { id: 'definitely-not-a-real-entry-xyz' },
    },
  ],
  admin: [
    {
      method: 'GET',
      parts: ['portal', 'applications', 'business', '42', 'approve'],
      expectStatus: 405, // approve is POST-only; the capture is written before that check
      captures: { kind: 'business', id: '42' },
    },
  ],
};

test('(c) the exported handler writes bracket captures onto req.query', async () => {
  for (const [name, cases] of Object.entries(HANDLER_CAPTURE_CASES)) {
    const r = ROUTERS.find((x) => x.name === name);
    for (const c of cases) {
      const res = await call(r.handler, c.method, `/api/${name}/x`, { slug: c.parts.join('/') });
      assert.strictEqual(
        res.status,
        c.expectStatus,
        `${name}: ${c.parts.join('/')} returned ${res.status}`
      );
      for (const [key, value] of Object.entries(c.captures)) {
        assert.strictEqual(
          res.query[key],
          value,
          `${name}: req.query.${key} not set for ${c.parts.join('/')}`
        );
      }
    }
  }
});

// ── (d) unknown paths get the router's own 404 shape ─────────────────────────

test('(d) unknown paths return the router 404 shape, identically for string and array slugs', async () => {
  for (const r of ROUTERS) {
    const asString = await call(r.handler, 'GET', `/api/${r.name}/x`, {
      slug: 'definitely/not/a-real-route',
    });
    const asArray = await call(r.handler, 'GET', `/api/${r.name}/x`, {
      slug: ['definitely', 'not', 'a-real-route'],
    });
    assert.strictEqual(asString.status, 404, `${r.name}: unknown string slug not 404`);
    assert.strictEqual(asArray.status, 404, `${r.name}: unknown array slug not 404`);
    assert.strictEqual(
      asString.query.id,
      undefined,
      `${r.name}: unknown path must not invent captures`
    );
    if (r.name === 'v1') {
      // The v1 error envelope: success:false + error.code NOT_FOUND.
      assert.strictEqual(asString.body.success, false, 'v1: 404 envelope missing success:false');
      assert.strictEqual(asString.body.error.code, 'NOT_FOUND', 'v1: 404 envelope code');
      assert.strictEqual(asArray.body.error.code, 'NOT_FOUND', 'v1: 404 envelope code (array)');
    } else {
      assert.deepStrictEqual(asString.body, { error: 'Not found' }, `${r.name}: 404 body`);
      assert.deepStrictEqual(asArray.body, { error: 'Not found' }, `${r.name}: 404 body (array)`);
    }
  }
});

// ── Runner ─────────────────────────────────────────────────────────────────────

async function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(
        `    ${String(err?.message || err)
          .split('\n')
          .slice(0, 8)
          .join('\n    ')}`
      );
    }
  }
  console.log(`\nRouter Behavior: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
