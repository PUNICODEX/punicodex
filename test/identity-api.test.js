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
    assert.ok(schemas[0].includes('CREATE TABLE IF NOT EXISTS account_downloads'));
    assert.ok(schemas[0].includes('UNIQUE(account_id, asset_id)'));
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

  await test('registration and reset await delivery and never falsely report provider failures', async () => {
    emailApi.notifyIdentityActivation = async () => ({
      success: false,
      error: 'provider rejected',
    });
    const registration = await invoke(handler, 'POST', '/api/account/auth/register/', {
      headers: { 'x-forwarded-for': '203.0.113.60' },
      params: { slug: ['auth', 'register'] },
      body: { email: 'delivery-failure@identity.test', password: 'delivery-password-12' },
    });
    assert.strictEqual(registration.status, 503);
    assert.strictEqual(registration.body.code, 'email_delivery_failed');
    assert.ok(!registration.body.message);

    emailApi.notifyIdentityPasswordReset = async () => ({
      success: false,
      error: 'provider rejected',
    });
    const reset = await invoke(handler, 'POST', '/api/account/auth/forgot/', {
      headers: { 'x-forwarded-for': '203.0.113.61' },
      params: { slug: ['auth', 'forgot'] },
      body: { email: 'delivery-failure@identity.test' },
    });
    assert.strictEqual(reset.status, 503);
    assert.strictEqual(reset.body.code, 'email_delivery_failed');
    assert.ok(!reset.body.message);

    emailApi.notifyIdentityActivation = async ({ token }) => {
      emailedToken = token;
      return { success: true };
    };
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

  let otherAccount;
  let otherSession;
  await test('download library enforces auth, CSRF, canonical metadata, dedupe, and account isolation', async () => {
    const identity = require('../platform/api/identity');
    const assetId = 'commons-zeus-zeus-anime-mascot-v1';
    const cookie = cookieFor(setup.body);
    const anonymous = await invoke(handler, 'GET', '/api/account/downloads/', {
      params: { slug: ['downloads'] },
    });
    assert.strictEqual(anonymous.status, 401);

    const rejected = await invoke(handler, 'POST', '/api/account/downloads/', {
      headers: { cookie },
      params: { slug: ['downloads'] },
      body: { assetId },
    });
    assert.strictEqual(rejected.status, 403);
    assert.strictEqual(rejected.body.code, 'csrf_required');

    const first = await invoke(handler, 'POST', '/api/account/downloads/', {
      headers: { cookie, 'x-csrf-token': setup.body.csrfToken },
      params: { slug: ['downloads'] },
      body: { assetId, title: 'Forged title', assetUrl: 'https://attacker.invalid/steal' },
    });
    assert.strictEqual(first.status, 201, JSON.stringify(first.body));
    assert.strictEqual(first.body.item.id, assetId);
    assert.strictEqual(first.body.item.templeId, 'zeus');
    assert.strictEqual(first.body.item.downloadCount, 1);
    assert.notStrictEqual(first.body.item.title, 'Forged title');
    assert.ok(first.body.item.assetUrl.startsWith('/assets/ai-commons/'));
    assert.ok(first.body.item.detailUrl.includes(encodeURIComponent(assetId)));
    assert.ok(first.body.item.firstDownloadedAt);
    assert.ok(first.body.item.lastDownloadedAt);

    const repeated = await invoke(handler, 'POST', '/api/account/downloads/', {
      headers: { cookie, 'x-csrf-token': setup.body.csrfToken },
      params: { slug: ['downloads'] },
      body: { assetId },
    });
    assert.strictEqual(repeated.body.item.downloadCount, 2);
    const list = await invoke(handler, 'GET', '/api/account/downloads/', {
      headers: { cookie },
      params: { slug: ['downloads'] },
    });
    assert.strictEqual(list.body.items.length, 1);
    assert.strictEqual(list.body.items[0].downloadCount, 2);

    otherAccount = await identity.provisionIdentity({
      email: 'other-download-member@identity.test',
      status: 'active',
      verified: true,
    });
    otherSession = await identity.createSession(otherAccount.id, {});
    const otherCookie = cookieFor(otherSession);
    const otherEmpty = await invoke(handler, 'GET', '/api/account/downloads/', {
      headers: { cookie: otherCookie },
      params: { slug: ['downloads'] },
    });
    assert.deepStrictEqual(otherEmpty.body.items, []);
    const otherRecord = await invoke(handler, 'POST', '/api/account/downloads/', {
      headers: { cookie: otherCookie, 'x-csrf-token': otherSession.csrfToken },
      params: { slug: ['downloads'] },
      body: { assetId },
    });
    assert.strictEqual(otherRecord.body.item.downloadCount, 1);

    const invalid = await invoke(handler, 'POST', '/api/account/downloads/', {
      headers: { cookie, 'x-csrf-token': setup.body.csrfToken },
      params: { slug: ['downloads'] },
      body: { assetId: '../../not-a-commons-work' },
    });
    assert.strictEqual(invalid.status, 400);
    assert.strictEqual(invalid.body.code, 'invalid_asset');

    const clearRejected = await invoke(handler, 'DELETE', '/api/account/downloads/', {
      headers: { cookie },
      params: { slug: ['downloads'] },
    });
    assert.strictEqual(clearRejected.status, 403);
    const cleared = await invoke(handler, 'DELETE', '/api/account/downloads/', {
      headers: { cookie, 'x-csrf-token': setup.body.csrfToken },
      params: { slug: ['downloads'] },
    });
    assert.strictEqual(cleared.status, 200);
    assert.strictEqual(cleared.body.success, true);
    const empty = await invoke(handler, 'GET', '/api/account/downloads/', {
      headers: { cookie },
      params: { slug: ['downloads'] },
    });
    assert.deepStrictEqual(empty.body.items, []);
    const otherRemaining = await invoke(handler, 'GET', '/api/account/downloads/', {
      headers: { cookie: otherCookie },
      params: { slug: ['downloads'] },
    });
    assert.strictEqual(otherRemaining.body.items.length, 1);
  });

  await test('download library returns only the latest 100 distinct works', async () => {
    const identity = require('../platform/api/identity');
    const manifest = require('../assets/ai-commons/manifest.json');
    for (const work of manifest.items.slice(0, 101)) {
      await identity.recordDownload(otherAccount.id, work.id);
    }
    const items = await identity.getDownloads(otherAccount.id);
    assert.strictEqual(items.length, 100);
    assert.strictEqual(new Set(items.map((item) => item.id)).size, 100);
    await identity.clearDownloads(otherAccount.id);
    assert.deepStrictEqual(await identity.getDownloads(otherAccount.id), []);
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
