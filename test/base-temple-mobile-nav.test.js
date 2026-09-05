/**
 * PuniCodex — Base Temple mobile navigation regression tests
 *
 * Ensures every non-flagship (generated) temple page has a global strip,
 * a compact base nav, and a working mobile hamburger menu. This prevents
 * the recurring issue where base temples look unstyled or the mobile menu
 * does not open.
 */

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const assert = require('node:assert');

const SITES_DIR = path.join(__dirname, '..', 'sites');
const BASE_CSS = path.join(__dirname, '..', 'css', 'temple-base.css');
const TEMPLATE = path.join(__dirname, '..', 'scripts', 'generate-temples.js');

function getBaseTempleDirs() {
  return fs
    .readdirSync(SITES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(SITES_DIR, name, 'index.html')))
    .filter((name) => !fs.existsSync(path.join(SITES_DIR, name, 'patron', 'index.html')))
    .filter((name) => {
      // Redirect stubs (deduped entries) are intentionally minimal pages.
      const html = fs.readFileSync(path.join(SITES_DIR, name, 'index.html'), 'utf8');
      return !html.includes('http-equiv="refresh"');
    });
}

function loadHomePage(id) {
  const filePath = path.join(SITES_DIR, id, 'index.html');
  if (!fs.existsSync(filePath)) return null;
  const html = fs.readFileSync(filePath, 'utf8');
  return cheerio.load(html);
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

const ids = getBaseTempleDirs();
// Expected base-temple count derives from the canonical flywheel: every
// lexicon entry has a temple; every built archetype is a flagship (flagships
// carry patron/ subpages, which getBaseTempleDirs excludes).
const { LEXICON } = require('../type/js/lexicon.js');
const { ARCHETYPES } = require('../js/archetypes-v2.js');
const expectedBaseCount = LEXICON.length - ARCHETYPES.filter((a) => a.built).length;
assert.ok(
  ids.length >= expectedBaseCount,
  `expected at least ${expectedBaseCount} base temples, found ${ids.length}`
);

console.log(`Base Temple Mobile Nav Tests — ${ids.length} temples`);

test('CSS exposes base-nav layout and compact mobile height', () => {
  const css = fs.readFileSync(BASE_CSS, 'utf8');
  assert.ok(css.includes('.base-nav'), 'expected .base-nav styles');
  assert.ok(css.includes('.base-nav-links'), 'expected .base-nav-links styles');
  assert.ok(css.includes('.nav-logo-text'), 'expected .nav-logo-text styles');
  assert.ok(
    /\.base-nav\s*\{[^}]*--nav-height\s*:\s*80px/i.test(css),
    'expected base nav desktop height of 80px'
  );
  assert.ok(
    /@media\s*\(max-width:\s*768px\)[\s\S]*\.base-nav\s*\{[^}]*--nav-height\s*:\s*72px/i.test(css),
    'expected base nav mobile height of 72px'
  );
});

test('base temple generator loads px-core.js before temple-base.js', () => {
  const template = fs.readFileSync(TEMPLATE, 'utf8');
  assert.ok(
    template.includes('https://punicodex.com/js/px-core.js'),
    'generate-temples.js must load px-core.js'
  );
  assert.ok(
    template.includes('https://punicodex.com/js/temple-base.js'),
    'generate-temples.js must load temple-base.js'
  );
  const pxIdx = template.indexOf('https://punicodex.com/js/px-core.js');
  const tbIdx = template.indexOf('https://punicodex.com/js/temple-base.js');
  assert.ok(pxIdx < tbIdx, 'px-core.js must load before temple-base.js');
});

test('every base temple has a global strip with required global links', () => {
  const required = ['Pantheon', 'Realms', 'Patterns', 'Trending', 'Store', 'Connections'];
  for (const id of ids.slice(0, 50)) {
    const $ = loadHomePage(id);
    assert.ok($, `${id}: home page missing`);
    const strip = $('.global-strip');
    assert.strictEqual(strip.length, 1, `${id}: expected .global-strip`);
    const links = strip.find('.global-links a');
    const texts = links.map((_, el) => $(el).text().trim()).get();
    for (const text of required) {
      assert.ok(
        texts.includes(text),
        `${id}: global strip missing "${text}" link (found: ${texts.join(', ')})`
      );
    }
  }
});

test('every base temple has a compact base nav with hamburger and mobile menu', () => {
  for (const id of ids.slice(0, 50)) {
    const $ = loadHomePage(id);
    assert.ok($, `${id}: home page missing`);
    const nav = $('#main-nav');
    assert.strictEqual(nav.length, 1, `${id}: expected #main-nav`);
    assert.ok(nav.hasClass('base-nav'), `${id}: nav should have .base-nav`);
    const logo = nav.find('.base-nav-logo');
    assert.strictEqual(logo.length, 1, `${id}: expected .base-nav-logo`);
    const logoText = logo.find('.nav-logo-text').text().trim();
    assert.ok(logoText.length > 0, `${id}: nav logo text should not be empty`);
    const toggle = $('#nav-toggle');
    assert.strictEqual(toggle.length, 1, `${id}: expected #nav-toggle`);
    const controls = toggle.attr('aria-controls');
    assert.ok(controls && controls.length > 0, `${id}: expected aria-controls on toggle`);
    const menu = $(`#${controls}`);
    assert.strictEqual(menu.length, 1, `${id}: expected mobile menu #${controls}`);
    assert.ok(menu.hasClass('mobile-menu'), `${id}: mobile menu should have .mobile-menu`);
    const links = menu.find('a');
    assert.ok(
      links.length >= 4,
      `${id}: expected at least 4 mobile menu links, found ${links.length}`
    );
  }
});

test('base temple mobile menu contains expected sections', () => {
  for (const id of ids.slice(0, 50)) {
    const $ = loadHomePage(id);
    assert.ok($, `${id}: home page missing`);
    const menu = $('#mobile-menu');
    assert.strictEqual(menu.length, 1, `${id}: expected #mobile-menu`);
    const hrefs = menu
      .find('a')
      .map((_, el) => $(el).attr('href'))
      .get();
    assert.ok(
      hrefs.some((h) => h.includes('pantheon')),
      `${id}: expected Pantheon link in mobile menu`
    );
    assert.ok(
      hrefs.some((h) => h.includes('lexicon')),
      `${id}: expected Lexicon link in mobile menu`
    );
    assert.ok(
      hrefs.some((h) => h.includes('type')),
      `${id}: expected Type link in mobile menu`
    );
    assert.ok(
      hrefs.some((h) => h.includes('about')),
      `${id}: expected About link in mobile menu`
    );
  }
});

test('base nav logo text does not duplicate the PUNICODEX wordmark', () => {
  for (const id of ids.slice(0, 20)) {
    const $ = loadHomePage(id);
    assert.ok($, `${id}: home page missing`);
    const wordmark = $('#main-nav .nav-wordmark');
    assert.strictEqual(wordmark.length, 0, `${id}: base nav should not contain .nav-wordmark`);
    const cta = $('#main-nav .nav-cta');
    assert.strictEqual(cta.length, 0, `${id}: base nav should not contain .nav-cta`);
  }
});

if (!process.exitCode) {
  console.log('\n✓ All base temple mobile nav tests passed');
} else {
  console.log('\n✗ Some base temple mobile nav tests failed');
  process.exit(1);
}
