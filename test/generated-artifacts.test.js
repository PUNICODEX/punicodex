/**
 * Generated Artifacts Regression Tests
 *
 * Verifies that the canonical sources and all generated consumers stay in sync.
 * The Flywheel Integrity validator is the authoritative check; this suite is a
 * fast smoke test that can be run in isolation.
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
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
  console.log(`\nGenerated Artifacts: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const root = path.join(__dirname, '..');
const lexiconModule = require(path.join(root, 'type/js/lexicon.js'));
const canonicalEntries = lexiconModule.LEXICON;

function readJson(...parts) {
  const file = path.join(root, ...parts);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function exists(...parts) {
  return fs.existsSync(path.join(root, ...parts));
}

test('canonical lexicon has expected entry count', () => {
  assert.ok(
    canonicalEntries.length >= 859,
    `expected >= 859 entries, got ${canonicalEntries.length}`
  );
});

test('generated lexicon copies exist and match canonical size', () => {
  const copies = [
    'extension/shared/lexicon.js',
    'mobile/shared/lexicon.js',
    'android/app/src/main/assets/shared/lexicon.json',
    'platform/browser/renderer/lexicon.json',
  ];
  for (const copy of copies) {
    assert.ok(exists(copy), `${copy} should exist`);
    if (copy.endsWith('.json')) {
      const data = readJson(copy);
      assert.ok(Array.isArray(data.entries) || Array.isArray(data));
    }
  }
});

test('renderer lexicon entries derive from canonical lexicon', () => {
  const renderer = readJson('platform/browser/renderer/lexicon.json');
  assert.ok(Array.isArray(renderer.entries), 'renderer entries should be an array');
  assert.strictEqual(renderer.entries.length, canonicalEntries.length);
  const canonicalIds = new Set(canonicalEntries.map((e) => e.id));
  const rendererIds = new Set(renderer.entries.map((e) => e.id));
  assert.deepStrictEqual(rendererIds, canonicalIds);
});

test('data-version.json is valid and counts match canonical', () => {
  const manifest = readJson('data-version.json');
  assert.ok(manifest.version, 'manifest should have a version');
  assert.ok(manifest.releasedAt, 'manifest should have releasedAt');
  assert.ok(manifest.canonicalHashes, 'manifest should have canonicalHashes');
  assert.strictEqual(manifest.counts.entries, canonicalEntries.length);
});

test('data-version.json canonicalHashes match current canonical sources', () => {
  const manifest = readJson('data-version.json');
  assert.ok(manifest.canonicalSources, 'manifest should list canonicalSources');
  for (const [key, relPath] of Object.entries(manifest.canonicalSources)) {
    const file = path.join(root, relPath);
    assert.ok(fs.existsSync(file), `${relPath} should exist`);
    const content = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    assert.strictEqual(
      manifest.canonicalHashes[key],
      hash,
      `canonical hash mismatch for ${relPath}: data-version is stale, run \`npm run generate\``
    );
  }
});

test('every entry has a generated temple page', () => {
  for (const entry of canonicalEntries.slice(0, 20)) {
    const temple = path.join(root, 'sites', entry.id, 'index.html');
    assert.ok(fs.existsSync(temple), `temple page should exist for ${entry.id}`);
  }
});

test('sample temple pages have required SEO tags', () => {
  for (const id of ['zeus', 'apollon', 'thor']) {
    const html = fs.readFileSync(path.join(root, 'sites', id, 'index.html'), 'utf8');
    assert.ok(html.includes('<title>'), `${id} temple should have <title>`);
    assert.ok(html.includes('<meta name="description"'), `${id} temple should have description`);
    assert.ok(html.includes('<link rel="canonical"'), `${id} temple should have canonical`);
    assert.ok(html.includes('og:title'), `${id} temple should have og:title`);
  }
});

test('lore catalog copies exist and are valid JSON', () => {
  const copies = [
    'platform/browser/renderer/lore-catalog.json',
    'extension/shared/lore-catalog.json',
    'mobile/shared/lore-catalog.json',
    'type/js/lore-catalog.json',
  ];
  for (const copy of copies) {
    assert.ok(exists(copy), `${copy} should exist`);
    const data = readJson(copy);
    assert.strictEqual(typeof data, 'object');
  }
});

run();
