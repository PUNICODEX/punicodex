/**
 * Admin Portal Growth Tests
 *
 * Covers the admin surfaces for the two features shipped without portal
 * oversight: the newsletter subscriber list and the creator-merch pipeline.
 *
 * - Auth negatives: no token → 401, wrong role → 403, revoked session → 401,
 *   locked account → 401 (account_locked) even with the correct password,
 *   disabled account → 401 on session resolve.
 * - Role matrix: every role reads the newsletter list + merch overview;
 *   only leasing + superadmin export the CSV or force-withdraw a product.
 * - Newsletter correctness: exact rows, total count, pagination, CSV shape,
 *   and spreadsheet formula-injection escaping (phones begin with '+').
 * - Merch oversight: product list fields, exact ledger totals (refunded
 *   orders excluded), force-withdraw through the creator-merch module
 *   (store catalog consistency) with an admin_actions audit row.
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-growth-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock the Stripe SDK before any service loads it (the portal service pulls
// in the booking layer).
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_growth',
          url: 'https://checkout.stripe.com/growth-mock',
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
const { invoke, adminHeader } = require('./helpers/http.js');
const { run } = require('../platform/db/operational.js');
const { getDb } = require('../platform/db/connection.js');
const migrateNewsletter = require('../platform/db/migrate-newsletter.js');
const { migrate: migrateCreatorMerch } = require('../platform/db/migrate-creator-merch.js');
const { migrate: migrateCreatives } = require('../platform/db/migrate-scholars-creatives.js');
const creatorMerch = require('../platform/api/creator-merch.js');
const dbApi = require('../platform/db/scholars');

const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const logoutHandler = require('../platform/api-handlers/admin/portal/logout/index.js');
const usersHandler = require('../platform/api-handlers/admin/portal/users/index.js');
const newsletterHandler = require('../platform/api-handlers/admin/portal/newsletter/index.js');
const newsletterExportHandler = require('../platform/api-handlers/admin/portal/newsletter/export/index.js');
const merchHandler = require('../platform/api-handlers/admin/portal/merch/index.js');
const merchWithdrawHandler = require('../platform/api-handlers/admin/portal/merch/[id]/withdraw/index.js');

// Distinct source IPs per login so the shared 'admin-login' rate-limit
// bucket (10/min/IP) never trips inside this suite.
let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `10.88.0.${ipCounter}`;
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

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

let superToken;
const roleTokens = {};

// ── Setup ─────────────────────────────────────────────────────

test('setup: bootstrap superadmin and create one user per role', async () => {
  const boot = await portalLogin('admin@punicodex.com', process.env.ADMIN_PASSWORD);
  assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
  superToken = boot.body.token;

  for (const role of ['viewer', 'ops', 'leasing', 'scholars']) {
    const res = await invoke(usersHandler, 'POST', '/api/admin/portal/users/', {
      headers: adminHeader(superToken),
      body: {
        email: `${role}@growth.test`,
        password: `${role}-password-123`,
        displayName: `${role} user`,
        role,
      },
    });
    assert.strictEqual(res.status, 201, `${role}: ${JSON.stringify(res.body)}`);
    const login = await portalLogin(`${role}@growth.test`, `${role}-password-123`);
    assert.strictEqual(login.status, 200, role);
    roleTokens[role] = login.body.token;
  }
});

test('setup: seed three newsletter subscribers (one with a + phone)', async () => {
  migrateNewsletter(getDb());
  await run('DELETE FROM newsletter_subscribers');
  const rows = [
    ['ada@example.com', '+1 555 0100', 'footer', '2026-07-19 09:00:00'],
    ['grace@example.com', null, 'temple', '2026-07-20 10:30:00'],
    ['alan@example.com', '+44 20 7946', 'site', '2026-07-21 11:45:00'],
  ];
  for (const [email, phone, source, at] of rows) {
    await run(
      `INSERT INTO newsletter_subscribers (email, phone, source, confirmed, subscribed_at)
       VALUES ($1, $2, $3, 1, $4)`,
      [email, phone, source, at]
    );
  }
});

let productId;
let secondProductId;
let assetId;
test('setup: seed creator products and two ledger orders (one later refunded)', async () => {
  // Products are listed through the real pipeline: consented creative asset →
  // listCreatorProductForAsset (needs the scholars institution/user parents
  // for the FK chain).
  migrateCreatives(getDb());
  migrateCreatorMerch(getDb());
  await run('DELETE FROM creator_order_ledger');
  await run('DELETE FROM creator_products');

  const created = dbApi.createInstitutionWithAdmin({
    name: 'Growth University',
    slug: 'growth-university-7901',
    domain: 'growth-u-7901.edu',
    accreditation: '',
    metadata: {},
    sponsorshipStatus: 'active',
    adminEmail: 'creator-7901@growth.test',
    adminPasswordHash: 'x',
    adminDisplayName: 'Ada Creator',
    adminDepartment: null,
  });

  const database = db();
  const insertAsset = database.prepare(
    `INSERT INTO creative_assets (creator_id, institution_id, title, department, status)
     VALUES (?, ?, ?, 'Classics', 'approved')`
  );
  assetId = Number(
    insertAsset.run(created.adminId, created.institutionId, 'Temple Poster').lastInsertRowid
  );
  const secondAssetId = Number(
    insertAsset.run(created.adminId, created.institutionId, 'Temple Tee').lastInsertRowid
  );
  database.close();

  creatorMerch.recordMerchConsent(assetId);
  creatorMerch.recordMerchConsent(secondAssetId);
  productId = Number(creatorMerch.listCreatorProductForAsset(assetId));
  secondProductId = Number(
    creatorMerch.listCreatorProductForAsset(secondAssetId, { productType: 'tee' })
  );
  assert.ok(productId > 0 && secondProductId > 0, 'products listed through the real pipeline');

  // Real ledger path: the module validates the product and computes the split.
  const order1 = creatorMerch.recordCreatorOrder({
    orderRef: 'growth-ord-1',
    productId,
    grossCents: 2900,
    baseCents: 1100,
    feesCents: 112,
  });
  assert.deepStrictEqual(
    { creator: order1.creatorShareCents, platform: order1.platformShareCents },
    { creator: 844, platform: 844 },
    'net 1688 splits 844/844'
  );
  const order2 = creatorMerch.recordCreatorOrder({
    orderRef: 'growth-ord-2',
    productId,
    grossCents: 900,
    baseCents: 400,
    feesCents: 30,
  });
  assert.deepStrictEqual(
    { creator: order2.creatorShareCents, platform: order2.platformShareCents },
    { creator: 235, platform: 235 },
    'net 470 splits 235/235'
  );
  await run("UPDATE creator_order_ledger SET status = 'refunded' WHERE order_ref = 'growth-ord-2'");
});

// ── Auth negatives ────────────────────────────────────────────

test('no token → 401 on every new route', async () => {
  const list = await invoke(newsletterHandler, 'GET', '/api/admin/portal/newsletter/');
  assert.strictEqual(list.status, 401);
  const csv = await invoke(newsletterExportHandler, 'GET', '/api/admin/portal/newsletter/export/');
  assert.strictEqual(csv.status, 401);
  const merch = await invoke(merchHandler, 'GET', '/api/admin/portal/merch/');
  assert.strictEqual(merch.status, 401);
  const withdraw = await invoke(
    merchWithdrawHandler,
    'POST',
    `/api/admin/portal/merch/${productId}/withdraw/`,
    { params: { id: String(productId) }, body: {} }
  );
  assert.strictEqual(withdraw.status, 401);
});

test('revoked session → 401 on the new routes', async () => {
  const login = await portalLogin('viewer@growth.test', 'viewer-password-123');
  const token = login.body.token;
  const out = await invoke(logoutHandler, 'POST', '/api/admin/portal/logout/', {
    headers: adminHeader(token),
  });
  assert.strictEqual(out.status, 200);

  const list = await invoke(newsletterHandler, 'GET', '/api/admin/portal/newsletter/', {
    headers: adminHeader(token),
  });
  assert.strictEqual(list.status, 401);
  const merch = await invoke(merchHandler, 'GET', '/api/admin/portal/merch/', {
    headers: adminHeader(token),
  });
  assert.strictEqual(merch.status, 401);
});

test('locked account → 401 account_locked even with the correct password', async () => {
  for (let i = 0; i < 5; i++) {
    const res = await portalLogin('ops@growth.test', 'wrong-password');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.code, 'invalid_credentials');
  }
  const locked = await portalLogin('ops@growth.test', 'ops-password-123');
  assert.strictEqual(locked.status, 401);
  assert.strictEqual(locked.body.code, 'account_locked');

  // Unlock so the role-matrix tests below can use the ops account.
  db().prepare('UPDATE admin_users SET login_attempts = 0, locked_until = NULL').run();
  const recovered = await portalLogin('ops@growth.test', 'ops-password-123');
  assert.strictEqual(recovered.status, 200);
  roleTokens.ops = recovered.body.token;
});

test('disabled account → sessions resolve to 401 on the new routes', async () => {
  // Disable the scholars account via SQL (the PATCH path is covered by the
  // base suite); its existing token must die on the next resolve.
  db()
    .prepare("UPDATE admin_users SET status = 'disabled' WHERE email = 'scholars@growth.test'")
    .run();
  const list = await invoke(newsletterHandler, 'GET', '/api/admin/portal/newsletter/', {
    headers: adminHeader(roleTokens.scholars),
  });
  assert.strictEqual(list.status, 401);
  // Resolving a disabled account also destroys its sessions, so sign back in.
  db()
    .prepare("UPDATE admin_users SET status = 'active' WHERE email = 'scholars@growth.test'")
    .run();
  const relogin = await portalLogin('scholars@growth.test', 'scholars-password-123');
  assert.strictEqual(relogin.status, 200);
  roleTokens.scholars = relogin.body.token;
});

// ── Role matrix ───────────────────────────────────────────────

test('newsletter list and merch overview are readable by every role', async () => {
  for (const [role, token] of Object.entries(roleTokens)) {
    const list = await invoke(newsletterHandler, 'GET', '/api/admin/portal/newsletter/', {
      headers: adminHeader(token),
    });
    assert.strictEqual(list.status, 200, `newsletter list as ${role}`);
    const merch = await invoke(merchHandler, 'GET', '/api/admin/portal/merch/', {
      headers: adminHeader(token),
    });
    assert.strictEqual(merch.status, 200, `merch overview as ${role}`);
  }
  const asSuper = await invoke(newsletterHandler, 'GET', '/api/admin/portal/newsletter/', {
    headers: adminHeader(superToken),
  });
  assert.strictEqual(asSuper.status, 200, 'newsletter list as superadmin');
});

test('viewer/ops/scholars get 403 on CSV export and force-withdraw', async () => {
  for (const role of ['viewer', 'ops', 'scholars']) {
    const csv = await invoke(
      newsletterExportHandler,
      'GET',
      '/api/admin/portal/newsletter/export/',
      {
        headers: adminHeader(roleTokens[role]),
      }
    );
    assert.strictEqual(csv.status, 403, `CSV export as ${role}`);

    const withdraw = await invoke(
      merchWithdrawHandler,
      'POST',
      `/api/admin/portal/merch/${productId}/withdraw/`,
      { headers: adminHeader(roleTokens[role]), params: { id: String(productId) }, body: {} }
    );
    assert.strictEqual(withdraw.status, 403, `withdraw as ${role}`);
  }
});

// ── Newsletter correctness ────────────────────────────────────

test('newsletter list returns exact rows, total, and pagination', async () => {
  const page1 = await invoke(
    newsletterHandler,
    'GET',
    '/api/admin/portal/newsletter/?limit=2&offset=0',
    { headers: adminHeader(superToken) }
  );
  assert.strictEqual(page1.status, 200);
  assert.strictEqual(page1.body.total, 3);
  assert.strictEqual(page1.body.items.length, 2);
  // Newest first.
  assert.deepStrictEqual(
    page1.body.items.map((s) => s.email),
    ['alan@example.com', 'grace@example.com']
  );
  assert.strictEqual(page1.body.items[0].phone, '+44 20 7946');
  assert.strictEqual(page1.body.items[0].source, 'site');
  assert.ok(!('ip_hash' in page1.body.items[0]), 'ip_hash must not be exposed');

  const page2 = await invoke(
    newsletterHandler,
    'GET',
    '/api/admin/portal/newsletter/?limit=2&offset=2',
    { headers: adminHeader(superToken) }
  );
  assert.strictEqual(page2.status, 200);
  assert.strictEqual(page2.body.items.length, 1);
  assert.strictEqual(page2.body.items[0].email, 'ada@example.com');
  assert.strictEqual(page2.body.total, 3);
});

test('CSV export: exact rows, attachment headers, formula-injection escaping', async () => {
  const res = await invoke(newsletterExportHandler, 'GET', '/api/admin/portal/newsletter/export/', {
    headers: adminHeader(roleTokens.leasing),
  });
  assert.strictEqual(res.status, 200);
  assert.match(res.headers['content-type'], /^text\/csv/);
  assert.match(
    res.headers['content-disposition'],
    /^attachment; filename="newsletter-\d{4}-\d{2}-\d{2}\.csv"$/
  );
  assert.strictEqual(res.headers['cache-control'], 'no-store');

  const lines = String(res.body).split('\r\n');
  assert.strictEqual(lines[0], 'email,phone,source,subscribed_at');
  assert.strictEqual(lines.length, 4, 'header + 3 subscribers');
  // Export is chronological (oldest first).
  assert.strictEqual(lines[1], "ada@example.com,'+1 555 0100,footer,2026-07-19 09:00:00");
  assert.strictEqual(lines[2], 'grace@example.com,,temple,2026-07-20 10:30:00');
  assert.strictEqual(lines[3], "alan@example.com,'+44 20 7946,site,2026-07-21 11:45:00");

  // A superadmin can export too (role matrix: superadmin ⊇ leasing).
  const asSuper = await invoke(
    newsletterExportHandler,
    'GET',
    '/api/admin/portal/newsletter/export/',
    {
      headers: adminHeader(superToken),
    }
  );
  assert.strictEqual(asSuper.status, 200);
});

test('CSV escaper guards every formula-leading character', async () => {
  const { newsletterSubscribersToCsv } = require('../platform/api/admin-portal-service.js');
  const csv = newsletterSubscribersToCsv([
    { email: '=cmd@evil.example', phone: '+1555', source: '-x', subscribed_at: '@now' },
    { email: 'qu"ote@example.com', phone: null, source: 'a,b', subscribed_at: 'line\nbreak' },
  ]);
  const lines = csv.split('\r\n');
  assert.strictEqual(lines[1], "'=cmd@evil.example,'+1555,'-x,'@now");
  assert.strictEqual(lines[2], '"qu""ote@example.com",,"a,b","line\nbreak"');
});

// ── Merch oversight ───────────────────────────────────────────

test('merch overview returns products with exact fields and ledger totals', async () => {
  const res = await invoke(merchHandler, 'GET', '/api/admin/portal/merch/', {
    headers: adminHeader(roleTokens.leasing),
  });
  assert.strictEqual(res.status, 200);

  const product = res.body.products.find((p) => p.id === productId);
  assert.ok(product, 'seeded product present');
  assert.strictEqual(product.title, 'Temple Poster');
  assert.strictEqual(product.creator_name, 'Ada Creator');
  assert.strictEqual(product.creator_university, 'Growth University');
  assert.strictEqual(product.price_cents, 2900);
  assert.strictEqual(product.status, 'live');

  assert.deepStrictEqual(res.body.productCounts, { pending: 0, live: 2, withdrawn: 0 });
  // The refunded order is excluded from totals and reported separately.
  assert.deepStrictEqual(res.body.ledger, {
    orders: 1,
    grossCents: 2900,
    baseCents: 1100,
    feesCents: 112,
    creatorShareCents: 844,
    platformShareCents: 844,
    refundedOrders: 1,
    refundedGrossCents: 900,
  });
});

test('force-withdraw: leasing role withdraws a live product; audit row written', async () => {
  const res = await invoke(
    merchWithdrawHandler,
    'POST',
    `/api/admin/portal/merch/${productId}/withdraw/`,
    { headers: adminHeader(roleTokens.leasing), params: { id: String(productId) }, body: {} }
  );
  assert.strictEqual(res.status, 200, JSON.stringify(res.body));
  assert.strictEqual(res.body.withdrawn, true);
  assert.strictEqual(res.body.product.status, 'withdrawn');

  // Store consistency: the public catalog helper no longer lists it.
  assert.ok(
    !creatorMerch.listLiveCreatorProducts().some((p) => p.id === productId),
    'withdrawn product must leave the live store catalog'
  );

  const audit = db()
    .prepare("SELECT * FROM admin_actions WHERE action = 'portal.merch.withdraw' AND target = ?")
    .get(`creator_product:${productId}`);
  assert.ok(audit, 'audit row exists');
  assert.ok(audit.admin_user_id, 'audit row carries the acting portal user');
  const meta = JSON.parse(audit.meta);
  assert.strictEqual(meta.by, 'leasing@growth.test');
  assert.strictEqual(meta.title, 'Temple Poster');
  assert.strictEqual(meta.creativeAssetId, assetId);
});

test('force-withdraw rejects non-live and unknown products; superadmin may withdraw', async () => {
  // Already withdrawn → 400.
  const again = await invoke(
    merchWithdrawHandler,
    'POST',
    `/api/admin/portal/merch/${productId}/withdraw/`,
    { headers: adminHeader(roleTokens.leasing), params: { id: String(productId) }, body: {} }
  );
  assert.strictEqual(again.status, 400);

  // Unknown id → 404.
  const missing = await invoke(
    merchWithdrawHandler,
    'POST',
    '/api/admin/portal/merch/999999/withdraw/',
    { headers: adminHeader(roleTokens.leasing), params: { id: '999999' }, body: {} }
  );
  assert.strictEqual(missing.status, 404);

  // Non-integer id → 400.
  const garbage = await invoke(
    merchWithdrawHandler,
    'POST',
    '/api/admin/portal/merch/abc/withdraw/',
    { headers: adminHeader(roleTokens.leasing), params: { id: 'abc' }, body: {} }
  );
  assert.strictEqual(garbage.status, 400);

  // Superadmin can withdraw (superadmin ⊇ leasing).
  const asSuper = await invoke(
    merchWithdrawHandler,
    'POST',
    `/api/admin/portal/merch/${secondProductId}/withdraw/`,
    { headers: adminHeader(superToken), params: { id: String(secondProductId) }, body: {} }
  );
  assert.strictEqual(asSuper.status, 200, JSON.stringify(asSuper.body));
  assert.strictEqual(asSuper.body.product.status, 'withdrawn');
});

test('wrong methods return 405 on the new routes', async () => {
  const list = await invoke(newsletterHandler, 'POST', '/api/admin/portal/newsletter/', {
    headers: adminHeader(superToken),
    body: {},
  });
  assert.strictEqual(list.status, 405);
  const csv = await invoke(
    newsletterExportHandler,
    'POST',
    '/api/admin/portal/newsletter/export/',
    {
      headers: adminHeader(superToken),
      body: {},
    }
  );
  assert.strictEqual(csv.status, 405);
  const merch = await invoke(merchHandler, 'POST', '/api/admin/portal/merch/', {
    headers: adminHeader(superToken),
    body: {},
  });
  assert.strictEqual(merch.status, 405);
  const withdraw = await invoke(
    merchWithdrawHandler,
    'GET',
    `/api/admin/portal/merch/${productId}/withdraw/`,
    { headers: adminHeader(superToken), params: { id: String(productId) } }
  );
  assert.strictEqual(withdraw.status, 405);
});

async function runTests() {
  console.log('\n▸ Admin Portal Growth Tests\n');
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
      if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
  console.log(`\nAdmin Portal Growth: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
