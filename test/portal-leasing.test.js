/**
 * Portal Leasing Tests
 *
 * Covers the Leasing-section endpoints of the unified admin portal plus the
 * email.js temple-slug threading that the section depends on:
 *
 * - Auth: every /api/admin/portal/bookings/* and /api/admin/portal/tenants/
 *   route returns 401 without a portal token; viewer gets 403 (leasing
 *   permission required).
 * - Bookings list: envelope shape ({items, total, stats, revenue, limit,
 *   offset}), per-status counts in stats.byStatus, 30d revenue summary, and
 *   the status/temple/search filters (incl. the 'trialing' pseudo-status).
 * - Admin create: POST validates the body via the service and records the
 *   portal user in admin_actions.
 * - Action wrappers: approve / approve-application / reject / golive / end /
 *   report pass the booking id, note, and the portal auth object through to
 *   admin-booking-service (service mocked via require.cache before the
 *   handlers are required, so the list tests above keep the real service).
 * - Tenants directory: linkage fields (siteSlugs, patronTempleIds,
 *   bookingCount, patronCount) resolve through the shared ownership linkage.
 * - Email slug threading: getDashboardUrl + a notify helper for a non-nike
 *   booking link to that booking's temple, never /sites/nike/; mixed-temple
 *   dashboard-link emails get the neutral subject.
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-portal-leasing-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock the Stripe SDK before any service loads it (admin-created bookings and
// application approvals can build checkout sessions).
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_portal_leasing',
          url: 'https://checkout.stripe.com/portal-leasing-mock',
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
const tenantPortal = require('../platform/api/tenant-portal.js');

const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const usersHandler = require('../platform/api-handlers/admin/portal/users/index.js');
const bookingsHandler = require('../platform/api-handlers/admin/portal/bookings/index.js');
const tenantsHandler = require('../platform/api-handlers/admin/portal/tenants/index.js');

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

let superToken = null;
let viewerToken = null;
const seeded = {};

async function runTests() {
  console.log('\n▸ Portal Leasing Tests\n');

  // ── Setup: bootstrap + a viewer (non-leasing) account ──────────
  await test('setup: bootstrap superadmin and create a viewer account', async () => {
    const boot = await portalLogin('admin@punicodex.com', process.env.ADMIN_PASSWORD);
    assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
    superToken = boot.body.token;

    const res = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: {
        email: 'viewer@leasing.test',
        password: 'viewer-password-123',
        displayName: 'viewer user',
        role: 'viewer',
      },
    });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
    const login = await portalLogin('viewer@leasing.test', 'viewer-password-123');
    assert.strictEqual(login.status, 200);
    viewerToken = login.body.token;
  });

  // ── Seed bookings across temples and statuses ──────────────────
  await test('setup: seed bookings across temples and statuses', async () => {
    const zeusApp = await createBooking({
      slotId: getSlotId(__filename, 'zeus', 11),
      email: 'leasing-zeus@example.com',
      companyName: 'Zeus App Co',
      leaseMonths: 1,
      trialMonths: 0,
      siteSlug: 'zeus',
    });
    await setBookingStatus(zeusApp.id, 'pending_application');
    seeded.zeusAppId = zeusApp.id;

    const nikeUpload = await createBooking({
      slotId: getSlotId(__filename, 'nike', 11),
      email: 'leasing-nike@example.com',
      companyName: 'Nike Upload Co',
      leaseMonths: 12,
      trialMonths: 0,
      siteSlug: 'nike',
    });
    await setBookingStatus(nikeUpload.id, 'pending_upload');
    seeded.nikeUploadId = nikeUpload.id;

    const zeusLive = await createBooking({
      slotId: getSlotId(__filename, 'zeus', 12),
      email: 'leasing-live@example.com',
      companyName: 'Zeus Live Co',
      leaseMonths: 1,
      trialMonths: 0,
      siteSlug: 'zeus',
    });
    await setBookingStatus(zeusLive.id, 'approved');
    seeded.zeusApprovedId = zeusLive.id;
  });

  // ── Auth sweep ─────────────────────────────────────────────────
  await test('auth: 401 without a token on every leasing route', async () => {
    const checks = [
      ['GET', '/api/admin/portal/bookings/', bookingsHandler],
      ['POST', '/api/admin/portal/bookings/', bookingsHandler],
      ['GET', '/api/admin/portal/tenants/', tenantsHandler],
    ];
    for (const [method, url, handler] of checks) {
      const res = await invoke(handler, method, url, { body: method === 'POST' ? {} : null });
      assert.strictEqual(res.status, 401, `${method} ${url} → ${res.status}`);
    }
  });

  await test('auth: viewer gets 403 (leasing permission required)', async () => {
    const list = await invoke(bookingsHandler, 'GET', '/api/admin/portal/bookings/', {
      headers: adminHeader(viewerToken),
    });
    assert.strictEqual(list.status, 403);
    assert.strictEqual(list.body.required, 'leasing');

    const tenants = await invoke(tenantsHandler, 'GET', '/api/admin/portal/tenants/', {
      headers: adminHeader(viewerToken),
    });
    assert.strictEqual(tenants.status, 403);
  });

  // ── Bookings list ──────────────────────────────────────────────
  await test('bookings list returns the leasing envelope with stats and 30d revenue', async () => {
    const res = await invoke(bookingsHandler, 'GET', '/api/admin/portal/bookings/', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    const { items, total, stats, revenue, limit, offset } = res.body;
    assert.ok(Array.isArray(items), 'items array');
    assert.ok(total >= 3, `total >= 3, got ${total}`);
    assert.ok(limit > 0 && offset === 0, 'limit/offset echoed');

    assert.ok(stats && typeof stats === 'object', 'stats block');
    assert.ok(stats.byStatus && typeof stats.byStatus === 'object', 'stats.byStatus map');
    assert.strictEqual(stats.byStatus.pending_application, 1);
    assert.strictEqual(stats.byStatus.pending_upload, 1);
    assert.strictEqual(stats.byStatus.approved, 1);
    assert.ok('totalTrialing' in stats, 'stats.totalTrialing present');

    assert.ok(revenue && typeof revenue === 'object', 'revenue block');
    assert.strictEqual(revenue.days, 30);
    assert.ok(typeof revenue.revenueCents === 'number', 'revenue.revenueCents numeric');
    assert.ok(typeof revenue.revenueDollars === 'string', 'revenue.revenueDollars string');
    assert.ok(typeof revenue.bookings === 'number', 'revenue.bookings numeric');

    const zeus = items.find((b) => b.id === seeded.zeusAppId);
    assert.ok(zeus, 'seeded zeus booking present');
    assert.strictEqual(zeus.site_slug, 'zeus');
    assert.ok(zeus.slot_name, 'slot name joined');
  });

  await test('bookings list filters by status, temple, and search', async () => {
    const byStatus = await invoke(
      bookingsHandler,
      'GET',
      '/api/admin/portal/bookings/?status=pending_upload',
      { headers: adminHeader(superToken) }
    );
    assert.strictEqual(byStatus.status, 200);
    assert.strictEqual(byStatus.body.total, 1);
    assert.strictEqual(byStatus.body.items[0].id, seeded.nikeUploadId);

    const byTemple = await invoke(
      bookingsHandler,
      'GET',
      '/api/admin/portal/bookings/?temple=zeus',
      {
        headers: adminHeader(superToken),
      }
    );
    assert.strictEqual(byTemple.status, 200);
    assert.strictEqual(byTemple.body.total, 2);
    assert.ok(byTemple.body.items.every((b) => b.site_slug === 'zeus'));

    const bySearch = await invoke(
      bookingsHandler,
      'GET',
      '/api/admin/portal/bookings/?search=zeus app',
      { headers: adminHeader(superToken) }
    );
    assert.strictEqual(bySearch.status, 200);
    assert.strictEqual(bySearch.body.total, 1);
    assert.strictEqual(bySearch.body.items[0].id, seeded.zeusAppId);

    const bad = await invoke(bookingsHandler, 'GET', '/api/admin/portal/bookings/?status=bogus', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(bad.status, 400);
  });

  await test("bookings list supports the 'trialing' pseudo-status filter", async () => {
    const res = await invoke(
      bookingsHandler,
      'GET',
      '/api/admin/portal/bookings/?status=trialing',
      {
        headers: adminHeader(superToken),
      }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.total, 0);
    assert.deepStrictEqual(res.body.items, []);
  });

  // ── Admin create ───────────────────────────────────────────────
  await test('bookings POST creates a pending_upload booking and audits the portal user', async () => {
    const res = await invoke(bookingsHandler, 'POST', '/api/admin/portal/bookings/', {
      headers: adminHeader(superToken),
      body: {
        slotId: getSlotId(__filename, 'nike', 12),
        email: 'leasing-admin-create@example.com',
        companyName: 'Admin Create Co',
        leaseMonths: 1,
        trialMonths: 0,
      },
    });
    assert.strictEqual(res.status, 201, JSON.stringify(res.body));
    assert.strictEqual(res.body.status, 'pending_upload');
    assert.ok(res.body.bookingId > 0);

    const audit = db()
      .prepare(
        `SELECT admin_user_id, action FROM admin_actions
          WHERE booking_id = ? AND action = 'admin.booking.create'
          ORDER BY id DESC LIMIT 1`
      )
      .get(res.body.bookingId);
    assert.ok(audit, 'audit row written');
    assert.ok(audit.admin_user_id > 0, 'audit row records the portal user id');

    const invalid = await invoke(bookingsHandler, 'POST', '/api/admin/portal/bookings/', {
      headers: adminHeader(superToken),
      body: { companyName: 'Missing everything' },
    });
    assert.strictEqual(invalid.status, 400);
  });

  // ── Action wrappers (mocked service) ───────────────────────────
  await test('action wrappers pass id, note, and the portal auth to the service', async () => {
    const calls = [];
    const record =
      (fn) =>
      async (...args) => {
        calls.push({ fn, args });
        return { success: true, mocked: fn, stripeUrl: 'https://checkout.stripe.com/mock' };
      };
    const svcPath = require.resolve('../platform/api/admin-booking-service.js');
    const prior = require.cache[svcPath];
    require.cache[svcPath] = {
      id: svcPath,
      filename: svcPath,
      loaded: true,
      exports: {
        approveBooking: record('approveBooking'),
        approveApplication: record('approveApplication'),
        rejectBooking: record('rejectBooking'),
        goLiveBooking: record('goLiveBooking'),
        endBookingAdmin: record('endBookingAdmin'),
        sendBookingReport: record('sendBookingReport'),
      },
    };

    try {
      const approveHandler = require('../platform/api-handlers/admin/portal/bookings/[id]/approve/index.js');
      const approveAppHandler = require('../platform/api-handlers/admin/portal/bookings/[id]/approve-application/index.js');
      const rejectHandler = require('../platform/api-handlers/admin/portal/bookings/[id]/reject/index.js');
      const goliveHandler = require('../platform/api-handlers/admin/portal/bookings/[id]/golive/index.js');
      const endHandler = require('../platform/api-handlers/admin/portal/bookings/[id]/end/index.js');
      const reportHandler = require('../platform/api-handlers/admin/portal/bookings/[id]/report/index.js');

      // 401 without a token even with the service mocked.
      const noAuth = await invoke(goliveHandler, 'POST', '/api/admin/portal/bookings/5/golive/', {
        params: { id: '5' },
        body: {},
      });
      assert.strictEqual(noAuth.status, 401);

      const routes = [
        [
          approveHandler,
          '/api/admin/portal/bookings/5/approve/',
          'approveBooking',
          { note: 'ok' },
          [5, 'ok'],
        ],
        [
          approveAppHandler,
          '/api/admin/portal/bookings/6/approve-application/',
          'approveApplication',
          {},
          [6],
        ],
        [
          rejectHandler,
          '/api/admin/portal/bookings/7/reject/',
          'rejectBooking',
          { note: 'no' },
          [7, 'no'],
        ],
        [goliveHandler, '/api/admin/portal/bookings/8/golive/', 'goLiveBooking', {}, [8]],
        [endHandler, '/api/admin/portal/bookings/9/end/', 'endBookingAdmin', {}, [9]],
        [reportHandler, '/api/admin/portal/bookings/10/report/', 'sendBookingReport', {}, [10]],
      ];
      for (const [handler, url, fn, body, expectedArgs] of routes) {
        const id = url.split('/')[5];
        const res = await invoke(handler, 'POST', url, {
          headers: adminHeader(superToken),
          params: { id },
          body,
        });
        assert.strictEqual(res.status, 200, `${fn} → ${res.status}: ${JSON.stringify(res.body)}`);
        assert.strictEqual(res.body.mocked, fn);
        const call = calls.find((c) => c.fn === fn);
        assert.ok(call, `${fn} called`);
        assert.deepStrictEqual(call.args.slice(0, expectedArgs.length), expectedArgs, `${fn} args`);
        const actor = call.args[call.args.length - 1];
        assert.ok(actor && typeof actor === 'object', `${fn} received the auth object`);
        assert.ok(actor.user && actor.user.id > 0, `${fn} actor carries the portal user`);
        assert.strictEqual(actor.user.email, 'admin@punicodex.com');
      }

      const badId = await invoke(
        approveHandler,
        'POST',
        '/api/admin/portal/bookings/abc/approve/',
        {
          headers: adminHeader(superToken),
          params: { id: 'abc' },
          body: {},
        }
      );
      assert.strictEqual(badId.status, 400);
    } finally {
      if (prior) require.cache[svcPath] = prior;
      else delete require.cache[svcPath];
    }
  });

  // ── Tenants directory ──────────────────────────────────────────
  await test('tenants endpoint returns linkage fields', async () => {
    // Provision a tenant account for the seeded zeus booking email so the
    // linkage has a real account row to augment.
    const provision = await tenantPortal.provisionTenantAccount('leasing-zeus@example.com', {
      kind: 'sponsor',
    });
    assert.ok(provision.account.id > 0);

    const res = await invoke(tenantsHandler, 'GET', '/api/admin/portal/tenants/', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    const { items, total } = res.body;
    assert.ok(total >= 1);
    const tenant = items.find((t) => t.email === 'leasing-zeus@example.com');
    assert.ok(tenant, 'provisioned tenant listed');
    assert.deepStrictEqual(tenant.siteSlugs, ['zeus']);
    assert.deepStrictEqual(tenant.patronTempleIds, []);
    assert.strictEqual(tenant.bookingCount, 1);
    assert.strictEqual(tenant.patronCount, 0);
    assert.ok('status' in tenant && 'createdAt' in tenant && 'lastLoginAt' in tenant);
  });

  // ── Email slug threading ───────────────────────────────────────
  await test('getDashboardUrl links to the booking temple, never silently nike', async () => {
    const email = require('../platform/api/email.js');
    const zeusUrl = email.getDashboardUrl('tok-zeus', 'zeus');
    assert.ok(zeusUrl.includes('/sites/zeus/'), zeusUrl);
    assert.ok(!zeusUrl.includes('/sites/nike/'), zeusUrl);
    assert.ok(zeusUrl.includes('token=tok-zeus'));
  });

  await test('notifyApproved for a zeus booking links /sites/zeus/ and brands the temple', async () => {
    const emailPath = require.resolve('../platform/api/email.js');
    const originalFetch = globalThis.fetch;
    const hadKey = 'RESEND_API_KEY' in process.env;
    const priorKey = process.env.RESEND_API_KEY;

    let captured = null;
    globalThis.fetch = async (url, options) => {
      captured = { url, options };
      return { ok: true, json: async () => ({ id: 'resend-leasing-test' }) };
    };

    try {
      process.env.RESEND_API_KEY = 'test-resend-key';
      delete require.cache[emailPath];
      const freshEmail = require(emailPath);

      const result = await freshEmail.notifyApproved({
        email: 'leasing-zeus@example.com',
        slotName: 'Thunder Banner',
        companyName: 'Zeus App Co',
        bookingToken: 'tok-zeus-1',
        siteSlug: 'zeus',
      });

      assert.strictEqual(result.success, true);
      const payload = JSON.parse(captured.options.body);
      assert.ok(
        payload.html.includes('/sites/zeus/dashboard/?token=tok-zeus-1'),
        'zeus dashboard link'
      );
      assert.ok(!payload.html.includes('/sites/nike/'), 'no nike link leaked');
      assert.ok(payload.html.includes('Zeús — Creative Approved'), 'temple branding in body');
    } finally {
      globalThis.fetch = originalFetch;
      if (hadKey) process.env.RESEND_API_KEY = priorKey;
      else delete process.env.RESEND_API_KEY;
      delete require.cache[emailPath];
    }
  });

  await test('sendDashboardLinks brands a single temple and neutralizes mixed temples', async () => {
    const emailPath = require.resolve('../platform/api/email.js');
    const originalFetch = globalThis.fetch;
    const hadKey = 'RESEND_API_KEY' in process.env;
    const priorKey = process.env.RESEND_API_KEY;

    const sent = [];
    globalThis.fetch = async (_url, options) => {
      sent.push(JSON.parse(options.body));
      return { ok: true, json: async () => ({ id: 'resend-leasing-test' }) };
    };

    try {
      process.env.RESEND_API_KEY = 'test-resend-key';
      delete require.cache[emailPath];
      const freshEmail = require(emailPath);

      await freshEmail.sendDashboardLinks({
        email: 'mixed@example.com',
        bookings: [
          { slot_name: 'A', status: 'live', analytics_token: 'tok-a', site_slug: 'zeus' },
          { slot_name: 'B', status: 'approved', analytics_token: 'tok-b', site_slug: 'nike' },
        ],
      });
      assert.strictEqual(sent[0].subject, 'Your PuniCodex dashboard links');
      assert.ok(sent[0].html.includes('/sites/zeus/dashboard/?token=tok-a'), 'per-row zeus link');
      assert.ok(sent[0].html.includes('/sites/nike/dashboard/?token=tok-b'), 'per-row nike link');

      await freshEmail.sendDashboardLinks({
        email: 'single@example.com',
        bookings: [{ slot_name: 'A', status: 'live', analytics_token: 'tok-c', site_slug: 'zeus' }],
      });
      assert.strictEqual(sent[1].subject, 'Your Zeús dashboard links');
    } finally {
      globalThis.fetch = originalFetch;
      if (hadKey) process.env.RESEND_API_KEY = priorKey;
      else delete process.env.RESEND_API_KEY;
      delete require.cache[emailPath];
    }
  });

  await test('leasing page: End is offered for every revocable status', async () => {
    // A redeemed/accepted lease (approved, pending_approval, trialing, live)
    // must always offer End — the master revoke. The service cancels billing,
    // frees the slot, and emails the sponsor.
    const fs = require('node:fs');
    const path = require('node:path');
    const html = fs.readFileSync(
      path.join(__dirname, '..', 'platform', 'public', 'admin-portal', 'leasing', 'index.html'),
      'utf8'
    );
    for (const status of ['approved', 'pending_approval', 'trialing', 'live']) {
      const block = html.match(new RegExp(`status === '${status}'[\\s\\S]{0,400}`));
      assert.ok(block, `status branch for ${status}`);
      assert.ok(block[0].includes(`data-action="end"`), `${status} offers End`);
    }
    assert.ok(
      html.includes('emails the sponsor a revocation notice'),
      'confirm copy discloses the email'
    );
  });

  await test('leasing page: all five tab panels are direct children of portal-main', async () => {
    // Regression: tab-patrons was never closed, so tab-discounts and
    // tab-orders became its children — activating either hid their parent
    // and the panels rendered blank in production.
    const fs = require('node:fs');
    const cheerio = require('cheerio');
    for (const file of [
      'platform/public/admin-portal/leasing/index.html',
      'admin-portal/leasing/index.html',
    ]) {
      const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
      for (const id of [
        'tab-bookings',
        'tab-tenants',
        'tab-patrons',
        'tab-discounts',
        'tab-orders',
      ]) {
        const panel = $(`#${id}`);
        assert.strictEqual(panel.length, 1, `${file}: #${id} missing`);
        assert.strictEqual(
          panel.parent().attr('id'),
          'portal-main',
          `${file}: #${id} must be a direct child of portal-main (found inside #${panel.parent().attr('id') || 'unknown'})`
        );
      }
      assert.strictEqual(
        $('#portal-main [id^="tab-"] [id^="tab-"]').length,
        0,
        `${file}: tab panels must never nest`
      );
    }
  });

  console.log('\n✓ All portal leasing tests passed');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
