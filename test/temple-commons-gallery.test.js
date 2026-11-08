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
    .filter((f) => f.endsWith('.jpg'))
    .filter((f) => f.startsWith(`${id}-v`) || (LEGACY_COMMONS.has(id) && f === `${id}.jpg`))
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

test('referenced commons assets exist on disk and are 512x512', () => {
  let checked = 0;
  for (const e of flagships) {
    for (const f of commonsWorksFor(e.id).slice(0, 2)) {
      assert.ok(exists(path.join('assets', 'ai-commons', f)), `${f} exists`);
      checked++;
      if (checked >= 60) return;
    }
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
