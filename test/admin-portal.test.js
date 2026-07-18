/**
 * Admin Portal Tests
 *
 * Covers the unified admin portal backend: bootstrap (with and without
 * ADMIN_PASSWORD), login lifecycle, lockout, role-matrix 403s, dashboard
 * shape, users CRUD, immediate session revocation, unified applications, and
 * patrons/scholars administration.
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-portal-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock the Stripe SDK before any service loads it (booking approvals create
// checkout sessions).
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_portal',
          url: 'https://checkout.stripe.com/portal-mock',
          mode: config.mode || 'payment',
        }),
      },
    },
    webhooks: {
      constructEvent: (payload) => JSON.parse(payload),
    },
  }),
};

const Database = require('better-sqlite3');
const { getTestDbPath } = require('./helpers/test-db.js');
const { invoke, adminHeader } = require('./helpers/http.js');
const { getSlotId } = require('./helpers/slots.js');
const { login: legacyAdminLogin } = require('../platform/api/admin.js');
const { createBooking, setBookingStatus } = require('../platform/api/bookings.js');
const { createPatronCheckoutRecord, markPatronPaid } = require('../platform/api/patron-service.js');
const dbApi = require('../platform/db/scholars');

const loginHandler = require('../api/admin/portal/login/index.js');
const logoutHandler = require('../api/admin/portal/logout/index.js');
const meHandler = require('../api/admin/portal/me/index.js');
const passwordHandler = require('../api/admin/portal/me/password/index.js');
const dashboardHandler = require('../api/admin/portal/dashboard/index.js');
const usersHandler = require('../api/admin/portal/users/index.js');
const userPatchHandler = require('../api/admin/portal/users/[id]/index.js');
const userDisableHandler = require('../api/admin/portal/users/[id]/disable/index.js');
const userResetHandler = require('../api/admin/portal/users/[id]/reset-password/index.js');
const applicationsHandler = require('../api/admin/portal/applications/index.js');
const appApproveHandler = require('../api/admin/portal/applications/[kind]/[id]/approve/index.js');
const appRejectHandler = require('../api/admin/portal/applications/[kind]/[id]/reject/index.js');
const patronsHandler = require('../api/admin/portal/patrons/index.js');
const patronStatsHandler = require('../api/admin/portal/patrons/stats/index.js');
const patronPatchHandler = require('../api/admin/portal/patrons/[id]/index.js');
const scholarsPendingHandler = require('../api/admin/portal/scholars/pending/index.js');
const scholarApproveHandler = require('../api/admin/portal/scholars/[kind]/[id]/approve/index.js');
const scholarRejectHandler = require('../api/admin/portal/scholars/[kind]/[id]/reject/index.js');

// Distinct source IPs per login so the shared 'admin-login' rate-limit
// bucket (10/min/IP) never trips inside this suite.
let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `10.77.0.${ipCounter}`;
}

async function portalLogin(email, password) {
  return invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
    headers: { 'x-forwarded-for': nextIp() },
    body: { email, password },
  });
}

function db() {
  return new Database(getTestDbPath(__filename));
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 4).join('\n'));
    process.exit(1);
  }
}

let superToken;
let superUser;
const roleTokens = {};

async function runTests() {
  console.log('\n▸ Admin Portal Tests\n');

  // ── Bootstrap ────────────────────────────────────────────────
  await test('portal login returns 503 when ADMIN_PASSWORD is not configured', async () => {
    const saved = process.env.ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
    try {
      const res = await portalLogin('admin@punicodex.com', 'whatever');
      assert.strictEqual(res.status, 503);
      assert.strictEqual(res.body.code, 'portal_unconfigured');
    } finally {
      process.env.ADMIN_PASSWORD = saved;
    }
  });

  await test('first login bootstraps a superadmin from ADMIN_PASSWORD', async () => {
    const res = await portalLogin('admin@punicodex.com', process.env.ADMIN_PASSWORD);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.token);
    assert.strictEqual(res.body.user.role, 'superadmin');
    assert.strictEqual(res.body.user.email, 'admin@punicodex.com');
    assert.strictEqual(res.body.requirePasswordChange, false);
    superToken = res.body.token;
    superUser = res.body.user;

    const row = db()
      .prepare('SELECT * FROM admin_users WHERE email = ?')
      .get('admin@punicodex.com');
    assert.ok(row, 'admin_users row should exist');
    assert.strictEqual(row.role, 'superadmin');
  });

  await test('bootstrap is idempotent — second login succeeds normally', async () => {
    const res = await portalLogin('admin@punicodex.com', process.env.ADMIN_PASSWORD);
    assert.strictEqual(res.status, 200);
    const count = db().prepare('SELECT COUNT(*) as c FROM admin_users').get().c;
    assert.strictEqual(count, 1);
  });

  await test('GET /me returns identity, role, and permissions', async () => {
    const res = await invoke(meHandler, 'GET', '/api/admin/portal/me/', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.email, 'admin@punicodex.com');
    assert.strictEqual(res.body.role, 'superadmin');
    assert.ok(res.body.permissions.includes('users'));
  });

  await test('GET /me rejects missing/invalid tokens with 401', async () => {
    const noToken = await invoke(meHandler, 'GET', '/api/admin/portal/me/');
    assert.strictEqual(noToken.status, 401);
    const badToken = await invoke(meHandler, 'GET', '/api/admin/portal/me/', {
      headers: adminHeader('deadbeef'.repeat(8)),
    });
    assert.strictEqual(badToken.status, 401);
  });

  await test('legacy shared-password token is not a portal session (401)', async () => {
    const legacy = await legacyAdminLogin(process.env.ADMIN_PASSWORD);
    assert.ok(legacy.success);
    const res = await invoke(meHandler, 'GET', '/api/admin/portal/me/', {
      headers: adminHeader(legacy.token),
    });
    assert.strictEqual(res.status, 401);
  });

  await test('portal token still passes legacy requireAdmin endpoints', async () => {
    const bookingsHandler = require('../api/admin/bookings/index.js');
    const res = await invoke(bookingsHandler, 'GET', '/api/admin/bookings', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(res.status, 200);
  });

  // ── Login lifecycle / lockout ────────────────────────────────
  await test('wrong password is rejected and locks the account after 5 attempts', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await portalLogin('admin@punicodex.com', 'wrong-password');
      assert.strictEqual(res.status, 401);
      assert.strictEqual(res.body.code, 'invalid_credentials');
    }
    const locked = await portalLogin('admin@punicodex.com', 'wrong-password');
    assert.strictEqual(locked.status, 401);
    assert.strictEqual(locked.body.code, 'account_locked');

    // Even the correct password is refused while locked.
    const stillLocked = await portalLogin('admin@punicodex.com', process.env.ADMIN_PASSWORD);
    assert.strictEqual(stillLocked.status, 401);
    assert.strictEqual(stillLocked.body.code, 'account_locked');

    // Unlock manually so the rest of the suite can proceed.
    db().prepare('UPDATE admin_users SET login_attempts = 0, locked_until = NULL').run();
    const recovered = await portalLogin('admin@punicodex.com', process.env.ADMIN_PASSWORD);
    assert.strictEqual(recovered.status, 200);
  });

  await test('unknown email uses the constant-time path and returns 401', async () => {
    const res = await portalLogin('nobody@punicodex.com', 'whatever-password');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'invalid_credentials');
  });

  // ── Users CRUD ───────────────────────────────────────────────
  const roles = ['viewer', 'leasing', 'scholars', 'ops'];
  await test('superadmin can create users with explicit passwords', async () => {
    for (const role of roles) {
      const res = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
        headers: adminHeader(superToken),
        body: {
          email: `${role}@portal.test`,
          password: `${role}-password-123`,
          displayName: `${role} user`,
          role,
        },
      });
      assert.strictEqual(res.status, 201, `${role}: ${JSON.stringify(res.body)}`);
      assert.strictEqual(res.body.user.role, role);
      assert.strictEqual(res.body.tempPassword, null);
      assert.strictEqual(res.body.user.tempPassword, false);
    }
  });

  await test('creating a user without a password returns a one-time temp password', async () => {
    const res = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { email: 'temp@portal.test', role: 'viewer' },
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.tempPassword, 'tempPassword should be returned once');
    assert.strictEqual(res.body.user.tempPassword, true);

    const login = await portalLogin('temp@portal.test', res.body.tempPassword);
    assert.strictEqual(login.status, 200);
    assert.strictEqual(login.body.requirePasswordChange, true);
  });

  await test('duplicate email returns 409; invalid role/email return 400', async () => {
    const dup = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { email: 'viewer@portal.test', password: 'whatever-123', role: 'viewer' },
    });
    assert.strictEqual(dup.status, 409);

    const badRole = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { email: 'x@portal.test', password: 'whatever-123', role: 'root' },
    });
    assert.strictEqual(badRole.status, 400);

    const badEmail = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { email: 'not-an-email', password: 'whatever-123', role: 'viewer' },
    });
    assert.strictEqual(badEmail.status, 400);
  });

  await test('malformed payload shapes return 4xx, never 5xx (auth-service type guards)', async () => {
    // createUser: non-string email/displayName must not crash normalization
    // or the SQL bind.
    const numericEmail = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { email: 42, password: 'whatever-123', role: 'viewer' },
    });
    assert.strictEqual(numericEmail.status, 400);

    const objectName = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: {
        email: 'guard@portal.test',
        password: 'whatever-123',
        role: 'viewer',
        displayName: { name: 'x' },
      },
    });
    assert.strictEqual(objectName.status, 201);
    assert.strictEqual(objectName.body.user.displayName, null);

    // updateUser: non-string displayName → 400 before the SQL bind.
    const target = db()
      .prepare('SELECT id FROM admin_users WHERE email = ?')
      .get('ops@portal.test');
    const patchName = await invoke(
      userPatchHandler,
      'PATCH',
      `/api/admin/portal/users/${target.id}/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(target.id) },
        body: { displayName: ['x'] },
      }
    );
    assert.strictEqual(patchName.status, 400);

    // changePassword: non-string currentPassword → 401, never a bcrypt 500.
    const pwChange = await invoke(passwordHandler, 'POST', '/api/admin/portal/me/password/', {
      headers: adminHeader(superToken),
      body: { currentPassword: {}, newPassword: 'new-password-123' },
    });
    assert.strictEqual(pwChange.status, 401);
  });

  await test('GET /users lists all portal users (superadmin)', async () => {
    const res = await invoke(usersHandler, 'GET', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(res.status, 200);
    const emails = res.body.items.map((u) => u.email);
    for (const role of roles) assert.ok(emails.includes(`${role}@portal.test`));
    assert.ok(!('password_hash' in res.body.items[0]), 'password hash must not leak');
  });

  await test('role logins succeed for every created user', async () => {
    for (const role of roles) {
      const res = await portalLogin(`${role}@portal.test`, `${role}-password-123`);
      assert.strictEqual(res.status, 200, role);
      assert.strictEqual(res.body.role, role);
      roleTokens[role] = res.body.token;
    }
  });

  await test('PATCH /users/:id updates displayName and role', async () => {
    const target = db()
      .prepare('SELECT id FROM admin_users WHERE email = ?')
      .get('ops@portal.test');
    const res = await invoke(userPatchHandler, 'PATCH', `/api/admin/portal/users/${target.id}/`, {
      headers: adminHeader(superToken),
      params: { id: String(target.id) },
      body: { displayName: 'Operations', role: 'viewer' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.role, 'viewer');
    assert.strictEqual(res.body.user.displayName, 'Operations');
  });

  await test('a superadmin cannot change their own role or disable themselves', async () => {
    const roleRes = await invoke(
      userPatchHandler,
      'PATCH',
      `/api/admin/portal/users/${superUser.id}/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(superUser.id) },
        body: { role: 'viewer' },
      }
    );
    assert.strictEqual(roleRes.status, 400);

    const disableRes = await invoke(
      userDisableHandler,
      'POST',
      `/api/admin/portal/users/${superUser.id}/disable/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(superUser.id) },
      }
    );
    assert.strictEqual(disableRes.status, 400);
  });

  await test('reset-password returns a temp password and destroys sessions', async () => {
    const target = db()
      .prepare('SELECT id FROM admin_users WHERE email = ?')
      .get('temp@portal.test');
    // Spy the email seam: the reset must fire the transactional email with the
    // same one-time temp password it returns (fire-and-forget).
    const emailApi = require('../platform/api/email.js');
    const originalNotify = emailApi.notifyAdminPasswordReset;
    const emailed = [];
    emailApi.notifyAdminPasswordReset = async (args) => {
      emailed.push(args);
      return { mocked: true };
    };
    let res;
    try {
      res = await invoke(
        userResetHandler,
        'POST',
        `/api/admin/portal/users/${target.id}/reset-password/`,
        {
          headers: adminHeader(superToken),
          params: { id: String(target.id) },
        }
      );
    } finally {
      emailApi.notifyAdminPasswordReset = originalNotify;
    }
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.tempPassword);
    assert.strictEqual(emailed.length, 1);
    assert.strictEqual(emailed[0].email, 'temp@portal.test');
    assert.strictEqual(emailed[0].tempPassword, res.body.tempPassword);

    // The old temp password no longer works (hash replaced), the new one does.
    const oldLogin = await portalLogin('temp@portal.test', 'temp-password-obsolete');
    assert.strictEqual(oldLogin.status, 401);
    const newLogin = await portalLogin('temp@portal.test', res.body.tempPassword);
    assert.strictEqual(newLogin.status, 200);
    assert.strictEqual(newLogin.body.requirePasswordChange, true);

    // Sessions for the user were destroyed: only the fresh login token works.
    const sessions = db()
      .prepare('SELECT COUNT(*) as c FROM admin_sessions WHERE admin_user_id = ?')
      .get(target.id).c;
    assert.strictEqual(sessions, 1);
  });

  await test('self-service password change revokes all sessions', async () => {
    const res = await invoke(passwordHandler, 'POST', '/api/admin/portal/me/password/', {
      headers: adminHeader(roleTokens.leasing),
      body: { currentPassword: 'leasing-password-123', newPassword: 'leasing-new-password-456' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.changed, true);

    const revoked = await invoke(meHandler, 'GET', '/api/admin/portal/me/', {
      headers: adminHeader(roleTokens.leasing),
    });
    assert.strictEqual(revoked.status, 401);

    const relogin = await portalLogin('leasing@portal.test', 'leasing-new-password-456');
    assert.strictEqual(relogin.status, 200);
    roleTokens.leasing = relogin.body.token;
  });

  await test('disable destroys sessions immediately (revocation on next request)', async () => {
    const target = db()
      .prepare('SELECT id FROM admin_users WHERE email = ?')
      .get('temp@portal.test');
    const res = await invoke(
      userDisableHandler,
      'POST',
      `/api/admin/portal/users/${target.id}/disable/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(target.id) },
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.status, 'disabled');

    const login = await portalLogin('temp@portal.test', 'anything-here');
    assert.strictEqual(login.status, 401);
    assert.strictEqual(login.body.code, 'account_inactive');
  });

  // ── Role matrix ──────────────────────────────────────────────
  await test('viewer can read but gets 403 on every mutation', async () => {
    const dash = await invoke(dashboardHandler, 'GET', '/api/admin/portal/dashboard/', {
      headers: adminHeader(roleTokens.viewer),
    });
    assert.strictEqual(dash.status, 200);

    const createUser = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(roleTokens.viewer),
      body: { email: 'nope@portal.test', password: 'nope-nope-123', role: 'viewer' },
    });
    assert.strictEqual(createUser.status, 403);

    const patronPatch = await invoke(patronPatchHandler, 'PATCH', '/api/admin/portal/patrons/1/', {
      headers: adminHeader(roleTokens.viewer),
      params: { id: '1' },
      body: { status: 'cancelled' },
    });
    assert.strictEqual(patronPatch.status, 403);

    const businessApprove = await invoke(
      appApproveHandler,
      'POST',
      '/api/admin/portal/applications/business/1/approve/',
      {
        headers: adminHeader(roleTokens.viewer),
        params: { kind: 'business', id: '1' },
      }
    );
    assert.strictEqual(businessApprove.status, 403);

    const scholarApprove = await invoke(
      scholarApproveHandler,
      'POST',
      '/api/admin/portal/scholars/edit/1/approve/',
      {
        headers: adminHeader(roleTokens.viewer),
        params: { kind: 'edit', id: '1' },
      }
    );
    assert.strictEqual(scholarApprove.status, 403);
  });

  await test('leasing cannot manage users or act on scholarly items', async () => {
    const usersList = await invoke(usersHandler, 'GET', '/api/admin/portal/users/', {
      headers: adminHeader(roleTokens.leasing),
    });
    assert.strictEqual(usersList.status, 403);

    const scholarApprove = await invoke(
      scholarApproveHandler,
      'POST',
      '/api/admin/portal/scholars/media/1/approve/',
      {
        headers: adminHeader(roleTokens.leasing),
        params: { kind: 'media', id: '1' },
      }
    );
    assert.strictEqual(scholarApprove.status, 403);
  });

  await test('scholars role cannot approve business applications', async () => {
    const res = await invoke(
      appApproveHandler,
      'POST',
      '/api/admin/portal/applications/business/1/approve/',
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'business', id: '1' },
      }
    );
    assert.strictEqual(res.status, 403);
  });

  // ── Dashboard ────────────────────────────────────────────────
  await test('dashboard aggregates all subsystems with the documented shape', async () => {
    const res = await invoke(dashboardHandler, 'GET', '/api/admin/portal/dashboard/', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(res.status, 200);
    const b = res.body;
    assert.ok(typeof b.generatedAt === 'string');
    assert.ok(typeof b.applications.businessPending === 'number');
    assert.ok(typeof b.applications.universityPending === 'number');
    assert.ok(typeof b.scholars.pendingEdits === 'number');
    assert.ok(typeof b.scholars.pendingMedia === 'number');
    assert.ok(typeof b.patrons.active === 'number');
    assert.ok(typeof b.patrons.estimatedMrrCents === 'number');
    assert.ok(typeof b.revenue.last30dCents === 'number');
    assert.ok(typeof b.revenue.bookingsLast30d === 'number');
    assert.ok(typeof b.traffic.requests === 'number');
    assert.ok(typeof b.traffic.errorRate === 'number');
    assert.ok(typeof b.indexedSites === 'number');
  });

  // ── Unified applications ─────────────────────────────────────
  let businessAppId;
  let universityAppId;
  let universityRejectId;

  await test('seed business + university applications', async () => {
    const booking = await createBooking({
      slotId: getSlotId(__filename, 'nike', 11),
      email: 'sponsor@example.com',
      companyName: 'Portal Sponsor Co',
      leaseMonths: 1,
      trialMonths: 0,
      siteSlug: 'nike',
    });
    await setBookingStatus(booking.id, 'pending_application');
    businessAppId = booking.id;

    const booking2 = await createBooking({
      slotId: getSlotId(__filename, 'nike', 12),
      email: 'sponsor2@example.com',
      companyName: 'Portal Reject Co',
      leaseMonths: 1,
      trialMonths: 0,
      siteSlug: 'nike',
    });
    await setBookingStatus(booking2.id, 'pending_application');

    const app = dbApi.createSponsorshipApplication({
      institutionName: 'Portal Test University',
      domain: 'portal-test.edu',
      contactName: 'Prof Portal',
      contactEmail: 'prof@portal-test.edu',
      departmentFocus: 'Classics',
      message: 'We would like to join.',
    });
    universityAppId = app.lastInsertRowid;

    const app2 = dbApi.createSponsorshipApplication({
      institutionName: 'Reject University',
      domain: 'reject-uni.edu',
      contactName: 'Dr Reject',
      contactEmail: 'dr@reject-uni.edu',
      departmentFocus: '',
      message: '',
    });
    universityRejectId = app2.lastInsertRowid;
  });

  await test('GET /applications merges business and university applications', async () => {
    const res = await invoke(applicationsHandler, 'GET', '/api/admin/portal/applications/', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(res.status, 200);
    const kinds = new Set(res.body.items.map((i) => i.kind));
    assert.ok(kinds.has('business'));
    assert.ok(kinds.has('university'));
    assert.ok(res.body.pendingCounts.business >= 1);
    assert.ok(res.body.pendingCounts.university >= 1);

    const biz = res.body.items.find((i) => i.kind === 'business');
    assert.ok(biz.applicant);
    assert.ok(biz.contactEmail);
    assert.strictEqual(biz.status, 'pending_application');

    const filtered = await invoke(
      applicationsHandler,
      'GET',
      '/api/admin/portal/applications/?kind=university',
      { headers: adminHeader(superToken) }
    );
    assert.ok(filtered.body.items.every((i) => i.kind === 'university'));

    const badKind = await invoke(
      applicationsHandler,
      'GET',
      '/api/admin/portal/applications/?kind=alien',
      { headers: adminHeader(superToken) }
    );
    assert.strictEqual(badKind.status, 400);
  });

  await test('approve university application provisions institution + admin (scholars role)', async () => {
    const res = await invoke(
      appApproveHandler,
      'POST',
      `/api/admin/portal/applications/university/${universityAppId}/approve/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'university', id: String(universityAppId) },
        body: { reviewComment: 'Welcome aboard' },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.approved, true);
    assert.ok(res.body.institutionId);
    assert.ok(res.body.adminPassword, 'one-time temp password returned');
    assert.strictEqual(res.body.adminEmail, 'prof@portal-test.edu');

    const adminUser = db()
      .prepare('SELECT * FROM scholars_users WHERE email = ?')
      .get('prof@portal-test.edu');
    assert.ok(adminUser);
    assert.strictEqual(adminUser.role, 'inst_admin');

    const application = dbApi.getSponsorshipApplicationById(universityAppId);
    assert.strictEqual(application.status, 'approved');

    const again = await invoke(
      appApproveHandler,
      'POST',
      `/api/admin/portal/applications/university/${universityAppId}/approve/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'university', id: String(universityAppId) },
      }
    );
    assert.strictEqual(again.status, 400);
  });

  await test('reject university application marks it rejected', async () => {
    const res = await invoke(
      appRejectHandler,
      'POST',
      `/api/admin/portal/applications/university/${universityRejectId}/reject/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'university', id: String(universityRejectId) },
        body: { reviewComment: 'Not a fit' },
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.rejected, true);
    assert.strictEqual(dbApi.getSponsorshipApplicationById(universityRejectId).status, 'rejected');
  });

  await test('approve business application delegates to the booking flow', async () => {
    const res = await invoke(
      appApproveHandler,
      'POST',
      `/api/admin/portal/applications/business/${businessAppId}/approve/`,
      {
        headers: adminHeader(roleTokens.leasing),
        params: { kind: 'business', id: String(businessAppId) },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.status, 'pending_payment');
    assert.ok(res.body.stripeUrl);
  });

  await test('reject business application delegates to the booking flow', async () => {
    const list = await invoke(
      applicationsHandler,
      'GET',
      '/api/admin/portal/applications/?kind=business',
      {
        headers: adminHeader(superToken),
      }
    );
    const target = list.body.items.find((i) => i.status === 'pending_application');
    assert.ok(target);
    const res = await invoke(
      appRejectHandler,
      'POST',
      `/api/admin/portal/applications/business/${target.id}/reject/`,
      {
        headers: adminHeader(roleTokens.leasing),
        params: { kind: 'business', id: String(target.id) },
        body: { note: 'Policy violation' },
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'rejected');
  });

  // ── Patrons administration ───────────────────────────────────
  let patronId;
  await test('patrons list, filters, and stats', async () => {
    const patron = await createPatronCheckoutRecord({
      templeId: 'portal-test',
      email: 'patron@portal.test',
      displayName: 'Portal Patron',
      amountCents: 700,
    });
    await markPatronPaid(patron.id, 'sub_portal_1', 'cus_portal_1', 700);
    patronId = patron.id;

    const list = await invoke(patronsHandler, 'GET', '/api/admin/portal/patrons/', {
      headers: adminHeader(roleTokens.leasing),
    });
    assert.strictEqual(list.status, 200);
    assert.ok(list.body.items.length >= 1);
    assert.ok(list.body.total >= 1);

    const filtered = await invoke(
      patronsHandler,
      'GET',
      '/api/admin/portal/patrons/?temple=portal-test&status=active',
      { headers: adminHeader(roleTokens.leasing) }
    );
    assert.strictEqual(filtered.body.items.length, 1);
    assert.strictEqual(filtered.body.items[0].display_name, 'Portal Patron');

    const stats = await invoke(patronStatsHandler, 'GET', '/api/admin/portal/patrons/stats/', {
      headers: adminHeader(roleTokens.leasing),
    });
    assert.strictEqual(stats.status, 200);
    assert.ok(stats.body.active >= 1);
    assert.ok(stats.body.estimatedMrrCents >= 700);
    assert.strictEqual(stats.body.limitPerTemple, 20);
  });

  await test('PATCH /patrons/:id cancels a patron (leasing role)', async () => {
    const res = await invoke(
      patronPatchHandler,
      'PATCH',
      `/api/admin/portal/patrons/${patronId}/`,
      {
        headers: adminHeader(roleTokens.leasing),
        params: { id: String(patronId) },
        body: { status: 'cancelled' },
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.patron.status, 'cancelled');

    const bad = await invoke(
      patronPatchHandler,
      'PATCH',
      `/api/admin/portal/patrons/${patronId}/`,
      {
        headers: adminHeader(roleTokens.leasing),
        params: { id: String(patronId) },
        body: { status: 'active' },
      }
    );
    assert.strictEqual(bad.status, 400);

    const missing = await invoke(patronPatchHandler, 'PATCH', '/api/admin/portal/patrons/999999/', {
      headers: adminHeader(roleTokens.leasing),
      params: { id: '999999' },
      body: { status: 'cancelled' },
    });
    assert.strictEqual(missing.status, 404);
  });

  // ── Scholars queues ──────────────────────────────────────────
  let editId;
  let mediaId;
  await test('seed a pending scholarly edit and media upload', async () => {
    const student = dbApi.createUserWithPassword({
      email: 'student@portal-test.edu',
      institutionId: null,
      role: 'student',
      displayName: 'Portal Student',
      passwordHash: 'x',
      accountStatus: 'active',
    });
    const temple = dbApi.createTemple({
      entryId: 'portal-test-temple',
      name: 'Portal Test Temple',
      pantheon: 'greek',
      tier: '2',
      manifestVersion: '0.1',
    });
    const section = dbApi.createSection({
      templeId: temple.lastInsertRowid,
      key: 'overview',
      label: 'Overview',
    });
    const edit = dbApi.createEdit({
      sectionId: section.lastInsertRowid,
      userId: student.lastInsertRowid,
      proposedBody: 'A portal-reviewed scholarly body.',
      proposedSources: [],
      proposedMedia: [],
    });
    editId = edit.lastInsertRowid;

    const media = dbApi.createMedia({
      filename: 'portal-test.png',
      url: '/uploads/scholars/portal-test.png',
      mimeType: 'image/png',
      sizeBytes: 1234,
      uploadedBy: student.lastInsertRowid,
    });
    mediaId = media.lastInsertRowid;
  });

  await test('GET /scholars/pending returns both queues', async () => {
    const res = await invoke(scholarsPendingHandler, 'GET', '/api/admin/portal/scholars/pending/', {
      headers: adminHeader(roleTokens.scholars),
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.edits.total >= 1);
    assert.ok(res.body.media.total >= 1);
    assert.ok(res.body.edits.items.some((e) => e.id === editId));
    assert.ok(res.body.media.items.some((m) => m.id === mediaId));
  });

  await test('approve a scholarly edit as curator via the portal', async () => {
    const res = await invoke(
      scholarApproveHandler,
      'POST',
      `/api/admin/portal/scholars/edit/${editId}/approve/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'edit', id: String(editId) },
        body: { comment: 'Solid work' },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.approved, true);

    const edit = dbApi.getEditById(editId);
    assert.strictEqual(edit.status, 'approved');
    const section = dbApi.getSectionById(edit.section_id);
    assert.strictEqual(section.body, 'A portal-reviewed scholarly body.');

    const again = await invoke(
      scholarApproveHandler,
      'POST',
      `/api/admin/portal/scholars/edit/${editId}/approve/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'edit', id: String(editId) },
      }
    );
    assert.strictEqual(again.status, 400);
  });

  await test('reject a scholarly media upload via the portal', async () => {
    const res = await invoke(
      scholarRejectHandler,
      'POST',
      `/api/admin/portal/scholars/media/${mediaId}/reject/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'media', id: String(mediaId) },
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.rejected, true);
    assert.strictEqual(dbApi.getMediaById(mediaId).status, 'rejected');
  });

  // ── Audit + logout ───────────────────────────────────────────
  await test('admin mutations are persisted to the admin_actions audit trail', async () => {
    const row = db()
      .prepare(
        "SELECT COUNT(*) as c FROM admin_actions WHERE admin_user_id IS NOT NULL AND action LIKE 'portal.%'"
      )
      .get();
    assert.ok(row.c >= 5, `expected portal audit rows, got ${row.c}`);
  });

  await test('logout destroys the session', async () => {
    const login = await portalLogin('viewer@portal.test', 'viewer-password-123');
    const token = login.body.token;
    const res = await invoke(logoutHandler, 'POST', '/api/admin/portal/logout/', {
      headers: adminHeader(token),
    });
    assert.strictEqual(res.status, 200);
    const after = await invoke(meHandler, 'GET', '/api/admin/portal/me/', {
      headers: adminHeader(token),
    });
    assert.strictEqual(after.status, 401);
  });

  console.log('\nAdmin Portal: all tests passed');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
