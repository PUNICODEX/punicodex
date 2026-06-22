/**
 * Frontend Smoke Tests
 *
 * Lightweight checks that the main public pages and type tool are wired
 * correctly and reference the canonical lexicon engine.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nFrontend Smoke: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const root = path.join(__dirname, '..');

function readHtml(...parts) {
  return fs.readFileSync(path.join(root, ...parts), 'utf8');
}

test('home page exists and references main styles', () => {
  const html = readHtml('index.html');
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('css/main.css') || html.includes('css/home'));
});

test('type tool page loads the lexicon and engine', () => {
  const html = readHtml('type/index.html');
  assert.ok(html.includes('js/lexicon.js'), 'type tool should load lexicon');
  assert.ok(html.includes('js/engine.js'), 'type tool should load engine');
});

test('lexicon browse page exists and loads lexicon data', () => {
  const html = readHtml('lexicon/index.html');
  assert.ok(html.includes('js/lexicon.js') || html.includes('renderer/lexicon.json'));
});

test('tiers page exists and references tier data', () => {
  const html = readHtml('tiers/index.html');
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('tiers') || html.includes('Tier'));
});

test('public search page exists and references search scripts', () => {
  const html = readHtml('search.html');
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('search'));
});

test('art marketplace page exists and loads marketplace scripts', () => {
  const html = readHtml('art/index.html');
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('art-marketplace-data.js'));
  assert.ok(html.includes('art/art.js'));
});

test('card game page exists and loads game scripts', () => {
  const html = readHtml('game/index.html');
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('card-game-data.js'));
  assert.ok(html.includes('game/game.js'));
});

test('authenticity checker page exists and loads script', () => {
  const html = readHtml('authenticity/index.html');
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('script.js'));
  assert.ok(html.includes('data-api-endpoint="/api/v2/authenticity/check"'));
});

run();
