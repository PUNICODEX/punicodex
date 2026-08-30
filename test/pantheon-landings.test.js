/**
 * PuniCodex — Pantheon Landing Page Tests
 *
 * Guards the per-pantheon overview pages generated at /{pantheon}/index.html.
 * Because the generator may not have run yet, missing pages are skipped with a
 * warning rather than failing the suite. Strict assertions apply to pages that
 * are present on disk.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { PANTHEON_META } = require('../type/js/pantheon-meta.js');
const { LEXICON } = require('../type/js/lexicon.js');
const { ARCHETYPES } = require('../js/archetypes-v2.js');

const TEXT_REGISTRY = JSON.parse(
  fs.readFileSync(path.join(root, 'platform', 'texts', 'registry.json'), 'utf8')
);

let passed = 0;
let failed = 0;
let skipped = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message.split('\n').slice(0, 8).join('\n    ')}`);
  }
}

function skip(name, reason) {
  skipped++;
  console.log(`  ⊘ ${name} (${reason})`);
}

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');

const lexiconIds = new Set(LEXICON.map((e) => e.id));
const builtFlagshipIds = new Set(ARCHETYPES.filter((a) => a.built === true).map((a) => a.id));
const textIds = new Set(TEXT_REGISTRY.texts.map((t) => t.id));

const pantheonIds = Object.keys(PANTHEON_META);

console.log('\n▸ Pantheon Landing Pages\n');

test('every pantheon text id is registered', () => {
  const missing = [];
  for (const id of pantheonIds) {
    const meta = PANTHEON_META[id];
    for (const textId of meta.texts || []) {
      if (!textIds.has(textId)) {
        missing.push(`${id} → ${textId}`);
      }
    }
  }
  assert.deepStrictEqual(missing, [], 'text ids not in registry');
});

test('every featured id exists in the lexicon', () => {
  const missing = [];
  for (const id of pantheonIds) {
    const meta = PANTHEON_META[id];
    for (const featuredId of meta.featured || []) {
      if (!lexiconIds.has(featuredId)) {
        missing.push(`${id} → ${featuredId}`);
      }
    }
  }
  assert.deepStrictEqual(missing, [], 'featured ids not in lexicon');
});

test('every pantheon has at least one featured built flagship', () => {
  const empty = [];
  for (const id of pantheonIds) {
    const meta = PANTHEON_META[id];
    const featured = meta.featured || [];
    const resolved = featured.filter((fid) => builtFlagshipIds.has(fid));
    if (resolved.length === 0) {
      empty.push(id);
    }
  }
  assert.deepStrictEqual(empty, [], 'pantheons with no built flagship features');
});

for (const id of pantheonIds) {
  const meta = PANTHEON_META[id];
  const pagePath = path.join(id, 'index.html');
  const fullPath = path.join(root, pagePath);

  if (!fs.existsSync(fullPath)) {
    skip(`${id} landing page`, `missing ${pagePath}`);
    continue;
  }

  test(`${id} landing page has canonical chrome`, () => {
    const html = read(pagePath);
    assert.ok(html.includes('<nav'), `${pagePath}: <nav> missing`);
    assert.ok(html.includes('<footer'), `${pagePath}: <footer> missing`);
    assert.ok(html.includes('<script type="application/ld+json">'), `${pagePath}: JSON-LD missing`);
    assert.ok(html.includes('property="og:title"'), `${pagePath}: og:title missing`);
    assert.ok(html.includes('property="og:description"'), `${pagePath}: og:description missing`);
    assert.ok(html.includes('property="og:image"'), `${pagePath}: og:image missing`);
    assert.ok(
      html.includes('<canvas class="pc-fx-pantheon"'),
      `${pagePath}: pantheon canvas missing`
    );
  });

  test(`${id} landing page title contains pantheon label and "Pantheon"`, () => {
    const html = read(pagePath);
    const titleMatch = html.match(/<title>([^<]*)<\/title>/);
    assert.ok(titleMatch, `${pagePath}: <title> missing`);
    const title = titleMatch[1];
    assert.ok(
      title.includes(meta.label),
      `${pagePath}: title "${title}" missing label "${meta.label}"`
    );
    assert.ok(title.includes('Pantheon'), `${pagePath}: title "${title}" missing "Pantheon"`);
  });

  test(`${id} landing page links back to /pantheon/`, () => {
    const html = read(pagePath);
    assert.ok(html.includes('href="/pantheon/"'), `${pagePath}: missing link back to /pantheon/`);
  });

  test(`${id} landing page texts are registered`, () => {
    for (const textId of meta.texts || []) {
      assert.ok(textIds.has(textId), `${pagePath}: text ${textId} not in registry`);
    }
  });

  test(`${id} landing page features resolve`, () => {
    const featured = meta.featured || [];
    assert.ok(featured.length > 0, `${pagePath}: no featured ids`);
    let resolved = 0;
    for (const featuredId of featured) {
      assert.ok(lexiconIds.has(featuredId), `${pagePath}: featured ${featuredId} not in lexicon`);
      if (builtFlagshipIds.has(featuredId)) {
        resolved++;
      } else {
        console.warn(`    ⚠ ${pagePath}: ${featuredId} is in lexicon but not a built flagship`);
      }
    }
    assert.ok(resolved > 0, `${pagePath}: none of the featured ids resolve to built flagships`);
  });
}

console.log(`\nPantheon Landing Pages: ${passed} passed, ${failed} failed, ${skipped} skipped`);
if (failed > 0) process.exit(1);
