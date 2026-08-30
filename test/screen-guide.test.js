/**
 * PuniCodex — Screen Guide Tests
 *
 * Guards the movie/screen guide hub at /screen/index.html and the per-production
 * detail pages at /screen/{id}/index.html. Also verifies that screen appearances
 * are rendered on the extended-lore pages of the entries referenced by each
 * production.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { LEXICON } = require('../type/js/lexicon.js');
const { PANTHEON_META } = require('../type/js/pantheon-meta.js');
const { ARCHETYPES } = require('../js/archetypes-v2.js');

const SCREEN_INDEX = JSON.parse(
  fs.readFileSync(path.join(root, 'data', 'screen-index.json'), 'utf8')
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
const pantheonIds = new Set(Object.keys(PANTHEON_META));
const builtFlagshipIds = new Set(
  (ARCHETYPES || []).filter((a) => a.built === true).map((a) => a.id)
);
const productions = SCREEN_INDEX.productions || [];

console.log('\n▸ Screen Guide\n');

test('screen-index has productions', () => {
  assert.ok(productions.length > 0, 'no productions in screen-index');
});

test('every production references valid pantheons', () => {
  const bad = [];
  for (const p of productions) {
    for (const pid of p.pantheons || []) {
      if (!pantheonIds.has(pid)) bad.push(`${p.id} → ${pid}`);
    }
  }
  assert.deepStrictEqual(bad, [], 'unknown pantheons referenced');
});

test('every production references valid lexicon entries', () => {
  const bad = [];
  for (const p of productions) {
    for (const eid of p.entries || []) {
      if (!lexiconIds.has(eid)) bad.push(`${p.id} → ${eid}`);
    }
  }
  assert.deepStrictEqual(bad, [], 'unknown entries referenced');
});

test('screen hub page exists with canonical chrome', () => {
  const hubPath = path.join(root, 'screen', 'index.html');
  assert.ok(fs.existsSync(hubPath), 'screen hub missing');
  const html = read('screen/index.html');
  assert.ok(html.includes('<nav'), 'hub missing <nav>');
  assert.ok(html.includes('<footer'), 'hub missing <footer>');
  assert.ok(html.includes('<script type="application/ld+json">'), 'hub missing JSON-LD');
  assert.ok(html.includes('property="og:title"'), 'hub missing og:title');
  assert.ok(html.includes('property="og:description"'), 'hub missing og:description');
  assert.ok(html.includes('property="og:image"'), 'hub missing og:image');
  assert.ok(html.includes('BreadcrumbList'), 'hub missing breadcrumb JSON-LD');
});

test('screen hub lists every production', () => {
  const html = read('screen/index.html');
  for (const p of productions) {
    assert.ok(html.includes(`/screen/${p.id}/`), `hub missing link to /screen/${p.id}/`);
  }
});

for (const p of productions) {
  const detailPath = path.join('screen', p.id, 'index.html');
  const fullDetailPath = path.join(root, detailPath);

  if (!fs.existsSync(fullDetailPath)) {
    skip(`${p.id} detail page`, `missing ${detailPath}`);
    continue;
  }

  test(`${p.id} detail page has canonical chrome`, () => {
    const html = read(detailPath);
    assert.ok(html.includes('<nav'), `${detailPath}: <nav> missing`);
    assert.ok(html.includes('<footer'), `${detailPath}: <footer> missing`);
    assert.ok(
      html.includes('<script type="application/ld+json">'),
      `${detailPath}: JSON-LD missing`
    );
    assert.ok(
      html.includes('"@type": "Movie"') ||
        html.includes('"@type": "TVSeries"') ||
        html.includes('"@type": "VideoGame"'),
      `${detailPath}: schema type missing`
    );
    assert.ok(html.includes('property="og:title"'), `${detailPath}: og:title missing`);
    assert.ok(html.includes('property="og:description"'), `${detailPath}: og:description missing`);
    assert.ok(html.includes('property="og:image"'), `${detailPath}: og:image missing`);
  });

  test(`${p.id} detail page links back to hub`, () => {
    const html = read(detailPath);
    assert.ok(html.includes('href="/screen/"'), `${detailPath}: missing link back to /screen/`);
  });

  test(`${p.id} detail page links to each referenced temple`, () => {
    const html = read(detailPath);
    for (const eid of p.entries || []) {
      assert.ok(html.includes(`/${eid}/`), `${detailPath}: missing link to temple /${eid}/`);
    }
  });
}

test('screen appearances section appears on relevant flagship extended-lore pages', () => {
  const seen = new Map();
  for (const p of productions) {
    for (const eid of p.entries || []) {
      if (builtFlagshipIds.has(eid)) {
        seen.set(eid, (seen.get(eid) || 0) + 1);
      }
    }
  }

  const missing = [];
  for (const eid of seen.keys()) {
    const extPath = path.join('sites', eid, 'lore', 'extended', 'index.html');
    const fullPath = path.join(root, extPath);
    if (!fs.existsSync(fullPath)) {
      missing.push(`${extPath} (not generated)`);
      continue;
    }
    const html = read(extPath);
    if (!html.includes('id="screen-appearances"')) {
      missing.push(`${extPath}: no #screen-appearances section`);
    }
  }
  assert.deepStrictEqual(missing, [], 'flagship extended-lore pages missing screen appearances');
});

console.log(`\nScreen Guide: ${passed} passed, ${failed} failed, ${skipped} skipped`);
if (failed > 0) process.exit(1);
