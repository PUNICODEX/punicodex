/**
 * PuniCodex — Trending page tests.
 *
 * Guards the live ranking engine: generator idempotency, canonical chrome,
 * the baked temple registry (completeness, mascot files on disk, safe JSON
 * embedding), and the client engine's wiring to /api/analytics/trending/.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');

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

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const GENERATOR = path.join(root, 'scripts', 'generate-trending-page.js');
const STAMPER = path.join(root, 'scripts', 'stamp-asset-versions.js');
const PAGE = path.join(root, 'trending', 'index.html');

function registryFrom(html) {
  const m = html.match(/window\.TRENDING_REGISTRY = (\{[\s\S]*?\});\n/);
  assert.ok(m, 'TRENDING_REGISTRY not embedded');
  return JSON.parse(m[1].replace(/<\\\//g, '</'));
}

test('generator is idempotent (byte-identical output across runs)', () => {
  const hash = () =>
    require('node:crypto').createHash('sha256').update(fs.readFileSync(PAGE)).digest('hex');
  const runStamper = () => execFileSync(process.execPath, [STAMPER], { cwd: root, stdio: 'pipe' });
  const committed = hash();
  execFileSync(process.execPath, [GENERATOR], { cwd: root, stdio: 'pipe' });
  runStamper();
  assert.strictEqual(
    hash(),
    committed,
    'first regeneration changed the page — rerun node scripts/generate-trending-page.js then node scripts/stamp-asset-versions.js'
  );
  execFileSync(process.execPath, [GENERATOR], { cwd: root, stdio: 'pipe' });
  runStamper();
  assert.strictEqual(hash(), committed, 'second regeneration changed the page');
});

test('page carries the canonical chrome and all beacon blocks', () => {
  const html = read('trending/index.html');
  for (const marker of [
    'PUNICODEX-ANALYTICS-START',
    'PUNICODEX-HERALD-BEACON-START',
    'PUNICODEX-COOKIE-CONSENT-START',
    'punicodex-wordmark-ivory',
    'class="nav-cta"',
    'id="nav-toggle"',
    'id="mobile-menu"',
    '<footer',
    '/assets/brand/02-favicons/favicon.svg',
    '<link rel="canonical" href="https://punicodex.com/trending/"',
  ]) {
    assert.ok(html.includes(marker), `missing ${marker}`);
  }
  assert.strictEqual(html.indexOf('<footer'), html.lastIndexOf('<footer'), 'duplicate footers');
});

test('registry covers every built flagship with resolvable mascots', () => {
  const { ARCHETYPES } = require(path.join(root, 'js', 'archetypes-v2.js'));
  const built = ARCHETYPES.filter((a) => a.built);
  const registry = registryFrom(read('trending/index.html'));
  assert.strictEqual(Object.keys(registry).length, built.length);
  let checked = 0;
  for (const a of built) {
    const entry = registry[a.id];
    assert.ok(entry, `registry missing ${a.id}`);
    assert.ok(entry.unicode && entry.pantheon, `registry ${a.id} incomplete`);
    if (entry.mascot) {
      const onDisk = path.join(root, entry.mascot.replace(/^\//, ''));
      assert.ok(fs.existsSync(onDisk), `mascot for ${a.id} missing on disk: ${entry.mascot}`);
      checked++;
    }
  }
  assert.ok(checked > built.length * 0.9, `too few mascots verified (${checked}/${built.length})`);
});

test('embedded registry JSON cannot break out of the script tag', () => {
  const html = read('trending/index.html');
  const m = html.match(/window\.TRENDING_REGISTRY = (\{[\s\S]*?\});\n/);
  assert.ok(m);
  assert.ok(!m[1].includes('</'), 'registry JSON contains a raw "</" sequence');
});

test('client engine is wired to the trending API and escapes all values', () => {
  const js = read('js/trending.js');
  assert.ok(js.includes('/api/analytics/trending/'), 'engine does not call the trending API');
  assert.ok(js.includes('escapeHtml'), 'engine has no HTML escaper');
  // every dynamic interpolation into innerHTML must pass through escapeHtml
  const inner = js.match(/innerHTML\s*=[\s\S]*?;/g) || [];
  assert.ok(inner.length >= 2, 'expected board render assignments');
  assert.ok(js.includes('visibilityState'), 'auto-refresh must respect tab visibility');
  assert.ok(
    read('trending/index.html').includes('/js/trending.js?v='),
    'page does not load the engine'
  );
});

test('generator is registered in the pipeline', () => {
  const pipeline = read('scripts/generate.js');
  assert.ok(pipeline.includes('scripts/generate-trending-page.js'));
});

console.log(`\nTrending Page: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
