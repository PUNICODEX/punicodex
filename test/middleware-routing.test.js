/**
 * Middleware execution tests — runs the real shipped edge middleware
 * (middleware.js, ESM) against a request matrix, plus an exhaustive sweep of
 * every generated DOMAIN_MAP entry (Unicode, punycode, and www variants).
 *
 * Complements the static flywheel validator: this proves the routing logic
 * actually produces the right response for every owned domain, the defensive
 * domains, external redirects, direct-serve domains, legacy paths, clean-URL
 * rewrites, and the API trailing-slash shim — without standing up Vercel.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'middleware.js');

// Fetch pass-throughs are how the middleware says "serve this instead" — stub
// global fetch to capture the URL it would fetch instead of hitting network.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input) => ({
  __fetched: String(input instanceof Request ? input.url : input),
});

let middleware;
let domainMap;

async function loadMiddleware() {
  const tmp = path.join(os.tmpdir(), `punicodex-middleware-${process.pid}.mjs`);
  fs.copyFileSync(SRC, tmp);
  const mod = await import(`file://${tmp.replace(/\\/g, '/')}`);
  middleware = mod.default;

  // Parse the generated DOMAIN_MAP block (single-quoted 'domain': '/sites/id').
  const src = fs.readFileSync(SRC, 'utf8');
  const block = src.match(/const DOMAIN_MAP = \{([\s\S]*?)\n\};/)[1];
  domainMap = new Map();
  for (const m of block.matchAll(/'([^']+)':\s*'\/sites\/([^']+)'/g)) {
    domainMap.set(m[1], m[2]);
  }
}

function req(url, host) {
  return new Request(url, { headers: { host: host || new URL(url).host } });
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
  }
}

async function run() {
  console.log('\n▸ Middleware Execution Tests\n');
  await loadMiddleware();
  assert.ok(domainMap.size > 500, `expected 500+ domain mappings, got ${domainMap.size}`);

  await test('unicode deity domain 301s to the clean punicodex.com path', async () => {
    const res = await middleware(req('https://achérōn.com/'));
    assert.strictEqual(res.status, 301);
    const loc = res.headers.get('Location');
    assert.ok(loc.startsWith('https://punicodex.com/acheron'), loc);
  });

  await test('paths and query survive the domain redirect', async () => {
    const res = await middleware(req('https://achérōn.com/lore/?x=1'));
    const loc = res.headers.get('Location');
    assert.ok(loc.includes('/acheron/lore/'), loc);
    assert.ok(loc.includes('x=1'), loc);
  });

  await test('www variant routes identically', async () => {
    const res = await middleware(req('https://www.achérōn.com/'));
    assert.strictEqual(res.status, 301);
    assert.ok(res.headers.get('Location').includes('/acheron'));
  });

  await test('punycode host routes to the same temple as its Unicode form', async () => {
    const { domainToASCII } = require('node:url');
    const ascii = domainToASCII('achérōn.com');
    assert.ok(ascii.startsWith('xn--'));
    const res = await middleware(req(`https://${ascii}/`));
    assert.strictEqual(res.status, 301);
    assert.ok(res.headers.get('Location').includes('/acheron'));
  });

  await test('defensive brand domains 301 to punicodex.com', async () => {
    for (const host of ['punycodex.com', 'www.punycodex.com', 'www.punicodex.com']) {
      const res = await middleware(req(`https://${host}/lexicon/`));
      assert.strictEqual(res.status, 301);
      const loc = res.headers.get('Location');
      assert.ok(loc.startsWith('https://punicodex.com/lexicon/'), `${host}: ${loc}`);
    }
  });

  await test('external-redirect domain goes to its canonical target', async () => {
    const res = await middleware(req('https://xn--kxaqik.com/'));
    assert.strictEqual(res.status, 301);
    assert.strictEqual(res.headers.get('Location'), 'https://punicodex.com/nike');
  });

  await test('direct-serve domain serves the temple in place (no redirect)', async () => {
    const res = await middleware(req('https://helheimr.com/lore/'));
    assert.ok(res.__fetched, 'must be a fetch pass-through, not a redirect');
    assert.ok(res.__fetched.includes('/sites/helheimr/lore/'), res.__fetched);
    // Root-relative static assets are served from the project root.
    const asset = await middleware(req('https://helheimr.com/js/temple-base.js'));
    assert.ok(asset.__fetched.endsWith('/js/temple-base.js'), asset.__fetched);
  });

  await test('legacy archetype paths 301 to the current canonical id', async () => {
    const res = await middleware(req('https://punicodex.com/enki'));
    assert.strictEqual(res.status, 301);
    assert.ok(res.headers.get('Location').includes('/ea'), res.headers.get('Location'));
  });

  await test('clean archetype URLs rewrite internally to /sites/{id}', async () => {
    const res = await middleware(req('https://punicodex.com/zeus/gallery/'));
    assert.ok(res.__fetched, 'must be a fetch pass-through');
    assert.ok(res.__fetched.includes('/sites/zeus/gallery/'), res.__fetched);
  });

  await test('API calls without trailing slash are shimmed internally (no 308)', async () => {
    const res = await middleware(req('https://punicodex.com/api/v1/names'));
    assert.ok(res.__fetched, 'must be a fetch pass-through');
    assert.ok(res.__fetched.includes('/api/v1/names/'), res.__fetched);
  });

  await test('unknown hosts and paths pass through untouched', async () => {
    const res = await middleware(req('https://example.com/anything'));
    assert.ok(res.__fetched);
    assert.ok(!res.__fetched.includes('/sites/'), res.__fetched);
  });

  await test('every DOMAIN_MAP entry routes to a live temple path (exhaustive)', async () => {
    const failures = [];
    for (const [domain, id] of domainMap) {
      // Skip external-redirect domains (they point off-host by design).
      if (['νίκη.com', 'xn--kxaqik.com', 'www.νίκη.com', 'www.xn--kxaqik.com'].includes(domain)) {
        continue;
      }
      if (domain === 'helheimr.com' || domain === 'www.helheimr.com') continue; // direct-serve
      const res = await middleware(req(`https://${domain}/`));
      if (res.status !== 301) {
        failures.push(`${domain}: status ${res.status}`);
        continue;
      }
      const loc = res.headers.get('Location') || '';
      if (!loc.includes(`/${id}`)) failures.push(`${domain}: ${loc} missing /${id}`);
    }
    assert.deepStrictEqual(failures.slice(0, 10), [], `${failures.length} routing failures`);
  });

  globalThis.fetch = realFetch;
  console.log(`\nMiddleware Execution: ${passed} passed, ${failed} failed (${domainMap.size} domains swept)`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  globalThis.fetch = realFetch;
  console.error(err);
  process.exit(1);
});
