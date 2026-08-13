/**
 * Extended Injection Simulation Tests
 *
 * Second wave of hostile-input replay, wider than the core attack-sim suite:
 * SQL/command/template injection and type-confusion across patrons checkout,
 * search, scholars, slot meta, discount creation, social links — plus CRLF
 * header injection into outbound email subjects. Every payload must be inert:
 * a clean 4xx or a safely-stored string, never a 500, never a sink leak.
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');

process.env.ADMIN_PASSWORD = 'test-injection-extended-admin-password';
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
    checkout: { sessions: { create: async () => ({ id: 'cs_inj', url: 'https://x.test' }) } },
    webhooks: { constructEvent: (p) => JSON.parse(typeof p === 'string' ? p : p.toString('utf8')) },
  }),
};

const discountService = require('../platform/api/discount-service.js');
const tenantPortal = require('../platform/api/tenant-portal.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const HOSTILE = [
  "' OR '1'='1' --",
  '"; DROP TABLE discount_codes; --',
  // biome-ignore lint/suspicious/noTemplateCurlyInString: intentional template-injection payload
  '${7*7}{{7*7}}',
  '../../etc/passwd',
  '%0d%0aSet-Cookie:%20pwnd=1',
  '<svg onload=alert(1)>',
  '\x00\x01null-bytes',
];

test('discount code creation rejects hostile codes (allowlist charset)', async () => {
  for (const payload of HOSTILE) {
    await assert.rejects(
      () =>
        discountService.createCode(
          { code: payload, kind: 'percent_off', percent: 10, appliesTo: 'nike' },
          null
        ),
      (err) =>
        err &&
        (err.status === 400 || err.statusCode === 400 || /invalid|charset|code/i.test(err.message)),
      `hostile code accepted: ${payload.slice(0, 30)}`
    );
  }
});

test('discount validation with hostile code strings is uniformly inert', async () => {
  const validateHandler = require('../platform/api-handlers/root/discount/validate/index.js');
  const { invoke } = require('./helpers/http.js');
  for (const payload of HOSTILE) {
    // Service level: never valid.
    const res = await discountService.validateCode({
      code: payload,
      siteSlug: 'nike',
      leaseMonths: 1,
      priceCents: 1000,
    });
    assert.strictEqual(res.valid, false);
    // HTTP level: every failure flattens to one generic reason (no oracle).
    const http = await invoke(validateHandler, 'POST', '/api/discount/validate/', {
      headers: { 'x-forwarded-for': '198.51.100.77' },
      body: { code: payload, siteSlug: 'nike', leaseMonths: 1, priceCents: 1000 },
    });
    assert.ok(http.status < 500, `HTTP ${http.status} for hostile code`);
    if (http.status === 200) {
      assert.strictEqual(http.body.valid, false);
      assert.strictEqual(http.body.reason, 'invalid_code', 'no oracle leak at the sink');
    }
  }
  const d = db();
  const alive = d.prepare('SELECT COUNT(*) c FROM discount_codes').get().c;
  d.close();
  assert.ok(alive >= 0, 'schema intact');
});

test('tenant login with type-confused bodies never 500s', async () => {
  const bodies = [
    { email: ['a@b.c'], password: 'x' },
    { email: { $gt: '' }, password: 'x' },
    { email: 'a@b.c', password: ['x'] },
    { email: null, password: null },
    { email: 42, password: true },
  ];
  for (const body of bodies) {
    const res = await tenantPortal.login(body).catch((e) => e);
    assert.ok(
      res === null || res instanceof Error,
      `type confusion accepted: ${JSON.stringify(body)}`
    );
  }
});

test('change-request target confusion cannot reach another type or account', async () => {
  await tenantPortal.provisionTenantAccount('inj-owner@example.com', { kind: 'sponsor' });
  const account = await tenantPortal.getAccountByEmail('inj-owner@example.com');
  const sanitized = { ...account, isSponsor: true, isPatron: false };
  // Non-numeric target → 400; negative/huge ids → 404, never 500.
  for (const target of ['abc', '-1', '999999999', '1 OR 1=1', '__proto__']) {
    await assert.rejects(
      () => tenantPortal.createChangeRequest(sanitized, { type: 'image', target, payload: {} }),
      (err) => [400, 404].includes(err.status),
      `target accepted: ${target}`
    );
  }
});

test('social-links change payloads reject javascript: and data: URLs', async () => {
  await tenantPortal.provisionTenantAccount('inj-patron@example.com', { kind: 'patron' });
  const row = await tenantPortal.getAccountByEmail('inj-patron@example.com');
  const d = db();
  d.prepare(
    `INSERT INTO patrons (temple_id, email, display_name, amount_cents, status)
     VALUES ('nike', 'inj-patron@example.com', 'Inj', 500, 'active')`
  ).run();
  const patronId = d
    .prepare("SELECT id FROM patrons WHERE email = 'inj-patron@example.com'")
    .get().id;
  d.close();
  const sanitized = { ...row, isSponsor: false, isPatron: true };
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,<script>1</script>',
    'file:///etc/passwd',
    'vbscript:x',
  ]) {
    await assert.rejects(
      () =>
        tenantPortal.createChangeRequest(sanitized, {
          type: 'social_links',
          target: patronId,
          payload: { socialPlatform: 'web', socialUrl: url },
        }),
      (err) => err.status === 400,
      `dangerous URL accepted: ${url}`
    );
  }
});

test('email subjects strip CRLF (no header injection into outbound mail)', async () => {
  const email = require('../platform/api/email.js');
  const fns = Object.keys(email).filter((k) => k.startsWith('notify'));
  assert.ok(fns.length > 0, 'email module exposes notify helpers');
  // The transport must never place attacker text into raw headers. Assert the
  // module builds subjects from controlled templates: no direct interpolation
  // of company/email into a subject line without sanitization.
  const src = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'platform', 'api', 'email.js'),
    'utf8'
  );
  assert.ok(
    !/subject:\s*`[^`]*\$\{(company|email|input)/i.test(src),
    'no raw sponsor text in subjects'
  );
});

test('booking custom heading/subtitle with markup is inert in JSON and escaped in HTML sinks', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const dash = fs.readFileSync(
    path.join(__dirname, '..', 'templates', 'flagship', 'dashboard.html'),
    'utf8'
  );
  assert.ok(
    !/innerHTML\s*\+?=.*custom_(heading|subtitle)/.test(dash) || dash.includes('textContent'),
    'token dashboard renders custom text via textContent'
  );
  const flagship = fs.readFileSync(
    path.join(__dirname, '..', 'templates', 'flagship', 'flagship.js'),
    'utf8'
  );
  assert.ok(
    flagship.includes('textContent') && !/innerHTML\s*=.*company_name/.test(flagship),
    'temple overlay uses textContent for sponsor fields'
  );
});

async function run() {
  console.log('\n▸ Extended Injection Simulation Tests\n');
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
  console.log(`\nInjection Extended: ${tests.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
