/**
 * Brand Integration Regression Tests (chrome wave + body-content wave)
 *
 * Guards the 2026-07-18 brand integration (docs/brand/brand-integration-plan.md):
 *  (a) the old P<span…>U</span>NYCODEX wordmark and the macron U are gone from
 *      every chrome-owned canonical file (generated sites/, root scholars/,
 *      node_modules and the read-only kit dir are excluded by construction),
 *  (b) the kit favicon cluster (svg/ico/apple-touch-icon/mask-icon/manifest)
 *      is present in every head that received it, and og:image points at the
 *      kit OG PNG,
 *  (c) the copied site.webmanifest (and the updated root manifest.json) are
 *      valid JSON with name + icons,
 *  (d) every /assets/brand/ file referenced by the edited HTML/CSS/JS/manifests
 *      exists on disk.
 * Body-content wave (page art, tiers, card fallback, admin debt):
 *  (e) the 7 root pages that still lacked favicons (art, authenticity,
 *      university-sponsorship, search.html, search-v2.html, realms, lexicon —
 *      plus terms/ + terms/data-use/, which had none either) now carry the
 *      kit cluster,
 *  (f) the tiers rebuild references the three tier seals, the triad ziggurat,
 *      and the gold .pc-display heading class,
 *  (g) js/pantheon.js + js/home.js reference the empty-portrait fallback,
 *  (h) every /assets/brand/ reference in the body-wave files exists on disk,
 *  (i) platform/public/admin-portal/portal.js has no `Ú</span>NYCODEX` remnant
 *      and renders the solid wordmark image instead.
 *
 * Note: platform/public/scholars/index.html does not exist — the scholars
 * portal root is a directory of sub-pages — so the representative scholars
 * page asserted here is platform/public/scholars/login/index.html.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nBrand Integration Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

// ---- file inventories -------------------------------------------------------

const ROOT_PAGES = [
  'index.html',
  '404.html',
  'oracle.html',
  'search.html',
  'search-v2.html',
  'about/index.html',
  'appraise/index.html',
  'art/index.html',
  'authenticity/index.html',
  'codex/index.html',
  'codex/anatomy-of-a-punycode-domain/index.html',
  'codex/building-the-temple/index.html',
  'codex/why-greek-accents-matter/index.html',
  'connections/index.html',
  'contact/index.html',
  'creatives/index.html',
  'lexicon/index.html',
  'pantheon/index.html',
  'privacy/index.html',
  'realms/index.html',
  'store/index.html',
  'terms/index.html',
  'terms/data-use/index.html',
  'tiers/index.html',
  'type/index.html',
  'university-sponsorship/index.html',
];

const FLAGSHIP_TEMPLATES = [
  'templates/flagship/index.html',
  'templates/flagship/lore/index.html',
  'templates/flagship/lore/extended/index.html',
  'templates/flagship/gallery/index.html',
  'templates/flagship/patterns/index.html',
  'templates/flagship/scholars/index.html',
  'templates/flagship/blog/index.html',
  'templates/flagship/creatives/index.html',
  'templates/flagship/patron/index.html',
];

const SCHOLARS_PAGES = [
  'platform/public/scholars/admin/index.html',
  'platform/public/scholars/analytics/index.html',
  'platform/public/scholars/apply/index.html',
  'platform/public/scholars/creatives/index.html',
  'platform/public/scholars/creatives/creator.html',
  'platform/public/scholars/dashboard/index.html',
  'platform/public/scholars/dept-admin/index.html',
  'platform/public/scholars/institution/index.html',
  'platform/public/scholars/login/index.html',
  'platform/public/scholars/review/index.html',
  'platform/public/scholars/search/index.html',
];

const CHROME_SCRIPTS = [
  'scripts/generate-temples.js',
  'scripts/fix-flagship-nav.js',
  'scripts/fix-main-footers.js',
];

const CLIENT_FILES = [
  'mobile/index.html',
  'mobile/shield.html',
  'extension/popup/popup.html',
  'extension/options/options.html',
];

const CHROME_CSS = [
  'css/main.css',
  'css/temple-base.css',
  'css/oracle.css',
  'css/search-system.css',
  'css/punicodex-tokens.css',
  'css/punicodex-motion.css',
  'creatives/creatives.css',
  'realms/styles.css',
  'mobile/css/mobile.css',
  'extension/popup/popup.css',
  'extension/options/options.css',
  'templates/flagship/flagship.css',
  'platform/public/scholars/creatives/creatives.css',
];

// All canonical files whose chrome this wave owns. Generated sites/**, root
// scholars/**, admin-portal/** and the superseded historical doc
// branding/punicodex/punicodex_visual_identity_system.md (retained as an
// archive, marked superseded) are intentionally absent.
const OWNED_FILES = [
  ...ROOT_PAGES,
  ...FLAGSHIP_TEMPLATES,
  ...SCHOLARS_PAGES,
  ...CHROME_SCRIPTS,
  ...CLIENT_FILES,
  ...CHROME_CSS,
  'manifest.json',
];

// The 16 root pages that carried the data-URI psi favicon (plan §5.2)
const FAVICON_PAGES = ROOT_PAGES.filter((rel) =>
  [
    'index.html',
    '404.html',
    'about/index.html',
    'appraise/index.html',
    'codex/index.html',
    'codex/anatomy-of-a-punycode-domain/index.html',
    'codex/building-the-temple/index.html',
    'codex/why-greek-accents-matter/index.html',
    'connections/index.html',
    'contact/index.html',
    'oracle.html',
    'pantheon/index.html',
    'privacy/index.html',
    'store/index.html',
    'tiers/index.html',
    'type/index.html',
  ].includes(rel)
);

const CLUSTER_HEADS = [...FAVICON_PAGES, ...FLAGSHIP_TEMPLATES, ...SCHOLARS_PAGES];

const OG_IMAGE = 'https://punicodex.com/assets/brand/05-social/punicodex-og-image-1200x630.png';

// ---- (a) old wordmark purge --------------------------------------------------

const OLD_MARK_PATTERNS = [
  'P<span class="accent">U</span>NYCODEX',
  'P<span>U</span>NYCODEX',
  'PUNY<span>CODEX</span>',
  'P<span>Ú</span>NYCODEX',
  'PŪNYCODEX',
];

test('(a) old span wordmark is gone from all owned canonical files', () => {
  for (const rel of OWNED_FILES) {
    const content = read(rel);
    for (const pattern of OLD_MARK_PATTERNS) {
      assert.ok(!content.includes(pattern), `${rel} still contains ${pattern}`);
    }
  }
});

test('(a) macron Ū survives only in legitimate non-brand contexts', () => {
  // scripts/generate-temples.js keeps Ū inside the /[āēīōūĀĒĪŌŪ]/ tier
  // classification regex (long-vowel detection over lexicon names) — that is
  // the only permitted capital-Ū context.
  const allowed = new Set(['scripts/generate-temples.js']);
  for (const rel of OWNED_FILES) {
    if (allowed.has(rel)) continue;
    assert.ok(!/Ū/.test(read(rel)), `${rel} contains a capital Ū`);
  }
});

test('(a) data-URI psi favicon and og-default are gone from owned files', () => {
  for (const rel of OWNED_FILES) {
    const content = read(rel);
    assert.ok(!content.includes('%CE%A8'), `${rel} still has the data-URI psi favicon`);
    assert.ok(
      !/assets\/images\/og-default\.(svg|png|webp)/.test(content),
      `${rel} still references assets/images/og-default.*`
    );
    assert.ok(
      !content.includes('/assets/images/apple-touch-icon.png'),
      `${rel} still references the old apple-touch-icon`
    );
  }
});

// ---- (b) favicon cluster + OG image -----------------------------------------

const CLUSTER_MARKUP = [
  '<link rel="icon" type="image/svg+xml" href="/assets/brand/02-favicons/favicon.svg">',
  '<link rel="icon" href="/assets/brand/02-favicons/favicon.ico" sizes="any">',
  '<link rel="apple-touch-icon" href="/assets/brand/02-favicons/apple-touch-icon.png">',
  '<link rel="mask-icon" href="/assets/brand/02-favicons/mask-icon.svg" color="#D4AF37">',
  '<link rel="manifest" href="/assets/brand/06-code/site.webmanifest">',
];

test('(b) kit favicon cluster present in every head that received it', () => {
  for (const rel of [...CLUSTER_HEADS, 'scripts/generate-temples.js']) {
    const content = read(rel);
    for (const markup of CLUSTER_MARKUP) {
      assert.ok(content.includes(markup), `${rel} is missing: ${markup}`);
    }
  }
});

test('(b) representative pages carry the cluster and the kit OG image', () => {
  for (const rel of [
    'index.html',
    'templates/flagship/index.html',
    'platform/public/scholars/login/index.html',
  ]) {
    const content = read(rel);
    for (const markup of CLUSTER_MARKUP) {
      assert.ok(content.includes(markup), `${rel} is missing: ${markup}`);
    }
  }
  // index.html: og:image + twitter:image; flagship template: JSON-LD
  // primaryImageOfPage (its og:image stays the per-temple mascot).
  assert.ok(read('index.html').includes(`<meta property="og:image" content="${OG_IMAGE}">`));
  assert.ok(read('index.html').includes(`<meta name="twitter:image" content="${OG_IMAGE}">`));
  assert.ok(read('templates/flagship/index.html').includes(OG_IMAGE));
});

test('(b) every root page og:image/twitter:image uses the kit OG PNG', () => {
  const ogRef = /content="https:\/\/punicodex\.com\/assets\/images\/og-default\.(svg|png|webp)"/;
  for (const rel of ROOT_PAGES) {
    const content = read(rel);
    assert.ok(!ogRef.test(content), `${rel} still has an og-default reference`);
    if (content.includes('og:image')) {
      assert.ok(content.includes(OG_IMAGE), `${rel} og:image is not the kit PNG`);
    }
  }
  const gen = read('scripts/generate-temples.js');
  assert.strictEqual((gen.match(/assets\/images\/og-default/g) || []).length, 0);
  assert.ok(
    (gen.match(/assets\/brand\/05-social\/punicodex-og-image-1200x630\.png/g) || []).length >= 3
  );
});

// ---- (c) manifests ------------------------------------------------------------

test('(c) site.webmanifest is valid JSON with name and icons', () => {
  const manifest = JSON.parse(read('assets/brand/06-code/site.webmanifest'));
  assert.ok(manifest.name, 'site.webmanifest has no name');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'no icons');
  for (const icon of manifest.icons) {
    assert.ok(icon.src && icon.sizes, 'icon entry missing src/sizes');
    assert.ok(
      fs.existsSync(path.join(root, icon.src.replace(/^\//, ''))),
      `icon not on disk: ${icon.src}`
    );
  }
});

test('(c) root manifest.json is valid JSON with kit icons and #0A0A0C colors', () => {
  const manifest = JSON.parse(read('manifest.json'));
  assert.ok(manifest.name, 'manifest.json has no name');
  assert.strictEqual(manifest.theme_color, '#0A0A0C');
  assert.strictEqual(manifest.background_color, '#0A0A0C');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'no icons');
  for (const icon of manifest.icons) {
    assert.ok(icon.src.startsWith('/assets/brand/'), `non-kit icon: ${icon.src}`);
  }
});

// ---- (d) referenced brand assets exist on disk ---------------------------------

test('(d) every /assets/brand/ reference in edited files resolves to a real file', () => {
  const refPatterns = [
    /(?:src|href)="(\/assets\/brand\/[^"]+)"/g,
    /url\(["']?(\/assets\/brand\/[^)"']+)["']?\)/g,
    /"src":\s*"(\/assets\/brand\/[^"]+)"/g,
  ];
  const files = [...OWNED_FILES, 'assets/brand/06-code/site.webmanifest'];
  const refs = new Set();
  for (const rel of files) {
    const content = read(rel);
    for (const re of refPatterns) {
      for (const match of content.matchAll(re)) {
        refs.add(match[1]);
      }
    }
  }
  assert.ok(refs.size > 0, 'no /assets/brand/ references found — scan is broken');
  for (const ref of refs) {
    const clean = ref.split(/[?#]/)[0];
    assert.ok(
      fs.existsSync(path.join(root, clean.replace(/^\//, ''))),
      `referenced brand asset missing on disk: ${ref}`
    );
  }
});

// ---- (e) favicon cluster on the pages the first wave missed -------------------

// The 7 root pages the parent tasked (art, authenticity, university-sponsorship,
// search.html, search-v2.html, realms, lexicon). terms/ and terms/data-use/
// turned out to have no favicon links at all and received the cluster too.
const BODY_CLUSTER_PAGES = [
  'art/index.html',
  'authenticity/index.html',
  'university-sponsorship/index.html',
  'search.html',
  'search-v2.html',
  'realms/index.html',
  'lexicon/index.html',
  'terms/index.html',
  'terms/data-use/index.html',
];

test('(e) kit favicon cluster present on the pages the first wave missed', () => {
  for (const rel of BODY_CLUSTER_PAGES) {
    const content = read(rel);
    for (const markup of CLUSTER_MARKUP) {
      assert.ok(content.includes(markup), `${rel} is missing: ${markup}`);
    }
  }
});

// ---- (f) tiers page rebuild ----------------------------------------------------

test('(f) tiers page references the three seals, the ziggurat, and pc-display', () => {
  const tiers = read('tiers/index.html');
  for (const seal of [
    'punicodex-badge-tier-1.png',
    'punicodex-badge-tier-2.png',
    'punicodex-badge-dual-tier.png',
  ]) {
    assert.ok(tiers.includes(`/assets/brand/04-badges/${seal}`), `tiers missing ${seal}`);
  }
  assert.ok(
    tiers.includes('/assets/brand/13-page-visuals/tiers/triad-ziggurat.png'),
    'tiers missing the triad ziggurat'
  );
  assert.ok(
    /class="tier-hero-title pc-display/.test(tiers),
    'tiers H1 does not carry the gold .pc-display class'
  );
});

// ---- (g) empty-portrait card fallback -------------------------------------------

test('(g) js/pantheon.js and js/home.js reference the empty-portrait fallback', () => {
  for (const rel of ['js/pantheon.js', 'js/home.js']) {
    const content = read(rel);
    assert.ok(
      content.includes('/assets/brand/03-ornaments/punicodex-empty-portrait.png'),
      `${rel} does not reference punicodex-empty-portrait.png`
    );
  }
});

// ---- (h) brand references in body-wave files resolve ----------------------------

// Every file the body-content wave edited (pages, css, js, admin, template, api).
const BODY_WAVE_FILES = [
  'index.html',
  '404.html',
  'oracle.html',
  'search.html',
  'search-v2.html',
  'about/index.html',
  'appraise/index.html',
  'art/index.html',
  'authenticity/index.html',
  'authenticity/styles.css',
  'codex/index.html',
  'codex/anatomy-of-a-punycode-domain/index.html',
  'codex/building-the-temple/index.html',
  'codex/why-greek-accents-matter/index.html',
  'connections/index.html',
  'contact/index.html',
  'creatives/index.html',
  'lexicon/index.html',
  'lexicon/css/lexicon.css',
  'pantheon/index.html',
  'realms/index.html',
  'store/index.html',
  'terms/index.html',
  'terms/data-use/index.html',
  'tiers/index.html',
  'type/index.html',
  'type/css/type.css',
  'university-sponsorship/index.html',
  'css/brand-overrides.css',
  'css/home-v2.css',
  'css/tiers.css',
  'css/about.css',
  'css/pantheon.css',
  'css/connections.css',
  'css/contact.css',
  'css/store.css',
  'css/codex.css',
  'css/404.css',
  'css/university-collaborators.css',
  'js/home.js',
  'js/pantheon.js',
  'api/v1/docs/index.js',
  'platform/public/scholars/apply/index.html',
  'platform/public/admin-portal/portal.js',
  'platform/public/admin-portal/index.html',
  'platform/public/admin-portal/login/index.html',
  'platform/public/admin-portal/applications/index.html',
  'platform/public/admin-portal/patrons/index.html',
  'platform/public/admin-portal/scholars/index.html',
  'platform/public/admin-portal/users/index.html',
  'templates/flagship/index.html',
];

test('(h) every /assets/brand/ reference in body-wave files exists on disk', () => {
  const refPatterns = [
    /(?:src|href|srcset|poster)="(\/assets\/brand\/[^"]+)"/g,
    /url\(["']?(\/assets\/brand\/[^)"']+)["']?\)/g,
  ];
  const refs = new Set();
  for (const rel of BODY_WAVE_FILES) {
    const content = read(rel);
    for (const re of refPatterns) {
      for (const match of content.matchAll(re)) {
        refs.add(match[1]);
      }
    }
  }
  assert.ok(refs.size > 20, `suspiciously few brand refs found (${refs.size}) — scan is broken`);
  for (const ref of refs) {
    const clean = ref.split(/[?#]/)[0];
    assert.ok(
      fs.existsSync(path.join(root, clean.replace(/^\//, ''))),
      `referenced brand asset missing on disk: ${ref}`
    );
  }
});

// ---- (i) admin portal wordmark debt ----------------------------------------------

test('(i) admin portal renders the solid wordmark, not the Ú span', () => {
  const portal = read('platform/public/admin-portal/portal.js');
  assert.ok(!portal.includes('Ú</span>NYCODEX'), 'portal.js still has the Ú span wordmark');
  assert.ok(
    portal.includes('/assets/brand/01-logos/punicodex-wordmark-gold-solid.png'),
    'portal.js does not reference the solid wordmark image'
  );
});

run();
