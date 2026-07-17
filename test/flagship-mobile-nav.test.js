/**
 * PuniCodex — Flagship mobile navigation regression tests
 * Ensures every flagship temple page has a visible, accessible hamburger
 * button wired to a dedicated mobile menu overlay. This prevents the
 * recurring issue where the mobile menu toggle becomes unreachable or
 * missing on temple pages.
 */

const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const assert = require('node:assert');

const SITES_DIR = path.join(__dirname, '..', 'sites');
const BASE_CSS = path.join(__dirname, '..', 'css', 'temple-base.css');

const SUB_PAGES = ['', 'lore/', 'gallery/', 'scholars/', 'creatives/', 'patron/', 'patterns/'];

function getFlagshipDirs() {
  return fs
    .readdirSync(SITES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .filter((name) => fs.existsSync(path.join(SITES_DIR, name, 'patron', 'index.html')));
}

function loadPage(id, subPath) {
  const filePath = path.join(SITES_DIR, id, subPath, subPath ? 'index.html' : 'index.html');
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

const ids = getFlagshipDirs();
assert.ok(ids.length >= 150, `expected at least 150 flagships, found ${ids.length}`);

console.log(`Flagship Mobile Nav Tests — ${ids.length} temples × ${SUB_PAGES.length} pages`);

test('CSS exposes global-strip-height and shows nav-toggle on mobile', () => {
  const css = fs.readFileSync(BASE_CSS, 'utf8');
  assert.ok(css.includes('--global-strip-height'), 'expected --global-strip-height variable');
  assert.ok(css.includes('.nav-toggle'), 'expected .nav-toggle styles');
  assert.ok(
    css.includes('@media (max-width: 768px)') && css.includes('.nav-toggle {'),
    'expected mobile media query to reveal nav-toggle'
  );
  assert.ok(
    css.includes('.mobile-menu.temple-mobile-menu'),
    'expected temple mobile menu overlay styles'
  );
});

test('every flagship home page has a hamburger and matching mobile menu', () => {
  for (const id of ids) {
    const $ = loadPage(id, '');
    assert.ok($, `${id}: home page missing`);
    const toggle = $('#nav-toggle');
    assert.strictEqual(toggle.length, 1, `${id}: expected #nav-toggle`);
    const controls = toggle.attr('aria-controls');
    assert.ok(controls && controls.length > 0, `${id}: expected aria-controls on toggle`);
    const menu = $(`#${controls}`);
    assert.strictEqual(menu.length, 1, `${id}: expected mobile menu #${controls}`);
    assert.ok(menu.hasClass('mobile-menu'), `${id}: mobile menu should have .mobile-menu`);
    assert.ok(
      menu.hasClass('temple-mobile-menu'),
      `${id}: mobile menu should have .temple-mobile-menu`
    );
    const links = menu.find('a');
    assert.ok(
      links.length >= 4,
      `${id}: expected at least 4 mobile menu links, found ${links.length}`
    );
  }
});

test('every flagship sub-page has a hamburger and matching mobile menu', () => {
  for (const id of ids) {
    for (const subPath of SUB_PAGES.slice(1)) {
      const $ = loadPage(id, subPath);
      if (!$) continue;
      const toggle = $('#nav-toggle');
      assert.strictEqual(toggle.length, 1, `${id}/${subPath}: expected #nav-toggle`);
      const controls = toggle.attr('aria-controls');
      assert.ok(
        controls && controls.length > 0,
        `${id}/${subPath}: expected aria-controls on toggle`
      );
      const menu = $(`#${controls}`);
      assert.strictEqual(menu.length, 1, `${id}/${subPath}: expected mobile menu #${controls}`);
      const links = menu.find('a');
      assert.ok(links.length >= 2, `${id}/${subPath}: expected at least 2 mobile menu links`);
    }
  }
});

test('mobile menu links are reachable and contain expected sections', () => {
  for (const id of ids) {
    const $ = loadPage(id, '');
    const menu = $('#temple-mobile-menu');
    if (menu.length === 0) continue;
    const hrefs = menu
      .find('a')
      .map((_, el) => $(el).attr('href'))
      .get();
    assert.ok(hrefs.includes('./') || hrefs.includes('index.html'), `${id}: expected Home link`);
    assert.ok(
      hrefs.some((h) => h.includes('lore')),
      `${id}: expected Lore link`
    );
    assert.ok(
      hrefs.some((h) => h.includes('gallery')),
      `${id}: expected Gallery link`
    );
    assert.ok(
      hrefs.some((h) => h.includes('patron')),
      `${id}: expected Patrons link`
    );
  }
});

test('hamburger is always the last visible item in the tab nav inner', () => {
  for (const id of ids) {
    const $ = loadPage(id, '');
    const inner = $('#tab-nav .nav-inner');
    assert.strictEqual(inner.length, 1, `${id}: expected .nav-inner`);
    const children = inner.children();
    const last = children.last();
    assert.ok(
      last.is('#nav-toggle') || last.find('#nav-toggle').length === 1,
      `${id}: expected hamburger to be the last child of nav-inner`
    );
  }
});

test('every flagship tabbed page loads px-core.js so the hamburger actually works', () => {
  // px-core.js owns the .nav-toggle click handler (PX.initNavigation). A page
  // can carry perfect hamburger markup and still be dead on mobile if this
  // script is missing — this is the regression that broke patron/patterns.
  for (const id of ids) {
    for (const subPath of SUB_PAGES) {
      const filePath = path.join(SITES_DIR, id, subPath, 'index.html');
      if (!fs.existsSync(filePath)) continue;
      const html = fs.readFileSync(filePath, 'utf8');
      assert.ok(
        html.includes('/js/px-core.js'),
        `${id}/${subPath || 'index.html'}: missing px-core.js — hamburger would be non-functional`
      );
    }
  }
});

if (!process.exitCode) {
  console.log('\n✓ All flagship mobile nav tests passed');
} else {
  console.log('\n✗ Some flagship mobile nav tests failed');
  process.exit(1);
}
