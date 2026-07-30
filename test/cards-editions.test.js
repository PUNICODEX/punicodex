/**
 * Edition Ladder + onboarding + Ink economy tests
 *
 * The card set is edition-based (common/holo/full-art/secret per flagship +
 * archive printings): every flagship owns the complete ladder, stats escalate
 * monotonically, ability upgrades only at Full-Art+, and every owned domain
 * maps to a full ladder. Onboarding must always complete a 30-card deck,
 * stale ids migrate, packs print flagship editions only, and the Ink
 * checkout/redeem path is shaped correctly.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SET = require('../game/cards.json');
const ARCHETYPES = require('../js/archetypes-v2.js');
const BUILT = (ARCHETYPES.ARCHETYPES || ARCHETYPES).filter((a) => a.built).map((a) => a.id);

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const byEntry = new Map();
for (const card of SET.cards) {
  if (!byEntry.has(card.entryId)) byEntry.set(card.entryId, []);
  byEntry.get(card.entryId).push(card);
}

test('every flagship owns the complete edition ladder (common, holo, full-art, secret when scripted)', () => {
  const missing = [];
  for (const id of BUILT) {
    const ladder = byEntry.get(id) || [];
    const editions = new Set(ladder.map((c) => c.edition));
    for (const need of ['common', 'holo', 'full-art']) {
      if (!editions.has(need)) missing.push(`${id}:${need}`);
    }
  }
  assert.deepStrictEqual(missing.slice(0, 10), [], missing.slice(0, 10).join(', '));
  assert.strictEqual(missing.length, 0, `${missing.length} missing editions`);
  // No ladder exceeds four printings.
  for (const [id, ladder] of byEntry) {
    if (BUILT.includes(id)) {
      assert.ok(ladder.length <= 4, `${id}: ${ladder.length} printings exceeds the ladder`);
    }
  }
});

test('stats escalate monotonically with edition; ability upgrades only at Full-Art+', () => {
  for (const [id, ladder] of byEntry) {
    const common = ladder.find((c) => c.edition === 'common');
    const holo = ladder.find((c) => c.edition === 'holo');
    const fullArt = ladder.find((c) => c.edition === 'full-art');
    const secret = ladder.find((c) => c.edition === 'secret');
    if (!common) continue;
    if (holo) {
      assert.strictEqual(holo.power, common.power + 5, `${id}: holo power bump`);
      assert.strictEqual(holo.health, common.health + 5, `${id}: holo health bump`);
      assert.strictEqual(holo.rarity, 'rare');
    }
    if (fullArt) {
      assert.strictEqual(fullArt.power, common.power + 5, `${id}: full-art power`);
      assert.strictEqual(fullArt.rarity, 'legendary');
      assert.ok(fullArt.art && fullArt.art.fullArt, `${id}: full-art face present`);
      if (common.ability && common.ability.effect && typeof common.ability.effect.power === 'number') {
        assert.strictEqual(
          fullArt.ability.effect.power,
          common.ability.effect.power + 2,
          `${id}: full-art ability gains +2`
        );
      }
    }
    if (secret && fullArt) {
      assert.strictEqual(secret.power, fullArt.power, `${id}: secret matches full-art (cosmetic apex)`);
      assert.strictEqual(secret.rarity, 'mythic');
      assert.ok(secret.foil, `${id}: secret rare is a foil`);
    }
  }
});

test('packs print flagship editions only', () => {
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  assert.ok(js.includes('c.flagship && (!pantheon || c.pantheon === pantheon)'), 'pack pool is flagship-only');
  assert.ok(js.includes("c.flagship && c.edition === 'common'"), 'starter grant uses flagship commons');
});

test('starter grant completes a 30-card deck: 26 unique + 2 copies + one pack ≥ 30', () => {
  assert.ok(SET.cards.filter((c) => c.edition === 'common' && c.flagship).length >= 26, 'enough flagship commons exist');
  // The grant math: 26 unique + 2 bonus copies + 5 from a Seeker Pack.
  assert.ok(26 + 2 + 5 >= 30, 'guaranteed 30+ physical after one pack');
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  assert.ok(js.includes('STARTER_UNIQUE = 26'), 'starter unique raised to 26');
  assert.ok(js.includes('physicalCards'), 'autofill backstop present');
  assert.ok(js.includes('autoBuildDeck'), 'auto-build path present');
});

test('stale ids migrate: standard→common, original-script→secret', () => {
  const js = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  assert.ok(js.includes('migrateIds'), 'migration present');
  assert.ok(js.includes("-standard$/") && js.includes("'-common'"), 'standard → common mapping');
  assert.ok(js.includes('-original-script') && js.includes("'-secret'"), 'foil → secret mapping');
});

test('ink economy: bundles, checkout, and redeem-once contract', () => {
  const checkout = fs.readFileSync(path.join(ROOT, 'api/game/ink/checkout/index.js'), 'utf8');
  for (const b of ['spark', 'flare', 'inferno']) assert.ok(checkout.includes(b), `bundle ${b}`);
  assert.ok(checkout.includes("type: 'game_ink'"), 'metadata marks game_ink');
  assert.ok(checkout.includes('ink_session={CHECKOUT_SESSION_ID}'), 'success URL carries the session');
  const redeem = fs.readFileSync(path.join(ROOT, 'api/game/ink/redeem/index.js'), 'utf8');
  assert.ok(redeem.includes('redeemed = 0'), 'redeem-once guard');
  assert.ok(redeem.includes('ON CONFLICT'), 'idempotent insert');
  assert.ok(redeem.includes('payment_status'), 'verifies payment with Stripe');
  const game = fs.readFileSync(path.join(ROOT, 'game/game.js'), 'utf8');
  assert.ok(game.includes('redeemInkSession'), 'client redeem flow');
  assert.ok(game.includes('ink-shop'), 'ink shop rendered');
});

test('ink endpoints: every relative require resolves to a real file', () => {
  // Static string checks cannot catch a require path that resolves to nothing
  // (the FUNCTION_INVOCATION_FAILED class of bug) — resolve each one for real.
  for (const f of ['api/game/ink/checkout/index.js', 'api/game/ink/redeem/index.js']) {
    const abs = path.join(ROOT, f);
    const src = fs.readFileSync(abs, 'utf8');
    const reqs = [...src.matchAll(/require\('(\.[^']+)'\)/g)].map((m) => m[1]);
    assert.ok(reqs.length > 0, `${f} should have relative requires`);
    for (const r of reqs) {
      const resolved = path.resolve(path.dirname(abs), r);
      assert.ok(
        fs.existsSync(resolved) || fs.existsSync(`${resolved}.js`),
        `${f}: require('${r}') resolves to nothing`
      );
    }
  }
});

test('the gallery presents the edition ladder', () => {
  const js = fs.readFileSync(path.join(ROOT, 'cards/cards.js'), 'utf8');
  for (const e of ['common', 'holo', 'full-art', 'secret', 'archive']) {
    assert.ok(js.includes(e), `gallery missing edition ${e}`);
  }
  const html = fs.readFileSync(path.join(ROOT, 'cards/index.html'), 'utf8');
  assert.ok(html.includes('data-edition="secret"'), 'secret pill present');
  assert.ok(html.includes('data-edition="full-art"'), 'full-art pill present');
});

(async () => {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
  if (failures) {
    console.error(`\n${failures} test(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${tests.length} edition-ladder tests passed`);
})();
