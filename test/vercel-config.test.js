/**
 * vercel.json configuration contract.
 *
 * Guards the failure modes that have actually hurt this project:
 *  1. valid JSON with exactly one instance of each top-level key (the
 *     historical duplicate-"redirects" incident broke all routing)
 *  2. no domain redirects/rewrites in vercel.json — middleware.js owns all
 *     domain routing (the other half of that incident)
 *  3. rewrites only ever point at api/ destinations
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
    assert.strictEqual(
      config.redirects,
      undefined,
      'vercel.json must not carry a redirects array'
    );
    for (const rw of config.rewrites || []) {
      assert.ok(
        rw.destination.startsWith('/api/'),
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
      assert.ok(
        fs.existsSync(file) || fs.existsSync(alt),
        `missing handler for cron ${cron.path}`
      );
      assert.ok(
        /^(\S+\s+){4}\S+$/.test(cron.schedule),
        `invalid cron schedule: ${cron.schedule}`
      );
    }
  });

  test('API trailing-slash policy stays enabled', () => {
    assert.strictEqual(config.trailingSlash, true, 'trailingSlash must stay true');
  });

  console.log(`\nVercel Config: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
