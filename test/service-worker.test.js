/**
 * Service Worker contract tests (sw.js)
 *
 * Regression guard for the 2026-07-26 production failure where the worker
 * intercepted /api/ GETs with a bare `respondWith(fetch(request))` and let
 * document fallbacks resolve `undefined` — any hiccup then surfaced as
 * "Failed to convert value to 'Response'" and hard network errors in the
 * admin portal. The worker must never intercept API or admin traffic, and
 * every respondWith path must be guaranteed to produce a real Response.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('API and admin-portal requests are never intercepted', () => {
  assert.ok(
    sw.includes("url.pathname.startsWith('/api/')") &&
      sw.includes("url.pathname.startsWith('/admin-portal/')"),
    'bypass prefixes present'
  );
  // The bypass must be an early bare return — no respondWith for those paths.
  const apiIdx = sw.indexOf("url.pathname.startsWith('/api/')");
  const slice = sw.slice(apiIdx, apiIdx + 400);
  const retIdx = slice.indexOf('return;');
  assert.ok(retIdx !== -1, 'bypass returns before any respondWith');
  assert.ok(!slice.slice(0, retIdx).includes('respondWith'), 'no respondWith on the bypass path');
  assert.ok(
    !/respondWith\(\s*fetch\([^)]*\)\s*\)/.test(sw),
    'no respondWith(fetch(...)) passthrough anywhere — every interception must handle failure'
  );
});

test('every failure path resolves to a guaranteed Response', () => {
  assert.ok(sw.includes('function offlineDocumentResponse()'), 'offline fallback exists');
  assert.ok(sw.includes('new Response('), 'fallback constructs a real Response');
  assert.ok(
    sw.includes('.catch(() => offlineDocumentResponse())'),
    'final catch guarantees Response'
  );
});

test('cache revision is bumped so broken workers are flushed', () => {
  const m = sw.match(/punicodex-shell-v(\d+)/);
  assert.ok(m, 'shell cache name versioned');
  assert.ok(Number(m[1]) >= 3, 'shell cache must be v3+ to evict the broken v2 worker caches');
});

// Behavioral proof: drive the worker with mocked caches/fetch and assert that
// API and admin requests fall through without respondWith, and that a failed
// document fetch still resolves to a real Response.
test('behavior: API/admin fall through; document failure still yields a Response', async () => {
  const listeners = {};
  const intercepted = [];
  const sandbox = {
    self: {
      addEventListener: (type, fn) => {
        listeners[type] = fn;
      },
      location: { origin: 'https://punicodex.com' },
    },
    caches: {
      open: async () => ({ put: async () => {} }),
      match: async () => undefined,
      keys: async () => [],
      delete: async () => true,
    },
    fetch: async () => {
      throw new Error('network down');
    },
    Response: class {
      constructor(body, init) {
        this.body = body;
        this.init = init;
      }
    },
    URL,
    Promise,
    Error,
  };
  vm.createContext(sandbox);
  vm.runInContext(sw, sandbox);
  assert.ok(listeners.fetch, 'fetch listener registered');

  async function dispatch(url, { method = 'GET', destination = '' } = {}) {
    const event = {
      request: { url, method, destination },
      respondWith: (p) => intercepted.push(p),
    };
    listeners.fetch(event);
    return event;
  }

  await dispatch('https://punicodex.com/api/admin/portal/store-orders/?limit=50');
  await dispatch('https://punicodex.com/admin-portal/leasing/?tab=orders');
  assert.strictEqual(intercepted.length, 0, 'no respondWith for API or admin requests');

  const _doc = await dispatch('https://punicodex.com/sites/zeus/', { destination: 'document' });
  assert.strictEqual(intercepted.length, 1, 'document is intercepted');
  const res = await intercepted[0];
  assert.ok(res instanceof sandbox.Response, 'document failure still resolves a Response');
  assert.strictEqual(res.init.status, 503, 'offline page is a 503');
});

(async () => {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
  if (failures) {
    console.error(`\n${failures} test(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${tests.length} service worker tests passed`);
})();
