/**
 * Codex Export Regression Tests
 *
 * Ensures the Codex Atlas data files stay in sync with the canonical
 * lexicon and that the Codex page exposes all new sections.
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
  console.log(`\nCodex Export: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const root = path.join(__dirname, '..');
const readJson = (...parts) => JSON.parse(fs.readFileSync(path.join(root, ...parts), 'utf8'));
const readHtml = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

test('codex-lexicon.json exists and has entries', () => {
  const data = readJson('codex', 'data', 'codex-lexicon.json');
  assert.ok(Array.isArray(data.entries), 'entries should be an array');
  assert.ok(
    data.entries.length >= 800,
    `expected at least 800 entries, got ${data.entries.length}`
  );
  assert.ok(data.stats && data.stats.totalEntries > 0, 'stats.totalEntries should be present');
});

test('codex-lexicon.json includes enriched fields', () => {
  const data = readJson('codex', 'data', 'codex-lexicon.json');
  const sample = data.entries.find((e) => e.id === 'zeus');
  assert.ok(sample, 'zeus entry should exist');
  assert.ok(sample.lore, 'zeus should have lore');
  assert.ok(sample.etymology, 'zeus should have etymology');
  assert.ok(sample.originalScript, 'zeus should have originalScript');
  assert.ok(sample.availability, 'zeus should have availability');
});

test('original-scripts.json exists and has provenance', () => {
  const data = readJson('codex', 'data', 'original-scripts.json');
  assert.ok(Array.isArray(data.atlas), 'atlas should be an array');
  assert.ok(
    data.atlas.length >= 300,
    `expected at least 300 script entries, got ${data.atlas.length}`
  );
  const sample = data.atlas.find((s) => s.id === 'ra');
  assert.ok(sample, 'ra script entry should exist');
  assert.ok(sample.originalScript, 'script should have originalScript');
  assert.ok(Array.isArray(sample.steps), 'script should have provenance steps');
});

test('availability.json exists and covers statuses', () => {
  const data = readJson('codex', 'data', 'availability.json');
  assert.ok(
    data.entries && typeof data.entries === 'object',
    'availability entries should be an object'
  );
  const ids = Object.keys(data.entries);
  assert.ok(ids.length >= 100, `expected at least 100 availability entries, got ${ids.length}`);
  const statuses = new Set(Object.values(data.entries).map((e) => e.status));
  assert.ok(
    statuses.has('live') || statuses.has('registered') || statuses.has('available'),
    'should include known statuses'
  );
});

test('source-catalog.json exists and has sources', () => {
  const data = readJson('codex', 'data', 'source-catalog.json');
  assert.ok(Array.isArray(data.sources), 'sources should be an array');
  assert.ok(
    data.sources.length >= 150,
    `expected at least 150 sources, got ${data.sources.length}`
  );
});

test('codex/index.html exposes all new section containers', () => {
  const html = readHtml('codex', 'index.html');
  assert.ok(html.includes('id="codex-global-search"'), 'global search input missing');
  assert.ok(html.includes('id="codex-global-results"'), 'global search results missing');
  assert.ok(html.includes('id="tier-system-panel"'), 'tier system panel missing');
  assert.ok(html.includes('id="availability-dashboard"'), 'availability dashboard missing');
  assert.ok(html.includes('id="owned-domains-gallery"'), 'owned domains gallery missing');
  assert.ok(html.includes('id="constellation-container"'), 'constellation container missing');
  assert.ok(html.includes('id="script-atlas"'), 'script atlas missing');
});

test('codex export script is wired into the master generator', () => {
  const generator = fs.readFileSync(path.join(root, 'scripts', 'generate.js'), 'utf8');
  assert.ok(
    generator.includes('scripts/export-codex-data.js'),
    'export-codex-data.js should be in generate.js'
  );
});

run();
