/**
 * Connections page smoke tests
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

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

console.log('\n▸ Connections Page Tests\n');

test('connections/index.html exists', () => {
  assert.ok(fileExists('connections/index.html'), 'page must exist');
});

test('connections page includes D3 and required scripts', () => {
  const html = read('connections/index.html');
  assert.ok(html.includes('d3js.org/d3.v7.min.js'), 'must load D3 v7');
  assert.ok(html.includes('/js/connections.js'), 'must load connections.js');
  assert.ok(html.includes('/css/connections.css'), 'must load connections.css');
});

test('connections page has graph container and search', () => {
  const html = read('connections/index.html');
  assert.ok(html.includes('id="graph-svg"'), 'must have graph svg');
  assert.ok(html.includes('id="node-search"'), 'must have node search input');
  assert.ok(html.includes('id="detail-panel"'), 'must have detail panel');
  assert.ok(html.includes('id="domain-grid"'), 'must have domain grid');
});

test('connections page has domain selector', () => {
  const html = read('connections/index.html');
  assert.ok(html.includes('id="domain-drawer"'), 'must have domain drawer');
  assert.ok(html.includes('Choose a domain'), 'must prompt user to choose domain');
});

test('connections stage is hidden by default and drawer is visible', () => {
  const html = read('connections/index.html');
  assert.ok(html.includes('id="connections-stage"'), 'must have connections stage');
  assert.ok(html.includes('connections-stage is-hidden'), 'stage must be hidden initially');
  assert.ok(!html.includes('domain-drawer is-hidden'), 'drawer must be visible initially');
});

test('connections stage has a back button', () => {
  const html = read('connections/index.html');
  assert.ok(html.includes('id="stage-back"'), 'must have stage back button');
});

test('connections page links to global nav', () => {
  const html = read('connections/index.html');
  assert.ok(html.includes('href="/connections/"'), 'must self-link in nav');
  assert.ok(html.includes('href="/pantheon/"'), 'must link to pantheon');
  assert.ok(html.includes('href="/lexicon/"'), 'must link to lexicon');
});

test('connections.js exists', () => {
  assert.ok(fileExists('js/connections.js'), 'connections.js must exist');
});

test('connections.css exists', () => {
  assert.ok(fileExists('css/connections.css'), 'connections.css must exist');
});

test('similarities.json is generated and valid', () => {
  assert.ok(fileExists('platform/api/similarities.json'), 'similarities.json must exist');
  const data = JSON.parse(read('platform/api/similarities.json'));
  assert.ok(Array.isArray(data.nodes), 'must have nodes array');
  assert.ok(Array.isArray(data.edges), 'must have edges array');
  assert.ok(data.meta, 'must have meta object');
  assert.ok(
    data.meta.relationships && data.meta.relationships.length > 0,
    'must list relationships'
  );
});

console.log(`\n  ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
