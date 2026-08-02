/**
 * Admin Role Floor Tests (2026-08 audit — privilege escalation regression)
 *
 * The legacy admin surface (api/_utils.js#requireAdmin) used to accept ANY
 * token in admin_sessions — including portal sessions belonging to low-role
 * users. A portal `viewer` could mint enterprise API keys and end live
 * bookings. The guard now loads the session's admin_user_id and, when it is
 * set (portal session), requires the resolved portal user to be an active
 * superadmin. Legacy shared-password tokens (admin_user_id NULL) keep full
 * access — they are the legacy superuser credential.
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-role-floor-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const { invoke, adminHeader } = require('./helpers/http.js');
const { login: legacyAdminLogin } = require('../platform/api/admin.js');
const portalAuth = require('../platform/api/admin-portal-auth.js');

const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const apiKeysHandler = require('../platform/api-handlers/admin/api-keys/index.js');
const bookingsHandler = require('../platform/api-handlers/admin/bookings/index.js');
const endBookingHandler = require('../platform/api-handlers/admin/bookings/[id]/end/index.js');

// Distinct source IPs per login so the shared 'admin-login' rate-limit
// bucket never trips inside this suite.
let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `10.99.0.${ipCounter}`;
}

async function portalLogin(email, password) {
  return invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
    headers: { 'x-forwarded-for': nextIp() },
    body: { email, password },
  });
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

let superToken;
let viewerToken;
let legacyToken;

test('setup: bootstrap superadmin, create a viewer, mint a legacy token', async () => {
  const boot = await portalLogin('admin@punicodex.com', process.env.ADMIN_PASSWORD);
  assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
  assert.strictEqual(boot.body.user.role, 'superadmin');
  superToken = boot.body.token;

  await portalAuth.createUser({
    email: 'floor-viewer@portal.test',
    password: 'floor-viewer-password-123',
    displayName: 'Floor Viewer',
    role: 'viewer',
  });
  const viewer = await portalLogin('floor-viewer@portal.test', 'floor-viewer-password-123');
  assert.strictEqual(viewer.status, 200, JSON.stringify(viewer.body));
  assert.strictEqual(viewer.body.role, 'viewer');
  viewerToken = viewer.body.token;

  const legacy = await legacyAdminLogin(process.env.ADMIN_PASSWORD);
  assert.strictEqual(legacy.success, true);
  legacyToken = legacy.token;
});

test('a viewer portal token gets 403 from POST /api/admin/api-keys', async () => {
  const res = await invoke(apiKeysHandler, 'POST', '/api/admin/api-keys', {
    headers: adminHeader(viewerToken),
    body: { name: 'escalation-attempt', tier: 'enterprise', scopes: ['admin'] },
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
});

test('a viewer portal token gets 403 from a bookings mutation', async () => {
  const res = await invoke(endBookingHandler, 'POST', '/api/admin/bookings/1/end', {
    headers: adminHeader(viewerToken),
    params: { id: '1' },
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(res.body.error, 'Forbidden');
});

test('a viewer portal token gets 403 from legacy admin reads as well', async () => {
  const res = await invoke(bookingsHandler, 'GET', '/api/admin/bookings', {
    headers: adminHeader(viewerToken),
  });
  assert.strictEqual(res.status, 403);
});

test('a superadmin portal token passes POST /api/admin/api-keys', async () => {
  const res = await invoke(apiKeysHandler, 'POST', '/api/admin/api-keys', {
    headers: adminHeader(superToken),
    body: { name: 'superadmin-key', tier: 'pro', scopes: ['names:read'] },
  });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.key.plaintext);
});

test('a legacy x-admin-token passes POST /api/admin/api-keys', async () => {
  const res = await invoke(apiKeysHandler, 'POST', '/api/admin/api-keys', {
    headers: adminHeader(legacyToken),
    body: { name: 'legacy-key', tier: 'free', scopes: ['names:read'] },
  });
  assert.strictEqual(res.status, 201, JSON.stringify(res.body));
  assert.strictEqual(res.body.success, true);
});

test('a missing or unknown token still gets 401, not 403', async () => {
  const missing = await invoke(apiKeysHandler, 'GET', '/api/admin/api-keys');
  assert.strictEqual(missing.status, 401);
  const unknown = await invoke(apiKeysHandler, 'GET', '/api/admin/api-keys', {
    headers: adminHeader('deadbeef'.repeat(8)),
  });
  assert.strictEqual(unknown.status, 401);
});

test('a disabled portal user is refused even with a live session row', async () => {
  await portalAuth.createUser({
    email: 'doomed@portal.test',
    password: 'doomed-password-123',
    role: 'viewer',
  });
  const login = await portalLogin('doomed@portal.test', 'doomed-password-123');
  assert.strictEqual(login.status, 200);
  const doomedToken = login.body.token;

  // Disable the account without destroying the session row: the role floor
  // itself must refuse the token (403), not just session deletion (401).
  const Database = require('better-sqlite3');
  const { getTestDbPath } = require('./helpers/test-db.js');
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE admin_users SET status = 'disabled' WHERE email = ?").run('doomed@portal.test');
  db.close();

  const res = await invoke(apiKeysHandler, 'GET', '/api/admin/api-keys', {
    headers: adminHeader(doomedToken),
  });
  assert.strictEqual(res.status, 403);
});

async function run() {
  console.log('\n▸ Admin Role Floor Tests\n');
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
      console.error(`    ${err.message}`);
      if (err.stack) console.error(err.stack.split('\n').slice(0, 4).join('\n'));
    }
  }
  console.log(`\nAdmin Role Floor: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
