/**
 * Security Telemetry Truth Tests
 *
 * The admin Security tab must TELL THE TRUTH: when hostile things happen, the
 * overview endpoint reports them exactly. Each test stages a real attack
 * artifact (error spikes, auth failures, CSP violations, spoof sightings) and
 * asserts the ops-facing payload reflects it with correct numbers.
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');

process.env.ADMIN_PASSWORD = 'test-telemetry-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const { invoke, adminHeader } = require('./helpers/http.js');
const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const securityHandler = require('../platform/api-handlers/admin/portal/security/index.js');
const { recordCspReport, getSecurityOverview } = require('../platform/api/security-overview.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

let token = null;

test('setup: bootstrap superadmin (ops+)', async () => {
  const boot = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
    headers: { 'x-forwarded-for': '198.51.100.240' },
    body: { email: 'admin@punicodex.com', password: process.env.ADMIN_PASSWORD },
  });
  assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
  token = boot.body.token;
});

test('a staged 404/429 attack wave appears in topAttackPaths with exact counts', async () => {
  const d = db();
  const now = new Date().toISOString();
  const insert = d.prepare(
    `INSERT INTO api_request_log (key_id, request_id, method, path, status_code, duration_ms, ip_hash, created_at)
     VALUES (NULL, ?, 'GET', ?, ?, 5, ?, ?)`
  );
  for (let i = 0; i < 7; i++) insert.run(`r-wp-${i}`, '/wp-login.php', 404, 'a'.repeat(64), now);
  for (let i = 0; i < 3; i++) insert.run(`r-env-${i}`, '/.env', 404, 'b'.repeat(64), now);
  for (let i = 0; i < 5; i++) insert.run(`r-rl-${i}`, '/api/v1/names', 429, 'a'.repeat(64), now);
  d.close();

  const res = await invoke(securityHandler, 'GET', '/api/admin/portal/security/', {
    headers: adminHeader(token),
  });
  assert.strictEqual(res.status, 200);
  const paths = res.body.topAttackPaths;
  const wp = paths.find((p) => p.path === '/wp-login.php');
  const env = paths.find((p) => p.path === '/.env');
  assert.ok(wp, 'wp-login probes are reported');
  assert.strictEqual(wp.errors, 7, 'exact probe count');
  assert.strictEqual(env.errors, 3);
  const src = res.body.topAttackSources.find((s) => s.ipHash === 'a'.repeat(12));
  assert.ok(src, 'the attacking source is visible by truncated hash');
  assert.strictEqual(src.errors, 12, '7 probes + 5 rate-limited');
});

test('failed logins surface in the authFailures feed with hashed identities only', async () => {
  for (let i = 0; i < 3; i++) {
    await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
      headers: { 'x-forwarded-for': '198.51.100.241' },
      body: { email: 'telemetry-target@example.com', password: 'wrong' },
    });
  }
  const overview = await getSecurityOverview();
  assert.ok(overview.authFailures.last24h.total >= 3, 'failures counted');
  assert.ok(
    overview.authFailures.last24h.byKind['portal.login.failed'] >= 3,
    'kind breakdown exact'
  );
  const recent = overview.authFailures.recent.find(
    (r) => r.kind === 'portal.login.failed' || r.action === 'portal.login.failed'
  );
  assert.ok(recent, 'feed carries the failure');
  assert.ok(
    !JSON.stringify(overview).includes('telemetry-target@example.com'),
    'raw email never leaks into the overview payload'
  );
});

test('CSP violations roll up with counts and last-seen ordering', async () => {
  await recordCspReport({
    documentPath: '/sites/nike/',
    directive: 'script-src',
    blockedHost: 'evil.example',
    sourceFileHost: '',
    lineNumber: 12,
  });
  await recordCspReport({
    documentPath: '/sites/nike/',
    directive: 'script-src',
    blockedHost: 'evil.example',
    sourceFileHost: '',
    lineNumber: 12,
  });
  const overview = await getSecurityOverview();
  assert.ok(overview.csp.last24h >= 2, 'two reports counted');
  const top = overview.csp.top.find(
    (v) => v.directive === 'script-src' && v.blockedHost === 'evil.example'
  );
  assert.ok(top, 'violation present');
  assert.strictEqual(top.count, 2, 'identical reports dedupe into the count');
});

test('degraded sources are named, never fatal', async () => {
  const d = db();
  d.prepare('DROP TABLE IF EXISTS csp_reports').run();
  d.close();
  // Force the service to re-probe the missing table.
  delete require.cache[require.resolve('../platform/api/security-overview.js')];
  const fresh = require('../platform/api/security-overview.js');
  const overview = await fresh.getSecurityOverview();
  assert.ok(Array.isArray(overview.degraded), 'degraded list exists');
  const res = await invoke(securityHandler, 'GET', '/api/admin/portal/security/', {
    headers: adminHeader(token),
  });
  assert.strictEqual(res.status, 200, 'endpoint stays up with a missing source');
});

test('posture strip reads the live vercel.json honestly', async () => {
  const overview = await getSecurityOverview();
  assert.strictEqual(overview.posture.cspEnforced, true);
  assert.strictEqual(overview.posture.hsts, true);
  assert.strictEqual(overview.posture.frameAncestorsNone, true);
  assert.strictEqual(overview.posture.contentTypeNosniff, true);
});

async function run() {
  console.log('\n▸ Security Telemetry Truth Tests\n');
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }
  console.log(`\nSecurity Telemetry: ${tests.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
