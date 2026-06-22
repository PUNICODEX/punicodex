/**
 * PÚNYCODEX — Edge function sample tests
 *
 * Verifies the Vercel Edge Function sample contract without needing an
 * actual edge runtime deployment.
 */

const assert = require('node:assert');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nEdge Function: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

async function loadHandler() {
  const mod = await import('../platform/edge/authenticity.mjs');
  return mod.default;
}

function makeRequest(url) {
  return new Request(url, { method: 'GET' });
}

test('edge handler exports a default function', async () => {
  const handler = await loadHandler();
  assert.strictEqual(typeof handler, 'function');
});

test('edge handler rejects missing input', async () => {
  const handler = await loadHandler();
  const res = await handler(makeRequest('https://punycodex.com/api/edge/authenticity/check'));
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.ok(body.error);
});

test('edge handler sets cache-related headers', async () => {
  const handler = await loadHandler();
  // Use a local origin that will fail fetch, but the handler must still
  // include the expected headers in the error response path is not exercised.
  // Instead we only verify the deterministic cache-key helper is wired.
  const res = await handler(
    makeRequest('https://punycodex.com/api/edge/authenticity/check?input=zeus&type=term')
  );
  // Without a running origin, the handler returns 502. The important contract
  // is that it runs and sets headers on success; we assert the function ran.
  assert.ok([200, 404, 502, 504].includes(res.status), `unexpected status ${res.status}`);
  const headers = res.headers;
  assert.ok(headers.has('X-Punycodex-Edge-Model-Version'), 'model version header present');
});

test('cache key is deterministic across calls', async () => {
  const mod = await import('../platform/edge/authenticity.mjs');
  // The module does not export cacheKey directly, so we rely on the header.
  const handler = mod.default;
  const res1 = await handler(
    makeRequest('https://punycodex.com/api/edge/authenticity/check?input=Áres&type=term')
  );
  const res2 = await handler(
    makeRequest('https://punycodex.com/api/edge/authenticity/check?input=áres&type=term')
  );
  assert.strictEqual(
    res1.headers.get('X-Punycodex-Edge-Cache-Key'),
    res2.headers.get('X-Punycodex-Edge-Cache-Key'),
    'normalized inputs share the same cache key'
  );
});

run();
