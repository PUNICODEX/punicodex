/**
 * PuniCodex — Cookie Consent Tests
 *
 * Guards the consent-banner wiring: every public page must carry the
 * cookie-consent assets between the PUNICODEX-COOKIE-CONSENT markers, the
 * injector must stay registered in the generate pipeline AFTER the page
 * generators (a standalone generate-store-pages run once stripped the
 * block from all 3,804 store pages), and excluded admin/auth/404 surfaces
 * must stay clean.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

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

const START = '<!-- PUNICODEX-COOKIE-CONSENT-START -->';
const END = '<!-- PUNICODEX-COOKIE-CONSENT-END -->';
const CSS = '<link rel="stylesheet" href="/css/cookie-consent.css?v=1">';
const JS = '<script src="/js/cookie-consent.js?v=1" defer></script>';

// Representative public pages: root, feature, store (all three tiers of
// generator), teasers, terms docs, blog, one flagship + one base temple.
const PUBLIC_PAGES = [
  'index.html',
  'pantheon/index.html',
  'lexicon/index.html',
  'about/index.html',
  'contact/index.html',
  'blog/index.html',
  'store/index.html',
  'store/zeus/index.html',
  'store/zeus/tee/index.html',
  'extension/index.html',
  'app/index.html',
  'terms/index.html',
  'terms/store/index.html',
  'terms/creatives/index.html',
  'sites/zeus/index.html',
  'sites/tethys/index.html',
];

// Surfaces the injector must never touch (admin/auth/404/herald pitch page).
const EXCLUDED_PAGES = ['herald/index.html', '404.html', 'account/index.html'];

test('every public page carries the consent block between its markers', () => {
  for (const rel of PUBLIC_PAGES) {
    const html = read(rel);
    const start = html.indexOf(START);
    const end = html.indexOf(END);
    assert.ok(start !== -1 && end !== -1 && end > start, `${rel}: consent markers missing or inverted`);
    const block = html.slice(start, end);
    assert.ok(block.includes(CSS), `${rel}: consent css link missing`);
    assert.ok(block.includes(JS), `${rel}: consent script missing`);
    assert.strictEqual(html.indexOf(START), html.lastIndexOf(START), `${rel}: duplicate consent blocks`);
  }
});

test('excluded admin/auth/404 surfaces stay clean', () => {
  for (const rel of EXCLUDED_PAGES) {
    assert.ok(!read(rel).includes(START), `${rel}: consent block leaked into an excluded page`);
  }
});

test('consent assets exist and wire the documented key and class', () => {
  const js = read('js/cookie-consent.js');
  const css = read('css/cookie-consent.css');
  assert.ok(js.includes('punicodex.cookie-consent'), 'consent js lost its localStorage key');
  assert.ok(js.includes('pc-cookie'), 'consent js lost its .pc-cookie root class');
  assert.ok(css.includes('.pc-cookie'), 'consent css lost its .pc-cookie rules');
});

test('injector runs after the page generators in the pipeline', () => {
  const pipeline = read('scripts/generate.js');
  const at = (needle) => {
    const i = pipeline.indexOf(needle);
    assert.notStrictEqual(i, -1, `${needle} is not registered in scripts/generate.js`);
    return i;
  };
  const injectAt = at('scripts/inject-cookie-consent.js');
  for (const generator of ['scripts/generate-store-pages.js', 'scripts/generate-blog-index.js']) {
    assert.ok(
      injectAt > at(generator),
      `inject-cookie-consent must run after ${generator} or its output strips the block`
    );
  }
});

console.log(`\nCookie Consent: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
