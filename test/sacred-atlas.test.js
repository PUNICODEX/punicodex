/**
 * Sacred Atlas contract (/world/sacred/).
 *
 * The dataset is the canonical spine: unique site ids, sane coordinates,
 * real lexicon deity links only, and sources on every site. The generated
 * page plots every site on the geometric map, renders every dossier for
 * server-readable SEO, and links every deity to its digital temple.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DATA = require('../data/sacred-sites.json');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('dataset: unique ids, sane coordinates, real deity links, sources', () => {
  const { LEXICON } = require('../type/js/lexicon.js');
  const ids = new Set(LEXICON.map((e) => e.id));
  const seen = new Set();
  for (const s of DATA.sites) {
    assert.ok(!seen.has(s.id), `duplicate site id ${s.id}`);
    seen.add(s.id);
    assert.ok(s.lat >= -90 && s.lat <= 90, `${s.id}: latitude sane`);
    assert.ok(s.lon >= -180 && s.lon <= 180, `${s.id}: longitude sane`);
    assert.ok(s.name && s.country && s.era && s.tradition, `${s.id}: core fields`);
    assert.ok(Array.isArray(s.sources) && s.sources.length >= 1, `${s.id}: at least one source`);
    assert.ok(Array.isArray(s.images), `${s.id}: images array present`);
    for (const d of s.deities) {
      assert.ok(ids.has(d.id), `${s.id}: deity link ${d.id} exists in the lexicon`);
      assert.ok(
        d.depiction && d.depiction.length > 20,
        `${s.id}: depiction for ${d.id} is substantive`
      );
    }
    if (!s.deities.length)
      assert.ok(s.deityNote, `${s.id}: unlinked sites must carry an honest note`);
  }
});

test('page: every site is plotted and dossiered', () => {
  const html = read('world/sacred/index.html');
  for (const s of DATA.sites) {
    assert.ok(html.includes(`data-site="${s.id}"`), `${s.id}: map marker`);
    assert.ok(html.includes(`id="site-${s.id}"`), `${s.id}: dossier`);
    for (const d of s.deities) {
      assert.ok(html.includes(`/${d.id}/`), `${s.id}: temple link for ${d.id}`);
    }
  }
});

test('page: canonical chrome, JSON-LD, and the interactive globe', () => {
  const html = read('world/sacred/index.html');
  assert.ok(
    html.includes('rel="canonical" href="https://punicodex.com/world/sacred/"'),
    'canonical'
  );
  assert.ok(html.includes('application/ld+json'), 'JSON-LD');
  assert.ok(html.includes('id="main-nav"'), 'canonical menu strip missing');
  assert.ok(html.includes('class="site-footer"'), 'canonical footer missing');
  assert.ok(html.includes('id="atx-globe"'), '3D globe canvas missing');
  assert.ok(html.includes('/js/sacred-globe.js'), 'globe engine missing');
  assert.ok(html.includes('data-globe-action="zoom-in"'), 'zoom controls missing');
  assert.ok(html.includes('Sacred Geography'), 'Sacred Geography label missing');
  assert.ok(html.includes('atx-filter'), 'tradition filter present');
});

test('the Atlas is reachable from STRATA and the ATLAS namespace', () => {
  const strata = read('pantheon/origins/index.html');
  assert.ok(strata.includes('/world/sacred/'), 'STRATA finale links the Sacred Atlas');
});

let failures = 0;
(async () => {
  for (const t of tests) {
    try {
      await t.fn();
      console.log(`✓ ${t.name}`);
    } catch (err) {
      failures++;
      console.error(`✗ ${t.name}\n  ${err.message}`);
    }
  }
  console.log(`${tests.length - failures}/${tests.length} passed`);
  process.exit(failures ? 1 : 0);
})();
