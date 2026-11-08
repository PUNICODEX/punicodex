const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { test, before } = require('node:test');

process.env.ADMIN_PASSWORD = 'route-authority-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.PLATFORM_URL = 'https://punicodex.com';

const ROOT = path.join(__dirname, '..');
const { prepareTestDb } = require('./helpers/test-db');
prepareTestDb(__filename);

const { invoke, adminHeader } = require('./helpers/http');
const { resolveApiHandler } = require('./helpers/api-routes');
const portalAuth = require('../platform/api/admin-portal-auth');
const identity = require('../platform/api/identity');

const HANDLER_ROOT = path.join(ROOT, 'platform', 'api-handlers', 'admin', 'portal');
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : entry.name.endsWith('.js') ? [full] : [];
  });
}

test('every admin handler except public login enforces portal authentication', () => {
  const missing = [];
  for (const file of walk(HANDLER_ROOT)) {
    const rel = path.relative(HANDLER_ROOT, file).replace(/\\/g, '/');
    if (rel === 'login/index.js') continue;
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('portalAuth.requirePortal')) missing.push(rel);
  }
  assert.deepStrictEqual(missing, []);
});

test('identity and identity-analytics routes resolve through the deployed catch-all', () => {
  const id = crypto.randomUUID();
  for (const route of [
    '/api/admin/portal/identities/',
    `/api/admin/portal/identities/${id}/`,
    `/api/admin/portal/identities/${id}/status/`,
    '/api/admin/portal/analytics/identity/',
  ]) {
    assert.ok(resolveApiHandler(route), `unresolved: ${route}`);
  }
  for (const file of [
    'identities/index.js',
    'identities/[id]/index.js',
    'identities/[id]/status/index.js',
  ]) {
    const source = fs.readFileSync(path.join(HANDLER_ROOT, file), 'utf8');
    assert.ok(source.includes("requirePortal(req, res, 'users')"), `${file} must require users`);
  }
  const analytics = fs.readFileSync(
    path.join(HANDLER_ROOT, 'analytics', 'identity', 'index.js'),
    'utf8'
  );
  assert.ok(analytics.includes("requirePortal(req, res, 'read')"));
});

let superToken;
let viewerToken;
let account;
before(async () => {
  await portalAuth.bootstrap();
  superToken = (await portalAuth.login('admin@punicodex.com', process.env.ADMIN_PASSWORD)).token;
  await portalAuth.createUser(
    {
      email: 'viewer@authority.test',
      password: 'viewer-password-123',
      role: 'viewer',
      displayName: 'Viewer',
    },
    { user: { email: 'admin@punicodex.com' } }
  );
  viewerToken = (await portalAuth.login('viewer@authority.test', 'viewer-password-123')).token;
  const registration = await identity.register({
    email: 'member@authority.test',
    password: 'member-password-12',
  });
  const activation = await identity.setPassword({
    token: registration.token,
    password: 'member-password-12',
  });
  account = activation.account;
});

test('viewer cannot enumerate or change public identities; superadmin gets a redacted review', async () => {
  const listHandler = require('../platform/api-handlers/admin/portal/identities/index.js');
  const detailHandler = require('../platform/api-handlers/admin/portal/identities/[id]/index.js');
  const statusHandler = require('../platform/api-handlers/admin/portal/identities/[id]/status/index.js');

  const forbidden = await invoke(listHandler, 'GET', '/api/admin/portal/identities/', {
    headers: adminHeader(viewerToken),
  });
  assert.strictEqual(forbidden.status, 403);

  const list = await invoke(
    listHandler,
    'GET',
    '/api/admin/portal/identities/?search=authority.test',
    {
      headers: adminHeader(superToken),
    }
  );
  assert.strictEqual(list.status, 200);
  assert.ok(list.body.items.some((row) => row.id === account.id));

  const detail = await invoke(detailHandler, 'GET', `/api/admin/portal/identities/${account.id}/`, {
    headers: adminHeader(superToken),
    params: { id: account.id },
  });
  assert.strictEqual(detail.status, 200);
  const serialized = JSON.stringify(detail.body);
  assert.ok(!serialized.includes('member-password-12'));
  assert.ok(!serialized.includes('password_hash'));
  assert.ok(!serialized.includes(account.email) || detail.body.account.email === account.email);

  const disabled = await invoke(
    statusHandler,
    'POST',
    `/api/admin/portal/identities/${account.id}/status/`,
    {
      headers: adminHeader(superToken),
      params: { id: account.id },
      body: { status: 'disabled' },
    }
  );
  assert.strictEqual(disabled.status, 200);
  assert.strictEqual(disabled.body.account.status, 'disabled');
  assert.strictEqual((await identity.getAccountById(account.id)).status, 'disabled');

  const enabled = await invoke(
    statusHandler,
    'POST',
    `/api/admin/portal/identities/${account.id}/status/`,
    {
      headers: adminHeader(superToken),
      params: { id: account.id },
      body: { status: 'active' },
    }
  );
  assert.strictEqual(enabled.status, 200);
  assert.strictEqual(enabled.body.account.status, 'active');
});

test('identity analytics is admin-read only and aggregate-only', async () => {
  const handler = require('../platform/api-handlers/admin/portal/analytics/identity/index.js');
  const forbidden = await invoke(handler, 'GET', '/api/admin/portal/analytics/identity/', {
    headers: adminHeader(viewerToken),
  });
  assert.strictEqual(forbidden.status, 200, 'the viewer role has read access');
  assert.ok(forbidden.body.accounts.total >= 1);
  assert.ok(!JSON.stringify(forbidden.body).includes(account.email));
  assert.ok(!JSON.stringify(forbidden.body).includes(account.id));
});
