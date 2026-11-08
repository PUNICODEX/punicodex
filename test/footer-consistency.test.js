/**
 * PuniCodex — Footer Consistency Tests
 *
 * Guards the canonical hub-mirror site footer: every non-temple page must
 * carry the same footer (camel wordmark, tagline, "Begin the Ascent", six
 * hub columns generated from scripts/nav-tree.js, legal line) — the drift
 * the 2026-07-19 audit found (custom minimal footers on realms/lexicon/blog,
 * none at all on search + terms subpages) must not return, and the
 * pre-hub Explore/Resources/Connect taxonomy must not resurrect.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const {
  TARGETS,
  HUB_ORDER,
  HUBS,
  featuredLinks,
  footerHrefs,
  footerHtml,
} = require('../scripts/sync-footer.js');

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

test('footer builder derives every hub column from nav-tree.js', () => {
  const html = footerHtml();
  for (const id of HUB_ORDER) {
    const hub = HUBS[id];
    assert.ok(
      html.includes(`<h2 class="footer-heading"><a href="${hub.href}">${hub.label}</a></h2>`),
      `footer missing hub heading ${hub.label} (${hub.href})`
    );
    assert.ok(html.includes(hub.role), `footer missing hub role line for ${hub.label}`);
    for (const l of featuredLinks(hub)) {
      assert.ok(
        html.includes(`<a href="${l.href}">${l.label}</a>`),
        `footer ${hub.label} column missing featured spoke ${l.label}`
      );
    }
    // No redundant "All of" escape — the column heading IS the hub link.
    assert.ok(!html.includes('footer-all'), 'redundant footer-all escape resurrected');
  }
  // The Archē door and the legal pair.
  assert.ok(
    html.includes('class="footer-begin">Begin the Ascent</a>'),
    'footer missing Begin the Ascent'
  );
  assert.ok(
    html.includes('href="/privacy/"') && html.includes('href="/terms/"'),
    'legal links missing'
  );
});

test('retired taxonomy and archived pages stay out of the footer', () => {
  const html = footerHtml();
  for (const heading of ['>Explore<', '>Resources<', '>Connect<']) {
    assert.ok(!html.includes(heading), `retired footer column heading ${heading} resurrected`);
  }
  for (const href of ['/innovation/', '/arbitrage/', '/art/', '/creatives/']) {
    assert.ok(!html.includes(`href="${href}"`), `footer must not link archived/redirected ${href}`);
  }
});

test('footer + menu resolve the 2026-11 audit findings', () => {
  const { HUBS } = require('../scripts/nav-tree.js');
  const hrefs = footerHrefs();
  // Pronunciation is a Library SPOKE (menu + hub page); Engineering is an
  // About spoke featured in the footer.
  assert.ok(
    HUBS.library.items.some((i) => i.href === '/pronunciation/'),
    'Library hub missing Pronunciation'
  );
  assert.ok(hrefs.includes('/engineering/'), 'footer missing Engineering (About)');
  // Tools spokes are represented.
  for (const h of ['/type/', '/oracle/', '/appraise/', '/api/v1/docs/']) {
    assert.ok(hrefs.includes(h), `footer missing Tools spoke ${h}`);
  }
  // No duplicate destinations under different labels. Hub pages legitimately
  // appear twice per column — the heading link and the "All of" escape.
  const html = footerHtml();
  const hubHrefs = new Set(HUB_ORDER.map((id) => HUBS[id].href));
  const all = [...html.matchAll(/<a href="(\/[^"]*)"/g)]
    .map((m) => m[1])
    .filter((h) => !hubHrefs.has(h));
  const dupes = all.filter((h, i) => all.indexOf(h) !== i);
  assert.deepStrictEqual(
    [...new Set(dupes)],
    [],
    `duplicate footer destinations: ${[...new Set(dupes)]}`
  );
});

test('every target page has exactly one hub-mirror footer', () => {
  for (const rel of TARGETS) {
    const html = readIfExists(rel);
    if (!html) {
      console.warn(`    ⚠ ${rel} missing, skipping footer check`);
      continue;
    }
    const footerCount = (html.match(/<footer[\s>]/gi) || []).length;
    assert.strictEqual(footerCount, 1, `${rel}: expected exactly 1 footer, found ${footerCount}`);
    for (const id of HUB_ORDER) {
      const hub = HUBS[id];
      assert.ok(
        html.includes(`<h2 class="footer-heading"><a href="${hub.href}">${hub.label}</a></h2>`),
        `${rel}: missing footer column ${hub.label}`
      );
    }
  }
});

test('every footer carries the camel wordmark and all canonical links', () => {
  const html = footerHtml();
  for (const rel of TARGETS) {
    const page = readIfExists(rel);
    if (!page) {
      console.warn(`    ⚠ ${rel} missing, skipping footer links check`);
      continue;
    }
    const footer = page.slice(page.search(/<footer[\s>]/i));
    assert.ok(footer.includes('punicodex-wordmark-camel-gold'), `${rel}: camel wordmark missing`);
    for (const href of footerHrefs()) {
      assert.ok(footer.includes(`href="${href}"`), `${rel}: missing footer link ${href}`);
    }
  }
});

test('no leftover retired footer variants (stacked lockup, text wordmark)', () => {
  for (const rel of TARGETS) {
    const html = readIfExists(rel);
    if (!html) {
      console.warn(`    ⚠ ${rel} missing, skipping retired variant check`);
      continue;
    }
    const footer = html.slice(html.search(/<footer[\s>]/i));
    assert.ok(
      !footer.includes('punicodex-lockup-stacked-gold') && !footer.includes('class="footer-logo"'),
      `${rel}: retired footer variant still present`
    );
  }
});

test('footer stylesheet is singular, current, and never duplicates main.css', () => {
  for (const rel of TARGETS) {
    const html = readIfExists(rel);
    if (!html) {
      console.warn(`    ⚠ ${rel} missing, skipping footer stylesheet check`);
      continue;
    }
    const links =
      html.match(/<link\s+rel="stylesheet"\s+href="\/css\/footer\.css[^"]*"\s*>/g) || [];
    if (html.includes('/css/main.css')) {
      assert.strictEqual(links.length, 0, `${rel}: footer.css duplicates main.css`);
    } else {
      assert.strictEqual(links.length, 1, `${rel}: expected exactly one footer.css link`);
      assert.ok(links[0].includes('/css/footer.css?v=8'), `${rel}: stale footer.css version`);
    }
  }
});

test('responsive grid rules exist for every width band (6-up → 3-up → 2-up)', () => {
  const shared = read(path.join('css', 'footer.css'));
  assert.ok(shared.includes('repeat(6, 1fr)'), 'footer.css missing the six-hub desktop grid');
  assert.ok(
    /@media \(max-width: 768px\)[\s\S]*grid-template-columns: repeat\(3, 1fr\)/.test(shared),
    'footer.css missing the 3-up mobile grid (two tidy rows)'
  );
  assert.ok(
    /@media \(max-width: 400px\)[\s\S]*grid-template-columns: 1fr 1fr/.test(shared),
    'footer.css missing the 2-up narrow fallback'
  );
  assert.ok(shared.includes('width: 150px'), 'footer.css missing compact mobile wordmark');
  const main = read(path.join('css', 'main.css'));
  for (const [label, css] of [
    ['main.css', main],
    ['footer.css', shared],
  ]) {
    assert.match(
      css,
      /\.site-footer \.container\s*\{[^}]*padding: 0 var\(--space-6\);/,
      `${label}: footer must own the homepage desktop container padding`
    );
    assert.match(
      css,
      /@media \(max-width: 768px\)[\s\S]*?\.site-footer \.container\s*\{[^}]*padding: 0 var\(--space-3\);/,
      `${label}: footer must own the homepage mobile container padding`
    );
  }
  assert.ok(main.includes('repeat(6, 1fr)'), 'main.css missing the six-hub desktop grid');
  const mainMobile = main.slice(main.lastIndexOf('@media (max-width: 768px)'));
  assert.ok(
    mainMobile.includes('grid-template-columns: repeat(3, 1fr)'),
    'main.css mobile footer must be 3-up (two tidy rows of hubs)'
  );
  assert.ok(
    /@media \(max-width: 400px\)[\s\S]*grid-template-columns: 1fr 1fr/.test(main),
    'main.css missing the 2-up narrow fallback'
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
