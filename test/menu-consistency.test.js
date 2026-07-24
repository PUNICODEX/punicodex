/**
 * PuniCodex — Menu Consistency Tests
 *
 * Guards the canonical navigation system: every non-temple page must carry
 * the same desktop nav (6 primary links + 13-item More dropdown + Enter CTA)
 * and the canonical sectioned mobile menu, with the page's own item marked
 * aria-current. Prevents the hand-maintained drift this audit found
 * (7 different desktop menus across 26 pages).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { TARGETS, PRIMARY, MORE } = require('../scripts/sync-desktop-nav.js');

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

test('sync-desktop-nav covers every root navigation page (34 targets)', () => {
  assert.strictEqual(TARGETS.length, 34);
  assert.strictEqual(PRIMARY.length, 6);
  assert.strictEqual(MORE.length, 13);
});

test('every target page carries the canonical primary links in order', () => {
  for (const { page } of TARGETS) {
    const html = read(page);
    let lastIdx = -1;
    for (const [href, label] of PRIMARY) {
      const needle = `<a href="${href}" class="nav-link`;
      const idx = html.indexOf(needle);
      assert.ok(idx !== -1, `${page}: missing primary link ${label} (${href})`);
      assert.ok(idx > lastIdx, `${page}: primary link ${label} out of order`);
      lastIdx = idx;
    }
  }
});

test('every target page carries the full 13-item More dropdown', () => {
  for (const { page } of TARGETS) {
    const html = read(page);
    assert.ok(html.includes('class="nav-more-toggle"'), `${page}: missing More toggle`);
    for (const [href, label] of MORE) {
      assert.ok(
        html.includes(`<a href="${href}" class="nav-link`),
        `${page}: missing More link ${label} (${href})`
      );
    }
  }
});

test('every target page has the wordmark lockup, Enter CTA, and nav toggle', () => {
  for (const { page, chrome } of TARGETS) {
    if (chrome === 'search') continue; // search pages keep their compact chrome
    const html = read(page);
    assert.ok(html.includes('punicodex-wordmark-ivory'), `${page}: wordmark missing`);
    assert.ok(html.includes('class="nav-cta"'), `${page}: Enter CTA missing`);
    assert.ok(html.includes('id="nav-toggle"'), `${page}: nav toggle missing`);
  }
});

test('pages mark their own item aria-current="page"', () => {
  const cases = TARGETS.filter((t) => t.active);
  assert.ok(cases.length >= 15, 'expected most pages to have an active item');
  for (const { page, active } of cases) {
    const html = read(page);
    const tagRe = new RegExp(`<a href="${active.replace(/[./]/g, '\\$&')}" class="nav-link[^"]*"[^>]*aria-current="page"`);
    assert.ok(tagRe.test(html), `${page}: expected aria-current="page" on ${active}`);
  }
  // Spot: codex articles inherit the codex hub's current marker.
  const article = read(path.join('codex', 'anatomy-of-a-punycode-domain', 'index.html'));
  assert.ok(/<a href="\/codex\/" class="nav-link[^"]*"[^>]*aria-current="page"/.test(article));
});

test('mobile menu is canonical (4 sections incl. Blog) on pages that carry it', () => {
  const mobileTargets = require('../scripts/sync-mobile-menu.js').TARGETS;
  for (const { page } of mobileTargets) {
    const html = read(page);
    for (const section of ['Explore', 'Tools', 'Resources', 'About']) {
      assert.ok(
        html.includes(`<span class="mobile-menu-title">${section}</span>`),
        `${page}: missing mobile section ${section}`
      );
    }
    assert.ok(html.includes('<a href="/blog/">Blog</a>'), `${page}: mobile menu missing Blog`);
  }
});

test('component stylesheets are linked where main.css is absent', () => {
  for (const { page } of TARGETS) {
    const html = read(page);
    if (!html.includes('/css/main.css')) {
      assert.ok(html.includes('/css/nav-more.css'), `${page}: nav-more.css not linked`);
      if (html.includes('class="mobile-menu"')) {
        assert.ok(html.includes('/css/mobile-menu.css'), `${page}: mobile-menu.css not linked`);
      }
    }
  }
});

test('app surfaces stay nav-free by design (game, entry)', () => {
  assert.ok(!read(path.join('game', 'index.html')).includes('class="main-nav"'));
  assert.ok(!read('entry.html').includes('class="main-nav"'));
});

test('sync-desktop-nav is registered in the generate pipeline after mobile sync', () => {
  const gen = read(path.join('scripts', 'generate.js'));
  const mobileIdx = gen.indexOf("'scripts/sync-mobile-menu.js'");
  const desktopIdx = gen.indexOf("'scripts/sync-desktop-nav.js'");
  assert.ok(mobileIdx !== -1 && desktopIdx !== -1, 'sync scripts missing from generate.js');
  assert.ok(desktopIdx > mobileIdx, 'desktop nav sync must run after mobile menu sync');
});

test('no target page still carries retired variant link sets', () => {
  // The pre-audit variants lacked Connections or Oracle or Appraise; the
  // canonical set must be a superset present on EVERY page now.
  for (const { page } of TARGETS) {
    const html = read(page);
    for (const href of ['/connections/', '/oracle.html', '/appraise/']) {
      assert.ok(html.includes(`<a href="${href}" class="nav-link`), `${page}: missing ${href}`);
    }
  }
});

test('no page script double-handles the mobile toggle (open→close in one click)', () => {
  // Regression 2026-07-18: realms/script.js registered its own #nav-toggle
  // handler alongside px-core's; both toggled per click, so the menu opened
  // and closed instantly. Page scripts must defer to px-core's single
  // canonical handler.
  const pageScripts = [
    path.join('realms', 'script.js'),
    path.join('lexicon', 'js', 'lexicon.js'),
  ];
  for (const rel of pageScripts) {
    const full = path.join(root, rel);
    if (!fs.existsSync(full)) continue;
    const src = read(rel);
    assert.ok(
      !src.includes("getElementById('nav-toggle')") &&
        !src.includes('getElementById("nav-toggle")'),
      `${rel}: must not register its own #nav-toggle handler (px-core owns it)`
    );
  }
});

test('temple-base.css hides desktop nav-links at mobile widths (cascade order)', () => {
  // Regression 2026-07-21: the base `.nav-links{display:flex}` rule came AFTER
  // the @media(max-width:768px) hide block with equal specificity, so the
  // desktop link list rendered as an undismissable overlay on mobile
  // (blog/creatives/lexicon/cognates phantom menu).
  const css = read('css/temple-base.css');
  const mediaBlock = css.match(/@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.base-nav-links,\s*\n?\s*\.main-nav \.nav-links\s*\{\s*display:\s*none/);
  assert.ok(
    mediaBlock,
    'css/temple-base.css: the 768px media block must hide `.main-nav .nav-links` (specificity 0,2,0 beats the later base rule)'
  );
});

console.log(`\nMenu Consistency: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
