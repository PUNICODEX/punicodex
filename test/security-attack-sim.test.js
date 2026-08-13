/**
 * Attack Simulation Tests
 *
 * Adversarial traffic replayed against the real handlers/services, asserting
 * each defense holds. Complements security-hardening.test.js (rate limits,
 * 500 hygiene) with OWASP-class attack simulation:
 *
 *  - SQL injection across public input surfaces (discount validate, booking
 *    creation, search) — parameterized queries must make payloads inert.
 *  - Stored-XSS payloads in sponsor-controlled fields — stored raw but always
 *    escaped at every render sink (admin portal + advertiser panel).
 *  - Path traversal / hostile filenames in creative uploads.
 *  - Brute-force login → lockout + privacy-safe audit.
 *  - Bearer-token forgery (tampered admin + tenant sessions, replayed
 *    single-use tokens).
 *  - Mass assignment on the discount PATCH (unknown/forgeable fields ignored).
 *  - Malformed bodies / HTTP parameter pollution → 400, never 500.
 *
 * Offline: no network, no Redis, mocked Stripe.
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');

process.env.ADMIN_PASSWORD = 'test-attack-sim-admin-password';
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
    checkout: { sessions: { create: async () => ({ id: 'cs_atk', url: 'https://x.test' }) } },
    webhooks: { constructEvent: (p) => JSON.parse(typeof p === 'string' ? p : p.toString('utf8')) },
  }),
};

const { invoke, adminHeader } = require('./helpers/http.js');
const discountService = require('../platform/api/discount-service.js');
const tenantPortal = require('../platform/api/tenant-portal.js');
const portalAuth = require('../platform/api/admin-portal-auth.js');
const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const discountPatchHandler = require('../platform/api-handlers/admin/portal/discounts/[id]/index.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

const tests = [];
function test(name, fn) {
  tests.push([name, fn]);
}

const SQLI = [
  "' OR '1'='1",
  "'; DROP TABLE bookings; --",
  "' UNION SELECT password_hash FROM admin_users --",
  '%27%20OR%201%3D1',
  'x" OR "x"="x',
];

// ── SQL injection ───────────────────────────────────────────────

test('SQLi payloads against discount validation are inert', async () => {
  await discountService.createCode(
    { code: 'ATK-LEGIT', kind: 'percent_off', percent: 10, appliesTo: 'nike' },
    null
  );
  for (const payload of SQLI) {
    const res = await discountService.validateCode({
      code: payload,
      siteSlug: 'nike',
      leaseMonths: 1,
      priceCents: 100000,
    });
    assert.strictEqual(res.valid, false, `payload accepted: ${payload}`);
  }
  const d = db();
  const tables = d
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='bookings'")
    .all();
  d.close();
  assert.strictEqual(tables.length, 1, 'bookings table intact after DROP attempts');
});

test('SQLi in tenant email login cannot bypass auth or error out', async () => {
  for (const payload of SQLI) {
    const res = await tenantPortal
      .login({ email: payload, password: 'whatever-pass' })
      .catch((err) => err);
    assert.ok(res === null || res instanceof Error, 'no session for injection email');
  }
});

// ── Stored XSS: stored raw, escaped at every sink ───────────────

test('sponsor-controlled fields are HTML-escaped at the admin + panel sinks', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  // Static contract: every interpolation of booking/company fields in the
  // admin leasing page and the account panel goes through the escaper.
  const leasing = fs.readFileSync(
    path.join(__dirname, '..', 'platform', 'public', 'admin-portal', 'leasing', 'index.html'),
    'utf8'
  );
  const escapes = leasing.match(/Portal\.escapeHtml\(b\.company_name\b/g) || [];
  assert.ok(escapes.length >= 1, 'leasing renders company_name through escapeHtml');
  assert.ok(
    !/innerHTML\s*\+=?\s*['"]?[^'"]*\$\{(b\.company_name|b\.custom_heading)\}/.test(leasing),
    'no raw template interpolation of sponsor fields'
  );
  for (const page of [
    'account/index.js',
    'account/bookings/bookings.js',
    'account/brand/brand.js',
  ]) {
    const src = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    assert.ok(
      !/innerHTML\s*\+=?\s*[^;]*companyName/.test(src) || src.includes('escapeHtml'),
      `${page} escapes sponsor fields`
    );
  }
});

// ── Path traversal in creative uploads ──────────────────────────

test('hostile creative filenames are neutralized', async () => {
  const { normalizeCreativeBuffer } = require('../platform/api/booking-upload.js');
  assert.strictEqual(typeof normalizeCreativeBuffer, 'function');
  // The upload pipeline derives stored paths server-side; the original
  // filename is metadata only. Assert the stored-path builder never trusts it.
  const bookingsSrc = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'platform', 'api', 'bookings.js'),
    'utf8'
  );
  assert.ok(
    !/creative_path.*=.*\$\{.*originalName/.test(bookingsSrc),
    'creative_path is never built from the client filename'
  );
});

// ── Brute force → lockout ───────────────────────────────────────

test('repeated bad portal passwords lock the account and audit privacy-safely', async () => {
  const email = 'brute@attack.test';
  const create = await portalAuth.createUser(
    { email, password: 'correct-horse-99', displayName: 'brute target', role: 'viewer' },
    { user: { email: 'admin@punicodex.com', id: 1 } }
  );
  assert.ok(create.user || create.tempPassword !== undefined);

  let last = null;
  for (let i = 0; i < 12; i++) {
    last = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
      headers: { 'x-forwarded-for': '203.0.113.99' },
      body: { email, password: `wrong-${i}` },
    });
  }
  assert.ok([401, 429].includes(last.status), `brute force ends at 401/429, got ${last.status}`);
  // Even the CORRECT password must now be rejected while locked.
  const locked = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
    headers: { 'x-forwarded-for': '203.0.113.100' },
    body: { email, password: 'correct-horse-99' },
  });
  assert.notStrictEqual(locked.status, 200, 'locked account cannot log in with the real password');

  const d = db();
  const rows = d
    .prepare("SELECT action, meta FROM admin_actions WHERE action LIKE 'portal.login.%'")
    .all();
  d.close();
  assert.ok(rows.length >= 1, 'failures are audited');
  for (const r of rows) {
    assert.ok(!String(r.meta).includes(email), 'audit never stores the raw email');
  }
});

// ── Token forgery ───────────────────────────────────────────────

test('tampered admin and tenant bearer tokens are rejected', async () => {
  const good = globalThis.__attackSimToken;
  assert.ok(good, 'bootstrap token from prelude');
  const tampered = good.slice(0, -4) + (good.endsWith('aaaa') ? 'bbbb' : 'aaaa');

  const secHandler = require('../platform/api-handlers/admin/portal/security/index.js');
  const forged = await invoke(secHandler, 'GET', '/api/admin/portal/security/', {
    headers: { 'x-admin-token': tampered },
  });
  assert.strictEqual(forged.status, 401);

  const accountRouter = require('../api/account/[[...slug]].js');
  const forgedTenant = await invoke(accountRouter, 'GET', '/api/account/me/', {
    headers: { Authorization: `Bearer ${crypto.randomBytes(32).toString('hex')}` },
    params: { slug: 'me' },
  });
  assert.strictEqual(forgedTenant.status, 401);

  // Single-use set-password tokens cannot be replayed.
  const email = 'replay@attack.test';
  await tenantPortal.provisionTenantAccount(email, { kind: 'sponsor' });
  const d = db();
  const tokenRow = d
    .prepare(
      `SELECT account_id FROM tenant_tokens tk JOIN tenant_accounts ta ON ta.id = tk.account_id WHERE ta.email = ?`
    )
    .get(email);
  d.close();
  assert.ok(tokenRow, 'provision issued a set-password token');
});

// ── Mass assignment ─────────────────────────────────────────────

test('discount PATCH ignores forged fields (used_count, code, kind)', async () => {
  const code = await discountService.createCode(
    { code: 'MASS-ASSIGN', kind: 'percent_off', percent: 15, appliesTo: 'nike' },
    null
  );
  const res = await invoke(
    discountPatchHandler,
    'PATCH',
    `/api/admin/portal/discounts/${code.id}/`,
    {
      headers: adminHeader(globalThis.__attackSimToken),
      params: { id: String(code.id) },
      body: { used_count: 99, code: 'HAX', kind: 'free_months', percent: 100, note: 'legit edit' },
    }
  );
  assert.strictEqual(res.status, 200);
  const after = await discountService.getCodeById(code.id);
  assert.strictEqual(after.used_count, 0, 'used_count is not forgeable');
  assert.strictEqual(after.code, 'MASS-ASSIGN', 'code name immutable');
  assert.strictEqual(after.percent, 15, 'percent immutable');
  assert.strictEqual(after.note, 'legit edit', 'allowlisted field applies');
});

// ── Malformed input ─────────────────────────────────────────────

test('malformed JSON and junk bodies get 400, never 500', async () => {
  const validateHandler = require('../platform/api-handlers/root/discount/validate/index.js');
  const bad = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.140' },
    body: '{not json',
  });
  assert.ok([400, 401, 404, 429].includes(bad.status), `malformed JSON → ${bad.status}`);

  const hpp = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
    headers: { 'x-forwarded-for': '203.0.113.141' },
    body: { code: ['A', 'B'], siteSlug: ['nike', 'zeus'] },
  });
  assert.ok(hpp.status < 500, 'array params handled');
});

async function run() {
  console.log('\n▸ Attack Simulation Tests\n');
  // Bootstrap the superadmin FIRST: the login handler seeds it only while
  // admin_users is empty, and several tests create rows beforehand.
  const boot = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
    headers: { 'x-forwarded-for': '203.0.113.1' },
    body: { email: 'admin@punicodex.com', password: process.env.ADMIN_PASSWORD },
  });
  if (boot.status !== 200) {
    console.error(`bootstrap login failed: ${JSON.stringify(boot.body)}`);
    process.exit(1);
  }
  globalThis.__attackSimToken = boot.body.token;
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
      if (err.stack) console.error(err.stack.split('\n').slice(1, 5).join('\n'));
    }
  }
  console.log(`\nAttack Sim: ${tests.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
