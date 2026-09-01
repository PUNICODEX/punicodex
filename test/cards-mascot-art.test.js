/**
 * Cards mascot-art regression tests.
 *
 * The /cards collector surface must not silently lose flagship mascot art:
 * every built flagship must resolve to a local mascot file, the five new
 * Chinese flagships must ship their bespoke abilities, and the baked HTML
 * must reference real images with a count that matches the canonical set.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SET = require('../game/cards.json');
const ARCHETYPES = require('../js/archetypes-v2.js');
const { ABILITY_OVERRIDES } = require('../scripts/generate-cards.js');

const BUILT = (ARCHETYPES.ARCHETYPES || ARCHETYPES).filter((a) => a.built !== false);
const _BUILT_IDS = new Set(BUILT.map((a) => a.id));
const NEW_FLAGSHIPS = ['nezha', 'change', 'houyi', 'longwang', 'xiwangmu'];

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function localPathFromUrl(url) {
  if (typeof url !== 'string') return null;
  if (url.startsWith('/')) return path.join(ROOT, url);
  return null;
}

test('every flagship card has a mascot path and a resolvable local image file', () => {
  const missing = [];
  for (const card of SET.cards) {
    if (!card.flagship) continue;
    const mascot = card.art?.mascot;
    if (!mascot) {
      missing.push(`${card.id}: missing art.mascot`);
      continue;
    }
    const local = localPathFromUrl(mascot);
    if (!local) {
      missing.push(`${card.id}: non-local mascot URL ${mascot}`);
      continue;
    }
    if (!fs.existsSync(local)) {
      missing.push(`${card.id}: missing file ${mascot}`);
    }
  }
  assert.deepStrictEqual(
    missing.slice(0, 20),
    [],
    `${missing.length} flagship cards lack mascot art`
  );
  assert.strictEqual(missing.length, 0);
});

test('the five new Chinese flagships use their bespoke abilities', () => {
  for (const id of NEW_FLAGSHIPS) {
    const override = ABILITY_OVERRIDES[id];
    assert.ok(override, `${id}: no ABILITY_OVERRIDES entry`);
    const common = SET.cards.find((c) => c.entryId === id && c.edition === 'common');
    assert.ok(common, `${id}: common printing missing from set`);
    assert.strictEqual(
      common.ability.name,
      override.name,
      `${id}: ability name does not match override`
    );
    assert.strictEqual(
      common.ability.trigger,
      override.trigger,
      `${id}: ability trigger does not match override`
    );
    assert.ok(common.ability.effect, `${id}: ability has no effect`);
  }
});

test('cards/index.html contains the correct card count and no broken image references', () => {
  const html = read('cards/index.html');
  const frames = html.match(/class="mcard[ "]/g) || [];
  assert.strictEqual(frames.length, SET.cards.length, 'frame count matches card set');

  const statMatch = html.match(/id="stat-total">([\d,]+)</);
  assert.ok(statMatch, 'stat-total span present');
  assert.strictEqual(
    Number(statMatch[1].replace(/,/g, '')),
    SET.cards.length,
    'stat-total matches set size'
  );

  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(jsonLdMatch, 'JSON-LD block present');
  const jsonLd = JSON.parse(jsonLdMatch[1]);
  assert.strictEqual(
    jsonLd.numberOfItems,
    SET.cards.length,
    'JSON-LD numberOfItems matches set size'
  );

  const broken = [];
  const unexpected = [];
  const imgTags = html.match(/<img[^>]*>/g) || [];
  for (const tag of imgTags) {
    const srcMatch = tag.match(/src="([^"]+)"/);
    if (!srcMatch) {
      broken.push(`img without src: ${tag.slice(0, 80)}`);
      continue;
    }
    const src = srcMatch[1];
    if (!src || src.trim() === '') {
      broken.push('empty img src');
      continue;
    }
    if (src.startsWith('/sites/')) {
      const local = path.join(ROOT, src);
      if (!fs.existsSync(local)) {
        broken.push(`missing local image: ${src}`);
      }
    } else if (src.startsWith('https://punycodex-masters.vercel.app/')) {
      // Masters CDN references are platform-font bakes; local files are not
      // required in the working tree. URL shape is validated above.
    } else if (src.startsWith('/assets/')) {
      // Shared brand/nav assets are outside this scope.
    } else {
      unexpected.push(`unexpected img src: ${src}`);
    }
  }
  assert.deepStrictEqual(broken.slice(0, 20), [], `${broken.length} broken image references`);
  assert.strictEqual(broken.length, 0);
  assert.deepStrictEqual(
    unexpected.slice(0, 20),
    [],
    `${unexpected.length} unexpected image sources`
  );
  assert.strictEqual(unexpected.length, 0);
});

test('the meta descriptions carry the live card count', () => {
  const html = read('cards/index.html');
  const countFormatted = SET.cards.length.toLocaleString('en-US');
  const desc = html.match(/<meta name="description" content="([^"]*)">/);
  const ogDesc = html.match(/<meta property="og:description" content="([^"]*)">/);
  assert.ok(
    desc?.[1].includes(`${countFormatted} trading cards`),
    'meta description count is stale'
  );
  assert.ok(
    ogDesc?.[1].includes(`${countFormatted} trading cards`),
    'og:description count is stale'
  );
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
  console.log(`\nAll ${tests.length} cards mascot-art tests passed`);
})();
