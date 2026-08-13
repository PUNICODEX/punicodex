/**
 * Authorization Matrix Tests
 *
 * Horizontal and vertical privilege-escalation simulation across every
 * permission boundary in the system:
 *
 *  - Horizontal: tenant A cannot read or mutate tenant B's resources
 *    (change requests, analytics, dashboard tokens).
 *  - Vertical: portal roles reach only their permission floor (viewer <
 *    read-only, leasing < leasing, ops < ops, users < superadmin).
 *  - Token confusion: a tenant session never authorizes admin surfaces and
 *    an admin token never authorizes tenant surfaces.
 *  - The booking analytics_token (dashboard snapshot) only ever exposes its
 *    own booking.
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');

process.env.ADMIN_PASSWORD = 'test-authz-matrix-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: { sessions: { create: async () => ({ id: 'cs_authz', url: 'https://x.test' }) } },
    webhooks: { constructEvent: (p) => JSON.parse(typeof p === 'string' ? p : p.toString('utf8')) },
  }),
};

const { invoke, adminHeader } = require('./helpers/http.js');
const { getIndividualSlotIds } = require('./helpers/slots.js');
const { createBooking } = require('../platform/api/bookings.js');
const tenantPortal = require('../platform/api/tenant-portal.js');
const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const usersHandler = require('../platform/api-handlers/admin/portal/users/index.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const slotIds = getIndividualSlotIds(__filename, 'zeus');
let slotCursor = 0;

async function makeSponsor(email) {
  const { id } = await createBooking({
    slotId: slotIds[slotCursor++],
    email,
    companyName: `Co ${email}`,
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'zeus',
  });
  const d = db();
  d.prepare(
    "UPDATE bookings SET status = 'approved', creative_path = '/uploads/test/x.png' WHERE id = ?"
  ).run(id);
  d.close();
  await tenantPortal.provisionTenantAccount(email, { kind: 'sponsor' });
  const row = await tenantPortal.getAccountByEmail(email);
  return { bookingId: id, account: { ...row, isSponsor: true, isPatron: false } };
}

let superToken = null;

test('setup: bootstrap superadmin', async () => {
  const boot = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
    headers: { 'x-forwarded-for': '198.51.100.1' },
    body: { email: 'admin@punicodex.com', password: process.env.ADMIN_PASSWORD },
  });
  assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
  superToken = boot.body.token;
});

// ── Horizontal ──────────────────────────────────────────────────

test('tenant A cannot file a change request against tenant B’s booking', async () => {
  const a = await makeSponsor('tenant-a@example.com');
  const b = await makeSponsor('tenant-b@example.com');
  await assert.rejects(
    () =>
      tenantPortal.createChangeRequest(a.account, {
        type: 'image',
        target: b.bookingId,
        payload: { image: 'data:image/png;base64,iVBORw0KGgo=', filename: 'x.png' },
      }),
    (err) => err.status === 403 && err.code === 'not_owner'
  );
});

test('tenant A’s resources never include tenant B’s bookings', async () => {
  const a = await tenantPortal.getAccountByEmail('tenant-a@example.com');
  const me = await tenantPortal.getMe({ ...a, isSponsor: true, isPatron: false });
  assert.ok(me.resources.bookings.length >= 1);
  for (const b of me.resources.bookings) {
    assert.notStrictEqual(b.companyName, 'Co tenant-b@example.com');
  }
});

test('dashboard analytics_token exposes only its own booking', async () => {
  const d = db();
  const row = d
    .prepare('SELECT id, analytics_token FROM bookings WHERE analytics_token IS NOT NULL LIMIT 1')
    .get();
  d.close();
  assert.ok(row, 'fixture booking exists');
  const bookingsRouter = require('../api/bookings/[[...slug]].js');
  // A forged/guessed token: safe not-found, no oracle about what exists.
  const forged = await invoke(bookingsRouter, 'GET', `/api/bookings/${'f'.repeat(64)}/`, {
    headers: { 'x-forwarded-for': '198.51.100.60' },
    params: { slug: 'f'.repeat(64) },
  });
  assert.ok([400, 401, 403, 404].includes(forged.status), `forged token → ${forged.status}`);
  assert.ok(
    !JSON.stringify(forged.body).includes(String(row.id)),
    'no booking id leaks on a guess'
  );
  // The real token returns exactly its own booking.
  const mine = await invoke(bookingsRouter, 'GET', `/api/bookings/${row.analytics_token}/`, {
    headers: { 'x-forwarded-for': '198.51.100.61' },
    params: { slug: row.analytics_token },
  });
  assert.strictEqual(mine.status, 200);
  assert.strictEqual(Number(mine.body.booking?.id ?? mine.body.id), row.id);
});

// ── Vertical ────────────────────────────────────────────────────

test('role floors: viewer < leasing < ops < superadmin on guarded endpoints', async () => {
  const mk = async (email, role) => {
    const res = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { email, password: `${role}-password-123`, displayName: role, role },
    });
    assert.ok([200, 201].includes(res.status), JSON.stringify(res.body));
    const login = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
      headers: { 'x-forwarded-for': `198.51.100.${10 + role.length}` },
      body: { email, password: `${role}-password-123` },
    });
    return login.body.token;
  };
  const viewer = await mk('floor-viewer@test.dev', 'viewer');
  const leasing = await mk('floor-leasing@test.dev', 'leasing');

  const securityHandler = require('../platform/api-handlers/admin/portal/security/index.js');
  const discountsHandler = require('../platform/api-handlers/admin/portal/discounts/index.js');
  const usersGet = usersHandler;

  // Security tab is ops-only: viewer and leasing both denied.
  for (const [label, token] of [
    ['viewer', viewer],
    ['leasing', leasing],
  ]) {
    const res = await invoke(securityHandler, 'GET', '/api/admin/portal/security/', {
      headers: adminHeader(token),
    });
    assert.strictEqual(res.status, 403, `security tab must 403 ${label}`);
  }
  // Discounts list is leasing-readable: viewer denied, leasing allowed.
  const dv = await invoke(discountsHandler, 'GET', '/api/admin/portal/discounts/', {
    headers: adminHeader(viewer),
  });
  assert.strictEqual(dv.status, 403);
  const dl = await invoke(discountsHandler, 'GET', '/api/admin/portal/discounts/', {
    headers: adminHeader(leasing),
  });
  assert.strictEqual(dl.status, 200);
  // User management is superadmin-only.
  for (const [label, token] of [
    ['viewer', viewer],
    ['leasing', leasing],
  ]) {
    const res = await invoke(usersGet, 'GET', '/api/admin/portal/users/', {
      headers: adminHeader(token),
    });
    assert.strictEqual(res.status, 403, `users must 403 ${label}`);
  }
});

// ── Token confusion ─────────────────────────────────────────────

test('a tenant session token never authorizes admin surfaces', async () => {
  await tenantPortal.provisionTenantAccount('confuse@example.com', { kind: 'sponsor' });
  // Fabricate a tenant SESSION directly (login requires the password flow).
  const crypto = require('node:crypto');
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
  const account = await tenantPortal.getAccountByEmail('confuse@example.com');
  const d2 = db();
  d2.prepare(
    `INSERT INTO tenant_sessions (token, account_id, expires_at) VALUES (?, ?, datetime('now', '+30 days'))`
  ).run(sessionHash, account.id);
  d2.close();

  const securityHandler = require('../platform/api-handlers/admin/portal/security/index.js');
  const res = await invoke(securityHandler, 'GET', '/api/admin/portal/security/', {
    headers: adminHeader(sessionToken),
  });
  assert.strictEqual(res.status, 401, 'tenant session is not an admin token');
});

test('an admin portal token never authorizes tenant surfaces', async () => {
  const accountRouter = require('../api/account/[[...slug]].js');
  const res = await invoke(accountRouter, 'GET', '/api/account/me/', {
    headers: { Authorization: `Bearer ${superToken}` },
    params: { slug: 'me' },
  });
  assert.strictEqual(res.status, 401, 'admin token is not a tenant session');
});

async function run() {
  console.log('\n▸ Authorization Matrix Tests\n');
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
  console.log(`\nAuthz Matrix: ${tests.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
