/**
 * STRATA page contract (/pantheon/origins/).
 *
 * The excavation renders every canonical stratum from
 * data/pantheon-strata.json as a server-readable scene, newest at the
 * surface scrolling down to the Dreamtime bedrock; every being chip links a
 * real temple; the syncretism fault-lines and the core sample close the
 * page; Station II's pantheons rectangle enters here.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DATA = require('../data/pantheon-strata.json');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('every canonical stratum renders a scene with its name', () => {
  const html = read('pantheon/origins/index.html');
  for (const l of DATA.layers) {
    assert.ok(html.includes(`id="stratum-${l.order}"`), `${l.pantheon}: scene present`);
    assert.ok(html.includes(l.name), `${l.pantheon}: name present`);
    assert.ok(html.includes(l.eraLabel), `${l.pantheon}: era present`);
    assert.ok(html.includes(l.attestation.slice(0, 40)), `${l.pantheon}: attestation present`);
    assert.ok(html.includes(l.scriptNote.slice(0, 20)), `${l.pantheon}: script note present`);
    for (const s of l.survivals.slice(0, 1)) {
      assert.ok(html.includes(s.slice(0, 24)), `${l.pantheon}: survivals present`);
    }
  }
});

test('every being chip links a real temple; every stratum links its pantheon', () => {
  const html = read('pantheon/origins/index.html');
  const { LEXICON } = require('../type/js/lexicon.js');
  const ids = new Set(LEXICON.map((e) => e.id));
  for (const l of DATA.layers) {
    for (const b of l.beings) {
      assert.ok(ids.has(b), `${l.pantheon}: being ${b} exists in the lexicon`);
      assert.ok(html.includes(`/sites/${b}/`), `${l.pantheon}: chip link for ${b}`);
    }
  }
});

test('surface, fault-lines, core sample, and finale are present', () => {
  const html = read('pantheon/origins/index.html');
  assert.ok(html.includes('id="surface"'), 'surface hero');
  assert.ok(html.includes('id="core"'), 'core finale');
  assert.ok(html.includes('stx-fault'), 'syncretism fault-lines rendered');
  assert.ok(html.includes('stx-core-band'), 'core sample bands rendered');
  assert.ok(html.includes('/pantheon/'), 'CTA into the full pantheon');
  assert.ok(html.includes('application/ld+json'), 'JSON-LD');
  assert.ok(
    html.includes('rel="canonical" href="https://punicodex.com/pantheon/origins/"'),
    'canonical'
  );
  const faults = (html.match(/class="stx-fault"/g) || []).length;
  assert.ok(faults >= 20, `expected >=20 fault-lines, got ${faults}`);
});

test('station II pantheons rectangle enters the excavation', () => {
  const html = read('index.html');
  const block = html.match(/href="\/pantheon\/origins\/"[^]*?Pantheons[^]*?<\/a>/);
  assert.ok(block, 'the 25-pantheons rectangle points at /pantheon/origins/');
});

test('all 25 pantheons are covered exactly once', () => {
  const seen = DATA.layers.map((l) => l.pantheon);
  assert.strictEqual(seen.length, 25);
  assert.strictEqual(new Set(seen).size, 25);
  assert.ok(
    DATA.layers.every((l, i) => l.order === i + 1),
    'orders are monotonic'
  );
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
