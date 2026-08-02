/**
 * JSON-LD metadata tests — every temple's structured data parses, carries the
 * required entity fields, the per-temple OG card, and defensible sameAs links.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require('../type/js/lexicon.js');
const { wikidataUrlFor } = require('../scripts/lib/wikidata-links.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

function jsonldOf(file) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, `no JSON-LD block in ${path.relative(ROOT, file)}`);
  return JSON.parse(m[1]);
}

const SAMPLE = ['zeus', 'baiame', 'atlas', 'rhea', 'kanaloa', 'odinn', 'kartikeya'];

function run() {
  console.log('\n▸ JSON-LD Metadata\n');

  test('sample temples have valid, complete JSON-LD', () => {
    for (const id of SAMPLE) {
      const file = path.join(ROOT, 'sites', id, 'index.html');
      if (!fs.existsSync(file)) continue;
      const j = jsonldOf(file);
      assert.strictEqual(j['@type'], 'WebPage', `${id} @type`);
      assert.ok(j.name && j.description && j.url, `${id} core fields`);
      assert.strictEqual(j.about?.['@type'], 'Thing', `${id} about`);
      assert.ok(
        Array.isArray(j.about.alternateName) && j.about.alternateName.length >= 2,
        `${id} alternateName`
      );
      const parts = Array.isArray(j.isPartOf) ? j.isPartOf : [j.isPartOf];
      assert.ok(
        parts.some((p) => p['@type'] === 'WebSite'),
        `${id} isPartOf WebSite`
      );
      assert.ok(
        parts.some((p) => p['@type'] === 'Collection'),
        `${id} isPartOf Collection (${JSON.stringify(parts.map((p) => p['@type']))})`
      );
      assert.ok(
        j.primaryImageOfPage?.url?.endsWith(`/assets/og/${id}.jpg`),
        `${id} primaryImageOfPage -> OG card (got ${j.primaryImageOfPage?.url})`
      );
    }
  });

  test('sameAs links, when present, are well-formed wikidata URLs and filtered', () => {
    let withLinks = 0;
    for (const e of LEXICON) {
      const url = wikidataUrlFor(e.id);
      if (!url) continue;
      withLinks++;
      assert.ok(
        /^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/.test(url),
        `${e.id}: malformed sameAs ${url}`
      );
    }
    assert.ok(withLinks >= 30, `expected 30+ defensible sameAs links, got ${withLinks}`);
    // The known bad matches must never pass the filter.
    assert.strictEqual(
      wikidataUrlFor('apollon'),
      null,
      'apollon naval-vessel mismatch must be filtered'
    );
  });

  test('og:image meta tags point at the per-temple card on sample pages', () => {
    for (const id of SAMPLE) {
      const file = path.join(ROOT, 'sites', id, 'index.html');
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, 'utf8');
      assert.ok(
        html.includes(`og:image" content="https://punicodex.com/assets/og/${id}.jpg`),
        `${id} og:image`
      );
      assert.ok(html.includes('og:image:width" content="1200"'), `${id} og:width`);
    }
  });

  test('OG card files exist for every lexicon entry', () => {
    const missing = LEXICON.filter(
      (e) => !fs.existsSync(path.join(ROOT, 'assets', 'og', `${e.id}.jpg`))
    ).map((e) => e.id);
    assert.deepStrictEqual(missing.slice(0, 8), [], `${missing.length} missing OG cards`);
  });

  console.log(`\nJSON-LD Metadata: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
