/**
 * Pitch Email Tests — founding-sponsorship pitch emails from discount codes.
 *
 * Covers:
 * - Template: offer headline/sentence math for every discount kind; the full
 *   email carries the code, temple, business, CTAs, terms, and custom note.
 * - loadTemple / loadPatternBullets / buildResonanceBullets: canonical temple
 *   resolution and pattern/lore-driven resonance bullets.
 * - Endpoint: 401 without a portal token; 400 on missing/invalid recipient,
 *   missing business name, applies_to=all codes, and dead codes (expired,
 *   inactive, exhausted — a dead code must never be emailed); 404 unknown
 *   code; 502 when delivery fails; happy path renders + "sends" (mocked
 *   without RESEND_API_KEY) with the temple and business in the subject.
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-pitch-email-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.PLATFORM_URL = 'https://punicodex.com';
delete process.env.RESEND_API_KEY;

const { prepareTestDb } = require('./helpers/test-db.js');
const testDb = prepareTestDb(__filename);

{
  const Database = require('better-sqlite3');
  const tmpDb = new Database(testDb);
  require('../platform/db/migrate-discount-codes.js').migrate(tmpDb);
  tmpDb.close();
}

const { invoke, adminHeader } = require('./helpers/http.js');

// Capture sendEmail at the module boundary before the pitch handler loads
// (same require.cache injection discount-codes.test.js uses for stripe): the
// delivery-failure test flips emailDeliveryFails, every other test delegates
// to the real console mock (RESEND_API_KEY is deleted above).
const emailModulePath = require.resolve('../platform/api/email.js');
const realEmail = require(emailModulePath);
const emailCalls = [];
let emailDeliveryFails = false;
require.cache[emailModulePath].exports = {
  ...realEmail,
  sendEmail: async (payload) => {
    emailCalls.push(payload);
    if (emailDeliveryFails) return { success: false, error: 'resend delivery refused (stub)' };
    return realEmail.sendEmail(payload);
  },
};

const {
  buildPitchEmail,
  buildResonanceBullets,
  loadTemple,
  loadPatternBullets,
  offerHeadline,
  offerSentence,
} = require('../platform/api/pitch-email.js');
const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const discountsHandler = require('../platform/api-handlers/admin/portal/discounts/index.js');
const pitchHandler = require('../platform/api-handlers/admin/portal/discounts/[id]/pitch/index.js');

let ipSeed = 0;
function nextIp() {
  ipSeed += 1;
  return `10.117.${Math.floor(ipSeed / 255)}.${ipSeed % 255}`;
}

const codeRow = {
  code: 'FATHERFEATHER',
  kind: 'percent_off',
  percent: 100,
  applies_to: 'quetzalcoatl',
};

async function run() {
  // ── Template: offer math ─────────────────────────────────────
  await test('offer headlines and sentences track the discount kind', () => {
    assert.strictEqual(offerHeadline({ kind: 'percent_off', percent: 100 }), 'COMPLIMENTARY PLACEMENT');
    assert.strictEqual(offerHeadline({ kind: 'percent_off', percent: 25 }), '25% OFF');
    assert.strictEqual(offerHeadline({ kind: 'fixed_off', fixed_cents: 5000 }), '$50 OFF');
    assert.strictEqual(offerHeadline({ kind: 'free_months', free_months: 3 }), '3 MONTHS — COMPLIMENTARY');
    assert.strictEqual(
      offerHeadline({ kind: 'free_months_then_price', free_months: 6, then_price_cents: 15000 }),
      '6 MONTHS FREE — THEN $150/MO'
    );
    assert.match(offerSentence({ kind: 'percent_off', percent: 100 }), /reduces the full term/);
    assert.match(
      offerSentence({ kind: 'free_months_then_price', free_months: 6, then_price_cents: 15000 }),
      /then holds your rate at \$150\/month/
    );
  });

  // ── Temple + patterns resolution ─────────────────────────────
  await test('loadTemple resolves canonical data; unknown slugs return null', () => {
    const temple = loadTemple('quetzalcoatl');
    assert.strictEqual(temple.unicode, 'Quetzalcōātl');
    assert.strictEqual(temple.tierLabel, 'TIER 1');
    assert.strictEqual(loadTemple('not-a-temple'), null);
  });

  await test('loadPatternBullets produces resonance bullets from the pattern map', () => {
    const bullets = loadPatternBullets('quetzalcoatl', 'Feather Exchange');
    assert.ok(bullets.length >= 1, 'expected at least one bullet');
    assert.match(bullets[0].why, /Feather Exchange/);
    assert.match(bullets[0].why, /Industry Patterns/);
  });

  await test('buildResonanceBullets: a lore-backed temple returns 3-5 clean bullets', () => {
    const bullets = buildResonanceBullets('quetzalcoatl', 'Feather Exchange');
    assert.ok(
      bullets.length >= 3 && bullets.length <= 5,
      `expected 3-5 bullets, got ${bullets.length}`
    );
    for (const b of bullets) {
      assert.ok(!/<[a-z][^>]*>/i.test(b.lead), `HTML tag in lead: ${b.lead}`);
      assert.ok(!/<[a-z][^>]*>/i.test(b.why), `HTML tag in why: ${b.why.slice(0, 60)}`);
      assert.match(b.why, /^[\p{L}\p{N}]/u, `leading quote debris in why: ${b.why.slice(0, 40)}`);
      assert.ok(b.why.length <= 500, `why over 500 chars (${b.why.length})`);
    }
  });

  await test('buildResonanceBullets: a temple with no lore falls back to the lexicon meaning', () => {
    // tethys has no lore-catalog entry and no industry-pattern seats, so the
    // only possible bullet is the lexicon-meaning fallback.
    const bullets = buildResonanceBullets('tethys', 'Acme Corp');
    assert.strictEqual(bullets.length, 1);
    assert.strictEqual(bullets[0].lead, 'The archetype itself.');
    assert.ok(bullets[0].why.includes('Tēthys'), 'fallback carries the Unicode name');
    assert.ok(bullets[0].why.includes('Grandmother'), 'fallback carries the lexicon meaning');
    assert.ok(bullets[0].why.includes('Acme Corp'), 'fallback carries the business name');
    assert.ok(bullets[0].why.length <= 500, `why over 500 chars (${bullets[0].why.length})`);
  });

  // ── Full template render ─────────────────────────────────────
  await test('the email carries the code, temple, business, CTAs, terms, and custom note', () => {
    const temple = loadTemple('quetzalcoatl');
    const patterns = loadPatternBullets('quetzalcoatl', 'Feather Exchange');
    const { subject, html, text } = buildPitchEmail({
      codeRow,
      temple,
      businessName: 'Feather Exchange',
      recipientSite: 'featherexchange.com',
      customNote: 'Your grading eye is the reason this temple exists.',
      patterns,
    });
    assert.match(subject, /Quetzalcōātl/);
    assert.match(subject, /Feather Exchange/);
    for (const needle of [
      'FATHERFEATHER',
      'QUETZALCŌĀTL',
      'Feather Exchange',
      'featherexchange.com',
      'COMPLIMENTARY PLACEMENT',
      'https://punicodex.com/sites/quetzalcoatl/',
      'https://punicodex.com/sites/quetzalcoatl/patterns/',
      'https://punicodex.com/terms/advertising/',
      'Martin Khoury',
      'Your grading eye is the reason this temple exists.',
      'No credit card. No payment details.',
    ]) {
      assert.ok(html.includes(needle), `email missing: ${needle}`);
    }
    assert.ok(text.includes('FATHERFEATHER'), 'plain-text part carries the code');
    // Injection safety: business input is escaped.
    const evil = buildPitchEmail({
      codeRow,
      temple,
      businessName: '<script>alert(1)</script>',
      patterns: [],
    });
    assert.ok(!evil.html.includes('<script>alert'), 'business name is escaped');
  });

  // ── Endpoint: auth + validation ──────────────────────────────
  let superToken = null;
  let codeId = null;

  await test('setup: bootstrap superadmin portal token and a temple-scoped code', async () => {
    const boot = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
      headers: { 'x-forwarded-for': nextIp() },
      body: { email: 'admin@punicodex.com', password: process.env.ADMIN_PASSWORD },
    });
    assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
    superToken = boot.body.token;

    const created = await invoke(discountsHandler, 'POST', '/api/admin/portal/discounts/', {
      headers: adminHeader(superToken),
      body: { code: 'PITCHTEST100', kind: 'percent_off', percent: 100, appliesTo: 'quetzalcoatl', maxUses: 1 },
    });
    assert.strictEqual(created.status, 201, JSON.stringify(created.body));
    codeId = created.body.id;
  });

  await test('pitch endpoint: 401 without a portal token', async () => {
    const res = await invoke(pitchHandler, 'POST', `/api/admin/portal/discounts/${codeId}/pitch/`, {
      params: { id: String(codeId) },
      body: { to: 'team@featherexchange.com', businessName: 'Feather Exchange' },
    });
    assert.strictEqual(res.status, 401);
  });

  await test('pitch endpoint: 400 on invalid recipient and missing business name', async () => {
    const badEmail = await invoke(pitchHandler, 'POST', `/api/admin/portal/discounts/${codeId}/pitch/`, {
      headers: adminHeader(superToken),
      params: { id: String(codeId) },
      body: { to: 'not-an-email', businessName: 'Feather Exchange' },
    });
    assert.strictEqual(badEmail.status, 400);
    const noName = await invoke(pitchHandler, 'POST', `/api/admin/portal/discounts/${codeId}/pitch/`, {
      headers: adminHeader(superToken),
      params: { id: String(codeId) },
      body: { to: 'team@featherexchange.com' },
    });
    assert.strictEqual(noName.status, 400);
  });

  await test('pitch endpoint: 404 unknown code; 400 for all-temple codes', async () => {
    const missing = await invoke(pitchHandler, 'POST', '/api/admin/portal/discounts/99999/pitch/', {
      headers: adminHeader(superToken),
      params: { id: '99999' },
      body: { to: 'team@featherexchange.com', businessName: 'Feather Exchange' },
    });
    assert.strictEqual(missing.status, 404);

    const allCode = await invoke(discountsHandler, 'POST', '/api/admin/portal/discounts/', {
      headers: adminHeader(superToken),
      body: { code: 'GLOBAL25', kind: 'percent_off', percent: 25, appliesTo: 'all' },
    });
    assert.strictEqual(allCode.status, 201, JSON.stringify(allCode.body));
    const res = await invoke(
      pitchHandler,
      'POST',
      `/api/admin/portal/discounts/${allCode.body.id}/pitch/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(allCode.body.id) },
        body: { to: 'team@featherexchange.com', businessName: 'Feather Exchange' },
      }
    );
    assert.strictEqual(res.status, 400, JSON.stringify(res.body));
  });

  await test('pitch endpoint: happy path renders and sends (mocked without RESEND_API_KEY)', async () => {
    const res = await invoke(pitchHandler, 'POST', `/api/admin/portal/discounts/${codeId}/pitch/`, {
      headers: adminHeader(superToken),
      params: { id: String(codeId) },
      body: {
        to: 'team@featherexchange.com',
        businessName: 'Feather Exchange',
        recipientSite: 'featherexchange.com',
        customNote: 'Your grading eye is the reason this temple exists.',
      },
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.sent, true);
    assert.strictEqual(res.body.mocked, true);
    assert.match(res.body.subject, /Quetzalcōātl/);
    assert.match(res.body.subject, /Feather Exchange/);
  });

  // ── Endpoint: a dead code must never be emailed ──────────────
  await test('pitch endpoint: 400 for expired, inactive, and exhausted codes; nothing is emailed', async () => {
    const Database = require('better-sqlite3');
    const cases = [
      {
        code: 'PITCHEXPIRED100',
        mutate: 'SET expires_at = ?',
        params: [new Date(Date.now() - 60 * 1000).toISOString()],
        error: /expired/,
      },
      { code: 'PITCHINACTIVE100', mutate: 'SET active = 0', params: [], error: /inactive/ },
      {
        code: 'PITCHEXHAUSTED100',
        mutate: 'SET max_uses = 1, used_count = 1',
        params: [],
        error: /no uses remaining/,
      },
    ];
    for (const c of cases) {
      const created = await invoke(discountsHandler, 'POST', '/api/admin/portal/discounts/', {
        headers: adminHeader(superToken),
        body: {
          code: c.code,
          kind: 'percent_off',
          percent: 100,
          appliesTo: 'quetzalcoatl',
        },
      });
      assert.strictEqual(created.status, 201, JSON.stringify(created.body));
      const conn = new Database(testDb);
      conn.prepare(`UPDATE discount_codes ${c.mutate} WHERE id = ?`).run(...c.params, created.body.id);
      conn.close();

      const callsBefore = emailCalls.length;
      const res = await invoke(
        pitchHandler,
        'POST',
        `/api/admin/portal/discounts/${created.body.id}/pitch/`,
        {
          headers: adminHeader(superToken),
          params: { id: String(created.body.id) },
          body: { to: 'team@featherexchange.com', businessName: 'Feather Exchange' },
        }
      );
      assert.strictEqual(res.status, 400, `${c.code}: ${JSON.stringify(res.body)}`);
      assert.match(res.body.error, c.error, `${c.code}: error message`);
      assert.strictEqual(
        emailCalls.length,
        callsBefore,
        `${c.code}: a dead code must never reach sendEmail`
      );
    }
  });

  await test('pitch endpoint: 502 when email delivery fails', async () => {
    emailDeliveryFails = true;
    try {
      const res = await invoke(pitchHandler, 'POST', `/api/admin/portal/discounts/${codeId}/pitch/`, {
        headers: adminHeader(superToken),
        params: { id: String(codeId) },
        body: { to: 'team@featherexchange.com', businessName: 'Feather Exchange' },
      });
      assert.strictEqual(res.status, 502, JSON.stringify(res.body));
      assert.strictEqual(res.body.error, 'Email delivery failed');
    } finally {
      emailDeliveryFails = false;
    }
  });
}

function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ✓ ${name}`))
    .catch((err) => {
      console.error(`  ✗ ${name}`);
      console.error(err);
      process.exitCode = 1;
      throw err;
    });
}

run()
  .then(() => {
    if (process.exitCode !== 1) console.log('\n✓ All pitch email tests passed');
  })
  .catch(() => {
    console.error('\n✗ Some pitch email tests failed');
    process.exit(1);
  });
