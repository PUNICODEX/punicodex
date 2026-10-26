/**
 * Store Configurator data contract tests
 *
 * Guards the products.json extensions the Reliquary PDP configurator is
 * data-driven from: artworks (choosable transparent arts, >=3 for apparel),
 * colors (derived from printfulVariants, hex via the Printful color table —
 * unknown names are hex-null neutral swatches, never failures), and placement
 * (garment-overlay geometry for apparel kinds, null for object kinds).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CATALOG = require('../store/products.json');
const { COLOR_HEX, hexForColor, isColorWord } = require('../scripts/printful-color-table.js');
// Catalog color_code index (authoritative hex where present).
const BASE_INDEX = (() => {
  try {
    return require('../store/base-colors.json');
  } catch {
    return {};
  }
})();

const APPAREL_KINDS = new Set(['tee', 'hoodie', 'crewneck']);
// Finish/decor names that are legitimately not in the color table (they are
// not fabric colors). Everything else in the catalog must resolve a hex.
const NULL_HEX_ALLOWLIST = new Set(['Glossy', 'Dotted']);

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function kindOf(p) {
  return p.id.split('-').pop();
}

test('products.json parses and the count matches the product array', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'store', 'products.json'), 'utf8'));
  assert.strictEqual(raw.count, 7132, `expected 7132 products, got ${raw.count}`);
  assert.strictEqual(raw.products.length, raw.count, 'products.length !== count');
  assert.strictEqual(CATALOG.products.length, raw.count);
});

test('every product carries artworks with key, label, and src', () => {
  for (const p of CATALOG.products) {
    assert.ok(Array.isArray(p.artworks), `${p.id}: artworks missing`);
    assert.ok(p.artworks.length >= 1, `${p.id}: no artworks`);
    if (APPAREL_KINDS.has(kindOf(p))) {
      assert.ok(
        p.artworks.length >= 3,
        `${p.id}: apparel product has ${p.artworks.length} artworks`
      );
    }
    const keys = new Set();
    for (const art of p.artworks) {
      assert.ok(art.key && typeof art.key === 'string', `${p.id}: artwork without key`);
      assert.ok(
        art.label && typeof art.label === 'string',
        `${p.id}: artwork ${art.key} without label`
      );
      assert.ok(
        typeof art.src === 'string' && art.src.length > 0,
        `${p.id}: artwork ${art.key} without src`
      );
      assert.ok(
        !art.key.startsWith('comp'),
        `${p.id}: composite master ${art.key} is not choosable art`
      );
      assert.ok(!keys.has(art.key), `${p.id}: duplicate artwork key ${art.key}`);
      keys.add(art.key);
    }
  }
});

test('artwork srcs resolve to real assets (deployed path or masters host)', () => {
  for (const p of CATALOG.products.slice(0, 200)) {
    for (const art of p.artworks) {
      if (art.src.startsWith('/')) {
        const onDisk =
          fs.existsSync(path.join(ROOT, art.src.replace(/^\//, '').replace(/\.webp$/, '.png'))) ||
          fs.existsSync(path.join(ROOT, art.src.replace(/^\//, '')));
        assert.ok(onDisk, `${p.id}: artwork src missing on disk: ${art.src}`);
      } else {
        assert.ok(
          art.src.startsWith('https://punycodex-masters.vercel.app/'),
          `${p.id}: artwork src not a known host: ${art.src}`
        );
      }
    }
  }
});

test('colors derive from printfulVariants and known names carry a hex', () => {
  for (const p of CATALOG.products) {
    assert.ok(Array.isArray(p.colors), `${p.id}: colors missing`);
    const expected = new Set();
    for (const label of Object.keys(p.printfulVariants || {})) {
      if (label.includes(' / ')) expected.add(label.split(' / ')[0]);
      else if (isColorWord(label)) expected.add(label);
    }
    const names = p.colors.map((c) => c.name);
    assert.deepStrictEqual(
      names.slice().sort(),
      [...expected].sort(),
      `${p.id}: colors do not match the variant color dimension`
    );
    for (const c of p.colors) {
      assert.strictEqual(typeof c.name, 'string', `${p.id}: color without name`);
      // The catalog color_code (store/base-colors.json) is authoritative when
      // the color is indexed there; the hand table is the fallback.
      const base = BASE_INDEX[p.id.split('-').pop()] || [];
      const indexed = base.find((b) => b.name === c.name);
      if (indexed) {
        assert.strictEqual(c.hex, indexed.hex, `${p.id}: ${c.name} hex mismatch vs base index`);
      } else if (hexForColor(c.name) !== null) {
        assert.strictEqual(c.hex, hexForColor(c.name), `${p.id}: ${c.name} hex mismatch`);
      } else {
        assert.strictEqual(c.hex, null, `${p.id}: ${c.name} should be hex null`);
        assert.ok(NULL_HEX_ALLOWLIST.has(c.name), `${p.id}: unexpected unknown color "${c.name}"`);
      }
    }
  }
});

test('placement is garment geometry for every kind (universal overlay)', () => {
  // Every kind previews art composited on a blank product photo, so every
  // kind carries placement geometry (per-kind art policies decide WHICH
  // arts are offered — that is a separate test below).
  for (const p of CATALOG.products) {
    const pl = p.placement;
    assert.ok(pl && typeof pl === 'object', `${p.id}: kind missing placement`);
    assert.ok(pl.widthPct > 5 && pl.widthPct < 80, `${p.id}: widthPct ${pl.widthPct} out of range`);
    assert.ok(pl.topPct > 5 && pl.topPct < 70, `${p.id}: topPct ${pl.topPct} out of range`);
    assert.ok(pl.leftPct >= 20 && pl.leftPct <= 80, `${p.id}: leftPct ${pl.leftPct} out of range`);
  }
});

test('per-kind artwork policies: canvas/phonecase mascot-only, pin logomark-only, notebook/sticker single design', () => {
  for (const p of CATALOG.products) {
    if (!p.temple) continue; // house line keeps its own art set
    const kind = kindOf(p);
    const keys = p.artworks.map((a) => a.key);
    if (kind === 'canvas' || kind === 'phonecase') {
      assert.deepStrictEqual(keys, ['mascot'], `${p.id}: ${kind} must offer the mascot only`);
    } else if (kind === 'pin') {
      assert.deepStrictEqual(keys, ['logomark'], `${p.id}: pin must offer the logomark only`);
    } else if (kind === 'notebook' || kind === 'sticker') {
      assert.deepStrictEqual(keys, ['design'], `${p.id}: ${kind} must be a single design`);
      assert.ok(
        keys[0] === 'design' && p.artworks[0].src.includes('_comp'),
        `${p.id}: design must be the composite master`
      );
    } else if (
      ['tee', 'hoodie', 'crewneck', 'cap', 'tote', 'mug', 'tumbler', 'print'].includes(kind)
    ) {
      assert.deepStrictEqual(
        keys,
        ['mascot', 'logomark', 'logolockup'],
        `${p.id}: ${kind} offers the three temple arts`
      );
    }
  }
});

test('the required Printful color table entries all resolve (incl. spelling variants)', () => {
  const required = [
    'Black',
    'White',
    'Navy',
    'Royal',
    'Red',
    'Heather Grey',
    'Heather Gray',
    'Charcoal',
    'Forest Green',
    'Maroon',
    'Gold',
    'Yellow',
    'Purple',
    'Orange',
    'Pink',
    'Light Blue',
    'Sports Grey',
    'Sport Grey',
    'Sports Gray',
    'Dark Heather',
    'Military Green',
    'Sand',
    'Ash',
    'Cardinal',
  ];
  for (const name of required) {
    assert.ok(hexForColor(name) !== null, `required color "${name}" has no hex entry`);
    assert.match(hexForColor(name), /^#[0-9a-f]{6}$/i, `bad hex for "${name}"`);
  }
  // Grey/gray and sport/sports spellings alias to a single canonical entry.
  assert.strictEqual(hexForColor('Heather Gray'), hexForColor('Heather Grey'));
  assert.strictEqual(hexForColor('Sport Grey'), hexForColor('Sports Grey'));
  assert.strictEqual(hexForColor('Sports Gray'), hexForColor('Sports Grey'));
  // Canonical table keys stay normalized and distinct.
  for (const key of Object.keys(COLOR_HEX)) {
    assert.strictEqual(key, key.toLowerCase(), `table key "${key}" is not normalized`);
  }
});

async function run() {
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
      console.error(
        `    ${String(err.message || err)
          .split('\n')
          .slice(0, 6)
          .join('\n    ')}`
      );
    }
  }
  console.log(`\nStore Configurator Data: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
