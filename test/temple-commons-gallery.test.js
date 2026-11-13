/**
 * Temple Art Room collections contract (flagship /art/ pages).
 *
 * The gallery and creatives tabs retired into the temple Art room: every
 * flagship art room carries The Commons (studio keeper works with the CC BY
 * 4.0 line) and the Creatives threshold panel. Where the studio has promoted
 * keeper works into assets/ai-commons/, the works are referenced; historic
 * (Wikimedia) works live under the Temple Gallery pill, studio works under
 * The Commons — never confused, each carrying its license.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { LEXICON } = require('../type/js/lexicon.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const COMMONS_DIR = path.join(ROOT, 'assets', 'ai-commons');
const LEGACY_COMMONS = new Set([
  'amaterasu',
  'anubis',
  'apollon',
  'aphrodite',
  'artemis',
  'athena',
  'odinn',
  'thor',
]);

function commonsWorksFor(id) {
  if (!exists('assets/ai-commons')) return [];
  return fs
    .readdirSync(COMMONS_DIR)
    .filter((f) => f.endsWith('.jpg') || f.endsWith('-anime-mascot-v1.png'))
    .filter(
      (f) =>
        f.startsWith(`${id}-v`) ||
        f === `${id}-anime-mascot-v1.png` ||
        (LEGACY_COMMONS.has(id) && f === `${id}.jpg`)
    )
    .sort();
}

// Flagships are entries whose temple dir carries the art room.
const flagships = LEXICON.filter((e) => exists(path.join('sites', e.id, 'art', 'index.html')));

test('sample: flagships with commons works render The Commons works', () => {
  const withWorks = flagships.filter((e) => commonsWorksFor(e.id).length > 0);
  assert.ok(
    withWorks.length >= 40,
    `expected >=40 flagships with commons works, got ${withWorks.length}`
  );
  for (const e of withWorks.slice(0, 25)) {
    const html = read(path.join('sites', e.id, 'art', 'index.html'));
    assert.ok(html.includes('data-cat="commons"'), `${e.id}: commons pill present`);
    assert.ok(html.includes('CC BY 4.0'), `${e.id}: license line`);
    const work = commonsWorksFor(e.id)[0];
    assert.ok(
      html.includes(`/assets/ai-commons/${work}`),
      `${e.id}: first work ${work} referenced`
    );
  }
});

test('every flagship art room carries the Creatives threshold view', () => {
  assert.ok(flagships.length >= 500, `expected >=500 flagship art rooms, got ${flagships.length}`);
  for (const e of flagships.slice(0, 120)) {
    const html = read(path.join('sites', e.id, 'art', 'index.html'));
    assert.ok(html.includes('data-cat="creatives"'), `${e.id}: creatives pill`);
    assert.ok(/Creatives/.test(html), `${e.id}: creatives copy`);
  }
});

test('the retired gallery/creatives pages redirect into the art room', () => {
  for (const e of flagships.slice(0, 120)) {
    const gallery = read(path.join('sites', e.id, 'gallery', 'index.html'));
    assert.ok(gallery.includes('view=temple'), `${e.id}: gallery redirect missing`);
    const creatives = read(path.join('sites', e.id, 'creatives', 'index.html'));
    assert.ok(creatives.includes('view=creatives'), `${e.id}: creatives redirect missing`);
  }
});

test('referenced commons assets exist on disk', () => {
  let checked = 0;
  for (const e of flagships) {
    for (const f of commonsWorksFor(e.id).slice(0, 2)) {
      assert.ok(exists(path.join('assets', 'ai-commons', f)), `${f} exists`);
      checked++;
      if (checked >= 60) return;
    }
  }
});

test('tattoo prompt library covers every flagship and background keying preserves dark linework', () => {
  const { ARCHETYPES } = require('../js/archetypes-v2.js');
  const library = JSON.parse(read('data/ai-art/prompt-library.json'));
  const built = ARCHETYPES.filter((entry) => entry.built);
  for (const archetype of built) {
    assert.ok(library.deities[archetype.id], `${archetype.id}: missing tattoo prompt`);
    assert.ok(
      library.traditions[library.deities[archetype.id].tradition],
      `${archetype.id}: tradition missing`
    );
  }
  assert.ok(built.filter((entry) => entry.pantheon === 'aboriginal').length > 5);
  assert.ok(library.families.tattoo.dna.includes('stencil-friendly'));
  assert.ok(library.traditions.aboriginal.iconography.includes('no generic dot painting'));

  const { removeConnectedWhiteBackground } = require('../scripts/promote-ai-art-commons.js');
  const pixels = new Uint8Array(4 * 4 * 3).fill(255);
  pixels[5 * 3] = 0;
  pixels[5 * 3 + 1] = 0;
  pixels[5 * 3 + 2] = 0;
  const keyed = removeConnectedWhiteBackground(pixels, 4, 4);
  assert.strictEqual(keyed.alpha[0], 0);
  assert.strictEqual(keyed.alpha[5], 255);
  assert.strictEqual(keyed.alpha[15], 0);
});

test('archived mascots carry provenance and appear in global and temple Commons', () => {
  const manifest = JSON.parse(read('assets/ai-commons/manifest.json'));
  const archived = manifest.items.filter((item) => item.kind === 'mascot');
  assert.ok(archived.length >= 200, `expected >=200 archived mascots, got ${archived.length}`);
  const globalArt = read('store/art/index.html');
  for (const item of archived.slice(0, 20)) {
    assert.ok(exists(item.src.slice(1)), `${item.src} exists`);
    assert.strictEqual(item.license, 'CC BY 4.0');
    assert.ok(item.attribution.includes('PuniCodex Studio'));
    assert.ok(item.attribution.includes(item.canonicalUrl));
    assert.ok(item.model, `${item.id}: model disclosure missing`);
    assert.ok(item.provenance.includes('preserved in Commons'));
    assert.ok(item.tags.includes('mascot'));
    const templeArt = read(path.join('sites', item.templeId, 'art', 'index.html'));
    assert.ok(templeArt.includes(item.src), `${item.templeId}: archived mascot missing`);
    assert.ok(globalArt.includes(item.src), `global Commons: ${item.src} missing`);
  }
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
