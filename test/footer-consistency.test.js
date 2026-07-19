/**
 * PuniCodex — Footer Consistency Tests
 *
 * Guards the canonical site footer: every non-temple page must carry the
 * same footer (camel wordmark, tagline, Explore/Resources/Connect columns,
 * legal line) — the drift the 2026-07-19 audit found (custom minimal
 * footers on realms/lexicon/blog, none at all on search + terms subpages)
 * must not return.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { TARGETS, EXPLORE, RESOURCES, CONNECT } = require('../scripts/sync-footer.js');

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

test('every target page has exactly one footer with the three canonical columns', () => {
  for (const rel of TARGETS) {
    const html = read(rel);
    const footerCount = (html.match(/<footer[\s>]/gi) || []).length;
    assert.strictEqual(footerCount, 1, `${rel}: expected exactly 1 footer, found ${footerCount}`);
    for (const heading of ['Explore', 'Resources', 'Connect']) {
      assert.ok(
        html.includes(`<h2 class="footer-heading">${heading}</h2>`),
        `${rel}: missing footer column "${heading}"`
      );
    }
  }
});

test('every footer carries the camel wordmark and all canonical links', () => {
  const all = [...EXPLORE, ...RESOURCES, ...CONNECT];
  for (const rel of TARGETS) {
    const html = read(rel);
    const footer = html.slice(html.search(/<footer[\s>]/i));
    assert.ok(footer.includes('punicodex-wordmark-camel-gold'), `${rel}: camel wordmark missing`);
    for (const [href, label] of all) {
      assert.ok(footer.includes(`<a href="${href}">${label}</a>`), `${rel}: missing link ${label}`);
    }
  }
});

test('no leftover retired footer variants (stacked lockup, text wordmark)', () => {
  for (const rel of TARGETS) {
    const html = read(rel);
    const footer = html.slice(html.search(/<footer[\s>]/i));
    assert.ok(
      !footer.includes('punicodex-lockup-stacked-gold') && !footer.includes('class="footer-logo"'),
      `${rel}: retired footer variant still present`
    );
  }
});

test('pages without main.css link the shared footer stylesheet', () => {
  for (const rel of TARGETS) {
    const html = read(rel);
    if (!html.includes('/css/main.css')) {
      assert.ok(html.includes('/css/footer.css'), `${rel}: footer.css not linked`);
    }
  }
});

test('mobile compaction rules exist (2-column grid + compact brand row)', () => {
  const shared = read(path.join('css', 'footer.css'));
  assert.ok(shared.includes('grid-template-columns: 1fr 1fr'), 'footer.css missing 2-col mobile grid');
  assert.ok(shared.includes('width: 150px'), 'footer.css missing compact mobile wordmark');
  const main = read(path.join('css', 'main.css'));
  const mobileBlock = main.slice(main.lastIndexOf('@media (max-width: 768px)'));
  assert.ok(
    mobileBlock.includes('grid-template-columns: 1fr 1fr'),
    'main.css mobile footer is still single-column stacked'
  );
});

test('sync-footer is registered in the generate pipeline', () => {
  const gen = read(path.join('scripts', 'generate.js'));
  assert.ok(gen.includes("'scripts/sync-footer.js'"), 'sync-footer.js missing from generate.js');
});

test('app surfaces stay footer-free by design (game, entry)', () => {
  assert.ok(!read(path.join('game', 'index.html')).includes('class="site-footer"'));
  assert.ok(!read('entry.html').includes('class="site-footer"'));
});

console.log(`\nFooter Consistency: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
