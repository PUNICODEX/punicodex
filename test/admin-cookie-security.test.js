const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'admin-cookie-security-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
const { prepareTestDb } = require('./helpers/test-db');
prepareTestDb(__filename);

const { invoke, adminHeader } = require('./helpers/http');
const identity = require('../platform/api/identity');
const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const meHandler = require('../platform/api-handlers/admin/portal/me/index.js');
const statusHandler = require('../platform/api-handlers/admin/portal/identities/[id]/status/index.js');
const logoutHandler = require('../platform/api-handlers/admin/portal/logout/index.js');

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err.stack || err.message}`);
    process.exit(1);
  }
}

async function run() {
  console.log('\n▸ Admin Cookie Security\n');
  let token;
  let csrf;
  let account;
  await test('login sets separate HttpOnly session and readable CSRF cookies', async () => {
    const registration = await identity.register({
      email: 'cookie-target@identity.test',
      password: 'target-password-12',
    });
    account = (
      await identity.setPassword({ token: registration.token, password: 'target-password-12' })
    ).account;
    const res = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
      headers: { 'x-forwarded-for': '198.51.100.40' },
      body: { email: 'admin@punicodex.com', password: process.env.ADMIN_PASSWORD },
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    token = res.body.token;
    csrf = res.body.csrfToken;
    assert.ok(token && csrf);
    assert.ok(
      res.headers['set-cookie'].some((cookie) => cookie.includes('punicodex_admin_session='))
    );
    assert.ok(res.headers['set-cookie'].some((cookie) => cookie.includes('punicodex_admin_csrf=')));
    assert.ok(res.headers['set-cookie'].some((cookie) => cookie.includes('HttpOnly')));
  });

  await test('cookie session authenticates reads; mutations require the matching CSRF token', async () => {
    const cookie = `punicodex_admin_session=${token}; punicodex_admin_csrf=${csrf}`;
    const me = await invoke(meHandler, 'GET', '/api/admin/portal/me/', { headers: { cookie } });
    assert.strictEqual(me.status, 200, JSON.stringify(me.body));

    const rejected = await invoke(
      statusHandler,
      'POST',
      `/api/admin/portal/identities/${account.id}/status/`,
      {
        headers: { cookie },
        params: { id: account.id },
        body: { status: 'disabled' },
      }
    );
    assert.strictEqual(rejected.status, 403);
    assert.strictEqual(rejected.body.code, 'csrf_required');

    const accepted = await invoke(
      statusHandler,
      'POST',
      `/api/admin/portal/identities/${account.id}/status/`,
      {
        headers: { cookie, 'x-csrf-token': csrf },
        params: { id: account.id },
        body: { status: 'disabled' },
      }
    );
    assert.strictEqual(accepted.status, 200, JSON.stringify(accepted.body));
    assert.strictEqual(accepted.body.account.status, 'disabled');
  });

  await test('legacy x-admin-token writes remain compatible without CSRF cookies', async () => {
    const accepted = await invoke(
      statusHandler,
      'POST',
      `/api/admin/portal/identities/${account.id}/status/`,
      {
        headers: adminHeader(token),
        params: { id: account.id },
        body: { status: 'active' },
      }
    );
    assert.strictEqual(accepted.status, 200, JSON.stringify(accepted.body));
    assert.strictEqual(accepted.body.account.status, 'active');
  });

  await test('logout destroys the session and clears both cookies', async () => {
    const cookie = `punicodex_admin_session=${token}; punicodex_admin_csrf=${csrf}`;
    const res = await invoke(logoutHandler, 'POST', '/api/admin/portal/logout/', {
      headers: { cookie, 'x-csrf-token': csrf },
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.headers['set-cookie'].some((cookie) => cookie.includes('Max-Age=0')));
    const me = await invoke(meHandler, 'GET', '/api/admin/portal/me/', { headers: { cookie } });
    assert.strictEqual(me.status, 401);
  });

  console.log('  ✓ all admin cookie security contracts passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
