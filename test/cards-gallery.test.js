/**
 * Mythic Cards gallery contract (/cards/).
 *
 * The collector surface must render the canonical FR1 set as TCG frames:
 * the page carries the chrome and renderer, the set itself keeps the
 * spec's rarity classes and art fields, and the renderer honors every
 * rarity/variant in the set.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SET = require('../game/cards.json');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the gallery page exists with canonical chrome and the renderer wired', () => {
  const html = read('cards/index.html');
  assert.ok(html.includes('<nav class="main-nav"'), 'canonical nav');
  assert.ok(html.includes('id="mobile-menu"'), 'mobile menu');
  assert.ok(html.includes('class="site-footer"'), 'footer');
  assert.ok(html.includes('/css/cards.css'), 'cards.css linked');
  assert.ok(html.includes('/cards/cards.js'), 'cards.js linked');
  assert.ok(html.includes('cards-grid'), 'grid present');
  assert.ok(html.includes('card-modal'), 'modal present');
});

test('the FR1 set honors the spec rarity classes and card frame fields', () => {
  assert.strictEqual(SET.set.id, 'first-restoration');
  assert.ok(SET.cards.length > 1000, 'full set present');
  const allowed = new Set(['legendary', 'mythic', 'rare', 'epic', 'uncommon', 'common']);
  for (const card of SET.cards) {
    assert.ok(allowed.has(card.rarity), `${card.id}: unknown rarity ${card.rarity}`);
    assert.ok(card.id && card.name && card.pantheon, `${card.id}: identity fields`);
    assert.ok(
      (card.art && (card.art.mascot || card.art.logomark)) || card.categoryIcon,
      `${card.id}: neither art nor a sigil fallback`
    );
    if (card.art && (card.art.mascot || card.art.logomark)) {
      assert.ok(card.art.colors?.primary, `${card.id}: brand art without colors`);
    }
    assert.ok(Number.isInteger(card.cost) && Number.isInteger(card.power), `${card.id}: stats`);
  }
  const legendaries = SET.cards.filter((c) => c.rarity === 'legendary');
  assert.strictEqual(legendaries.length, 287, 'the flagship fleet is exactly 287 legendaries');
  const foils = SET.cards.filter((c) => c.variant === 'original-script');
  assert.ok(foils.length > 200, 'chase foils present');
  assert.ok(
    foils.every((c) => c.rarity === 'mythic'),
    'every foil is mythic'
  );
});

test('the renderer honors every rarity and variant in the set', () => {
  const js = read('cards/cards.js');
  for (const r of ['legendary', 'mythic', 'rare', 'uncommon', 'common']) {
    assert.ok(js.includes(r), `renderer missing rarity ${r}`);
  }
  assert.ok(js.includes('original-script'), 'foil variant handled');
  assert.ok(js.includes('/game/cards.json'), 'renderer loads the canonical set');
  assert.ok(js.includes('applyFilters'), 'filter pipeline present');
  assert.ok(js.includes('openModal'), 'detail modal present');
  assert.ok(js.includes('/sites/'), 'temple cross-link present');
});

test('the gallery is server-rendered: 1,803 static frames + payload, no empty shell', () => {
  const html = read('cards/index.html');
  const frames = html.match(/class="mcard[ "]/g) || [];
  assert.strictEqual(frames.length, 1803, 'every card has a static frame in the raw HTML');
  assert.ok(!html.includes('Restoring the set…'), 'no client-only loading shell remains');
  assert.ok(html.includes('CARDS-GRID-START'), 'grid markers present for regeneration');
  const m = html.match(/window\.__CARDS_PAYLOAD = (\[[\s\S]*?\]);/);
  assert.ok(m, 'payload baked into the page');
  const payload = JSON.parse(m[1].replace(/\\u003c/g, '<'));
  assert.strictEqual(payload.length, 1803, 'payload carries the full set');
  assert.ok(html.includes('id="stat-total">1,803'), 'stat count server-filled');
  assert.ok(!html.includes('id="stat-total">—'), 'no placeholder dash in stats');
  const js = read('cards/cards.js');
  assert.ok(js.includes('window.__CARDS_PAYLOAD'), 'renderer uses the baked payload first');
  assert.ok(js.includes('/game/cards.json'), 'fetch fallback preserved');
});

test('the frame CSS carries the foil treatment and rarity gems', () => {
  const css = read('css/cards.css');
  assert.ok(css.includes('.mcard--foil'), 'foil treatment');
  assert.ok(css.includes('mgem--legendary'), 'legendary gem');
  assert.ok(css.includes('mgem--mythic'), 'mythic gem');
  assert.ok(css.includes('foil-sheen'), 'shimmer animation');
  assert.ok(css.includes('prefers-reduced-motion'), 'reduced-motion guard');
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
  console.log(`\nAll ${tests.length} cards gallery tests passed`);
})();
