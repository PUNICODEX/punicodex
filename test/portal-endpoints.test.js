/**
 * Portal Endpoints Tests (extended integration coverage)
 *
 * Companion suite to test/admin-portal.test.js — covers the /api/admin/portal/*
 * route CONTRACTS that the base suite does not:
 *
 * - Full role-matrix sweep: viewer/ops get 403 on every mutation route;
 *   leasing is forbidden from scholars queues + university applications + user
 *   management; scholars is forbidden from business applications + patrons
 *   mutations + user management; every role keeps read access.
 * - Application flows: business approve (stripeUrl + pending_payment persisted),
 *   university approve (institution slugging incl. -2 dedup suffix, one-time
 *   admin password, review comment), rejects with stored comments.
 * - Patrons admin: temple/status filters, pagination, cancel + expire, invalid
 *   statuses, full stats shape.
 * - Scholars queues: pending shape, media approve, edit reject with
 *   needs_revision, double-review 400s.
 * - Error paths: 405 on wrong methods, garbage bodies → 400, unknown kinds →
 *   400, non-integer ids → 400, nonexistent ids → 404.
 * - Login rate limit: 429 after the shared 'admin-login' bucket (10/min/IP) is
 *   exhausted, with resetLimiters() isolation.
 * - Session revocation: disable and password change kill existing tokens
 *   immediately (including sibling sessions).
 *
 * Seeds data through the same service calls test/admin-portal.test.js uses.
 * Written against route contracts only — no internals.
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-portal-endpoints-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock the Stripe SDK before any service loads it (business application
// approvals create checkout sessions).
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_portal_endpoints',
          url: 'https://checkout.stripe.com/portal-endpoints-mock',
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
const { createBooking, setBookingStatus } = require('../platform/api/bookings.js');
const { createPatronCheckoutRecord, markPatronPaid } = require('../platform/api/patron-service.js');
const { resetLimiters } = require('../platform/api/api-rate-limiter.js');
const dbApi = require('../platform/db/scholars');

const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const meHandler = require('../platform/api-handlers/admin/portal/me/index.js');
const passwordHandler = require('../platform/api-handlers/admin/portal/me/password/index.js');
const dashboardHandler = require('../platform/api-handlers/admin/portal/dashboard/index.js');
const analyticsHandler = require('../platform/api-handlers/admin/portal/analytics/index.js');
const usersHandler = require('../platform/api-handlers/admin/portal/users/index.js');
const userPatchHandler = require('../platform/api-handlers/admin/portal/users/[id]/index.js');
const userDisableHandler = require('../platform/api-handlers/admin/portal/users/[id]/disable/index.js');
const userResetHandler = require('../platform/api-handlers/admin/portal/users/[id]/reset-password/index.js');
const applicationsHandler = require('../platform/api-handlers/admin/portal/applications/index.js');
const appApproveHandler = require('../platform/api-handlers/admin/portal/applications/[kind]/[id]/approve/index.js');
const appRejectHandler = require('../platform/api-handlers/admin/portal/applications/[kind]/[id]/reject/index.js');
const patronsHandler = require('../platform/api-handlers/admin/portal/patrons/index.js');
const patronStatsHandler = require('../platform/api-handlers/admin/portal/patrons/stats/index.js');
const patronPatchHandler = require('../platform/api-handlers/admin/portal/patrons/[id]/index.js');
const scholarsPendingHandler = require('../platform/api-handlers/admin/portal/scholars/pending/index.js');
const scholarApproveHandler = require('../platform/api-handlers/admin/portal/scholars/[kind]/[id]/approve/index.js');
const scholarRejectHandler = require('../platform/api-handlers/admin/portal/scholars/[kind]/[id]/reject/index.js');

// Distinct source IPs per login so the shared 'admin-login' rate-limit bucket
// (10/min/IP) never trips outside the dedicated rate-limit test.
let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `10.66.0.${ipCounter}`;
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

// Every mutation route of the portal, as { label, handler, method, url,
// params, body }. Role checks run before id validation/service calls, so any
// id works for the 403 sweep.
const MUTATION_ROUTES = [
  {
    label: 'users.create',
    handler: usersHandler,
    method: 'POST',
    url: '/api/admin/portal/users/',
    body: { email: 'sweep@portal.test', password: 'sweep-password-123', role: 'viewer' },
  },
  {
    label: 'users.patch',
    handler: userPatchHandler,
    method: 'PATCH',
    url: '/api/admin/portal/users/1/',
    params: { id: '1' },
    body: { displayName: 'Sweep' },
  },
  {
    label: 'users.disable',
    handler: userDisableHandler,
    method: 'POST',
    url: '/api/admin/portal/users/1/disable/',
    params: { id: '1' },
  },
  {
    label: 'users.reset-password',
    handler: userResetHandler,
    method: 'POST',
    url: '/api/admin/portal/users/1/reset-password/',
    params: { id: '1' },
  },
  {
    label: 'applications.business.approve',
    handler: appApproveHandler,
    method: 'POST',
    url: '/api/admin/portal/applications/business/1/approve/',
    params: { kind: 'business', id: '1' },
  },
  {
    label: 'applications.business.reject',
    handler: appRejectHandler,
    method: 'POST',
    url: '/api/admin/portal/applications/business/1/reject/',
    params: { kind: 'business', id: '1' },
  },
  {
    label: 'applications.university.approve',
    handler: appApproveHandler,
    method: 'POST',
    url: '/api/admin/portal/applications/university/1/approve/',
    params: { kind: 'university', id: '1' },
  },
  {
    label: 'applications.university.reject',
    handler: appRejectHandler,
    method: 'POST',
    url: '/api/admin/portal/applications/university/1/reject/',
    params: { kind: 'university', id: '1' },
  },
  {
    label: 'patrons.patch',
    handler: patronPatchHandler,
    method: 'PATCH',
    url: '/api/admin/portal/patrons/1/',
    params: { id: '1' },
    body: { status: 'cancelled' },
  },
  {
    label: 'scholars.edit.approve',
    handler: scholarApproveHandler,
    method: 'POST',
    url: '/api/admin/portal/scholars/edit/1/approve/',
    params: { kind: 'edit', id: '1' },
  },
  {
    label: 'scholars.edit.reject',
    handler: scholarRejectHandler,
    method: 'POST',
    url: '/api/admin/portal/scholars/edit/1/reject/',
    params: { kind: 'edit', id: '1' },
  },
  {
    label: 'scholars.media.approve',
    handler: scholarApproveHandler,
    method: 'POST',
    url: '/api/admin/portal/scholars/media/1/approve/',
    params: { kind: 'media', id: '1' },
  },
  {
    label: 'scholars.media.reject',
    handler: scholarRejectHandler,
    method: 'POST',
    url: '/api/admin/portal/scholars/media/1/reject/',
    params: { kind: 'media', id: '1' },
  },
];

const READ_ROUTES = [
  { label: 'dashboard', handler: dashboardHandler, url: '/api/admin/portal/dashboard/' },
  { label: 'analytics', handler: analyticsHandler, url: '/api/admin/portal/analytics/' },
  { label: 'applications', handler: applicationsHandler, url: '/api/admin/portal/applications/' },
  { label: 'patrons', handler: patronsHandler, url: '/api/admin/portal/patrons/' },
  { label: 'patrons.stats', handler: patronStatsHandler, url: '/api/admin/portal/patrons/stats/' },
  {
    label: 'scholars.pending',
    handler: scholarsPendingHandler,
    url: '/api/admin/portal/scholars/pending/',
  },
];

let superToken;
const roleTokens = {};

// Seeded entity ids, populated by the seed test.
const seeded = {
  businessApproveId: null,
  businessRejectId: null,
  universityApproveId: null,
  universitySlugDupId: null,
  universityRejectId: null,
  patronCancelId: null,
  patronExpireId: null,
  editNeedsRevisionId: null,
  editRejectId: null,
  mediaApproveId: null,
  mediaRejectId: null,
};

async function runTests() {
  console.log('\n▸ Portal Endpoints Tests\n');

  // ── Setup: bootstrap + role users ────────────────────────────
  await test('setup: bootstrap superadmin and create one user per role', async () => {
    const boot = await portalLogin('admin@punicodex.com', process.env.ADMIN_PASSWORD);
    assert.strictEqual(boot.status, 200);
    superToken = boot.body.token;

    for (const role of ['viewer', 'leasing', 'scholars', 'ops']) {
      const res = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
        headers: adminHeader(superToken),
        body: {
          email: `${role}@pe.test`,
          password: `${role}-password-123`,
          displayName: `${role} user`,
          role,
        },
      });
      assert.strictEqual(res.status, 201, `${role}: ${JSON.stringify(res.body)}`);
      const login = await portalLogin(`${role}@pe.test`, `${role}-password-123`);
      assert.strictEqual(login.status, 200, role);
      roleTokens[role] = login.body.token;
    }
  });

  // ── Seed entities ────────────────────────────────────────────
  await test('setup: seed business + university applications, patrons, scholarly items', async () => {
    const bizA = await createBooking({
      slotId: getSlotId(__filename, 'nike', 11),
      email: 'pe-biz-a@example.com',
      companyName: 'PE Approve Co',
      leaseMonths: 1,
      trialMonths: 0,
      siteSlug: 'nike',
    });
    await setBookingStatus(bizA.id, 'pending_application');
    seeded.businessApproveId = bizA.id;

    const bizB = await createBooking({
      slotId: getSlotId(__filename, 'nike', 12),
      email: 'pe-biz-b@example.com',
      companyName: 'PE Reject Co',
      leaseMonths: 1,
      trialMonths: 0,
      siteSlug: 'nike',
    });
    await setBookingStatus(bizB.id, 'pending_application');
    seeded.businessRejectId = bizB.id;

    const uniA = dbApi.createSponsorshipApplication({
      institutionName: 'Endpoint University',
      domain: 'endpoint-uni.edu',
      contactName: 'Prof Endpoint',
      contactEmail: 'prof@endpoint-uni.edu',
      departmentFocus: 'Classics, Linguistics',
      message: 'Endpoint application.',
    });
    seeded.universityApproveId = uniA.lastInsertRowid;

    // Same institution name on purpose: approval must dedupe the slug.
    const uniDup = dbApi.createSponsorshipApplication({
      institutionName: 'Endpoint University',
      domain: 'endpoint-uni-2.edu',
      contactName: 'Dr Duplicate',
      contactEmail: 'dr@endpoint-uni-2.edu',
      departmentFocus: '',
      message: '',
    });
    seeded.universitySlugDupId = uniDup.lastInsertRowid;

    const uniReject = dbApi.createSponsorshipApplication({
      institutionName: 'Endpoint Reject College',
      domain: 'endpoint-reject.edu',
      contactName: 'Dr No',
      contactEmail: 'no@endpoint-reject.edu',
      departmentFocus: '',
      message: '',
    });
    seeded.universityRejectId = uniReject.lastInsertRowid;

    const patronCancel = await createPatronCheckoutRecord({
      templeId: 'pe-filter',
      email: 'cancel@pe.test',
      displayName: 'PE Cancel',
      amountCents: 700,
    });
    await markPatronPaid(patronCancel.id, 'sub_pe_cancel', 'cus_pe_cancel', 700);
    seeded.patronCancelId = patronCancel.id;

    const patronExpire = await createPatronCheckoutRecord({
      templeId: 'pe-filter',
      email: 'expire@pe.test',
      displayName: 'PE Expire',
      amountCents: 1000,
    });
    await markPatronPaid(patronExpire.id, 'sub_pe_expire', 'cus_pe_expire', 1000);
    seeded.patronExpireId = patronExpire.id;

    // Pending (unpaid) patron on the same temple for filter coverage.
    await createPatronCheckoutRecord({
      templeId: 'pe-filter',
      email: 'pending@pe.test',
      displayName: 'PE Pending',
      amountCents: 500,
    });

    const student = dbApi.createUserWithPassword({
      email: 'student@pe.edu',
      institutionId: null,
      role: 'student',
      displayName: 'PE Student',
      passwordHash: 'x',
      accountStatus: 'active',
    });
    const temple = dbApi.createTemple({
      entryId: 'pe-temple',
      name: 'PE Temple',
      pantheon: 'greek',
      tier: '2',
      manifestVersion: '0.1',
    });
    const section = dbApi.createSection({
      templeId: temple.lastInsertRowid,
      key: 'overview',
      label: 'Overview',
    });
    seeded.sectionId = section.lastInsertRowid;

    for (const key of ['editNeedsRevisionId', 'editRejectId']) {
      const edit = dbApi.createEdit({
        sectionId: section.lastInsertRowid,
        userId: student.lastInsertRowid,
        proposedBody: `PE proposed body for ${key}.`,
        proposedSources: [],
        proposedMedia: [],
      });
      seeded[key] = edit.lastInsertRowid;
    }

    for (const key of ['mediaApproveId', 'mediaRejectId']) {
      const media = dbApi.createMedia({
        filename: `${key}.png`,
        url: `/uploads/scholars/${key}.png`,
        mimeType: 'image/png',
        sizeBytes: 4321,
        uploadedBy: student.lastInsertRowid,
      });
      seeded[key] = media.lastInsertRowid;
    }
  });

  // ── (a) Role matrix ──────────────────────────────────────────
  await test('role matrix: viewer gets 403 on EVERY mutation route', async () => {
    for (const route of MUTATION_ROUTES) {
      const res = await invoke(route.handler, route.method, route.url, {
        headers: adminHeader(roleTokens.viewer),
        params: route.params,
        body: route.body,
      });
      assert.strictEqual(res.status, 403, `${route.label} → ${res.status}`);
      assert.strictEqual(res.body.error, 'Forbidden');
      assert.strictEqual(res.body.role, 'viewer');
    }
  });

  await test('role matrix: ops gets 403 on EVERY mutation route', async () => {
    for (const route of MUTATION_ROUTES) {
      const res = await invoke(route.handler, route.method, route.url, {
        headers: adminHeader(roleTokens.ops),
        params: route.params,
        body: route.body,
      });
      assert.strictEqual(res.status, 403, `${route.label} → ${res.status}`);
    }
  });

  await test('role matrix: leasing is forbidden from scholars queues, university applications, and user management', async () => {
    const forbidden = MUTATION_ROUTES.filter(
      (r) =>
        r.label.startsWith('users.') ||
        r.label.startsWith('scholars.') ||
        r.label.startsWith('applications.university.')
    );
    assert.strictEqual(forbidden.length, 10);
    for (const route of forbidden) {
      const res = await invoke(route.handler, route.method, route.url, {
        headers: adminHeader(roleTokens.leasing),
        params: route.params,
        body: route.body,
      });
      assert.strictEqual(res.status, 403, `${route.label} → ${res.status}`);
    }

    const usersList = await invoke(usersHandler, 'GET', '/api/admin/portal/users/', {
      headers: adminHeader(roleTokens.leasing),
    });
    assert.strictEqual(usersList.status, 403);
  });

  await test('role matrix: scholars is forbidden from business applications, patrons mutations, and user management', async () => {
    const forbidden = MUTATION_ROUTES.filter(
      (r) =>
        r.label.startsWith('users.') ||
        r.label.startsWith('applications.business.') ||
        r.label === 'patrons.patch'
    );
    assert.strictEqual(forbidden.length, 7);
    for (const route of forbidden) {
      const res = await invoke(route.handler, route.method, route.url, {
        headers: adminHeader(roleTokens.scholars),
        params: route.params,
        body: route.body,
      });
      assert.strictEqual(res.status, 403, `${route.label} → ${res.status}`);
    }

    const usersList = await invoke(usersHandler, 'GET', '/api/admin/portal/users/', {
      headers: adminHeader(roleTokens.scholars),
    });
    assert.strictEqual(usersList.status, 403);
  });

  await test('role matrix: every role (incl. ops + viewer) keeps read access', async () => {
    for (const [role, token] of Object.entries(roleTokens)) {
      for (const route of READ_ROUTES) {
        const res = await invoke(route.handler, 'GET', route.url, {
          headers: adminHeader(token),
        });
        assert.strictEqual(res.status, 200, `${role} ${route.label} → ${res.status}`);
      }
    }
    // User management stays superadmin-only.
    for (const role of ['viewer', 'leasing', 'scholars', 'ops']) {
      const res = await invoke(usersHandler, 'GET', '/api/admin/portal/users/', {
        headers: adminHeader(roleTokens[role]),
      });
      assert.strictEqual(res.status, 403, `${role} users.list → ${res.status}`);
    }
  });

  // ── (a2) Portal analytics endpoint ───────────────────────
  await test('analytics: rejects unauthenticated requests with 401', async () => {
    const res = await invoke(analyticsHandler, 'GET', '/api/admin/portal/analytics/', {});
    assert.strictEqual(res.status, 401);
  });

  await test('analytics: envelope shape with a valid session', async () => {
    const res = await invoke(analyticsHandler, 'GET', '/api/admin/portal/analytics/?days=7', {
      headers: adminHeader(roleTokens.viewer),
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body).slice(0, 200));
    const b = res.body;
    assert.ok(
      typeof b.generatedAt === 'string' && !Number.isNaN(new Date(b.generatedAt).getTime()),
      'generatedAt should be an ISO timestamp'
    );

    const o = b.overview;
    assert.ok(o && typeof o === 'object', 'overview missing');
    assert.strictEqual(o.periodDays, 7);
    for (const key of ['humanViews', 'botViews', 'uniqueSessions', 'botPct']) {
      assert.strictEqual(typeof o.totals[key], 'number', `totals.${key} should be a number`);
    }
    assert.ok(Array.isArray(o.byDay) && o.byDay.length === 7, 'byDay should cover 7 days');
    for (const key of ['topTemples', 'topReferrers', 'botCategories']) {
      assert.ok(Array.isArray(o[key]), `overview.${key} should be an array`);
    }
    assert.ok(o.devices && typeof o.devices === 'object', 'devices missing');
    // topPaths: array of {path, views} when the driver computes path rollups,
    // an honest null otherwise — never missing.
    assert.ok(
      Array.isArray(o.topPaths) || o.topPaths === null,
      'overview.topPaths should be an array or null'
    );
    if (Array.isArray(o.topPaths)) {
      assert.ok(o.topPaths.length <= 20, 'topPaths capped at 20');
      for (const row of o.topPaths) {
        assert.strictEqual(typeof row.path, 'string');
        assert.strictEqual(typeof row.views, 'number');
      }
    }

    const e = b.engagement;
    assert.ok(e && typeof e === 'object', 'engagement missing');
    for (const key of ['periodDays', 'engagements', 'avgVisibleMs', 'avgScrollPct']) {
      assert.strictEqual(typeof e[key], 'number', `engagement.${key} should be a number`);
    }
    assert.ok(Array.isArray(e.topEngaged), 'engagement.topEngaged should be an array');

    // depth is null when the storage driver cannot compute it.
    assert.ok(b.depth === null || typeof b.depth === 'object', 'depth should be an object or null');
    if (b.depth) {
      for (const key of [
        'periodDays',
        'pagesPerSession',
        'singlePageSessions',
        'sessions',
        'bouncePct',
      ]) {
        assert.strictEqual(typeof b.depth[key], 'number', `depth.${key} should be a number`);
      }
    }
  });

  await test('analytics: days is clamped to the 1–120 window', async () => {
    const high = await invoke(analyticsHandler, 'GET', '/api/admin/portal/analytics/?days=500', {
      headers: adminHeader(roleTokens.viewer),
    });
    assert.strictEqual(high.status, 200);
    assert.strictEqual(high.body.overview.periodDays, 120);
    assert.strictEqual(high.body.overview.byDay.length, 120);

    const garbage = await invoke(analyticsHandler, 'GET', '/api/admin/portal/analytics/?days=abc', {
      headers: adminHeader(roleTokens.viewer),
    });
    assert.strictEqual(garbage.status, 200);
    assert.strictEqual(garbage.body.overview.periodDays, 30);
  });

  await test('analytics: temple scope narrows the overview to one temple', async () => {
    const res = await invoke(
      analyticsHandler,
      'GET',
      '/api/admin/portal/analytics/?days=30&temple=nike',
      { headers: adminHeader(roleTokens.leasing) }
    );
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.overview.topTemples.every((t) => t.templeId === 'nike'));
    if (Array.isArray(res.body.overview.topPaths)) {
      assert.ok(res.body.overview.topPaths.every((p) => p.path.startsWith('/sites/nike/')));
    }
  });

  // ── (b) Application flows ────────────────────────────────────
  await test('business approve returns stripeUrl, persists pending_payment, and refuses a second approve', async () => {
    const res = await invoke(
      appApproveHandler,
      'POST',
      `/api/admin/portal/applications/business/${seeded.businessApproveId}/approve/`,
      {
        headers: adminHeader(roleTokens.leasing),
        params: { kind: 'business', id: String(seeded.businessApproveId) },
        body: { note: 'Looks good' },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.status, 'pending_payment');
    assert.ok(/^https:\/\//.test(res.body.stripeUrl), 'stripeUrl should be an https URL');

    const row = db()
      .prepare('SELECT status, stripe_session_id FROM bookings WHERE id = ?')
      .get(seeded.businessApproveId);
    assert.strictEqual(row.status, 'pending_payment');
    assert.ok(row.stripe_session_id, 'stripe session id persisted');

    const again = await invoke(
      appApproveHandler,
      'POST',
      `/api/admin/portal/applications/business/${seeded.businessApproveId}/approve/`,
      {
        headers: adminHeader(roleTokens.leasing),
        params: { kind: 'business', id: String(seeded.businessApproveId) },
      }
    );
    assert.strictEqual(again.status, 400);
  });

  await test('university approve provisions institution + admin, shows the one-time password once, stores the comment', async () => {
    const res = await invoke(
      appApproveHandler,
      'POST',
      `/api/admin/portal/applications/university/${seeded.universityApproveId}/approve/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'university', id: String(seeded.universityApproveId) },
        body: { reviewComment: 'Strong department' },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.approved, true);
    assert.ok(res.body.institutionId);
    assert.ok(res.body.adminId);
    assert.strictEqual(res.body.adminEmail, 'prof@endpoint-uni.edu');
    assert.ok(
      typeof res.body.adminPassword === 'string' && res.body.adminPassword.length >= 8,
      'one-time admin password returned'
    );

    const institution = db()
      .prepare('SELECT * FROM scholars_institutions WHERE id = ?')
      .get(res.body.institutionId);
    assert.ok(institution, 'institution row exists');
    assert.strictEqual(institution.slug, 'endpoint-university');
    assert.deepStrictEqual(JSON.parse(institution.department_allowlist), [
      'Classics',
      'Linguistics',
    ]);

    const adminUser = db()
      .prepare('SELECT * FROM scholars_users WHERE email = ?')
      .get('prof@endpoint-uni.edu');
    assert.ok(adminUser);
    assert.strictEqual(adminUser.role, 'inst_admin');

    const application = dbApi.getSponsorshipApplicationById(seeded.universityApproveId);
    assert.strictEqual(application.status, 'approved');
    assert.strictEqual(application.review_comment, 'Strong department');
  });

  await test('university approve with a duplicate institution name gets a deduped slug', async () => {
    const res = await invoke(
      appApproveHandler,
      'POST',
      `/api/admin/portal/applications/university/${seeded.universitySlugDupId}/approve/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'university', id: String(seeded.universitySlugDupId) },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    const institution = db()
      .prepare('SELECT slug FROM scholars_institutions WHERE id = ?')
      .get(res.body.institutionId);
    assert.strictEqual(institution.slug, 'endpoint-university-2');
  });

  await test('rejects persist status + comment (university) and delegate with note (business)', async () => {
    const uni = await invoke(
      appRejectHandler,
      'POST',
      `/api/admin/portal/applications/university/${seeded.universityRejectId}/reject/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'university', id: String(seeded.universityRejectId) },
        body: { reviewComment: 'Insufficient accreditation' },
      }
    );
    assert.strictEqual(uni.status, 200);
    assert.strictEqual(uni.body.rejected, true);
    const uniRow = dbApi.getSponsorshipApplicationById(seeded.universityRejectId);
    assert.strictEqual(uniRow.status, 'rejected');
    assert.strictEqual(uniRow.review_comment, 'Insufficient accreditation');

    // A second reject on a decided application is a 400.
    const uniAgain = await invoke(
      appRejectHandler,
      'POST',
      `/api/admin/portal/applications/university/${seeded.universityRejectId}/reject/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'university', id: String(seeded.universityRejectId) },
      }
    );
    assert.strictEqual(uniAgain.status, 400);

    const biz = await invoke(
      appRejectHandler,
      'POST',
      `/api/admin/portal/applications/business/${seeded.businessRejectId}/reject/`,
      {
        headers: adminHeader(roleTokens.leasing),
        params: { kind: 'business', id: String(seeded.businessRejectId) },
        body: { note: 'Off-topic creative' },
      }
    );
    assert.strictEqual(biz.status, 200);
    assert.strictEqual(biz.body.status, 'rejected');
    const bizRow = db()
      .prepare('SELECT status FROM bookings WHERE id = ?')
      .get(seeded.businessRejectId);
    assert.strictEqual(bizRow.status, 'rejected');
  });

  // ── (c) Patrons administration ───────────────────────────────
  await test('patrons list filters by temple and status, paginates, and rejects bad status', async () => {
    const byTemple = await invoke(
      patronsHandler,
      'GET',
      '/api/admin/portal/patrons/?temple=pe-filter',
      {
        headers: adminHeader(roleTokens.leasing),
      }
    );
    assert.strictEqual(byTemple.status, 200);
    assert.strictEqual(byTemple.body.total, 3);
    assert.ok(byTemple.body.items.every((p) => p.temple_id === 'pe-filter'));

    const active = await invoke(
      patronsHandler,
      'GET',
      '/api/admin/portal/patrons/?temple=pe-filter&status=active',
      { headers: adminHeader(roleTokens.leasing) }
    );
    assert.strictEqual(active.body.total, 2);

    const pending = await invoke(
      patronsHandler,
      'GET',
      '/api/admin/portal/patrons/?temple=pe-filter&status=pending_payment',
      { headers: adminHeader(roleTokens.leasing) }
    );
    assert.strictEqual(pending.body.total, 1);
    assert.strictEqual(pending.body.items[0].display_name, 'PE Pending');

    const page = await invoke(
      patronsHandler,
      'GET',
      '/api/admin/portal/patrons/?temple=pe-filter&limit=2&offset=2',
      { headers: adminHeader(roleTokens.leasing) }
    );
    assert.strictEqual(page.body.items.length, 1);
    assert.strictEqual(page.body.total, 3);
    assert.strictEqual(page.body.limit, 2);
    assert.strictEqual(page.body.offset, 2);

    const pastEnd = await invoke(
      patronsHandler,
      'GET',
      '/api/admin/portal/patrons/?temple=pe-filter&offset=50',
      { headers: adminHeader(roleTokens.leasing) }
    );
    assert.strictEqual(pastEnd.body.items.length, 0);
    assert.strictEqual(pastEnd.body.total, 3);

    const badStatus = await invoke(
      patronsHandler,
      'GET',
      '/api/admin/portal/patrons/?status=frozen',
      {
        headers: adminHeader(roleTokens.leasing),
      }
    );
    assert.strictEqual(badStatus.status, 400);
  });

  await test('PATCH /patrons/:id supports cancel and expire; rejects invalid statuses and unknown ids', async () => {
    const cancel = await invoke(
      patronPatchHandler,
      'PATCH',
      `/api/admin/portal/patrons/${seeded.patronCancelId}/`,
      {
        headers: adminHeader(roleTokens.leasing),
        params: { id: String(seeded.patronCancelId) },
        body: { status: 'cancelled' },
      }
    );
    assert.strictEqual(cancel.status, 200);
    assert.strictEqual(cancel.body.patron.status, 'cancelled');

    const expire = await invoke(
      patronPatchHandler,
      'PATCH',
      `/api/admin/portal/patrons/${seeded.patronExpireId}/`,
      {
        headers: adminHeader(roleTokens.leasing),
        params: { id: String(seeded.patronExpireId) },
        body: { status: 'expired' },
      }
    );
    assert.strictEqual(expire.status, 200);
    assert.strictEqual(expire.body.patron.status, 'expired');

    for (const status of ['active', 'pending_payment', 'frozen', 42, null]) {
      const bad = await invoke(
        patronPatchHandler,
        'PATCH',
        `/api/admin/portal/patrons/${seeded.patronCancelId}/`,
        {
          headers: adminHeader(roleTokens.leasing),
          params: { id: String(seeded.patronCancelId) },
          body: { status },
        }
      );
      assert.strictEqual(bad.status, 400, `status=${status} → ${bad.status}`);
    }

    const missing = await invoke(patronPatchHandler, 'PATCH', '/api/admin/portal/patrons/999999/', {
      headers: adminHeader(roleTokens.leasing),
      params: { id: '999999' },
      body: { status: 'cancelled' },
    });
    assert.strictEqual(missing.status, 404);
  });

  await test('patron stats expose the full aggregate shape', async () => {
    const res = await invoke(patronStatsHandler, 'GET', '/api/admin/portal/patrons/stats/', {
      headers: adminHeader(roleTokens.viewer),
    });
    assert.strictEqual(res.status, 200);
    const b = res.body;
    for (const key of [
      'total',
      'pendingPayment',
      'active',
      'cancelled',
      'expired',
      'activeTemples',
      'estimatedMrrCents',
      'limitPerTemple',
    ]) {
      assert.strictEqual(typeof b[key], 'number', `${key} should be a number`);
    }
    assert.strictEqual(typeof b.estimatedMrrDollars, 'string');
    assert.strictEqual(b.limitPerTemple, 20);
    assert.ok(b.cancelled >= 1 && b.expired >= 1, 'cancel/expire flows reflected in stats');
    assert.strictEqual(b.total, b.pendingPayment + b.active + b.cancelled + b.expired);
  });

  // ── (d) Scholars queues ──────────────────────────────────────
  await test('scholars pending queue returns edits and media with totals and item fields', async () => {
    const res = await invoke(scholarsPendingHandler, 'GET', '/api/admin/portal/scholars/pending/', {
      headers: adminHeader(roleTokens.ops),
    });
    assert.strictEqual(res.status, 200);
    const { edits, media } = res.body;
    assert.ok(Array.isArray(edits.items) && typeof edits.total === 'number');
    assert.ok(Array.isArray(media.items) && typeof media.total === 'number');
    assert.ok(edits.total >= 2 && media.total >= 2);

    const edit = edits.items.find((e) => e.id === seeded.editNeedsRevisionId);
    assert.ok(edit);
    assert.strictEqual(edit.proposed_body, 'PE proposed body for editNeedsRevisionId.');
    assert.strictEqual(edit.status, 'pending');

    const item = media.items.find((m) => m.id === seeded.mediaApproveId);
    assert.ok(item);
    assert.strictEqual(item.filename, 'mediaApproveId.png');
    assert.strictEqual(item.status, 'pending');
  });

  await test('approve a pending media upload; a second review is a 400', async () => {
    const res = await invoke(
      scholarApproveHandler,
      'POST',
      `/api/admin/portal/scholars/media/${seeded.mediaApproveId}/approve/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'media', id: String(seeded.mediaApproveId) },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.approved, true);
    assert.strictEqual(dbApi.getMediaById(seeded.mediaApproveId).status, 'approved');

    const again = await invoke(
      scholarApproveHandler,
      'POST',
      `/api/admin/portal/scholars/media/${seeded.mediaApproveId}/approve/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'media', id: String(seeded.mediaApproveId) },
      }
    );
    assert.strictEqual(again.status, 400);
  });

  await test('reject an edit with needs_revision leaves the section body untouched', async () => {
    const before = db()
      .prepare('SELECT body FROM scholars_sections WHERE id = ?')
      .get(seeded.sectionId);

    const res = await invoke(
      scholarRejectHandler,
      'POST',
      `/api/admin/portal/scholars/edit/${seeded.editNeedsRevisionId}/reject/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'edit', id: String(seeded.editNeedsRevisionId) },
        body: { comment: 'Needs sources', status: 'needs_revision' },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.rejected, true);
    assert.strictEqual(res.body.status, 'needs_revision');
    assert.strictEqual(dbApi.getEditById(seeded.editNeedsRevisionId).status, 'needs_revision');

    const after = db()
      .prepare('SELECT body FROM scholars_sections WHERE id = ?')
      .get(seeded.sectionId);
    assert.strictEqual(after.body, before.body, 'rejected edit must not modify the section');
  });

  await test('reject an edit without a status defaults to rejected; unknown status values are not honored', async () => {
    const res = await invoke(
      scholarRejectHandler,
      'POST',
      `/api/admin/portal/scholars/edit/${seeded.editRejectId}/reject/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'edit', id: String(seeded.editRejectId) },
        body: { status: 'bogus-value' },
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.rejected, true);
    assert.strictEqual(
      res.body.status,
      'rejected',
      'non-needs_revision values fall back to rejected'
    );
    assert.strictEqual(dbApi.getEditById(seeded.editRejectId).status, 'rejected');

    const media = await invoke(
      scholarRejectHandler,
      'POST',
      `/api/admin/portal/scholars/media/${seeded.mediaRejectId}/reject/`,
      {
        headers: adminHeader(roleTokens.scholars),
        params: { kind: 'media', id: String(seeded.mediaRejectId) },
      }
    );
    assert.strictEqual(media.status, 200);
    assert.strictEqual(media.body.rejected, true);
    assert.strictEqual(dbApi.getMediaById(seeded.mediaRejectId).status, 'rejected');
  });

  // ── (e) Error paths ──────────────────────────────────────────
  await test('wrong methods return 405 across portal routes', async () => {
    const cases = [
      { handler: loginHandler, method: 'GET', url: '/api/admin/portal/login/' },
      { handler: usersHandler, method: 'PUT', url: '/api/admin/portal/users/' },
      {
        handler: userPatchHandler,
        method: 'POST',
        url: '/api/admin/portal/users/1/',
        params: { id: '1' },
      },
      { handler: applicationsHandler, method: 'POST', url: '/api/admin/portal/applications/' },
      {
        handler: appApproveHandler,
        method: 'GET',
        url: '/api/admin/portal/applications/business/1/approve/',
        params: { kind: 'business', id: '1' },
      },
      { handler: patronsHandler, method: 'POST', url: '/api/admin/portal/patrons/' },
      {
        handler: patronPatchHandler,
        method: 'GET',
        url: '/api/admin/portal/patrons/1/',
        params: { id: '1' },
      },
      { handler: patronStatsHandler, method: 'DELETE', url: '/api/admin/portal/patrons/stats/' },
      {
        handler: scholarsPendingHandler,
        method: 'POST',
        url: '/api/admin/portal/scholars/pending/',
      },
      {
        handler: scholarApproveHandler,
        method: 'PATCH',
        url: '/api/admin/portal/scholars/edit/1/approve/',
        params: { kind: 'edit', id: '1' },
      },
      { handler: dashboardHandler, method: 'POST', url: '/api/admin/portal/dashboard/' },
      { handler: analyticsHandler, method: 'POST', url: '/api/admin/portal/analytics/' },
      { handler: passwordHandler, method: 'GET', url: '/api/admin/portal/me/password/' },
    ];
    for (const c of cases) {
      const res = await invoke(c.handler, c.method, c.url, {
        headers: adminHeader(superToken),
        params: c.params,
      });
      assert.strictEqual(res.status, 405, `${c.method} ${c.url} → ${res.status}`);
    }
  });

  await test('garbage request bodies are rejected with 400 on validated mutations', async () => {
    for (const body of ['{"email":', ['not', 'an', 'object'], 42]) {
      const res = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
        headers: adminHeader(superToken),
        body,
      });
      assert.strictEqual(
        res.status,
        400,
        `users POST body=${JSON.stringify(body)} → ${res.status}`
      );

      const patron = await invoke(patronPatchHandler, 'PATCH', '/api/admin/portal/patrons/1/', {
        headers: adminHeader(roleTokens.leasing),
        params: { id: '1' },
        body,
      });
      assert.strictEqual(
        patron.status,
        400,
        `patrons PATCH body=${JSON.stringify(body)} → ${patron.status}`
      );
    }
  });

  await test('unknown application/scholar kinds return 400', async () => {
    const targets = [
      {
        handler: appApproveHandler,
        kind: 'alien',
        url: '/api/admin/portal/applications/alien/1/approve/',
      },
      {
        handler: appRejectHandler,
        kind: 'alien',
        url: '/api/admin/portal/applications/alien/1/reject/',
      },
      {
        handler: scholarApproveHandler,
        kind: 'alien',
        url: '/api/admin/portal/scholars/alien/1/approve/',
      },
      {
        handler: scholarRejectHandler,
        kind: 'alien',
        url: '/api/admin/portal/scholars/alien/1/reject/',
      },
    ];
    for (const t of targets) {
      const res = await invoke(t.handler, 'POST', t.url, {
        headers: adminHeader(superToken),
        params: { kind: t.kind, id: '1' },
      });
      assert.strictEqual(res.status, 400, `${t.url} → ${res.status}`);
    }

    const list = await invoke(
      applicationsHandler,
      'GET',
      '/api/admin/portal/applications/?kind=alien',
      {
        headers: adminHeader(superToken),
      }
    );
    assert.strictEqual(list.status, 400);
  });

  await test('non-integer ids return 400 on every parameterized route', async () => {
    const cases = [
      {
        handler: userPatchHandler,
        method: 'PATCH',
        url: '/api/admin/portal/users/abc/',
        params: { id: 'abc' },
      },
      {
        handler: userDisableHandler,
        method: 'POST',
        url: '/api/admin/portal/users/abc/disable/',
        params: { id: 'abc' },
      },
      {
        handler: userResetHandler,
        method: 'POST',
        url: '/api/admin/portal/users/abc/reset-password/',
        params: { id: 'abc' },
      },
      {
        handler: appApproveHandler,
        method: 'POST',
        url: '/api/admin/portal/applications/business/abc/approve/',
        params: { kind: 'business', id: 'abc' },
      },
      {
        handler: appRejectHandler,
        method: 'POST',
        url: '/api/admin/portal/applications/university/abc/reject/',
        params: { kind: 'university', id: 'abc' },
      },
      {
        handler: patronPatchHandler,
        method: 'PATCH',
        url: '/api/admin/portal/patrons/abc/',
        params: { id: 'abc' },
        body: { status: 'cancelled' },
      },
      {
        handler: scholarApproveHandler,
        method: 'POST',
        url: '/api/admin/portal/scholars/edit/abc/approve/',
        params: { kind: 'edit', id: 'abc' },
      },
      {
        handler: scholarRejectHandler,
        method: 'POST',
        url: '/api/admin/portal/scholars/media/abc/reject/',
        params: { kind: 'media', id: 'abc' },
      },
    ];
    for (const c of cases) {
      const res = await invoke(c.handler, c.method, c.url, {
        headers: adminHeader(superToken),
        params: c.params,
        body: c.body,
      });
      assert.strictEqual(res.status, 400, `${c.method} ${c.url} → ${res.status}`);
    }
  });

  await test('nonexistent ids return 404 from the service layer', async () => {
    const cases = [
      {
        handler: userPatchHandler,
        method: 'PATCH',
        url: '/api/admin/portal/users/999999/',
        params: { id: '999999' },
        body: { displayName: 'Ghost' },
      },
      {
        handler: userDisableHandler,
        method: 'POST',
        url: '/api/admin/portal/users/999999/disable/',
        params: { id: '999999' },
      },
      {
        handler: userResetHandler,
        method: 'POST',
        url: '/api/admin/portal/users/999999/reset-password/',
        params: { id: '999999' },
      },
      {
        handler: appApproveHandler,
        method: 'POST',
        url: '/api/admin/portal/applications/business/999999/approve/',
        params: { kind: 'business', id: '999999' },
      },
      {
        handler: appApproveHandler,
        method: 'POST',
        url: '/api/admin/portal/applications/university/999999/approve/',
        params: { kind: 'university', id: '999999' },
      },
      {
        handler: appRejectHandler,
        method: 'POST',
        url: '/api/admin/portal/applications/university/999999/reject/',
        params: { kind: 'university', id: '999999' },
      },
      {
        handler: scholarApproveHandler,
        method: 'POST',
        url: '/api/admin/portal/scholars/edit/999999/approve/',
        params: { kind: 'edit', id: '999999' },
      },
      {
        handler: scholarRejectHandler,
        method: 'POST',
        url: '/api/admin/portal/scholars/media/999999/reject/',
        params: { kind: 'media', id: '999999' },
      },
    ];
    for (const c of cases) {
      const res = await invoke(c.handler, c.method, c.url, {
        headers: adminHeader(superToken),
        params: c.params,
        body: c.body,
      });
      assert.strictEqual(res.status, 404, `${c.method} ${c.url} → ${res.status}`);
    }
  });

  // ── (f) Login rate limit ─────────────────────────────────────
  await test('portal login is rate limited to 10/min per IP (429 afterwards)', async () => {
    resetLimiters();
    const ip = nextIp();
    let last;
    for (let i = 0; i < 10; i++) {
      last = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
        headers: { 'x-forwarded-for': ip },
        body: { email: 'ghost@pe.test', password: 'wrong-password' },
      });
      assert.strictEqual(last.status, 401, `attempt ${i + 1} → ${last.status}`);
    }
    const blocked = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
      headers: { 'x-forwarded-for': ip },
      body: { email: 'ghost@pe.test', password: 'wrong-password' },
    });
    assert.strictEqual(blocked.status, 429);
    assert.ok(blocked.body.retryAfter >= 1);
    assert.ok(blocked.headers['retry-after']);

    // Isolation: resetting the limiters frees the bucket again.
    resetLimiters();
    const after = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
      headers: { 'x-forwarded-for': ip },
      body: { email: 'ghost@pe.test', password: 'wrong-password' },
    });
    assert.strictEqual(after.status, 401);
  });

  // ── (g) Session revocation ───────────────────────────────────
  await test('disabling a user kills their existing token on the next request', async () => {
    const created = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { email: 'revoke-me@pe.test', password: 'revoke-password-123', role: 'viewer' },
    });
    assert.strictEqual(created.status, 201);
    const userId = created.body.user.id;

    const login = await portalLogin('revoke-me@pe.test', 'revoke-password-123');
    assert.strictEqual(login.status, 200);
    const token = login.body.token;

    const before = await invoke(meHandler, 'GET', '/api/admin/portal/me/', {
      headers: adminHeader(token),
    });
    assert.strictEqual(before.status, 200);

    const disable = await invoke(
      userDisableHandler,
      'POST',
      `/api/admin/portal/users/${userId}/disable/`,
      { headers: adminHeader(superToken), params: { id: String(userId) } }
    );
    assert.strictEqual(disable.status, 200);
    assert.strictEqual(disable.body.user.status, 'disabled');

    const after = await invoke(meHandler, 'GET', '/api/admin/portal/me/', {
      headers: adminHeader(token),
    });
    assert.strictEqual(after.status, 401, 'disabled user token must die immediately');

    const loginAfter = await portalLogin('revoke-me@pe.test', 'revoke-password-123');
    assert.strictEqual(loginAfter.status, 401);
    assert.strictEqual(loginAfter.body.code, 'account_inactive');
  });

  await test('disabling via PATCH status also destroys sessions immediately', async () => {
    const created = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { email: 'patch-disable@pe.test', password: 'patch-password-123', role: 'viewer' },
    });
    const userId = created.body.user.id;
    const login = await portalLogin('patch-disable@pe.test', 'patch-password-123');
    const token = login.body.token;

    const patch = await invoke(userPatchHandler, 'PATCH', `/api/admin/portal/users/${userId}/`, {
      headers: adminHeader(superToken),
      params: { id: String(userId) },
      body: { status: 'disabled' },
    });
    assert.strictEqual(patch.status, 200);
    assert.strictEqual(patch.body.user.status, 'disabled');

    const after = await invoke(meHandler, 'GET', '/api/admin/portal/me/', {
      headers: adminHeader(token),
    });
    assert.strictEqual(after.status, 401);
  });

  await test('password change kills every session of the account, including siblings', async () => {
    const created = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { email: 'multi-session@pe.test', password: 'multi-password-123', role: 'viewer' },
    });
    assert.strictEqual(created.status, 201);

    const loginA = await portalLogin('multi-session@pe.test', 'multi-password-123');
    const loginB = await portalLogin('multi-session@pe.test', 'multi-password-123');
    const tokenA = loginA.body.token;
    const tokenB = loginB.body.token;
    assert.notStrictEqual(tokenA, tokenB);

    const changed = await invoke(passwordHandler, 'POST', '/api/admin/portal/me/password/', {
      headers: adminHeader(tokenA),
      body: { currentPassword: 'multi-password-123', newPassword: 'multi-new-password-456' },
    });
    assert.strictEqual(changed.status, 200);
    assert.strictEqual(changed.body.changed, true);

    for (const [label, token] of [
      ['acting session', tokenA],
      ['sibling session', tokenB],
    ]) {
      const res = await invoke(meHandler, 'GET', '/api/admin/portal/me/', {
        headers: adminHeader(token),
      });
      assert.strictEqual(res.status, 401, `${label} should be revoked`);
    }

    const oldLogin = await portalLogin('multi-session@pe.test', 'multi-password-123');
    assert.strictEqual(oldLogin.status, 401);
    const newLogin = await portalLogin('multi-session@pe.test', 'multi-new-password-456');
    assert.strictEqual(newLogin.status, 200);
  });

  await test('user creation validates password length and email shape', async () => {
    const short = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { email: 'short@pe.test', password: 'tiny', role: 'viewer' },
    });
    assert.strictEqual(short.status, 400);

    const missing = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: { password: 'whatever-123', role: 'viewer' },
    });
    assert.strictEqual(missing.status, 400);

    const wrongCurrent = await invoke(passwordHandler, 'POST', '/api/admin/portal/me/password/', {
      headers: adminHeader(roleTokens.viewer),
      body: { currentPassword: 'not-the-password', newPassword: 'viewer-new-password-1' },
    });
    assert.strictEqual(wrongCurrent.status, 401);
  });

  console.log('\nPortal Endpoints: all tests passed');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
