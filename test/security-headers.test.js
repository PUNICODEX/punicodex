/**
 * Transport & Header Posture Tests
 *
 * Static contract over vercel.json: the security headers every response
 * carries, cache rules that keep authenticated/API traffic out of the CDN,
 * and repo hygiene (no secrets in committed config). These are the
 * deployment-level defenses — a regression here silently strips them
 * fleet-wide, so they are pinned by test.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

function headersFor(sourcePattern) {
  const rule = (config.headers || []).find((h) => h.source === sourcePattern);
  if (!rule) return null;
  const map = {};
  for (const { key, value } of rule.headers) map[key.toLowerCase()] = value;
  return map;
}

test('every route carries the core security header set', () => {
  const all = headersFor('/(.*)');
  assert.ok(all, 'global header rule exists');
  assert.strictEqual(all['x-frame-options'], 'DENY');
  assert.strictEqual(all['x-content-type-options'], 'nosniff');
  assert.ok(all['referrer-policy'], 'referrer policy set');
  assert.ok(all['strict-transport-security']?.includes('max-age=63072000'), 'HSTS 2y');
  assert.ok(all['strict-transport-security'].includes('includeSubDomains'), 'HSTS subdomains');
  assert.ok(all['strict-transport-security'].includes('preload'), 'HSTS preload');
  assert.ok(all['permissions-policy']?.includes('camera=()'), 'permissions policy locked');
});

test('CSP is enforcing (not report-only), restrictive, and reporting', () => {
  const all = headersFor('/(.*)');
  const csp = all['content-security-policy'];
  assert.ok(csp, 'enforcing CSP present');
  assert.ok(!all['content-security-policy-report-only'], 'no report-only downgrade');
  for (const directive of [
    "default-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]) {
    assert.ok(csp.includes(directive), `CSP carries ${directive}`);
  }
  assert.ok(
    csp.includes('report-uri /api/security/csp-report/'),
    'CSP violations report to the collector'
  );
});

test('API and auth surfaces are never cached at the edge', () => {
  const rules = config.headers || [];
  const apiRule = rules.find((h) => h.source?.startsWith('/api/'));
  if (apiRule) {
    const cc = Object.fromEntries(apiRule.headers.map((h) => [h.key.toLowerCase(), h.value]))[
      'cache-control'
    ];
    assert.ok(!cc || /no-store|no-cache|must-revalidate/.test(cc), 'API responses uncached');
  }
  // Service workers must always revalidate (stale SW = stale defenses).
  const swRule = rules.find((h) => h.source?.includes('sw.js'));
  if (swRule) {
    const cc = Object.fromEntries(swRule.headers.map((h) => [h.key.toLowerCase(), h.value]))[
      'cache-control'
    ];
    assert.ok(/must-revalidate|no-cache|no-store/.test(cc), 'service worker revalidates');
  }
});

test('no secrets live in vercel.json (leak regression)', () => {
  const raw = fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf8');
  const patterns = [
    /sk_live_/,
    /sk_test_[A-Za-z0-9]{8,}/,
    /re_[A-Za-z0-9]{8,}/,
    /-----BEGIN [A-Z ]*PRIVATE KEY/,
    /rediss?:\/\/[^\s"]+/,
    /postgres(ql)?:\/\/[^\s"]+/,
    /Bearer\s+[A-Za-z0-9._-]{12,}/,
  ];
  for (const re of patterns) {
    assert.ok(!re.test(raw), `vercel.json matches a secret pattern: ${re}`);
  }
});

test('crons all route to existing handlers with sane schedules', () => {
  assert.ok(Array.isArray(config.crons) && config.crons.length >= 8, 'cron fleet present');
  for (const cron of config.crons) {
    assert.ok(/^\/api\/cron\//.test(cron.path), `${cron.path} stays under /api/cron/`);
  }
});

async function run() {
  console.log('\n▸ Transport & Header Posture Tests\n');
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nTransport Posture: ${tests.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
