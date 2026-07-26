/**
 * PuniCodex — Admin portal page tests
 * Verifies the unified enterprise admin portal frontend: canonical pages in
 * platform/public/admin-portal/ and their synced copies at admin-portal/
 * exist and are byte-identical, every page is noindex, the login screen
 * carries the required form contract, every /api/ URL referenced by the
 * portal matches the deployed backend route table (static drift check), no
 * secrets are hardcoded, and the role-based nav logic is present.
 */

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const assert = require('node:assert');

const ROOT = path.join(__dirname, '..');
const CANONICAL = path.join(ROOT, 'platform', 'public', 'admin-portal');
const SYNCED = path.join(ROOT, 'admin-portal');

const PAGES = [
  'index.html',
  'login/index.html',
  'analytics/index.html',
  'applications/index.html',
  'requests/index.html',
  'leasing/index.html',
  'scholars/index.html',
  'newsletter/index.html',
  'merch/index.html',
  'users/index.html',
  'system/index.html',
  'api-keys/index.html',
  'legacy/index.html',
];
// Legacy stubs whose content moved into another section. They stay as
// noindex redirect pages (no portal.js auth guard) and are checked in a
// dedicated test below.
const REDIRECT_PAGES = ['patrons/index.html'];
const ASSETS = ['portal.css', 'portal.js'];
const ALL_FILES = [...PAGES, ...ASSETS];

/**
 * Backend route table (api/admin/portal/** plus the legacy x-admin-token
 * endpoints the portal token is accepted on). `:param` segments are
 * wildcards. Every /api/ literal found in the portal sources must either
 * fully match one of these routes or be a prefix fragment of one (the
 * fragments are concatenated with ids at runtime).
 */
const API_ROUTES = [
  '/api/admin/portal/login/',
  '/api/admin/portal/logout/',
  '/api/admin/portal/me/',
  '/api/admin/portal/me/password/',
  '/api/admin/portal/dashboard/',
  '/api/admin/portal/analytics/',
  '/api/admin/portal/users/',
  '/api/admin/portal/users/:id/',
  '/api/admin/portal/users/:id/disable/',
  '/api/admin/portal/users/:id/reset-password/',
  '/api/admin/portal/applications/',
  '/api/admin/portal/applications/:kind/:id/approve/',
  '/api/admin/portal/applications/:kind/:id/reject/',
  '/api/admin/portal/patrons/',
  '/api/admin/portal/patrons/stats/',
  '/api/admin/portal/patrons/:id/',
  '/api/admin/portal/tenant-requests/',
  '/api/admin/portal/tenant-requests/:id/approve/',
  '/api/admin/portal/tenant-requests/:id/reject/',
  '/api/admin/portal/bookings/',
  '/api/admin/portal/bookings/:id/approve/',
  '/api/admin/portal/bookings/:id/approve-application/',
  '/api/admin/portal/bookings/:id/reject/',
  '/api/admin/portal/bookings/:id/golive/',
  '/api/admin/portal/bookings/:id/end/',
  '/api/admin/portal/bookings/:id/report/',
  '/api/admin/portal/tenants/',
  '/api/admin/portal/discounts/',
  '/api/admin/portal/discounts/:id/',
  '/api/admin/portal/discounts/:id/redemptions/',
  '/api/admin/portal/store-orders/',
  '/api/admin/portal/store-orders/:id/',
  '/api/admin/portal/store-orders/:id/retry-fulfillment/',
  '/api/admin/portal/careers/',
  '/api/admin/portal/careers/:id/status/',
  '/api/admin/portal/arbitrage/',
  '/api/admin/portal/arbitrage/:id/status/',
  '/api/admin/portal/scholars/pending/',
  '/api/admin/portal/scholars/:kind/:id/approve/',
  '/api/admin/portal/scholars/:kind/:id/reject/',
  '/api/admin/portal/newsletter/',
  '/api/admin/portal/newsletter/export/',
  '/api/admin/portal/merch/',
  '/api/admin/portal/merch/:id/withdraw/',
  '/api/v1/names/',
  '/api/admin/portal/careers/',
  '/api/admin/portal/careers/:id/status/',
  '/api/admin/portal/arbitrage/',
  '/api/admin/portal/arbitrage/:id/status/',
  '/api/crawler/stats/',
  '/api/crawler/queue/',
  '/api/crawler/queue/process/',
  '/api/crawler/discover/',
  '/api/crawler/tenant-keywords/',
  '/api/crawl/',
  '/api/crawl/recrawl/',
  '/api/sites/',
  '/api/sites/:punycode/spam/',
  '/api/admin/observability/',
  '/api/admin/api-keys/',
  '/api/admin/api-keys/:id/',
  '/api/admin/api-keys/:id/revoke/',
  '/api/admin/api-keys/:id/unrevoke/',
  '/api/admin/api-keys/:id/usage/',
];

function routeToRegex(route) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/:[^/]+/g, '[^/]+');
  return new RegExp(`^${escaped}$`);
}

const ROUTE_REGEXES = API_ROUTES.map(routeToRegex);

function routeAllows(literalBase) {
  if (ROUTE_REGEXES.some((re) => re.test(literalBase))) return true;
  // Prefix fragment of a deeper route (runtime id concatenation).
  return API_ROUTES.some((route) => route.startsWith(literalBase));
}

function readCanonical(rel) {
  return fs.readFileSync(path.join(CANONICAL, rel), 'utf8');
}

function extractApiLiterals(source) {
  const literals = new Set();
  for (const match of source.matchAll(/['"](\/api\/[^'"]*)['"]/g)) {
    literals.add(match[1]);
  }
  return [...literals];
}

function portalJsSources() {
  const sources = { 'portal.js': readCanonical('portal.js') };
  for (const page of PAGES) {
    sources[page] = readCanonical(page);
  }
  return sources;
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('Admin Portal Page Tests');

test('canonical portal directory exists with all pages and assets', () => {
  for (const rel of ALL_FILES) {
    assert.ok(
      fs.existsSync(path.join(CANONICAL, rel)),
      `missing canonical file platform/public/admin-portal/${rel}`
    );
  }
});

test('synced admin-portal/ copy exists and is byte-identical to canonical', () => {
  assert.ok(
    fs.existsSync(path.join(ROOT, 'scripts', 'sync-admin-portal.js')),
    'missing scripts/sync-admin-portal.js'
  );
  for (const rel of ALL_FILES) {
    const syncedPath = path.join(SYNCED, rel);
    assert.ok(
      fs.existsSync(syncedPath),
      `missing synced file admin-portal/${rel} — run scripts/sync-admin-portal.js`
    );
    assert.strictEqual(
      fs.readFileSync(syncedPath, 'utf8'),
      readCanonical(rel),
      `admin-portal/${rel} diverged from canonical — rerun scripts/sync-admin-portal.js`
    );
  }
});

test('legacy redirect stubs are noindex, point at their new section, and stay in sync', () => {
  for (const rel of REDIRECT_PAGES) {
    const src = readCanonical(rel);
    assert.ok(src.includes('/leasing/?tab=patrons'), `${rel}: expected the leasing tab link`);
    const $ = cheerio.load(src);
    const robots = $('meta[name="robots"]').attr('content') || '';
    assert.ok(robots.includes('noindex'), `${rel}: expected a noindex robots meta`);
    const syncedPath = path.join(SYNCED, rel);
    assert.ok(fs.existsSync(syncedPath), `missing synced file admin-portal/${rel}`);
    assert.strictEqual(
      fs.readFileSync(syncedPath, 'utf8'),
      src,
      `admin-portal/${rel} diverged from canonical — rerun scripts/sync-admin-portal.js`
    );
  }
});

test('every portal page is noindex,nofollow', () => {
  for (const rel of PAGES) {
    const $ = cheerio.load(readCanonical(rel));
    const robots = $('meta[name="robots"]').attr('content') || '';
    assert.ok(
      robots.includes('noindex') && robots.includes('nofollow'),
      `${rel}: expected <meta name="robots" content="noindex,nofollow">`
    );
  }
});

test('every portal page loads the shared stylesheet and protected pages load portal.js', () => {
  for (const rel of PAGES) {
    const $ = cheerio.load(readCanonical(rel));
    const styles = $('link[rel="stylesheet"]')
      .map((_, el) => $(el).attr('href'))
      .get();
    assert.ok(
      styles.some((h) => h.endsWith('portal.css')),
      `${rel}: expected a portal.css stylesheet link`
    );
    if (rel !== 'login/index.html') {
      const scripts = $('script[src]')
        .map((_, el) => $(el).attr('src'))
        .get();
      assert.ok(
        scripts.some((s) => s.endsWith('portal.js')),
        `${rel}: expected a portal.js script tag`
      );
    }
  }
});

test('login page has the required form fields, ids, and error surfaces', () => {
  const $ = cheerio.load(readCanonical('login/index.html'));
  assert.strictEqual($('form#login-form').length, 1, 'expected #login-form');
  assert.strictEqual($('form#login-form input#email[type="email"]').length, 1, 'expected #email');
  assert.strictEqual(
    $('form#login-form input#password[type="password"]').length,
    1,
    'expected #password'
  );
  assert.strictEqual($('button#login-submit').length, 1, 'expected #login-submit');
  assert.strictEqual($('form#password-form').length, 1, 'expected #password-form');
  assert.strictEqual($('#current-password').length, 1, 'expected #current-password');
  assert.strictEqual($('#new-password').length, 1, 'expected #new-password');
  assert.strictEqual($('#confirm-password').length, 1, 'expected #confirm-password');
  assert.strictEqual($('button#password-submit').length, 1, 'expected #password-submit');
  const message = $('#login-message');
  assert.strictEqual(message.length, 1, 'expected #login-message');
  assert.strictEqual(message.attr('role'), 'alert', 'expected role=alert on #login-message');
  assert.strictEqual($('#login-setup').length, 1, 'expected #login-setup (503 setup message)');

  const src = readCanonical('login/index.html');
  assert.ok(src.includes("TOKEN_KEY = 'punicodex_portal_token'"), 'expected portal token key');
  assert.ok(src.includes('localStorage.setItem(TOKEN_KEY'), 'expected token storage on success');
  assert.ok(src.includes('requirePasswordChange'), 'expected forced password-change flow');
  assert.ok(src.includes('portal_unconfigured'), 'expected 503 portal_unconfigured handling');
  assert.ok(src.includes('account_locked'), 'expected account_locked handling');
  assert.ok(src.includes('account_inactive'), 'expected account_inactive handling');
  assert.ok(src.includes('429'), 'expected rate-limit (429) handling');
});

test('every /api/ URL referenced by the portal matches the backend route table', () => {
  const sources = portalJsSources();
  const found = [];
  for (const [file, src] of Object.entries(sources)) {
    for (const literal of extractApiLiterals(src)) {
      found.push({ file, literal });
    }
  }
  assert.ok(found.length >= 15, `expected at least 15 /api/ literals, found ${found.length}`);

  for (const { file, literal } of found) {
    const base = literal.split('?')[0];
    assert.ok(
      base.endsWith('/'),
      `${file}: ${literal} is missing the trailing slash (bare paths 308)`
    );
    assert.ok(routeAllows(base), `${file}: ${literal} does not match any deployed backend route`);
  }

  // Reverse coverage: every deployed route the UI relies on must be exercised.
  for (const route of API_ROUTES) {
    const re = routeToRegex(route);
    const covered = found.some(({ literal }) => {
      const base = literal.split('?')[0];
      return re.test(base) || route.startsWith(base);
    });
    assert.ok(covered, `no portal code references route ${route}`);
  }
});

test('no secrets or hardcoded credentials in the portal sources', () => {
  const secretPatterns = [
    /sk_(live|test)_[A-Za-z0-9]+/,
    /pk_live_[A-Za-z0-9]+/,
    /whsec_[A-Za-z0-9]+/,
    /AKIA[0-9A-Z]{16}/,
    /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/,
    /Bearer\s+[A-Za-z0-9._~+/=-]{12,}/,
    /x-admin-token['"]?\s*[:=]\s*['"][A-Za-z0-9+/=_-]{8,}['"]/,
    /(?:password|passwd|secret)\s*:\s*['"][A-Za-z0-9!@#$%^&*_+=.-]{8,}['"]/i,
  ];
  for (const rel of ALL_FILES) {
    const src = readCanonical(rel);
    for (const pattern of secretPatterns) {
      assert.ok(!pattern.test(src), `${rel}: possible hardcoded secret matching ${pattern}`);
    }
  }
});

test('role-based nav and action gating logic is present', () => {
  const shell = readCanonical('portal.js');
  assert.ok(shell.includes('NAV_ITEMS'), 'expected NAV_ITEMS table');
  assert.ok(
    /id: 'users'[\s\S]{0,120}permission: 'users'/.test(shell),
    'expected Users nav item gated on the users permission'
  );
  assert.ok(
    /id: 'requests'[\s\S]{0,120}href: `\$\{PREFIX\}requests\/`/.test(shell),
    'expected Requests nav item pointing at /admin-portal/requests/'
  );
  assert.ok(
    /id: 'newsletter'[\s\S]{0,120}href: `\$\{PREFIX\}newsletter\/`/.test(shell),
    'expected Newsletter nav item'
  );
  assert.ok(
    /id: 'merch'[\s\S]{0,120}href: `\$\{PREFIX\}merch\/`/.test(shell),
    'expected Creator Merch nav item'
  );
  assert.ok(shell.includes('can(item.permission)'), 'expected nav filtering by permission');
  assert.ok(shell.includes('indexOf(permission)'), 'expected permission membership check');
  assert.ok(shell.includes('redirectToLogin'), 'expected auth guard redirect');
  assert.ok(shell.includes('withTrailingSlash'), 'expected trailing-slash enforcement');
  assert.ok(shell.includes("'x-admin-token'"), 'expected x-admin-token header wiring');

  assert.ok(
    readCanonical('index.html').includes("Portal.can('ops')"),
    'dashboard: expected ops section gated on ops permission'
  );
  assert.ok(
    readCanonical('applications/index.html').includes('Portal.can(permissionFor(item.kind))'),
    'applications: expected per-kind action gating'
  );
  assert.ok(
    readCanonical('leasing/index.html').includes("Portal.can('leasing')"),
    'leasing: expected leasing-gated booking/patron actions'
  );
  assert.ok(
    readCanonical('scholars/index.html').includes("Portal.can('scholars')"),
    'scholars: expected scholars-gated actions'
  );
  assert.ok(
    readCanonical('newsletter/index.html').includes("Portal.can('leasing')"),
    'newsletter: expected leasing-gated CSV export'
  );
  assert.ok(
    readCanonical('merch/index.html').includes("Portal.can('leasing')"),
    'merch: expected leasing-gated withdraw action'
  );
  assert.ok(
    readCanonical('users/index.html').includes("Portal.can('users')"),
    'users: expected superadmin gate'
  );
});

test('dashboard renders every field of the dashboard payload', () => {
  const src = readCanonical('index.html');
  for (const field of [
    'businessPending',
    'universityPending',
    'pendingEdits',
    'pendingMedia',
    'estimatedMrrDollars',
    'estimatedMrrCents',
    'last30dDollars',
    'bookingsLast30d',
    'windowDays',
    'windowHours',
    'errorCount',
    'errorRate',
    'indexedSites',
    'generatedAt',
  ]) {
    assert.ok(src.includes(field), `dashboard: expected payload field ${field}`);
  }
});

test('legacy dashboards link back to the portal', () => {
  for (const page of [
    'admin-api-keys.html',
    'admin-bookings.html',
    'admin-analytics.html',
    'admin-authenticity.html',
  ]) {
    const src = fs.readFileSync(path.join(ROOT, 'platform', 'public', page), 'utf8');
    assert.ok(src.includes('href="/admin-portal/"'), `${page}: expected a Portal nav link`);
  }
});

if (!process.exitCode) {
  console.log('\n✓ All admin portal page tests passed');
} else {
  console.log('\n✗ Some admin portal page tests failed');
  process.exit(1);
}
