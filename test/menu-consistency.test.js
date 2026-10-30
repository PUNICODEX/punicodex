/**
 * PuniCodex — Menu Consistency Tests
 *
 * Guards the canonical navigation system: every non-temple page must carry
 * the same desktop nav (5 primary links incl. ✦ Herald + sectioned Menu drawer + Enter CTA)
 * and the canonical sectioned mobile menu, with the page's own item marked
 * aria-current. Prevents the hand-maintained drift this audit found
 * (7 different desktop menus across 26 pages).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const { TARGETS, PRIMARY, MORE } = require('../scripts/sync-desktop-nav.js');
const { HUB_ORDER, HUBS, childrenOf, PANTHEON_CHILDREN, CODEX_CHILDREN } = require('../scripts/nav-tree.js');

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

function readIfExists(rel) {
  const full = path.join(root, rel);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : null;
}

test('sync-desktop-nav covers every root navigation page (54+ targets)', () => {
  // Base target list is 54; per-pantheon landing pages and wing hub pages
  // are appended at runtime.
  assert.ok(TARGETS.length >= 54, `expected at least 54 targets, got ${TARGETS.length}`);
  assert.strictEqual(PRIMARY.length, 6);
  assert.deepStrictEqual(
    PRIMARY.map(([href, label]) => [href, label]),
    HUB_ORDER.map((id) => [HUBS[id].href, HUBS[id].label])
  );
  assert.strictEqual(MORE.length, 6);
  for (const section of MORE) {
    assert.ok(section.heading, 'every wing must have a heading');
    assert.ok(Array.isArray(section.links), 'every wing must have a links array');
  }
});

test('fan-out panels: Pantheon mega-panel and Codex panel have their destinations', () => {
  const { navLinksHtml } = require('../scripts/sync-desktop-nav.js');
  const html = navLinksHtml(null);
  assert.ok(html.includes('nav-hub-panel--mega'), 'pantheon mega-panel missing');
  for (const c of PANTHEON_CHILDREN) {
    assert.ok(html.includes(`href="${c.href}"`), `mega-panel missing ${c.label} (${c.href})`);
  }
  for (const c of CODEX_CHILDREN) {
    assert.ok(html.includes(`href="${c.href}"`), `codex panel missing ${c.label} (${c.href})`);
  }
  // Store fan-out is Phase B: plain link, no caret/panel until activated.
  const relics = html.slice(html.indexOf('data-hub="relics"'), html.indexOf('data-hub="about"'));
  assert.ok(relics.includes('<a href="/store/">Store</a>'), 'store must be a plain link until Phase B');
  assert.ok(!relics.includes('nav-hub-panel'), 'store panel must not ship before Phase B');
});

test('Pronunciation is footer-only (not in desktop nav menus)', () => {
  const moreHrefs = MORE.flatMap((s) => s.links.map(([href]) => href));
  assert.ok(!moreHrefs.includes('/pronunciation/'), 'More dropdown must not contain Pronunciation');
  const primaryHrefs = PRIMARY.map(([href]) => href);
  assert.ok(
    !primaryHrefs.includes('/pronunciation/'),
    'Primary nav must not contain Pronunciation'
  );
});

test('every target page carries the canonical primary links in order', () => {
  for (const { page } of TARGETS) {
    const html = readIfExists(page);
    if (!html) {
      console.warn(`    ⚠ ${page} missing, skipping primary nav check`);
      continue;
    }
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

test('every target page carries the wing dropdowns with their destinations', () => {
  for (const { page } of TARGETS) {
    const html = readIfExists(page);
    if (!html) {
      console.warn(`    ⚠ ${page} missing, skipping dropdown check`);
      continue;
    }
    assert.ok(
      (html.match(/class="nav-hub"/g) || []).length === 6,
      `${page}: expected 6 wing dropdowns`
    );
    for (const id of HUB_ORDER) {
      const hub = HUBS[id];
      for (const item of hub.items) {
        assert.ok(
          html.includes(`href="${item.href}"`),
          `${page}: missing ${hub.label} dropdown link ${item.label} (${item.href})`
        );
        for (const c of childrenOf(item)) {
          assert.ok(
            html.includes(`href="${c.href}"`),
            `${page}: missing fan-out link ${c.label} (${c.href})`
          );
        }
      }
    }
  }
});

test('every target page has the wordmark lockup, Enter CTA, and nav toggle', () => {
  for (const { page, chrome } of TARGETS) {
    if (chrome === 'search') continue; // search pages keep their compact chrome
    const html = readIfExists(page);
    if (!html) {
      console.warn(`    ⚠ ${page} missing, skipping chrome check`);
      continue;
    }
    assert.ok(html.includes('punicodex-wordmark-ivory'), `${page}: wordmark missing`);
    assert.ok(html.includes('class="nav-cta"'), `${page}: Enter CTA missing`);
    assert.ok(html.includes('id="nav-toggle"'), `${page}: nav toggle missing`);
  }
});

test('pages mark their own item aria-current="page"', () => {
  const cases = TARGETS.filter((t) => t.active);
  assert.ok(cases.length >= 15, 'expected most pages to have an active item');
  const navHrefs = new Set();
  for (const id of HUB_ORDER) {
    navHrefs.add(HUBS[id].href);
    for (const item of HUBS[id].items) {
      navHrefs.add(item.href);
      for (const c of childrenOf(item)) navHrefs.add(c.href);
    }
  }
  for (const { page, active } of cases) {
    // Footer-only pages (Rulebook, Pronunciation) are not expected to carry
    // aria-current in the desktop nav menus.
    if (!navHrefs.has(active)) continue;
    const html = readIfExists(page);
    if (!html) {
      console.warn(`    ⚠ ${page} missing, skipping aria-current check`);
      continue;
    }
    // Hub links carry class="nav-link…"; dropdown and fan-out links are
    // class-less, so the class group is optional.
    const tagRe = new RegExp(
      `<a href="${active.replace(/[./]/g, '\\$&')}"( class="nav-link[^"]*")?[^>]*aria-current="page"`
    );
    assert.ok(tagRe.test(html), `${page}: expected aria-current="page" on ${active}`);
  }
  // Spot: codex articles inherit the codex item's current marker.
  const article = read(path.join('codex', 'anatomy-of-a-punycode-domain', 'index.html'));
  assert.ok(/<a href="\/codex\/"[^>]*aria-current="page"/.test(article));
});

test('mobile menu is canonical (4 sections incl. Blog) on pages that carry it', () => {
  const { TARGETS: mobileTargets, CANONICAL_MENU } = require('../scripts/sync-mobile-menu.js');
  assert.ok(
    !CANONICAL_MENU.includes('href="/pronunciation/"'),
    'mobile menu must not contain Pronunciation'
  );
  for (const { page } of mobileTargets) {
    const html = readIfExists(page);
    if (!html) {
      console.warn(`    ⚠ ${page} missing, skipping mobile menu check`);
      continue;
    }
    for (const section of HUB_ORDER.map((id) => HUBS[id].label)) {
      assert.ok(
        html.includes(`<span class="mobile-menu-title">${section}</span>`),
        `${page}: missing mobile section ${section}`
      );
    }
    assert.ok(html.includes('<a href="/blog/">Blog</a>'), `${page}: mobile menu missing Blog`);
    assert.ok(
      html.includes('<a href="/pantheon/" class="mobile-link--featured'),
      `${page}: mobile Pantheon link missing featured class`
    );
    // Nested fan-out: the Pantheon accordion carries the pantheon landings.
    assert.ok(
      html.includes('<details class="mobile-sub">'),
      `${page}: mobile menu missing the Pantheon accordion`
    );
    assert.ok(
      html.includes('<a href="/greek/">Greek</a>'),
      `${page}: mobile Pantheon accordion missing landings`
    );
  }
});

test('component stylesheets are linked where main.css is absent', () => {
  for (const { page } of TARGETS) {
    const html = readIfExists(page);
    if (!html) {
      console.warn(`    ⚠ ${page} missing, skipping stylesheet check`);
      continue;
    }
    if (!html.includes('/css/main.css')) {
      assert.ok(html.includes('/css/nav-more.css'), `${page}: nav-more.css not linked`);
      if (html.includes('class="mobile-menu"')) {
        assert.ok(html.includes('/css/mobile-menu.css'), `${page}: mobile-menu.css not linked`);
      }
    }
    // The hub dropdown styles load on EVERY page: desktop dropdowns at ≥1024px
    // and the drawer-hide rules below that both come from nav-hubs.css.
    assert.ok(html.includes('/css/nav-hubs.css'), `${page}: nav-hubs.css not linked`);
    assert.ok(html.includes('/js/nav-hubs.js'), `${page}: nav-hubs.js not loaded`);
  }
});

test('app surfaces stay nav-free by design (game, entry)', () => {
  assert.ok(!read(path.join('game', 'index.html')).includes('class="main-nav"'));
  assert.ok(!read('entry.html').includes('class="main-nav"'));
});

test('sync-desktop-nav is registered in the generate pipeline before mobile sync', () => {
  const gen = read(path.join('scripts', 'generate.js'));
  const mobileIdx = gen.indexOf("'scripts/sync-mobile-menu.js'");
  const desktopIdx = gen.indexOf("'scripts/sync-desktop-nav.js'");
  assert.ok(mobileIdx !== -1 && desktopIdx !== -1, 'sync scripts missing from generate.js');
  // Fresh pages (everyday, ink, any future insertNav target) receive their
  // <nav> + nav-toggle from the DESKTOP sync; the mobile menu sync inserts
  // its menu only after those exist, so desktop must run first.
  assert.ok(desktopIdx < mobileIdx, 'desktop nav sync must run before mobile menu sync');
});

test('no target page still carries retired variant link sets', () => {
  // The pre-audit variants lacked Connections or Oracle or App or Extension;
  // the canonical set must be a superset present on EVERY page now.
  for (const { page } of TARGETS) {
    const html = readIfExists(page);
    if (!html) {
      console.warn(`    ⚠ ${page} missing, skipping retired variant check`);
      continue;
    }
    for (const href of ['/connections/', '/oracle/', '/app/', '/extension/']) {
      assert.ok(html.includes(`href="${href}"`), `${page}: missing ${href}`);
    }
  }
});

test('no page script double-handles the mobile toggle (open→close in one click)', () => {
  // Regression 2026-07-18: realms/script.js registered its own #nav-toggle
  // handler alongside px-core's; both toggled per click, so the menu opened
  // and closed instantly. Page scripts must defer to px-core's single
  // canonical handler.
  const pageScripts = [path.join('realms', 'script.js'), path.join('lexicon', 'js', 'lexicon.js')];
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
  const mediaBlock = css.match(
    /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*?\.base-nav-links,\s*\n?\s*\.main-nav \.nav-links\s*\{\s*display:\s*none/
  );
  assert.ok(
    mediaBlock,
    'css/temple-base.css: the 768px media block must hide `.main-nav .nav-links` (specificity 0,2,0 beats the later base rule)'
  );
});

console.log(`\nMenu Consistency: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
