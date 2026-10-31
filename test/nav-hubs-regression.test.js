/**
 * PuniCodex — Nav & Hub regression tests (Phase A wings + Phase B Reliquary)
 *
 * Pins the hard-won fixes from the six-wing nav + 3D hubs + store
 * restructure work so they cannot silently regress:
 *
 *  1. Desktop fan-out panels anchor to their ITEM row (the "hovering
 *     Pantheon shows nothing" bug was a missing position:relative).
 *  2. Mobile drawer: collapsed fan-out accordions occupy ONE grid cell
 *     (Pantheon beside Connections, Codex beside Rulebook); the summary
 *     label is a real link that navigates; the expanded "— overview"
 *     heading spans the full row.
 *  3. Hub pages carry the system metaphor (Mind/Voice/Hand/Memory/Vault),
 *     the canonical sitewide footer, and the home-identical nav strip
 *     geometry (no global-strip gap, 72px bar, no Enter CTA).
 *  4. The Reliquary restructure: /store/ entrance links both departments,
 *     every nav fan-out href exists on disk, and checkout/email order
 *     URLs point at the merch tree.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

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

const {
  HUB_ORDER,
  HUBS,
  STORE_CHILDREN,
  STORE_CHILDREN_ENABLED,
} = require('../scripts/nav-tree.js');
const PINS = require('../scripts/asset-pins.js');

test('nav-hubs.css anchors fan-out panels to their item row', () => {
  const css = read('css/nav-hubs.css');
  assert.ok(
    /\.nav-hub-item\s*\{[^}]*position:\s*relative/.test(css),
    '.nav-hub-item must be position:relative — without it panels detach from the hovered row'
  );
});

test('nav-hubs.js navigates on mobile summary-label taps (caret still toggles)', () => {
  const js = read('js/nav-hubs.js');
  assert.ok(
    js.includes("closest('a.mobile-sub-link')"),
    'capture handler for .mobile-sub-link missing'
  );
  assert.ok(
    /addEventListener\('click',[\s\S]*true\)/.test(js),
    'the label handler must be capture-phase so preventDefault stops the <summary> toggle'
  );
});

test('mobile menu: collapsed fan-out sits in one grid cell; open spans the row', () => {
  const css = read('css/mobile-menu.css');
  assert.ok(
    !/\.mobile-sub\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/.test(css),
    'a BASE .mobile-sub rule must not span the full row — that was the "Pantheon under Atlas" bug'
  );
  assert.ok(
    /\[open\][^}]*grid-column:\s*1\s*\/\s*-1/.test(css),
    '.mobile-sub[open] must span the full row'
  );
  assert.ok(
    /\.mobile-sub-group\s+a\.mobile-link--featured\s*\{[^}]*grid-column:\s*1\s*\/\s*-1/.test(css),
    'the expanded "— overview" heading must span all columns'
  );
  assert.ok(css.includes('.mobile-sub-link'), 'summary label link styles missing');
});

test('mobile menu markup: summary label is a link to the section', () => {
  const { CANONICAL_MENU } = require('../scripts/sync-mobile-menu.js');
  assert.ok(
    CANONICAL_MENU.includes('<summary><a href="/pantheon/" class="mobile-sub-link">Pantheon</a>'),
    'Pantheon summary label must link to /pantheon/'
  );
  assert.ok(
    CANONICAL_MENU.includes(
      '<a href="/pantheon/" class="mobile-link--featured">Pantheon — overview</a>'
    ),
    'Pantheon overview link must remain inside the expanded group'
  );
});

test('hub pages carry the system metaphor, canonical footer, and current pins', () => {
  const roles = HUB_ORDER.filter((id) => HUBS[id].role).map((id) => HUBS[id].role);
  assert.ok(roles.length >= 5, 'every wing hub must declare a system role');
  const OUT_DIRS = {
    atlas: 'world',
    culture: 'culture',
    tools: 'instruments',
    library: 'library',
    relics: 'relics',
  };
  for (const id of Object.keys(OUT_DIRS)) {
    const html = read(path.join(OUT_DIRS[id], 'index.html'));
    const role = HUBS[id].role;
    assert.ok(
      html.includes(`PuniCodex · ${role}`),
      `${OUT_DIRS[id]}: kicker must read "PuniCodex · ${role}"`
    );
    assert.ok(
      !html.includes('Wing of the Pantheon'),
      `${OUT_DIRS[id]}: retired "Wing of the Pantheon" copy`
    );
    assert.ok(
      html.includes('footer-grid'),
      `${OUT_DIRS[id]}: must carry the canonical sitewide footer`
    );
    assert.ok(html.includes('/css/hub.css?v=2'), `${OUT_DIRS[id]}: hub.css must be cache-bumped`);
    assert.ok(html.includes(PINS.NAV_HUBS_CSS), `${OUT_DIRS[id]}: nav-hubs pin current`);
  }
});

test('hub.css resets the strip geometry to the home-page nav', () => {
  const css = read('css/hub.css');
  assert.ok(
    /--global-strip-height:\s*0px/.test(css),
    'the phantom global-strip gap must be zeroed'
  );
  assert.ok(/--nav-height:\s*72px/.test(css), 'hub nav must match the 72px home bar');
  assert.ok(/\.nav-cta\s*\{[^}]*display:\s*none/.test(css), 'hubs must not render the Enter CTA');
  assert.ok(
    /@media\s*\(max-width:\s*1024px\)[\s\S]*\.main-nav \.nav-links[\s\S]*display:\s*none/.test(css),
    'hub nav links must hide below the desktop breakpoint (home parity)'
  );
  assert.ok(css.includes('.hub-hero-copy'), 'hero copy readability rules (text-shadow) missing');
  assert.ok(
    /@media\s*\(max-width:\s*720px\)[\s\S]*\.hub-kicker/.test(css),
    'mobile kicker legibility rule missing'
  );
});

test('store fan-out: enabled and every destination exists on disk', () => {
  assert.strictEqual(STORE_CHILDREN_ENABLED, true, 'store fan-out must be enabled in Phase B');
  assert.ok(STORE_CHILDREN.length >= 2, 'at least Merch + Art departments');
  for (const c of STORE_CHILDREN) {
    assert.ok(
      fs.existsSync(path.join(ROOT, c.href.replace(/^\//, ''), 'index.html')),
      `store fan-out destination ${c.href} has no page on disk`
    );
  }
});

test('checkout success/cancel and order emails point at the merch tree', () => {
  const stripe = read(path.join('platform', 'api', 'stripe.js'));
  assert.ok(
    stripe.includes('/store/merch/?order='),
    'stripe success/cancel URLs must land on the merch hall'
  );
  const email = read(path.join('platform', 'api', 'email.js'));
  assert.ok(email.includes('/store/merch/?order='), 'order emails must link the merch hall');
});

test('no temple page links a non-merch store collection URL', () => {
  // Sample the fleet: 40 spread across the alphabet is plenty to catch a
  // regressed generator, without a full-tree scan in the hot path.
  const sitesDir = path.join(ROOT, 'sites');
  const ids = fs
    .readdirSync(sitesDir)
    .filter((d) => {
      try {
        return (
          fs.statSync(path.join(sitesDir, d)).isDirectory() &&
          fs.existsSync(path.join(sitesDir, d, 'index.html'))
        );
      } catch {
        return false;
      }
    })
    .sort();
  const sample = ids
    .filter((_, i) => i % Math.max(1, Math.floor(ids.length / 40)) === 0)
    .slice(0, 40);
  const bad = [];
  for (const id of sample) {
    const html = read(path.join('sites', id, 'index.html'));
    if (/punicodex\.com\/store\/(?!merch\/)[a-z0-9-]+\//.test(html)) bad.push(id);
  }
  assert.deepStrictEqual(bad, [], `temples with legacy store links: ${bad.join(', ')}`);
});

console.log(`\nNav & Hub Regression: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
