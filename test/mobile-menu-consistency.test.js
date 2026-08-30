/**
 * PuniCodex — Mobile menu consistency tests
 *
 * Every non-temple navigation page must expose the same canonical,
 * sectioned enterprise mobile menu (Explore / Tools / Resources / About),
 * with a working toggle wired either through js/px-core.js or a local
 * page script that references the menu. Guards the unification shipped
 * with scripts/sync-mobile-menu.js.
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const {
  CANONICAL_MENU,
  MENU_OPEN,
  TARGETS,
  findBalancedDivEnd,
  menuForPage,
} = require('../scripts/sync-mobile-menu.js');

const CANONICAL_LINKS = [
  '/pantheon/',
  '/realms/',
  '/lexicon/',
  '/connections/',
  '/patterns/',
  '/trending/',
  '/type/',
  '/search/',
  '/tiers/',
  '/oracle/',
  '/texts/',
  '/codex/',
  '/api/v1/docs/',
  '/appraise/',
  '/store/',
  '/about/',
  '/about/founder/',
  '/careers/',
  '/contact/',
];

function readPage(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function readPageSafe(rel) {
  const full = path.join(ROOT, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

test('canonical menu covers all 19 navigation links', () => {
  for (const href of CANONICAL_LINKS) {
    assert.ok(CANONICAL_MENU.includes(`href="${href}"`), `menu links to ${href}`);
  }
  assert.strictEqual((CANONICAL_MENU.match(/mobile-menu-section/g) || []).length, 4);
});

test('every navigation page carries the exact canonical mobile menu', () => {
  assert.ok(TARGETS.length >= 15, 'target list covers the navigation pages');
  for (const target of TARGETS) {
    const rel = target.page;
    const html = readPageSafe(rel);
    if (!html) {
      console.warn(`    ⚠ ${rel} missing, skipping mobile menu check`);
      continue;
    }
    const startIdx = html.indexOf(MENU_OPEN);
    assert.ok(startIdx !== -1, `${rel} has a .mobile-menu`);
    const endIdx = findBalancedDivEnd(html, startIdx);
    assert.ok(endIdx !== -1, `${rel} menu div is balanced`);
    assert.strictEqual(
      html.slice(startIdx, endIdx),
      menuForPage(target.active),
      `${rel} menu is canonical (active: ${target.active || 'none'})`
    );
  }
});

test('every navigation page has a toggle wired to the menu', () => {
  for (const target of TARGETS) {
    const rel = target.page;
    const html = readPageSafe(rel);
    if (!html) {
      console.warn(`    ⚠ ${rel} missing, skipping toggle wiring check`);
      continue;
    }
    assert.ok(html.includes('nav-toggle'), `${rel} has a nav-toggle button`);
    const usesPxCore = html.includes('/js/px-core.js');
    const localWiring =
      /mobile-menu/.test(html) && /<script[^>]+src="[^"]*(script|main|oracle)\.js/.test(html);
    assert.ok(usesPxCore || localWiring, `${rel} wires the toggle (px-core or local script)`);
  }
});

test('pages whose own link is in the menu carry the active marker', () => {
  for (const target of TARGETS) {
    if (!target.active) continue;
    // If the tidy removed the page's link from the canonical menu, it no
    // longer carries an active marker there (Rulebook / Pronunciation are
    // footer-only now).
    if (!CANONICAL_MENU.includes(`href="${target.active}"`)) continue;
    const html = readPageSafe(target.page);
    if (!html) {
      console.warn(`    ⚠ ${target.page} missing, skipping active marker check`);
      continue;
    }
    assert.ok(
      html.includes(`<a href="${target.active}" class="active">`),
      `${target.page} marks ${target.active} active in its menu`
    );
  }
});

test('university-sponsorship page is free of the collaborators strip', () => {
  const html = readPage(path.join('university-sponsorship', 'index.html'));
  assert.ok(
    !html.includes('PUNICODEX-UNIVERSITY-COLLABORATORS'),
    'no strip markers on the sponsorship page'
  );
  assert.ok(!html.includes('university-collaborators-strip'), 'no strip container');
  assert.ok(html.includes('footer-grid'), 'standard enterprise footer');
  assert.ok(html.includes('nav-toggle'), 'hamburger present');
  assert.ok(html.includes('/js/px-core.js'), 'px-core wired');
});

test('collaborators injector excludes the sponsorship page', () => {
  const injector = readPage(path.join('scripts', 'inject-university-collaborators.js'));
  assert.ok(injector.includes('EXCLUDED_PAGES'), 'injector has an exclusion list');
  assert.ok(
    injector.includes("path.join('university-sponsorship', 'index.html')") &&
      injector.includes('EXCLUDED_PAGES'),
    'sponsorship page is excluded'
  );
});

test('creatives uses the canonical main-nav, not the legacy global strip', () => {
  // 2026-07-20: /creatives/ carried BOTH the canonical main-nav and the
  // retired global-strip (a second, older menu stacked beneath it). The strip
  // is a temple-only component; root pages must not render it.
  const html = readPage(path.join('creatives', 'index.html'));
  assert.ok(!/class="global-strip"/.test(html), 'creatives has no legacy global-strip');
  assert.ok(/class="main-nav"/.test(html), 'creatives has the canonical main-nav');
});

test('realms defers mobile toggling to px-core (no duplicate handler)', () => {
  const script = readPage(path.join('realms', 'script.js'));
  // 2026-07-18: realms/script.js had its own #nav-toggle handler that raced
  // px-core's canonical one (open→close in a single click). The page script
  // must leave toggling to px-core and keep no duplicate handler.
  assert.ok(
    !script.includes("getElementById('nav-toggle')") &&
      !script.includes('getElementById("nav-toggle")'),
    'realms script must not register its own #nav-toggle handler'
  );
  assert.ok(script.includes('px-core'), 'realms script documents the px-core handoff');
});

console.log('Mobile menu consistency test module loaded.');
