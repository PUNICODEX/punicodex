const assert = require('node:assert');

process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
const { setupTestDb, startScholarsServer } = require('../platform/scholars/test-helpers');
setupTestDb('institution-identity-api');
const { invoke } = require('./helpers/http');
const accountHandler = require('../api/account/[[...slug]].js');
const identity = require('../platform/api/identity');

function centralCookies(headers) {
  const raw = String(headers['set-cookie'] || '');
  const session = raw.match(/punicodex_session=([^;]+)/)?.[1];
  const csrf = raw.match(/punicodex_csrf=([^;]+)/)?.[1];
  assert.ok(session && csrf, `missing central cookies: ${raw}`);
  return { cookie: `punicodex_session=${session}; punicodex_csrf=${csrf}`, csrf };
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
  const api = await startScholarsServer();
  const { request } = api;
  let auth;
  await test('institution admin login issues both legacy and central sessions', async () => {
    const res = await request('POST', '/api/v1/scholars/auth/login/', {
      body: { email: 'admin@loadtest.academy', password: 'AdminPass123!' },
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.ok(res.body.data.identityToken);
    assert.ok(res.body.data.csrfToken);
    auth = centralCookies(res.headers);
    if (process.env.IDENTITY_TEST_DEBUG) {
      console.log('CENTRAL AUTH', auth);
      console.log(
        'SESSIONS',
        await require('../platform/db/operational').all('SELECT * FROM account_sessions')
      );
      const resolved = await identity.resolveSession(
        { headers: { cookie: auth.cookie } },
        { setHeader() {}, clearCookie() {} }
      );
      console.log('RESOLVED', resolved);
    }
  });

  let invitations;
  await test('bulk invitations reject missing CSRF then create and list real one-time links', async () => {
    const payload = {
      emailsText: 'student@identity.test\nsecond@identity.test',
      department: 'Classics',
      role: 'student',
    };
    const rejected = await request('POST', '/api/v1/scholars/institution/invitations/', {
      body: payload,
      headers: { cookie: auth.cookie },
    });
    assert.strictEqual(rejected.status, 403, JSON.stringify(rejected.body));
    assert.strictEqual(rejected.body.code, 'csrf_required');

    const created = await request('POST', '/api/v1/scholars/institution/invitations/', {
      body: payload,
      headers: { cookie: auth.cookie, 'x-csrf-token': auth.csrf },
    });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    assert.strictEqual(created.body.data.items.length, 2);
    assert.ok(created.body.data.items.every((item) => item.setupPath.includes('token=')));
    invitations = created.body.data.items;

    const listed = await request('GET', '/api/v1/scholars/institution/invitations/', {
      headers: { cookie: auth.cookie },
    });
    assert.strictEqual(listed.status, 200);
    assert.strictEqual(listed.body.data.items.length, 2);
    assert.ok(!JSON.stringify(listed.body).includes('setupPath'));
  });

  await test('invitation acceptance creates a linked student and applies institution policy', async () => {
    const token = decodeURIComponent(invitations[0].setupPath.split('token=')[1]);
    const accepted = await invoke(accountHandler, 'POST', '/api/account/auth/set-password/', {
      params: { slug: ['auth', 'set-password'] },
      body: { token, password: 'student-password-12' },
    });
    assert.strictEqual(accepted.status, 200, JSON.stringify(accepted.body));
    const account = await identity.getAccountByEmail('student@identity.test');
    const capabilities = await identity.getCapabilities(account.id);
    assert.ok(capabilities.includes('scholars.edit'));
    assert.ok(capabilities.includes('creatives.upload'));
    assert.ok(!capabilities.includes('store.purchase'));

    const policy = await request('PUT', '/api/v1/scholars/institution/policies/', {
      body: { capability: 'store.purchase', effect: 'allow', department: 'Classics' },
      headers: { cookie: auth.cookie, 'x-csrf-token': auth.csrf },
    });
    assert.strictEqual(policy.status, 200, JSON.stringify(policy.body));
    const updated = await identity.getCapabilities(account.id);
    assert.ok(updated.includes('store.purchase'));
  });

  await test('revocation kills the unused invitation and keeps the accepted one intact', async () => {
    const revoked = await request(
      'DELETE',
      `/api/v1/scholars/institution/invitations/${invitations[1].id}`,
      {
        headers: { cookie: auth.cookie, 'x-csrf-token': auth.csrf },
      }
    );
    assert.strictEqual(revoked.status, 200, JSON.stringify(revoked.body));
    const listed = await request('GET', '/api/v1/scholars/institution/invitations/', {
      headers: { cookie: auth.cookie },
    });
    assert.strictEqual(
      listed.body.data.items.find((item) => item.id === invitations[1].id).status,
      'revoked'
    );
    assert.strictEqual(
      listed.body.data.items.find((item) => item.id === invitations[0].id).status,
      'accepted'
    );
  });

  await api.cleanup();
  console.log('  ✓ all institution identity API contracts passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
