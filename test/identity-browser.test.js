const assert = require('node:assert');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright-core');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'test', 'tmp');
const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];
function browserPath() {
  for (const candidate of CANDIDATES) if (fs.existsSync(candidate)) return candidate;
  try {
    const cache = path.join(os.homedir(), 'AppData', 'Local', 'ms-playwright');
    for (const rev of fs.readdirSync(cache).sort().reverse()) {
      for (const rel of ['chrome-win64/chrome.exe', 'chrome-win/chrome.exe']) {
        const candidate = path.join(cache, rev, ...rel.split('/'));
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  } catch {}
  return null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};
function serve() {
  const server = http.createServer((req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(ROOT, pathname);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

function fixtureMe() {
  return {
    account: {
      id: ACCOUNT_ID,
      email: 'member@punicodex.test',
      displayName: 'PuniCodex Member',
      status: 'active',
      isSponsor: true,
      isPatron: true,
      hasPassword: true,
    },
    identity: {
      linkedSystems: ['scholar', 'tenant'],
      scholars: [
        {
          role: 'inst_admin',
          department: 'Classics',
          institutionId: 1,
          institutionName: 'PuniCodex University',
          sponsorshipStatus: 'active',
        },
      ],
      initiation: { currentChapter: 4, totalChapters: 24, completedAt: null },
    },
    capabilities: [
      'initiation.read',
      'store.purchase',
      'sponsorship.book',
      'sponsorship.manage',
      'patron.subscribe',
      'patron.manage',
      'analytics.view',
      'scholars.edit',
      'scholars.review',
      'creatives.upload',
      'institution.manage',
      'institution.invite',
    ],
    resources: {
      bookings: [
        {
          id: 1,
          slotName: 'Crown Banner',
          siteSlug: 'zeus',
          status: 'live',
          slotSlug: 'crown',
          hasCreative: true,
        },
      ],
      patrons: [{ id: 2, templeId: 'zeus', displayName: 'Member', status: 'active' }],
      orders: [
        {
          orderRef: 'SO-TEST-ORDER',
          productName: 'Zeús Temple Tee',
          variantLabel: 'Black · M',
          quantity: 1,
          grossCents: 3800,
          status: 'shipped',
          trackingUrl: 'https://tracking.example/SO-TEST-ORDER',
          carrier: 'DHL',
          createdAt: '2026-11-01T00:00:00Z',
        },
      ],
    },
  };
}

function fixtureCustomerMe() {
  return {
    account: {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'member@punicodex.test',
      displayName: 'PuniCodex Member',
      status: 'active',
      isSponsor: false,
      isPatron: false,
      hasPassword: true,
    },
    identity: {
      linkedSystems: [],
      scholars: [],
      initiation: { currentChapter: 0, totalChapters: 24, completedAt: null },
    },
    capabilities: ['authenticity.use', 'initiation.read', 'store.purchase'],
    resources: { bookings: [], patrons: [], orders: [] },
  };
}

function fixtureAnalytics() {
  return {
    periodDays: 30,
    accounts: {
      total: 42,
      byStatus: { active: 40, disabled: 2 },
      linked: { tenant: 20, scholar: 8 },
    },
    events: {
      byName: {
        identity_login: 80,
        identity_register: 12,
        identity_activate: 10,
        institution_invitation_created: 9,
        institution_invitation_accepted: 7,
        initiation_progress: 70,
        store_order_paid: 5,
      },
      total: 200,
      daily: [
        { day: '2026-11-01', events: { identity_login: 38 } },
        { day: '2026-11-02', events: { identity_login: 42 } },
      ],
    },
    invitations: { byStatus: { accepted: 7, pending: 2, revoked: 0 }, acceptanceRate: 0.7 },
    initiation: { started: 30, completed: 8, completionRate: 0.2667 },
    orders: { count: 5, grossCents: 19000 },
  };
}

async function mock(page, path, payload) {
  await page.route(
    (url) => url.pathname === path,
    (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  );
}
async function mockAll(page) {
  page.on('pageerror', (err) => console.error('BROWSER SCRIPT ERROR:', err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('BROWSER CONSOLE:', msg.text());
  });
  if (process.env.IDENTITY_TEST_DEBUG) {
    page.on('response', async (response) => {
      if (response.url().includes('/api/'))
        console.log('API RESPONSE', response.status(), response.url());
    });
  }
  await page.route('**/api/analytics/collect/**', (route) =>
    route.fulfill({ status: 204, body: '' })
  );
  await mock(page, '/api/account/me/', fixtureMe());
  await mock(
    page,
    '/api/account/initiation/',
    { currentChapter: 4, totalChapters: 24, completedAt: null },
    'PUT'
  );
  await mock(page, '/api/v1/scholars/institution/invitations/', {
    success: true,
    data: {
      items: [
        {
          id: 'invite-1',
          email: 'student@punicodex.test',
          department: 'Classics',
          role: 'student',
          status: 'pending',
          expires_at: '2026-11-15',
        },
      ],
    },
  });
  await mock(page, '/api/v1/scholars/institution/policies/', {
    success: true,
    data: { items: [] },
  });
  await mock(page, '/api/account/institution/overview/', {
    institution: { id: 1, name: 'PuniCodex University', department: null, role: 'inst_admin' },
    members: { students: 12, reviewers: 3, administrators: 2, total: 17 },
    scholarship: { pending: 4, approved: 18, needsRevision: 2, rejected: 1, total: 25 },
  });
  await mock(page, '/api/v1/creatives/institution/dashboard/', {
    success: true,
    data: {
      assets: [
        {
          id: 7,
          title: 'The Crossroads at Dawn',
          creator_name: 'Test Student',
          department: 'Classics',
          status: 'pending_review',
          created_at: '2026-11-01T00:00:00Z',
        },
      ],
      totalEarningsCents: 12500,
      pendingReviewCount: 1,
      approvedCount: 5,
    },
  });
  await mock(page, '/api/v1/creatives/institution/analytics/', {
    success: true,
    data: {
      views: 42,
      purchases: 3,
      revenueCents: 18000,
      topAssets: [{ id: 7, title: 'The Crossroads at Dawn', views: 42 }],
    },
  });
  await mock(page, '/api/admin/portal/me/', {
    user: { email: 'admin@punicodex.com', displayName: 'Admin', role: 'superadmin' },
    role: 'superadmin',
    permissions: ['read', 'users', 'ops', 'leasing', 'scholars'],
  });
  await mock(page, '/api/admin/portal/institutions/', {
    items: [
      {
        id: 1,
        name: 'PuniCodex University',
        slug: 'punicodex-university',
        status: 'active',
        sponsorshipStatus: 'active',
        accessActive: true,
      },
    ],
  });
  await mock(page, '/api/admin/portal/analytics/identity/', fixtureAnalytics());
  await mock(page, '/api/admin/portal/identities/', {
    items: [
      {
        id: ACCOUNT_ID,
        email: 'member@punicodex.test',
        status: 'active',
        link_count: 2,
        session_count: 1,
        last_login_at: '2026-11-02T10:00:00Z',
      },
    ],
    total: 1,
    limit: 100,
    offset: 0,
  });
  await mock(page, `/api/admin/portal/identities/${ACCOUNT_ID}/`, {
    ...fixtureMe(),
    audit: [
      { action: 'identity.login', resource_type: 'account', created_at: '2026-11-02T10:00:00Z' },
    ],
  });
}

async function consent(page) {
  try {
    await page.locator('.pc-cookie__btn--accept').click({ timeout: 1500 });
  } catch {}
}
function noOverflow(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}
let browser;
let server;
let base;

test('login presents a professional unified account and registration switch', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await mockAll(page);
  await page.route('**/api/account/me/', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
  );
  await page.goto(`${base}/account/login/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#view-login').waitFor({ state: 'visible' });
  assert.ok(await page.locator('h1:text("Welcome back")').isVisible());
  await page.locator('#show-register').click();
  assert.ok(await page.locator('#view-register').isVisible());
  await shot(page, 'identity-login-desktop');
  await page.close();
});

test('structured gateway failures become readable messages, never object-object errors', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mockAll(page);
  await page.route('**/api/account/me/', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
  );
  await page.route('**/api/account/auth/login/', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: { code: '500', message: 'A server error has occurred' } }),
    })
  );
  await page.goto(`${base}/account/login/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#view-login').waitFor({ state: 'visible' });
  await page.locator('#login-email').fill('member@punicodex.test');
  await page.locator('#login-password').fill('mobile-password-12');
  await page.locator('#login-submit').click();
  await page.waitForFunction(() =>
    document.getElementById('login-message').textContent.includes('A server error has occurred')
  );
  assert.ok(!(await page.locator('#login-message').textContent()).includes('[object Object]'));
  await page.close();
});

test('account home unifies identity, placements, orders, scholarship, institution, and initiation', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await mockAll(page);
  await page.goto(`${base}/account/`, { waitUntil: 'domcontentloaded' });
  if (process.env.IDENTITY_TEST_DEBUG) {
    await page.waitForTimeout(750);
    console.log('ACCOUNT BODY', (await page.locator('body').innerText()).slice(0, 2200));
  }
  await page.locator('#overview-greeting').waitFor({ state: 'visible' });
  await consent(page);
  assert.ok(await page.locator('#scholar-module').isVisible());
  assert.ok(await page.locator('#institution-module').isVisible());
  await page.waitForFunction(
    () => document.getElementById('initiation-count').textContent === '4 / 24 scenes'
  );
  assert.ok(
    await page
      .locator('#orders-meta')
      .textContent()
      .then((text) => text.includes('1 order'))
  );
  assert.ok(await noOverflow(page));
  await shot(page, 'identity-account-desktop');
  await page.close();
});

test('account home stays coherent and overflow-safe on mobile', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mockAll(page);
  await page.goto(`${base}/account/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#overview-greeting').waitFor({ state: 'visible' });
  await consent(page);
  assert.ok(await noOverflow(page));
  assert.ok(await page.locator('.sb-initiation-card').isVisible());
  await shot(page, 'identity-account-mobile');
  await page.close();
});

test('mobile registration, cookie sign-in, member entitlements, and Archē work as one journey', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const sponsorRequests = [];
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('request', (request) => {
    if (/\/api\/account\/analytics\/(space|temple)/.test(request.url())) {
      sponsorRequests.push(request.url());
    }
  });
  try {
    await context.addCookies([{ name: 'punicodex_csrf', value: 'mobile-csrf', url: base }]);
    await mockAll(page);
    let csrfHeader = null;
    await page.route('**/api/account/initiation/', (route) => {
      csrfHeader = route.request().headers()['x-csrf-token'] || null;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ currentChapter: 1, totalChapters: 24, completedAt: null }),
      });
    });
    await page.route('**/api/account/auth/register/', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'If this email can be registered, an activation link has been sent.',
        }),
      })
    );
    await page.route('**/api/account/auth/login/', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': 'punicodex_session=mobile-member-session; Path=/; HttpOnly; SameSite=Lax',
        },
        body: JSON.stringify({
          token: 'mobile-member-session',
          csrfToken: 'mobile-csrf',
          account: fixtureCustomerMe().account,
        }),
      })
    );
    await page.route('**/api/account/me/', (route) => {
      const authenticated = (route.request().headers().cookie || '').includes(
        'punicodex_session=mobile-member-session'
      );
      return route.fulfill({
        status: authenticated ? 200 : 401,
        contentType: 'application/json',
        body: JSON.stringify(authenticated ? fixtureCustomerMe() : { error: 'Please sign in.' }),
      });
    });

    await page.goto(`${base}/account/login/?view=register`, { waitUntil: 'domcontentloaded' });
    await page.locator('#view-register').waitFor({ state: 'visible' });
    await page.locator('#register-email').fill('member@punicodex.test');
    await page.locator('#register-password').fill('mobile-password-12');
    await page.locator('#register-confirm').fill('mobile-password-12');
    await page.locator('#register-submit').click();
    await page.waitForFunction(() =>
      document.getElementById('register-message').textContent.includes('Check your inbox')
    );
    await page.locator('#show-login').click();
    await page.locator('#login-email').fill('member@punicodex.test');
    await page.locator('#login-password').fill('mobile-password-12');
    await page.locator('#login-submit').click();
    await page.waitForURL(`${base}/account/`);
    await page.locator('#overview-empty').waitFor({ state: 'visible' });

    assert.ok(!(await page.locator('#institution-module').isVisible()));
    assert.ok(!(await page.locator('#scholar-module').isVisible()));
    assert.ok(!(await page.locator('#temples-section').isVisible()));
    assert.ok(!(await page.locator('#placements-section').isVisible()));
    const nav = await page.locator('.sb-nav').textContent();
    assert.ok(!nav.includes('Placements'));
    assert.ok(!nav.includes('Creative Studio'));
    assert.ok(nav.includes('Orders'));
    assert.strictEqual(sponsorRequests.length, 0);
    assert.ok(!(await page.locator('body').textContent()).includes('[object Object]'));
    assert.ok(await noOverflow(page));
    await page.evaluate(() =>
      window.Sandbox.api('/api/account/initiation/', {
        method: 'PUT',
        body: { currentChapter: 1 },
      })
    );
    assert.strictEqual(csrfHeader, 'mobile-csrf');

    await page.locator('#initiation-link').click();
    await page.waitForURL(`${base}/account/initiation/`);
    await page.locator('#initiation-enter').waitFor({ state: 'visible' });
    await page.locator('#initiation-enter').click();
    await page.waitForURL(`${base}/genesis/?resume=1`);
    await page.waitForFunction(() => document.getElementById('arche-identity-gate').hidden);
    assert.strictEqual(await page.locator('#arche-stage').getAttribute('aria-hidden'), null);
    assert.deepStrictEqual(runtimeErrors, []);
  } finally {
    await context.close();
  }
});

test('orders surface real fulfillment and tracking', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await mockAll(page);
  await page.goto(`${base}/account/orders/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#orders-list').waitFor({ state: 'visible' });
  assert.ok((await page.locator('#orders-list').textContent()).includes('SO-TEST-ORDER'));
  assert.ok((await page.locator('#orders-list').textContent()).includes('shipped'));
  assert.strictEqual(
    await page.locator('#orders-list a[href="https://tracking.example/SO-TEST-ORDER"]').count(),
    1
  );
  await page.close();
});

test('institution page exposes invitations and policy without confusing defaults', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
  await mockAll(page);
  await page.goto(`${base}/account/institution/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#invite-form').waitFor({ state: 'visible' });
  assert.ok(
    (await page.locator('#invitations-list').textContent()).includes('student@punicodex.test')
  );
  assert.ok((await page.locator('#policies-list').textContent()).includes('Reliquary purchases'));
  assert.ok((await page.locator('body').textContent()).includes('Commerce is opt-in'));
  assert.ok((await page.locator('#institution-kpis').textContent()).includes('Active students'));
  assert.ok((await page.locator('#institution-kpis').textContent()).includes('12'));
  assert.ok(
    (await page.locator('#institution-creative-list').textContent()).includes(
      'The Crossroads at Dawn'
    )
  );
  assert.strictEqual(await page.locator('.sb-initiation-card').count(), 0);
  await page.close();
});

test('Archē public gate explains account-only progress and renders correctly on mobile', async () => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mockAll(page);
  await page.route('**/api/account/me/', (route) =>
    route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
  );
  await page.goto(`${base}/genesis/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#arche-identity-gate').waitFor({ state: 'visible' });
  assert.ok(await page.locator('#arche-identity-title').isVisible());
  assert.ok(await noOverflow(page));
  assert.strictEqual(await page.locator('#arche-stage').getAttribute('aria-hidden'), 'true');
  await consent(page);
  await shot(page, 'identity-arche-gate-mobile');
  await page.close();
});

test('Archē admits members and saves scene progress to their account', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await mockAll(page);
  await page.goto(`${base}/genesis/?resume=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.getElementById('arche-identity-gate').hidden);
  assert.strictEqual(await page.locator('#arche-stage').getAttribute('aria-hidden'), null);
  await page.locator('[data-begin]').first().click();
  await page.waitForTimeout(1200);
  assert.ok(await page.locator('.arche-scene.is-active .arche-title').first().isVisible());
  await shot(page, 'identity-arche-member-desktop');
  await page.close();
});

test('admin identity dashboard renders aggregate intelligence, search, and identity review', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  await mockAll(page);
  await page.addInitScript(() =>
    localStorage.setItem('punicodex_portal_token', 'test-admin-session')
  );
  await page.goto(`${base}/admin-portal/identities/`, { waitUntil: 'domcontentloaded' });
  if (process.env.IDENTITY_TEST_DEBUG) {
    await page.waitForTimeout(750);
    console.log('ADMIN BODY', (await page.locator('body').innerText()).slice(0, 2400));
  }
  await page.locator('#identity-insights').waitFor({ state: 'visible' });
  assert.ok((await page.locator('#identity-kpis').textContent()).includes('42'));
  assert.ok((await page.locator('#identity-kpis').textContent()).includes('Accepted invitations'));
  assert.ok(
    (await page.locator('#identity-table').textContent()).includes('member@punicodex.test')
  );
  await page.locator('[data-detail]').click();
  await page.locator('#identity-close').waitFor({ state: 'visible' });
  assert.ok((await page.locator('.identity-detail').textContent()).includes('Capabilities'));
  assert.ok(await noOverflow(page));
  await shot(page, 'identity-admin-desktop');
  await page.close();
});

test('admin can grant and revoke scoped institution access from identity review', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  await mockAll(page);
  await page.addInitScript(() =>
    localStorage.setItem('punicodex_portal_token', 'test-admin-session')
  );
  let grantPayload = null;
  let revokePayload = null;
  await page.route(`**/api/admin/portal/identities/${ACCOUNT_ID}/institution/`, async (route) => {
    const request = route.request();
    if (request.method() === 'POST') grantPayload = request.postDataJSON();
    if (request.method() === 'DELETE') revokePayload = request.postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ...fixtureMe(), audit: [] }),
    });
  });
  await page.goto(`${base}/admin-portal/identities/`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-detail]').click();
  await page.locator('#identity-grant').waitFor({ state: 'visible' });
  assert.strictEqual(await page.locator('#identity-institution option').count(), 1);
  await page.locator('#identity-role').selectOption('dept_admin');
  await page.locator('#identity-department').fill('Classics');
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes(`/identities/${ACCOUNT_ID}/institution/`) &&
        response.request().method() === 'POST'
    ),
    page.locator('#identity-grant-submit').click(),
  ]);
  assert.deepStrictEqual(grantPayload, {
    institutionId: 1,
    role: 'dept_admin',
    department: 'Classics',
  });
  await page.locator('[data-revoke-institution]').first().waitFor({ state: 'visible' });
  page.once('dialog', (dialog) => dialog.accept());
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes(`/identities/${ACCOUNT_ID}/institution/`) &&
        response.request().method() === 'DELETE'
    ),
    page.locator('[data-revoke-institution]').first().click(),
  ]);
  assert.deepStrictEqual(revokePayload, { institutionId: 1 });
  await page.close();
});

async function run() {
  const executablePath = browserPath();
  if (!executablePath) {
    console.log('  ⊘ no Chromium/Edge binary found — skipping identity browser suite');
    return;
  }
  fs.mkdirSync(OUT, { recursive: true });
  server = await serve();
  base = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ executablePath, headless: true });
  let passed = 0;
  let failed = 0;
  const active = process.env.IDENTITY_TEST_ONLY
    ? tests.filter((item) => item.name.includes(process.env.IDENTITY_TEST_ONLY))
    : tests;
  for (const item of active) {
    try {
      await item.fn();
      passed++;
      console.log(`  ✓ ${item.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${item.name}\n    ${err.stack || err.message}`);
    }
  }
  await browser.close();
  server.close();
  console.log(`\nIdentity Browser: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
