/**
 * Stale Counter Tests
 *
 * Fleet counters appear in many hand-edited pages beyond the home page.
 * This suite pins the contract that scripts/sync-stale-counters.js (part of
 * npm run generate) keeps them in sync with canonical sources.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function loadStats() {
  const { ARCHETYPES } = require('../js/archetypes-v2.js');
  const { LEXICON } = require('../type/js/lexicon.js');
  const OWNED = require('../platform/db/owned-domains.json');
  const temples = ARCHETYPES.filter((a) => a.built).length;
  const entries = LEXICON.length;
  const pantheons = new Set(LEXICON.map((e) => e.pantheon)).size;
  const domains = (OWNED.domains || OWNED).length;
  const baseTemples = entries - temples;
  return { temples, entries, pantheons, domains, baseTemples };
}

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('canonical stats are sane', () => {
  const { temples, entries, pantheons, domains } = loadStats();
  assert.ok(temples >= 200, 'temples sane');
  assert.ok(entries >= 800, 'entries sane');
  assert.ok(pantheons >= 20, 'pantheons sane');
  assert.ok(domains >= 200, 'domains sane');
});

test('pantheon page carries current flagship count', () => {
  const { temples } = loadStats();
  const html = read('pantheon/index.html');
  assert.ok(
    html.includes(`${temples} flagship temples`),
    `pantheon OG must say ${temples} flagship temples`
  );
  assert.ok(
    html.includes(`${temples} restored flagships`),
    `pantheon summary must say ${temples} restored flagships`
  );
});

test('about/founder page carries current counts', () => {
  const { temples, entries } = loadStats();
  const html = read('about/founder/index.html');
  assert.ok(
    html.includes(`${temples} flagship temples`),
    `founder page must say ${temples} flagship temples`
  );
  assert.ok(
    html.includes(`${temples} of them built out as flagships`),
    `founder page must say ${temples} built out as flagships`
  );
  assert.ok(
    html.includes(`${entries} restorations across`),
    `founder page must say ${entries} restorations`
  );
});

test('herald page carries current fleet counts', () => {
  const { temples, entries, pantheons, domains } = loadStats();
  const html = read('herald/index.html');
  assert.ok(
    html.includes(
      `${entries} lexicon entries. ${temples} flagship temples. ${pantheons} pantheons. ${domains} domains owned`
    ),
    `herald must list current fleet counts`
  );
});

test('cards page carries current flagship count', () => {
  const { temples } = loadStats();
  const html = read('cards/index.html');
  assert.ok(
    html.includes(`${temples} flagship temples`),
    `cards meta must say ${temples} flagship temples`
  );
});

test('codex/building-the-temple carries current counts', () => {
  const { temples, entries, baseTemples } = loadStats();
  const html = read('codex/building-the-temple/index.html');
  assert.ok(html.includes(`all ${entries} names`), `must say all ${entries} names`);
  assert.ok(
    html.includes(`generating ${baseTemples} base temples`),
    `must say ${baseTemples} base temples`
  );
  assert.ok(html.includes(`hand-expanding ${temples} flagships`), `must say ${temples} flagships`);
});

test('no known stale fleet counters remain in customer-facing pages', () => {
  const files = [
    'index.html',
    'pantheon/index.html',
    'about/index.html',
    'about/founder/index.html',
    'herald/index.html',
    'cards/index.html',
    'codex/building-the-temple/index.html',
    'oracle/index.html',
    'rulebook/index.html',
    'lexicon/index.html',
    'scholars/index.html',
  ];
  const stale = [
    '271 digital temples',
    '282 flagship temples',
    '397 flagship temples',
    '399 flagship temples',
    '680 base temples',
    '235 flagships',
    '927 lexicon entries',
    '926 restorations',
    '927 temples built',
  ];
  for (const file of files) {
    const html = read(file);
    for (const s of stale) {
      assert.ok(!html.includes(s), `${file} still contains stale counter "${s}"`);
    }
  }
});

test('sync-stale-counters.js is registered in npm run generate', () => {
  const gen = read('scripts/generate.js');
  assert.ok(gen.includes('sync-stale-counters.js'), 'sync-stale-counters not in generate chain');
});

async function run() {
  console.log('\n▸ Stale Counter Tests\n');
  let failed = 0;
  for (const [name, fn] of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nStale Counter Tests: ${tests.length - failed} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}

run();
