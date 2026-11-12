const assert = require('node:assert');

process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.PLATFORM_URL = 'https://punicodex.com';
const { prepareTestDb } = require('./helpers/test-db');
prepareTestDb(__filename);

const { invoke } = require('./helpers/http');
const handler = require('../api/account/[[...slug]].js');

function cookieFor(session) {
  return `punicodex_session=${session.token}; punicodex_csrf=${session.csrfToken}`;
}

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
  console.log('\n▸ Public Identity API\n');
  let emailedToken = null;
  const emailApi = require('../platform/api/email');
  emailApi.notifyIdentityActivation = async ({ token }) => {
    emailedToken = token;
    return { success: true };
  };
  await test('Postgres schema self-healing uses multi-statement exec, never prepared run', async () => {
    const identityMigration = require('../platform/db/migrate-identity');
    const tenantMigration = require('../platform/db/migrate-tenant-portal');
    const analyticsMigration = require('../platform/db/migrate-analytics-slot');
    const schemas = [];
    const helpers = {
      isPostgres: () => true,
      exec: async (sql) => schemas.push(sql),
      run: async () => {
        throw new Error('multi-statement schema must not use prepared run');
      },
    };
    await identityMigration.migratePostgres(helpers);
    await tenantMigration.migratePostgres(helpers);
    assert.strictEqual(schemas.length, 2);
    assert.ok(schemas[0].includes('CREATE TABLE IF NOT EXISTS accounts'));
    assert.ok(schemas[0].includes('CREATE TABLE IF NOT EXISTS account_sessions'));
    assert.ok(schemas[1].includes('CREATE TABLE IF NOT EXISTS tenant_accounts'));
    assert.ok(schemas[1].includes('SERIAL PRIMARY KEY'));

    const statements = [];
    await analyticsMigration.migratePostgres({
      isPostgres: () => true,
      run: async (sql) => statements.push(sql),
    });
    assert.strictEqual(statements.length, 4);
    assert.ok(statements[0].includes('slot_slug TEXT'));
    assert.ok(statements[1].includes('visible_seconds REAL'));
    assert.ok(statements[2].includes('visible_percent REAL'));
  });

  let setup;
  await test('register and activation set a secure session without exposing account existence', async () => {
    const registration = await invoke(handler, 'POST', '/api/account/auth/register/', {
      headers: { 'x-forwarded-for': '203.0.113.50' },
      params: { slug: ['auth', 'register'] },
      body: { email: 'api-member@identity.test', password: 'api-password-12' },
    });
    assert.strictEqual(registration.status, 200);
    assert.ok(registration.body.message.includes('If this email can be registered'));
    assert.ok(emailedToken, 'activation email carries the one-time token');
    setup = await invoke(handler, 'POST', '/api/account/auth/set-password/', {
      params: { slug: ['auth', 'set-password'] },
      body: { token: emailedToken, password: 'api-password-12' },
    });
    assert.strictEqual(setup.status, 200, JSON.stringify(setup.body));
    assert.ok(setup.body.csrfToken);
    assert.ok(
      setup.headers['set-cookie'].some((cookie) => cookie.includes('punicodex_session=')),
      JSON.stringify(setup.headers)
    );
    assert.ok(setup.headers['set-cookie'].some((cookie) => cookie.includes('punicodex_csrf=')));
  });

  await test('/me exposes only the signed-in identity and initiation writes require CSRF', async () => {
    const cookie = cookieFor(setup.body);
    const me = await invoke(handler, 'GET', '/api/account/me/', {
      headers: { cookie },
      params: { slug: ['me'] },
    });
    assert.strictEqual(me.status, 200, JSON.stringify(me.body));
    assert.strictEqual(me.headers['cache-control'], 'no-store');
    assert.strictEqual(me.body.account.email, 'api-member@identity.test');
    assert.ok(me.body.capabilities.includes('store.purchase'));
    assert.ok(!JSON.stringify(me.body).includes('password_hash'));

    const rejected = await invoke(handler, 'PUT', '/api/account/initiation/', {
      headers: { cookie },
      params: { slug: ['initiation'] },
      body: { currentChapter: 3 },
    });
    assert.strictEqual(rejected.status, 403);
    assert.strictEqual(rejected.body.code, 'csrf_required');

    const accepted = await invoke(handler, 'PUT', '/api/account/initiation/', {
      headers: { cookie, 'x-csrf-token': setup.body.csrfToken },
      params: { slug: ['initiation'] },
      body: { currentChapter: 3 },
    });
    assert.strictEqual(accepted.status, 200, JSON.stringify(accepted.body));
    assert.strictEqual(accepted.body.currentChapter, 3);
  });

  await test('login rejects bad credentials generically then succeeds with the real password', async () => {
    const bad = await invoke(handler, 'POST', '/api/account/auth/login/', {
      headers: { 'x-forwarded-for': '203.0.113.51' },
      params: { slug: ['auth', 'login'] },
      body: { email: 'api-member@identity.test', password: 'wrong-password' },
    });
    assert.strictEqual(bad.status, 401);
    assert.strictEqual(bad.body.code, 'invalid_credentials');

    const good = await invoke(handler, 'POST', '/api/account/auth/login/', {
      headers: { 'x-forwarded-for': '203.0.113.52' },
      params: { slug: ['auth', 'login'] },
      body: { email: 'api-member@identity.test', password: 'api-password-12' },
    });
    assert.strictEqual(good.status, 200, JSON.stringify(good.body));
    assert.strictEqual(good.body.account.email, 'api-member@identity.test');
  });

  await test('logout revokes the session and clears the cookies', async () => {
    const cookie = cookieFor(setup.body);
    const logout = await invoke(handler, 'POST', '/api/account/auth/logout/', {
      headers: { cookie, 'x-csrf-token': setup.body.csrfToken },
      params: { slug: ['auth', 'logout'] },
      body: {},
    });
    assert.strictEqual(logout.status, 200);
    const me = await invoke(handler, 'GET', '/api/account/me/', {
      headers: { cookie },
      params: { slug: ['me'] },
    });
    assert.strictEqual(me.status, 401);
  });

  console.log('  ✓ all public identity API contracts passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
