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
  await mock(page, '/api/admin/portal/me/', {
    user: { email: 'admin@punicodex.com', displayName: 'Admin', role: 'superadmin' },
    role: 'superadmin',
    permissions: ['read', 'users', 'ops', 'leasing', 'scholars'],
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
