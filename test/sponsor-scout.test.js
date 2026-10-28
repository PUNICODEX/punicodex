#!/usr/bin/env node
/**
 * PuniCodex — sponsorship scouting tests.
 *
 * Covers:
 * - Seed integrity: every sponsor-seed temple is a real lexicon entry, every
 *   seat is one of the temple's pattern-map industries, (temple, domain)
 *   pairs are unique.
 * - Prospect store: lazy schema, idempotent upsert on (temple, domain),
 *   pitch lifecycle (markPitched throttles pending → contacted), status
 *   guards, code linking.
 * - Scoring engine: candidates with a matching seat outrank adjacent ones;
 *   temples without seats score zero.
 * - Admin endpoints: 401 without a portal token; list envelope; the
 *   preview-first pitch flow — preview renders the real email, provisions +
 *   links a founding code, but does NOT deliver, count, or change status;
 *   the send path delivers (mocked), counts, and reuses the SAME code on a
 *   second pitch; active/declined/3× guards block sends but never previews.
 */

const assert = require('node:assert');

process.env.ADMIN_PASSWORD = 'test-sponsor-scout-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb, getTestDbPath } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const Database = require('better-sqlite3');
const { invoke, adminHeader } = require('./helpers/http.js');

const loginHandler = require('../platform/api-handlers/admin/portal/login/index.js');
const sponsorsHandler = require('../platform/api-handlers/admin/portal/sponsors/index.js');
const pitchHandler = require('../platform/api-handlers/admin/portal/sponsors/[id]/pitch/index.js');
const prospects = require('../platform/db/business-prospects.js');
const { loadTemple, buildResonanceBullets } = require('../platform/api/pitch-email.js');
const SEED = require('../store/sponsor-seed.json');
const PATTERNS = require('../platform/api/industry-patterns.json');
const { LEXICON } = require('../type/js/lexicon.js');

function db() {
  return new Database(getTestDbPath(__filename));
}

let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `10.91.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
    process.exit(1);
  }
}

let superToken = null;
const TEST_TEMPLE = 'zeus';

async function runTests() {
  console.log('\n▸ Sponsor Scout Tests\n');

  // ── Seed integrity ───────────────────────────────────────────
  await test('seed: every temple is a lexicon entry with matching pattern seats', () => {
    const lexIds = new Set(LEXICON.map((e) => e.id));
    const seen = new Set();
    for (const s of SEED) {
      assert.ok(lexIds.has(s.temple), `unknown temple: ${s.temple}`);
      const key = `${s.temple}|${s.domain}`;
      assert.ok(!seen.has(key), `duplicate (temple, domain): ${key}`);
      seen.add(key);
      const seats = PATTERNS.byEntry?.[s.temple] || [];
      assert.ok(
        seats.some((x) => x.industry === s.seat),
        `${s.temple}: seat "${s.seat}" is not in the temple's pattern map`
      );
    }
  });

  await test('seed candidates resolve to temple descriptors and resonance bullets', () => {
    for (const s of SEED.slice(0, 12)) {
      const temple = loadTemple(s.temple);
      assert.ok(temple, `loadTemple(${s.temple})`);
      assert.ok(temple.unicode);
      const bullets = buildResonanceBullets(s.temple, s.business);
      assert.ok(bullets.length >= 1, `no resonance bullets for ${s.temple}`);
    }
  });

  // ── Prospect store ───────────────────────────────────────────
  await test('store: lazy schema, idempotent upsert on (temple, domain)', async () => {
    await prospects.deleteProspect(TEST_TEMPLE, 'example-scout-store.com');
    await prospects.upsertProspect({
      temple_id: TEST_TEMPLE,
      business_name: 'Scout Test Co',
      domain: 'example-scout-store.com',
      industry_seat: 'storm-forecasting',
      source: 'manual',
      score: 77,
      signals: ['test signal'],
    });
    await prospects.upsertProspect({
      temple_id: TEST_TEMPLE,
      business_name: 'Scout Test Co',
      domain: 'example-scout-store.com',
      industry_seat: 'storm-forecasting',
      source: 'manual',
      score: 99,
    });
    const rows = (await prospects.listProspects({ templeId: TEST_TEMPLE })).filter(
      (p) => p.domain === 'example-scout-store.com'
    );
    assert.strictEqual(rows.length, 1, 'upsert must not duplicate');
    assert.strictEqual(rows[0].score, 77, 'first write wins (INSERT OR IGNORE)');
    assert.strictEqual(rows[0].status, 'pending');
  });

  await test('store: markPitched lifecycle and linkCode', async () => {
    const row = (await prospects.listProspects({ templeId: TEST_TEMPLE })).find(
      (p) => p.domain === 'example-scout-store.com'
    );
    await prospects.markPitched(row.id);
    const after = (await prospects.listProspects({ templeId: TEST_TEMPLE })).find(
      (p) => p.domain === 'example-scout-store.com'
    );
    assert.strictEqual(after.pitch_count, 1);
    assert.strictEqual(after.status, 'contacted', 'pending → contacted on first pitch');

    await prospects.linkCode(row.id, 424242);
    const linked = (await prospects.listProspects({ templeId: TEST_TEMPLE })).find(
      (p) => p.domain === 'example-scout-store.com'
    );
    assert.strictEqual(linked.code_id, 424242);
    await prospects.linkCode(row.id, null);

    await prospects.setProspectStatus(row.id, 'pending');
    const reset = (await prospects.listProspects({ templeId: TEST_TEMPLE })).find(
      (p) => p.domain === 'example-scout-store.com'
    );
    assert.strictEqual(reset.status, 'pending');
  });

  // ── Scoring (via the scout script's pure functions) ──────────
  await test('scoring: seat match outranks adjacent categories; no seats → zero', async () => {
    const scout = require('../scripts/scout-temple-sponsors.js');
    assert.strictEqual(typeof scout.scoreCandidate, 'function');
    const seats = (PATTERNS.byEntry[TEST_TEMPLE] || []).slice(0, 5);
    const matched = scout.scoreCandidate({ seat: seats[0].industry, source: 'seed' }, seats);
    const adjacent = scout.scoreCandidate({ seat: 'unrelated-seat', source: 'seed' }, seats);
    assert.ok(matched.score > adjacent.score, 'seat match must outrank adjacent');
    assert.strictEqual(scout.scoreCandidate({ seat: seats[0].industry }, []).score, 0);
  });

  // ── Admin endpoints ──────────────────────────────────────────
  await test('setup: seed the handler-test prospect', async () => {
    await prospects.deleteProspect(TEST_TEMPLE, 'example-scout-handler.com');
    await prospects.upsertProspect({
      temple_id: TEST_TEMPLE,
      business_name: 'Scout Handler Co',
      domain: 'example-scout-handler.com',
      industry_seat: 'leadership',
      source: 'manual',
      score: 55,
      signals: ['handler test fixture'],
    });
  });

  await test('endpoints: 401 without a portal token', async () => {
    for (const [method, url, handler, opts] of [
      ['GET', '/api/admin/portal/sponsors/', sponsorsHandler, {}],
      [
        'POST',
        '/api/admin/portal/sponsors/1/pitch/',
        pitchHandler,
        { params: { id: '1' }, body: { to: 'a@b.com' } },
      ],
    ]) {
      const res = await invoke(handler, method, url, opts);
      assert.strictEqual(res.status, 401, `${method} ${url} → ${res.status}`);
    }
  });

  await test('setup: bootstrap superadmin portal token', async () => {
    const boot = await invoke(loginHandler, 'POST', '/api/admin/portal/login/', {
      headers: { 'x-forwarded-for': nextIp() },
      body: { email: 'admin@punicodex.com', password: process.env.ADMIN_PASSWORD },
    });
    assert.strictEqual(boot.status, 200, JSON.stringify(boot.body));
    superToken = boot.body.token;
  });

  await test('list: envelope carries items, byStatus, byTemple with temple labels', async () => {
    const res = await invoke(sponsorsHandler, 'GET', '/api/admin/portal/sponsors/', {
      headers: adminHeader(superToken),
    });
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.ok(Array.isArray(res.body.items));
    assert.strictEqual(res.body.total, res.body.items.length);
    assert.ok(res.body.byStatus && typeof res.body.byStatus === 'object');
    assert.ok(res.body.byTemple && typeof res.body.byTemple === 'object');
    const row = res.body.items.find((p) => p.domain === 'example-scout-handler.com');
    assert.ok(row, 'seeded prospect appears in the list');
    assert.ok(row.templeLabel, 'temple label resolved');
    assert.strictEqual(row.templeId, TEST_TEMPLE);
  });

  let prospectId = null;
  await test('pitch preview: renders the real email, provisions + links a code, changes nothing', async () => {
    const list = await invoke(sponsorsHandler, 'GET', '/api/admin/portal/sponsors/', {
      headers: adminHeader(superToken),
    });
    const row = list.body.items.find((p) => p.domain === 'example-scout-handler.com');
    prospectId = row.id;
    assert.ok(!row.codeId, 'no code linked before the first pitch');

    const res = await invoke(
      pitchHandler,
      'POST',
      `/api/admin/portal/sponsors/${prospectId}/pitch/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(prospectId) },
        body: {
          to: 'founder@scout-test.com',
          preview: true,
          offer: { kind: 'free_months', freeMonths: 2 },
        },
      }
    );
    assert.strictEqual(res.status, 200, JSON.stringify(res.body));
    assert.strictEqual(res.body.preview, true);
    assert.ok(res.body.html.includes('SCOUT-'), 'rendered email quotes the provisioned code');
    assert.match(res.body.subject, /private invitation|founding frame/i);

    // Nothing may move on a preview: no counter, no status change — but the
    // code IS provisioned and linked so the draft shows the truth.
    const after = (await prospects.listProspects({ templeId: TEST_TEMPLE })).find(
      (p) => p.domain === 'example-scout-handler.com'
    );
    assert.strictEqual(after.pitch_count, 0, 'preview must not count');
    assert.strictEqual(after.status, 'pending', 'preview must not change status');
    assert.ok(after.code_id, 'code is linked after provisioning');
  });

  await test('pitch send: mocked delivery, counts, reuses the SAME code on re-pitch', async () => {
    const send = await invoke(
      pitchHandler,
      'POST',
      `/api/admin/portal/sponsors/${prospectId}/pitch/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(prospectId) },
        body: {
          to: 'founder@scout-test.com',
          customNote: 'Your thunder-risk modelling is exactly the standard we cite.',
          offer: { kind: 'free_months', freeMonths: 2 },
        },
      }
    );
    assert.strictEqual(send.status, 200, JSON.stringify(send.body));
    assert.strictEqual(send.body.sent, true);
    assert.strictEqual(send.body.mocked, true, 'no RESEND_API_KEY → mocked send');

    const after = (await prospects.listProspects({ templeId: TEST_TEMPLE })).find(
      (p) => p.domain === 'example-scout-handler.com'
    );
    assert.strictEqual(after.pitch_count, 1);
    assert.strictEqual(after.status, 'contacted');

    // Second pitch (status contacted, count 1) must reuse the linked code —
    // the email must never quote two different codes to the same prospect.
    const codeId = after.code_id;
    const second = await invoke(
      pitchHandler,
      'POST',
      `/api/admin/portal/sponsors/${prospectId}/pitch/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(prospectId) },
        body: { to: 'founder@scout-test.com', preview: true },
      }
    );
    assert.strictEqual(second.status, 200, JSON.stringify(second.body));
    const again = (await prospects.listProspects({ templeId: TEST_TEMPLE })).find(
      (p) => p.domain === 'example-scout-handler.com'
    );
    assert.strictEqual(again.code_id, codeId, 'linked code is reused, not re-provisioned');
  });

  await test('pitch guards: active/declined/3× block sends but never previews', async () => {
    await prospects.setProspectStatus(prospectId, 'declined');
    const blocked = await invoke(
      pitchHandler,
      'POST',
      `/api/admin/portal/sponsors/${prospectId}/pitch/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(prospectId) },
        body: { to: 'founder@scout-test.com' },
      }
    );
    assert.strictEqual(blocked.status, 409, `declined send → ${blocked.status}`);

    const previewOk = await invoke(
      pitchHandler,
      'POST',
      `/api/admin/portal/sponsors/${prospectId}/pitch/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(prospectId) },
        body: { to: 'founder@scout-test.com', preview: true },
      }
    );
    assert.strictEqual(previewOk.status, 200, 'reading a draft is never throttled');

    await prospects.setProspectStatus(prospectId, 'pending');
  });

  await test('pitch validation: bad email and unknown prospect', async () => {
    const bad = await invoke(
      pitchHandler,
      'POST',
      `/api/admin/portal/sponsors/${prospectId}/pitch/`,
      {
        headers: adminHeader(superToken),
        params: { id: String(prospectId) },
        body: { to: 'not-an-email' },
      }
    );
    assert.strictEqual(bad.status, 400);

    const missing = await invoke(pitchHandler, 'POST', '/api/admin/portal/sponsors/999999/pitch/', {
      headers: adminHeader(superToken),
      params: { id: '999999' },
      body: { to: 'founder@scout-test.com', preview: true },
    });
    assert.strictEqual(missing.status, 404);
  });

  await test('cleanup', async () => {
    await prospects.deleteProspect(TEST_TEMPLE, 'example-scout-handler.com');
    const conn = db();
    const codeRows = conn.prepare(`SELECT id FROM discount_codes WHERE code LIKE 'SCOUT-%'`).all();
    for (const c of codeRows) {
      conn.prepare(`DELETE FROM discount_redemptions WHERE code_id = ?`).run(c.id);
      conn.prepare(`DELETE FROM discount_codes WHERE id = ?`).run(c.id);
    }
    conn.close();
    console.log(`    removed ${codeRows.length} scout test code(s)`);
  });

  console.log('');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
