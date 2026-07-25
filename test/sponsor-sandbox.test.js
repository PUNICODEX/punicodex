/**
 * Sponsor Sandbox Tests
 *
 * Covers the B4 slice of the admin-portal redesign (docs/admin-portal-redesign.md §4):
 *   - migrate-analytics-slot adds analytics_events.slot_slug (+ index), idempotently.
 *   - The trackers store the placement slug (pixel endpoint with ?slot=hero;
 *     junk values dropped to NULL).
 *   - getBookingEventStats: bySlot split + viewability math (ctr, viewabilityPct).
 *   - Scoping: tenant A can never read tenant B's placement detail
 *     (GET /api/account/analytics/slot/?id= → 403; unauthenticated → 401).
 *   - The sandbox pages exist with the expected markup hooks and only call
 *     real /api/account/* endpoints.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

process.env.PLATFORM_URL = 'https://punicodex.com';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const { migrate } = require('../platform/db/migrate-analytics-slot.js');
const { invoke } = require('./helpers/http.js');
const tenantPortal = require('../platform/api/tenant-portal.js');
const { createBooking, goLive, recordEvent } = require('../platform/api/bookings.js');
const { getIndividualSlotIds } = require('./helpers/slots.js');

const pixelHandler = require('../api/analytics/pixel.gif/index.js');
const accountHandler = require('../api/account/[[...slug]].js');

const HUMAN_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0';

let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `10.77.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}
function ipHeaders() {
  return { 'x-forwarded-for': nextIp() };
}
function bearerHeaders(token) {
  return { authorization: `Bearer ${token}`, 'x-forwarded-for': nextIp() };
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// ── Fixtures ───────────────────────────────────────────────

const SPONSOR_A = 'sandbox-a@tenant.test';
const SPONSOR_B = 'sandbox-b@tenant.test';
const nikeSlotIds = getIndividualSlotIds(__filename, 'nike');

let bookingA; // tenant A's live booking (nike)
let bookingB; // tenant B's live booking (nike)
let tokenA;

async function makeLiveBooking(slotId, email) {
  const { id, publicId } = await createBooking({
    slotId,
    email,
    companyName: 'Sandbox Test Co',
    websiteUrl: 'https://example.com',
    leaseMonths: 1,
    trialMonths: 0,
    siteSlug: 'nike',
  });
  const db = new Database(getTestDbPath(__filename));
  db.prepare("UPDATE bookings SET status = 'approved' WHERE id = ?").run(id);
  db.close();
  await goLive(id);
  return { id, publicId };
}

async function provisionAndLogin(email, password) {
  const provision = await tenantPortal.provisionTenantAccount(email, { kind: 'sponsor' });
  const set = await tenantPortal.setPassword({ token: provision.token, password });
  return set.token;
}

// ── Migration ──────────────────────────────────────────────

test('migration adds slot_slug and the (booking_id, slot_slug) index, idempotently', () => {
  const db = new Database(getTestDbPath(__filename));
  try {
    migrate(db);
    migrate(db); // second run must be a no-op
    const cols = db
      .prepare('PRAGMA table_info(analytics_events)')
      .all()
      .map((c) => c.name);
    assert.ok(cols.includes('slot_slug'), 'slot_slug column present');
    const indexes = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'analytics_events'"
      )
      .all()
      .map((i) => i.name);
    assert.ok(indexes.includes('idx_analytics_events_booking_slot'), 'slot index present');
  } finally {
    db.close();
  }
});

// ── Trackers store the slot dimension ──────────────────────

test('pixel endpoint stores ?slot= on the impression event', async () => {
  bookingA = await makeLiveBooking(nikeSlotIds[0], SPONSOR_A);
  bookingB = await makeLiveBooking(nikeSlotIds[1], SPONSOR_B);

  const res = await invoke(pixelHandler, 'GET', '/api/analytics/pixel.gif/?b=x&slot=hero', {
    headers: ipHeaders(),
    params: { b: bookingA.publicId, slot: 'hero' },
  });
  assert.strictEqual(res.status, 200, 'pixel still serves the gif');

  const db = new Database(getTestDbPath(__filename));
  const row = db
    .prepare(
      "SELECT slot_slug FROM analytics_events WHERE booking_id = ? AND event_type = 'impression'"
    )
    .get(bookingA.id);
  db.close();
  assert.strictEqual(row.slot_slug, 'hero');
});

test('an invalid slot parameter is sanitized to NULL (whole-slot bucket)', async () => {
  const res = await invoke(pixelHandler, 'GET', '/api/analytics/pixel.gif/?b=x&slot=BAD!!', {
    headers: ipHeaders(),
    params: { b: bookingA.publicId, slot: 'BAD!!' },
  });
  assert.strictEqual(res.status, 200);

  const db = new Database(getTestDbPath(__filename));
  const row = db
    .prepare(
      "SELECT slot_slug FROM analytics_events WHERE booking_id = ? AND event_type = 'impression' ORDER BY id DESC LIMIT 1"
    )
    .get(bookingA.id);
  db.close();
  assert.strictEqual(row.slot_slug, null);
});

// ── bySlot + viewability math ──────────────────────────────

test('getBookingEventStats returns bySlot split and viewability math', async () => {
  // 100 impressions / 40 viewable / 5 clicks across two placement slugs.
  const seed = async (slotSlug, type, count) => {
    for (let i = 0; i < count; i++) {
      await recordEvent({
        bookingId: bookingA.id,
        eventType: type,
        ip: `9.9.9.${i}`,
        userAgent: HUMAN_UA,
        slotSlug,
        ...(type === 'viewable_impression' ? { visibleSeconds: 2, visiblePercent: 80 } : {}),
      });
    }
  };
  await seed('hero', 'impression', 60);
  await seed('sidebar', 'impression', 40);
  await seed('hero', 'viewable_impression', 25);
  await seed('sidebar', 'viewable_impression', 15);
  await seed('hero', 'click', 3);
  await seed('sidebar', 'click', 2);

  const stats = await tenantPortal.getBookingEventStats(bookingA.id);
  // Two earlier pixel events (hero + NULL) ride along: 102 impressions total.
  assert.strictEqual(stats.impressions, 102);
  assert.strictEqual(stats.clicks, 5);
  assert.strictEqual(stats.ctr, ((5 / 102) * 100).toFixed(2));
  assert.strictEqual(stats.viewableImpressions, 40);
  assert.strictEqual(stats.viewabilityPct, ((40 / 102) * 100).toFixed(1));

  const hero = stats.bySlot.find((s) => s.slotSlug === 'hero');
  const sidebar = stats.bySlot.find((s) => s.slotSlug === 'sidebar');
  const whole = stats.bySlot.find((s) => s.slotSlug === null);
  assert.ok(hero && sidebar, 'both placement slugs present in bySlot');
  assert.strictEqual(hero.impressions, 61); // 60 seeded + 1 pixel test event
  assert.strictEqual(hero.viewableImpressions, 25);
  assert.strictEqual(hero.clicks, 3);
  assert.strictEqual(hero.ctr, ((3 / 61) * 100).toFixed(2));
  assert.strictEqual(hero.viewabilityPct, ((25 / 61) * 100).toFixed(1));
  assert.strictEqual(sidebar.impressions, 40);
  assert.strictEqual(sidebar.viewableImpressions, 15);
  assert.strictEqual(sidebar.viewabilityPct, ((15 / 40) * 100).toFixed(1));
  assert.ok(whole, 'NULL events bucket as slotSlug: null');
  assert.strictEqual(whole.impressions, 1); // the sanitized BAD!! pixel event
});

// Exact round numbers requested by the contract: 100 / 40 / 5 → 5.00 / 40.0.
test('viewabilityPct and ctr use exact fixed-point math (100/40/5)', async () => {
  const { id } = await makeLiveBooking(nikeSlotIds[2], 'sandbox-math@tenant.test');
  const seed = async (slotSlug, type, count) => {
    for (let i = 0; i < count; i++) {
      await recordEvent({
        bookingId: id,
        eventType: type,
        ip: `8.8.8.${i}`,
        userAgent: HUMAN_UA,
        slotSlug,
        ...(type === 'viewable_impression' ? { visibleSeconds: 2, visiblePercent: 75 } : {}),
      });
    }
  };
  await seed('hero', 'impression', 60);
  await seed('sidebar', 'impression', 40);
  await seed('hero', 'viewable_impression', 25);
  await seed('sidebar', 'viewable_impression', 15);
  await seed('hero', 'click', 3);
  await seed('sidebar', 'click', 2);

  const stats = await tenantPortal.getBookingEventStats(id);
  assert.strictEqual(stats.impressions, 100);
  assert.strictEqual(stats.viewableImpressions, 40);
  assert.strictEqual(stats.clicks, 5);
  assert.strictEqual(stats.ctr, '5.00');
  assert.strictEqual(stats.viewabilityPct, '40.0');
  assert.strictEqual(stats.bySlot.length, 2);
});

// ── Placement-detail endpoint + scoping ────────────────────

test('GET /api/account/analytics/slot/ requires auth and serves the owner', async () => {
  tokenA = await provisionAndLogin(SPONSOR_A, 'sandbox-pass-a1');
  const tokenB = await provisionAndLogin(SPONSOR_B, 'sandbox-pass-b1');

  const noAuth = await invoke(accountHandler, 'GET', '/api/account/analytics/slot/?id=1', {
    headers: ipHeaders(),
    params: { slug: ['analytics', 'slot'], id: String(bookingA.id) },
  });
  assert.strictEqual(noAuth.status, 401);

  const own = await invoke(
    accountHandler,
    'GET',
    `/api/account/analytics/slot/?id=${bookingA.id}`,
    {
      headers: bearerHeaders(tokenA),
      params: { slug: ['analytics', 'slot'], id: String(bookingA.id) },
    }
  );
  assert.strictEqual(own.status, 200, JSON.stringify(own.body));
  assert.strictEqual(own.body.booking.id, bookingA.id);
  assert.strictEqual(own.body.booking.slotName.length > 0, true);
  assert.ok(Array.isArray(own.body.bySlot));
  assert.ok(own.body.bySlot.length >= 2, 'placement split present');
  assert.strictEqual(typeof own.body.viewabilityPct, 'string');
  assert.ok(own.body.temple === null || own.body.temple.templeId === 'nike');

  // Path-parameter variant resolves identically.
  const viaPath = await invoke(
    accountHandler,
    'GET',
    `/api/account/analytics/slot/${bookingA.id}/`,
    {
      headers: bearerHeaders(tokenA),
      params: { slug: ['analytics', 'slot', String(bookingA.id)] },
    }
  );
  assert.strictEqual(viaPath.status, 200);
  assert.strictEqual(viaPath.body.booking.id, bookingA.id);

  // Tenant A can never read tenant B's placement detail.
  const cross = await invoke(
    accountHandler,
    'GET',
    `/api/account/analytics/slot/?id=${bookingB.id}`,
    {
      headers: bearerHeaders(tokenA),
      params: { slug: ['analytics', 'slot'], id: String(bookingB.id) },
    }
  );
  assert.strictEqual(cross.status, 403);
  assert.strictEqual(cross.body.code, 'not_owner');

  const crossBack = await invoke(
    accountHandler,
    'GET',
    `/api/account/analytics/slot/?id=${bookingA.id}`,
    {
      headers: bearerHeaders(tokenB),
      params: { slug: ['analytics', 'slot'], id: String(bookingA.id) },
    }
  );
  assert.strictEqual(crossBack.status, 403);

  const invalid = await invoke(accountHandler, 'GET', '/api/account/analytics/slot/?id=abc', {
    headers: bearerHeaders(tokenA),
    params: { slug: ['analytics', 'slot'], id: 'abc' },
  });
  assert.strictEqual(invalid.status, 400);

  const missing = await invoke(accountHandler, 'GET', '/api/account/analytics/slot/?id=999999', {
    headers: bearerHeaders(tokenA),
    params: { slug: ['analytics', 'slot'], id: '999999' },
  });
  assert.strictEqual(missing.status, 404);
});

test('space analytics carry the new fields per slot', async () => {
  const res = await invoke(accountHandler, 'GET', '/api/account/analytics/space/', {
    headers: bearerHeaders(tokenA),
    params: { slug: ['analytics', 'space'] },
  });
  assert.strictEqual(res.status, 200);
  const slot = res.body.slots.find((s) => s.bookingId === bookingA.id);
  assert.ok(slot);
  assert.strictEqual(slot.tracking, 'events');
  assert.strictEqual(slot.templeSlug, 'nike');
  assert.strictEqual(typeof slot.viewabilityPct, 'string');
  assert.ok(Array.isArray(slot.bySlot));
  assert.ok(Array.isArray(res.body.patrons));
});

// ── Sandbox pages: files, hooks, real endpoints ────────────

const ACCOUNT_ROOT = path.join(__dirname, '..', 'account');
const REAL_ENDPOINTS = [
  '/api/account/auth/login/',
  '/api/account/auth/logout/',
  '/api/account/auth/forgot/',
  '/api/account/auth/set-password/',
  '/api/account/me/',
  '/api/account/analytics/space/',
  '/api/account/analytics/temple/',
  '/api/account/analytics/slot/',
  '/api/account/requests/',
];

const PAGES = [
  {
    html: 'index.html',
    js: 'index.js',
    hooks: [
      'id="sandbox-topbar"',
      'id="temple-cards"',
      'id="placements-list"',
      'id="patrons-strip"',
    ],
  },
  {
    html: 'slot/index.html',
    js: 'slot/slot.js',
    hooks: [
      'id="slot-kpis"',
      'id="chart-impressions"',
      'id="chart-clicks"',
      'id="slot-placements"',
      'id="slot-temple"',
    ],
  },
  {
    html: 'bookings/index.html',
    js: 'bookings/bookings.js',
    hooks: ['id="bookings-list"', 'id="patrons-list"'],
  },
  {
    html: 'brand/index.html',
    js: 'brand/brand.js',
    hooks: ['id="request-forms"', 'id="request-history"'],
  },
  {
    html: 'login/index.html',
    js: 'login/login.js',
    hooks: ['id="login-form"', 'id="forgot-form"', 'id="set-password-form"'],
  },
];

test('sandbox pages exist with their markup hooks and shared assets', () => {
  for (const asset of ['sandbox.css', 'sandbox.js']) {
    assert.ok(fs.existsSync(path.join(ACCOUNT_ROOT, asset)), `account/${asset} exists`);
  }
  for (const page of PAGES) {
    const htmlPath = path.join(ACCOUNT_ROOT, page.html);
    assert.ok(fs.existsSync(htmlPath), `account/${page.html} exists`);
    const html = fs.readFileSync(htmlPath, 'utf8');
    assert.ok(html.includes('/account/sandbox.css'), `${page.html} links the sandbox stylesheet`);
    assert.ok(html.includes('/account/sandbox.js'), `${page.html} loads the sandbox core`);
    assert.ok(fs.existsSync(path.join(ACCOUNT_ROOT, page.js)), `account/${page.js} exists`);
    assert.ok(html.includes(`/account/${page.js}`), `${page.html} loads its page script`);
    for (const hook of page.hooks) {
      assert.ok(html.includes(hook), `${page.html} carries ${hook}`);
    }
  }
});

test('sandbox page scripts reference only real endpoints and keep the auth contract', () => {
  const scripts = PAGES.map((p) => p.js).concat(['sandbox.js']);
  for (const script of scripts) {
    const src = fs.readFileSync(path.join(ACCOUNT_ROOT, script), 'utf8');
    // Page scripts may call the API exclusively through the shared core
    // (requireAccount → /me), so zero direct literals is fine — any literal
    // that IS present must be a real endpoint.
    const calls = src.match(/'\/api\/[^']*'/g) || [];
    for (const call of calls) {
      const url = call.slice(1, -1);
      assert.ok(
        REAL_ENDPOINTS.some((endpoint) => url === endpoint || url.startsWith(endpoint)),
        `${script} references a real endpoint: ${url}`
      );
    }
  }
  const core = fs.readFileSync(path.join(ACCOUNT_ROOT, 'sandbox.js'), 'utf8');
  assert.ok(core.includes("TOKEN_KEY = 'punicodex_tenant_token'"), 'token storage key unchanged');
});

// ── Runner ─────────────────────────────────────────────────

async function run() {
  console.log('\n▸ Sponsor Sandbox Tests\n');
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
      if (err.stack) console.error(err.stack.split('\n').slice(1, 4).join('\n'));
    }
  }
  console.log(`\nSponsor Sandbox: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
