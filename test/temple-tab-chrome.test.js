#!/usr/bin/env node
/**
 * Temple tab chrome regression tests.
 *
 * Guards the four chrome defects fixed in the 2026-11 tab-chrome pass:
 *  1. temple-base.css nav rules must stay scoped (.tab-nav / .base-nav /
 *     .temple-mobile-menu) — unscoped they contaminate every canonical page
 *     that loads temple-base.css (uppercase hubs, restyled mobile menus).
 *  2. No temple tab page may carry the legacy "Logo injected by JS" nav —
 *     the injection no longer exists and the logolockup renders blank.
 *  3. Every temple tab nav must inline the logolockup (nav-logo-img) and
 *     ship exactly one #nav-toggle.
 *  4. The tab-nav toggle must keep explicit dimensions + non-shrinking
 *     spans: main.css pins .nav-toggle at 28×20px and, without this, the
 *     column flex shrinks the empty spans to height 0 — the hamburger
 *     renders invisible on store/merch tabs.
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TEMPLE_BASE = fs.readFileSync(path.join(ROOT, 'css', 'temple-base.css'), 'utf8');
const SITES_DIR = path.join(ROOT, 'sites');

function templeDirs() {
  return fs
    .readdirSync(SITES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(SITES_DIR, e.name, 'index.html')))
    .map((e) => e.name);
}

test('temple-base.css: nav rules are scoped, no contamination', () => {
  // No bare (unscoped) .nav-link / .nav-links rules: every occurrence must
  // be prefixed with .tab-nav or .base-nav.
  const bareNavLink = /(^|\})\s*\.nav-links?\s*\{/g;
  const hits = [...TEMPLE_BASE.matchAll(bareNavLink)];
  assert.deepStrictEqual(
    hits.map((h) => h[0].trim()),
    [],
    'unscoped .nav-link/.nav-links rule found in temple-base.css'
  );
  // The temple mobile-menu overlay styles must not target the canonical
  // .mobile-menu used across the site.
  assert.ok(
    !/(^|\})\s*\.mobile-menu\s+a\s*\{/.test(TEMPLE_BASE),
    'unscoped .mobile-menu a rule found (contaminates the canonical site menu)'
  );
});

test('temple-base.css: tab toggle keeps explicit size and non-shrinking spans', () => {
  const rules = [...TEMPLE_BASE.matchAll(/\.tab-nav \.nav-toggle, \.base-nav \.nav-toggle\s*\{([\s\S]*?)\}/g)].map((m) => m[1]);
  const base = rules.find((body) => /width:\s*40px/.test(body));
  assert.ok(base, '.tab-nav/.base-nav .nav-toggle rule with pinned 40px size missing (main.css 28×20 would shrink spans to 0)');
  assert.ok(/height:\s*40px/.test(base), 'toggle must pin height');
  const spans = [...TEMPLE_BASE.matchAll(/\.tab-nav \.nav-toggle span, \.base-nav \.nav-toggle span\s*\{([\s\S]*?)\}/g)].map((m) => m[1]);
  assert.ok(spans.length > 0, 'toggle span rule missing');
  assert.ok(spans.some((body) => /flex-shrink:\s*0/.test(body)), 'toggle spans must not flex-shrink to 0 height');
});

test('temple tab pages: no legacy JS-injected nav, inline logolockup present', () => {
  const stale = [];
  const missingLogo = [];
  const toggleIssues = [];
  const TAB_PAGES = ['index.html', 'patterns/index.html', 'patron/index.html', 'blog/index.html', 'lore/index.html'];
  for (const id of templeDirs()) {
    for (const rel of TAB_PAGES) {
      const file = path.join(SITES_DIR, id, rel);
      if (!fs.existsSync(file)) continue;
      const html = fs.readFileSync(file, 'utf8');
      if (!html.includes('class="main-nav tab-nav"')) continue; // base temples use base-nav
      if (html.includes('Logo injected by JS')) stale.push(`${id}/${rel}`);
      if (!html.includes('nav-logo-img')) missingLogo.push(`${id}/${rel}`);
      const toggles = html.split('id="nav-toggle"').length - 1;
      if (toggles !== 1) toggleIssues.push(`${id}/${rel} (${toggles})`);
    }
  }
  assert.deepStrictEqual(stale, [], `${stale.length} tab pages still carry the legacy injected-logo nav`);
  assert.deepStrictEqual(missingLogo, [], `${missingLogo.length} tab pages lack the inline logolockup`);
  assert.deepStrictEqual(toggleIssues, [], `tab pages with toggle count ≠ 1: ${toggleIssues.slice(0, 5).join(', ')}`);
});

test('temple pages: footer present and canonical (temple-footer or site-footer)', () => {
  const bad = [];
  for (const id of templeDirs()) {
    const file = path.join(SITES_DIR, id, 'index.html');
    const html = fs.readFileSync(file, 'utf8');
    // Redirect stubs carry no footer by design.
    if (html.includes('http-equiv="refresh"')) continue;
    if (!html.includes('<footer')) bad.push(`${id} (no footer)`);
  }
  assert.deepStrictEqual(bad, []);
});

test('store tab pages: temple context pages carry the tab nav + toggle', () => {
  for (const rel of ['store/zeus/index.html', 'store/merch/zeus/index.html']) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    assert.ok(html.includes('class="main-nav tab-nav"'), `${rel}: tab nav missing`);
    assert.ok(html.includes('temple-mobile-menu'), `${rel}: temple mobile menu missing`);
    const toggles = html.split('id="nav-toggle"').length - 1;
    assert.strictEqual(toggles, 1, `${rel}: expected 1 nav-toggle, found ${toggles}`);
  }
});
