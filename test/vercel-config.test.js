/**
 * vercel.json configuration contract.
 *
 * Guards the failure modes that have actually hurt this project:
 *  1. valid JSON with exactly one instance of each top-level key (the
 *     historical duplicate-"redirects" incident broke all routing)
 *  2. no domain redirects/rewrites in vercel.json — middleware.js owns all
 *     domain routing (the other half of that incident)
 *  3. rewrites only ever point at api/ destinations — with one whitelisted
 *     exception: static-asset offload proxies (source path under /assets/)
 *     to our own media hosts, which serve files, not routes
 *  4. required security headers are present on all routes with exact values
 *  5. cron entries reference existing api/cron handlers with valid schedules
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

const REQUIRED_HEADERS = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
};

// Static-media offload hosts: our own static deployments serving print
// masters and other heavy assets. Proxying /assets/ paths to them is file
// hosting, not domain routing (deity/unicode domains stay in middleware.js).
const MEDIA_PROXY_HOSTS = new Set(['punycodex-masters.vercel.app']);

function isStaticAssetProxy(rw) {
  if (!rw.source.includes('/assets/')) return false;
  try {
    return MEDIA_PROXY_HOSTS.has(new URL(rw.destination).host);
  } catch {
    return false;
  }
}

function run() {
  console.log('\n▸ Vercel Config Contract\n');
  const raw = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');

  test('vercel.json is valid JSON with unique top-level keys', () => {
    JSON.parse(raw); // throws on invalid JSON
    const keys = [...raw.matchAll(/^  "([a-zA-Z]+)":/gm)].map((m) => m[1]);
    const dupes = keys.filter((k, i) => keys.indexOf(k) !== i);
    assert.deepStrictEqual([...new Set(dupes)], [], 'duplicate top-level keys');
  });

  const config = JSON.parse(raw);

  test('no domain redirects live in vercel.json (middleware owns routing)', () => {
    assert.strictEqual(config.redirects, undefined, 'vercel.json must not carry a redirects array');
    for (const rw of config.rewrites || []) {
      assert.ok(
        rw.destination.startsWith('/api/') || isStaticAssetProxy(rw),
        `rewrite to non-api destination: ${rw.destination}`
      );
    }
  });

  test('required security headers are set on all routes', () => {
    const all = (config.headers || []).find((h) => h.source === '/(.*)');
    assert.ok(all, 'must have a headers rule for /(.*)');
    const map = {};
    for (const h of all.headers) map[h.key.toLowerCase()] = h.value;
    for (const [key, value] of Object.entries(REQUIRED_HEADERS)) {
      assert.strictEqual(map[key], value, `header ${key}`);
    }
  });

  test('every cron points at an existing handler with a valid schedule', () => {
    assert.ok(Array.isArray(config.crons) && config.crons.length > 0, 'crons must exist');
    for (const cron of config.crons) {
      const file = path.join(ROOT, cron.path, 'index.js');
      const alt = path.join(ROOT, `${cron.path}.js`);
      assert.ok(fs.existsSync(file) || fs.existsSync(alt), `missing handler for cron ${cron.path}`);
      assert.ok(/^(\S+\s+){4}\S+$/.test(cron.schedule), `invalid cron schedule: ${cron.schedule}`);
    }
  });

  test('API trailing-slash policy stays enabled', () => {
    assert.strictEqual(config.trailingSlash, true, 'trailingSlash must stay true');
  });

  // Vercel forwards a rewrite capture under the NAME used in the source
  // pattern: ":slug*" arrives as ?slug=..., ":path*" as ?path=.... A
  // [[...slug]] router reads req.query.slug, so a ":path*" capture leaves it
  // undefined and every request falls through to the router's empty-slug
  // branch. That is exactly how all of /api/v2 was dead in production while
  // every test passed (tests inject the slug directly).
  test('catch-all rewrites capture under the name their router reads', () => {
    const offenders = [];
    for (const rewrite of config.rewrites || []) {
      if (!/\[\[\.\.\.slug\]\]$/.test(rewrite.destination || '')) continue;
      const capture = (rewrite.source.match(/:(\w+)\*/) || [])[1];
      if (capture && capture !== 'slug') {
        offenders.push(`${rewrite.source} -> ${rewrite.destination} (captures :${capture}*)`);
      }
    }
    assert.deepStrictEqual(offenders, [], 'catch-all rewrites with a mismatched capture name');
  });

  // Vercel populates req.query (the catch-all routers restore bracket segments
  // there); it never populates req.params. An unguarded req.params.x throws a
  // TypeError on every request, which handleError turns into a silent 500 —
  // exactly how tenant-ad impression tracking was dead.
  test('no handler dereferences req.params without a guard', () => {
    const handlers = [];
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.js')) handlers.push(full);
      }
    })(path.join(ROOT, 'platform', 'api-handlers'));

    const offenders = [];
    for (const file of handlers) {
      const src = fs.readFileSync(file, 'utf8');
      src.split(/\r?\n/).forEach((line, i) => {
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
        // Bare `req.params.foo` — no `?.`, no `req.params &&` guard.
        if (/(?<!\?)\breq\.params\.\w+/.test(line) && !/req\.params\s*&&/.test(line)) {
          offenders.push(`${path.relative(ROOT, file)}:${i + 1}`);
        }
      });
    }
    assert.deepStrictEqual(offenders, [], 'handlers dereferencing req.params unguarded');
  });

  test('every [[...slug]] router splits a string slug', () => {
    // The capture arrives as ONE slash-joined string. A router that treats it
    // as an array reads a character count for .length and a single letter for
    // [0], so no multi-segment route ever matches.
    const routers = [];
    (function walk(dir) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === '[[...slug]].js') routers.push(full);
      }
    })(path.join(ROOT, 'api'));
    assert.ok(routers.length > 0, 'no catch-all routers found');

    const offenders = [];
    for (const file of routers) {
      const src = fs.readFileSync(file, 'utf8');
      const splits = /typeof\s+(\w+)\s*===\s*'string'\)?\s*\1\s*=\s*\1\.split\('\/'\)/.test(src);
      const delegates = /createApiHandler\(/.test(src);
      if (!splits && !delegates) offenders.push(path.relative(ROOT, file));
    }
    assert.deepStrictEqual(offenders, [], 'catch-all routers that never split a string slug');
  });

  console.log(`\nVercel Config: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
