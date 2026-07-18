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
 * Deferred-polish wave (card overlays, legal pages, search emoji, codex
 * mastheads):
 *  (j) pantheon/home card portrait markup still renders mascot imgs for
 *      built archetypes AND css/pantheon.css + css/home-v2.css carry the
 *      medallion-frame ::after overlay rule with the --pc-ring-medallion
 *      ring shadow,
 *  (k) templates/flagship/gallery/index.html thumbs carry the same
 *      medallion-frame overlay (.gallery-figure::after),
 *  (l) the awaiting-restoration stamp rule exists for unbuilt cards
 *      (.archetype-card.unbuilt .card-portrait::before at 35% opacity) —
 *      a rule-presence guard: today's data has zero unbuilt archetypes,
 *  (m) terms/, terms/data-use/, terms/advertising/ and privacy/ all
 *      reference the sealed tablet, and the terms cards use kit glyphs
 *      instead of the old emoji entities (guide §LEGAL.2),
 *  (n) search.html badge/filter rows contain none of the enumerated emoji
 *      removed in this wave (⚙️🏛️👑🔒🔑🌐📑▶️⚡⚠️🏪🧠).
 *
 * Perf/a11y verification wave (docs/perf-a11y-2026-07.md):
 *  (o) every <img> in the brand-owned canonical files carries an alt
 *      (decorative images use alt=""),
 *  (p) the medallion/stamp pseudo-element overlays stay decorative —
 *      empty content and pointer-events:none,
 *  (q) temple mobile menus start aria-hidden + inert and px-core.js keeps
 *      aria-hidden/inert in sync with the open state,
 *  (r) footer column headings are h2 (no h1/h2→h4 skip) and the temple
 *      takeover title is h2,
 *  (s) the brand gold tokens used for text meet WCAG contrast on obsidian
 *      (computed ratios, not vibes),
 *  (t) the pantheon filter pills are styled with AA-passing colors and a
 *      24px+ touch target (Lighthouse color-contrast/target-size fix),
 *  (u) search.html filter selects have explicit labels and the logo link
 *      takes its accessible name from its contents,
 *  (v) the lexicon show-all toggle is a real <button> so aria-pressed is
 *      legal and keyboard activation works.
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
  'terms/advertising/index.html',
  'privacy/index.html',
  'templates/flagship/gallery/index.html',
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

// ---- (j) medallion-frame overlay on pantheon/home cards -----------------------

test('(j) built cards still render mascot imgs AND the medallion overlay rule exists', () => {
  // Mascot invariant: built archetypes render their mascot <img>; the kit
  // empty portrait remains only the unbuilt/error fallback path.
  const pantheon = read('js/pantheon.js');
  assert.ok(
    pantheon.includes('data-fallback="${a.mascotFallback || a.mascotPath}"'),
    'js/pantheon.js no longer renders the mascot thumb img with mascotPath fallback'
  );
  assert.ok(
    pantheon.includes('class="card-portrait-img"'),
    'js/pantheon.js no longer tags the portrait img'
  );
  const home = read('js/home.js');
  assert.ok(
    home.includes('<img src="${a.mascotPath}"'),
    'js/home.js no longer renders the mascotPath img for built archetypes'
  );
  // The medallion frame is a CSS ::after overlay ON TOP of the portrait —
  // it never replaces the img. pointer-events:none keeps the card link
  // clickable; the badge is outside the portrait so it is never covered.
  const MEDALLION_RULE =
    "background: url('/assets/brand/03-ornaments/punicodex-medallion-frame.webp') center / 100% 100% no-repeat;";
  for (const rel of ['css/pantheon.css', 'css/home-v2.css']) {
    const css = read(rel);
    assert.ok(css.includes('.card-portrait::after'), `${rel} missing the medallion ::after rule`);
    assert.ok(css.includes(MEDALLION_RULE), `${rel} missing the medallion-frame asset`);
    assert.ok(
      css.includes('var(--pc-ring-medallion)'),
      `${rel} missing the --pc-ring-medallion ring shadow`
    );
  }
});

// ---- (k) gallery template thumb overlay ----------------------------------------

test('(k) gallery template thumbs carry the medallion-frame overlay', () => {
  const tpl = read('templates/flagship/gallery/index.html');
  assert.ok(
    tpl.includes('.gallery-figure::after'),
    'gallery template missing the .gallery-figure::after thumb overlay rule'
  );
  assert.ok(
    tpl.includes(
      "background: url('/assets/brand/03-ornaments/punicodex-medallion-frame.webp') center / 100% 100% no-repeat;"
    ),
    'gallery template missing the medallion-frame asset on thumbs'
  );
  assert.ok(
    tpl.includes('pointer-events: none;'),
    'gallery thumb overlay must not block the lightbox click'
  );
});

// ---- (l) awaiting-restoration stamp on unbuilt cards ----------------------------

test('(l) unbuilt cards carry the awaiting-restoration stamp rule', () => {
  // Rule-presence guard only: today's archetype data has zero unbuilt
  // entries, so this proves the CSS rule ships, not a live visual.
  for (const rel of ['css/pantheon.css', 'css/home-v2.css']) {
    const css = read(rel);
    assert.ok(
      css.includes('.archetype-card.unbuilt .card-portrait::before'),
      `${rel} missing the unbuilt stamp rule`
    );
    assert.ok(
      css.includes('/assets/brand/08-seals-stamps/punicodex-stamp-awaiting-restoration.webp'),
      `${rel} missing the stamp asset`
    );
    assert.ok(css.includes('opacity: 0.35'), `${rel} stamp must sit at ~35% opacity`);
  }
});

// ---- (m) terms/privacy sealed tablet + kit card glyphs ---------------------------

test('(m) terms and privacy pages reference the sealed tablet and kit card glyphs', () => {
  for (const rel of [
    'terms/index.html',
    'terms/data-use/index.html',
    'terms/advertising/index.html',
    'privacy/index.html',
  ]) {
    assert.ok(
      read(rel).includes('/assets/brand/13-page-visuals/legal/sealed-tablet.png'),
      `${rel} missing the sealed tablet beside its title`
    );
  }
  // Guide §LEGAL.2: the six terms cards use kit glyphs, not emoji entities.
  const terms = read('terms/index.html');
  for (const glyph of [
    '/assets/brand/03-ornaments/punicodex-medallion-frame.png',
    '/assets/brand/08-seals-stamps/punicodex-official-seal.png',
    '/assets/brand/13-page-visuals/type/monolith-cursor.png',
    '/assets/brand/13-page-visuals/search/the-lens.png',
    '/assets/brand/13-page-visuals/api/api-lattice.png',
    '/assets/brand/13-page-visuals/store/golden-brilliant.png',
  ]) {
    assert.ok(terms.includes(glyph), `terms/index.html missing card glyph ${glyph}`);
  }
  for (const entity of [
    '&#128;</div>',
    '&#128214;</div>',
    '&#9000;</div>',
    '&#128269;</div>',
    '&#128241;</div>',
    '&#127760;</div>',
  ]) {
    assert.ok(!terms.includes(entity), `terms/index.html still has emoji icon ${entity}`);
  }
});

// ---- (n) search.html badge/filter-row emoji purge ---------------------------------

test('(n) no emoji remain in search.html badge/filter rows', () => {
  const search = read('search.html');
  // The enumerated badge/filter-row emoji removed in the polish wave.
  const REMOVED = [
    '⚙️ Refine', // filter toggle
    '🏛️ Flagship', // serp-badge flagship
    '👑 Crown Jewel', // lease-badge flagship + kp-tenant-label
    '🔒 Leased', // lease-badge leased
    '🔑 Available', // lease-badge available
    '🌐 Unicode', // unicode-badge
    '📑 ${r.sitemapEntries} pages', // serp-sitemap-badge
    '▶️ Video', // serp-sitemap-badge video
    '>⚡ ${r.scoreBreakdown', // score-breakdown badge
    'trust-warning">⚠️ ', // trust-warning badge
    '🏪 Tenant', // tenant-label + kp-tenant-label
    '🧠 semantic match', // semantic fallback badge
    'query-trust-${data.queryTrust.severity}">⚠️ ', // query trust banner
  ];
  for (const s of REMOVED) {
    assert.ok(!search.includes(s), `search.html still has badge/filter-row emoji: ${s}`);
  }
  // The on-brand text treatments that replaced them still render.
  assert.ok(search.includes('>Refine</button>'), 'filter toggle lost its label');
  assert.ok(
    search.includes('"serp-badge flagship">Flagship</span>'),
    'flagship badge lost its label'
  );
  assert.ok(search.includes('"lease-badge leased">Leased</span>'), 'leased badge lost its label');
  assert.ok(search.includes('"unicode-badge">Unicode</span>'), 'unicode badge lost its label');
});

// ---- (o) alt coverage on every brand <img> ------------------------------------

test('(o) every <img> in brand-owned canonical files has an alt attribute', () => {
  const SCAN = [
    ...ROOT_PAGES,
    ...FLAGSHIP_TEMPLATES,
    ...SCHOLARS_PAGES,
    ...CLIENT_FILES,
    'js/pantheon.js',
    'js/home.js',
    'platform/public/admin-portal/portal.js',
    'scripts/create-flagship.js',
    'scripts/generate-temples.js',
    'scripts/fix-main-footers.js',
    'scripts/fix-flagship-nav.js',
  ];
  for (const rel of SCAN) {
    const content = read(rel);
    for (const match of content.matchAll(/<img\b[^>]*>/g)) {
      assert.ok(
        /\balt=/.test(match[0]),
        `${rel} has an <img> without alt: ${match[0].slice(0, 100)}`
      );
    }
  }
});

// ---- (p) decorative overlays stay decorative ------------------------------------

test('(p) medallion/stamp overlays have empty content and pointer-events:none', () => {
  for (const rel of ['css/pantheon.css', 'css/home-v2.css']) {
    const css = read(rel);
    for (const sel of ['.card-portrait::after', '.archetype-card.unbuilt .card-portrait::before']) {
      const i = css.indexOf(sel);
      assert.ok(i !== -1, `${rel} missing the ${sel} rule`);
      const rule = css.slice(i, css.indexOf('}', i));
      assert.ok(
        /content:\s*(''|"")/.test(rule),
        `${rel} ${sel} must not render text via the content property`
      );
      assert.ok(rule.includes('pointer-events: none'), `${rel} ${sel} must be pointer-events:none`);
    }
  }
});

// ---- (q) temple mobile menu: aria-hidden + inert, synced by px-core -------------

test('(q) temple mobile menus start inert and px-core syncs aria-hidden/inert', () => {
  for (const rel of FLAGSHIP_TEMPLATES) {
    assert.ok(
      read(rel).includes('id="temple-mobile-menu" aria-hidden="true" inert'),
      `${rel} mobile menu must start aria-hidden + inert so its links are unreachable while closed`
    );
  }
  const px = read('js/px-core.js');
  assert.ok(
    px.includes("mobileMenu.setAttribute('aria-hidden', open ? 'false' : 'true')"),
    'js/px-core.js must toggle aria-hidden with the menu open state'
  );
  assert.ok(
    px.includes('mobileMenu.inert = !open'),
    'js/px-core.js must toggle inert with the menu open state'
  );
});

// ---- (r) heading order guards ----------------------------------------------------

test('(r) footer column headings are h2 and the temple takeover title is h2', () => {
  for (const rel of OWNED_FILES) {
    assert.ok(
      !read(rel).includes('<h4 class="footer-heading">'),
      `${rel} still has an h4 footer heading (heading-level skip)`
    );
  }
  assert.ok(
    read('templates/flagship/index.html').includes('<h2 class="takeover-title">'),
    'flagship index template takeover title must be h2 (h1 -> h3 skip otherwise)'
  );
});

// ---- (s) brand gold contrast on obsidian (WCAG, computed) -------------------------

test('(s) gold tokens used for text meet WCAG contrast on obsidian', () => {
  const lum = (hex) => {
    const c = hex.replace('#', '');
    const ch = [0, 2, 4]
      .map((i) => parseInt(c.substr(i, 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
  };
  const ratio = (fg, bg) => {
    const hi = Math.max(lum(fg), lum(bg));
    const lo = Math.min(lum(fg), lum(bg));
    return (hi + 0.05) / (lo + 0.05);
  };
  // Normal-text tokens on --pc-obsidian #0A0A0C: AA requires >= 4.5:1.
  assert.ok(ratio('#D4AF37', '#0A0A0C') >= 4.5, '--pc-gold must pass AA normal text');
  assert.ok(ratio('#F5E3A8', '#0A0A0C') >= 4.5, '--pc-gold-highlight must pass AA normal text');
  assert.ok(ratio('#C9A23F', '#0A0A0C') >= 4.5, '--pc-gold-mid must pass AA normal text');
  // --pc-gold-deep only appears in the .pc-display gradient at display sizes
  // (>= 36px): large text requires >= 3:1.
  assert.ok(ratio('#8C6A22', '#0A0A0C') >= 3, '--pc-gold-deep must pass AA large text');
});

// ---- (t) pantheon filter pills: AA colors + 24px touch targets --------------------

test('(t) pantheon filter pills are styled with passing colors and touch targets', () => {
  const css = read('css/pantheon.css');
  const i = css.indexOf('.filter-pill {');
  assert.ok(i !== -1, 'css/pantheon.css missing the .filter-pill rule');
  const rule = css.slice(i, css.indexOf('}', i));
  assert.ok(
    rule.includes('min-height: 32px'),
    'filter pills must meet the 24px touch-target minimum'
  );
  assert.ok(
    rule.includes('color: var(--text-secondary)'),
    'filter pill text must use the AA-passing secondary token'
  );
  assert.ok(css.includes('.filter-pill.active'), 'missing the .filter-pill.active state');
});

// ---- (u) search.html select labels + logo accessible name --------------------------

test('(u) search filter selects have explicit labels; logo name matches contents', () => {
  const html = read('search.html');
  assert.ok(
    html.includes('for="pantheonFilter">Pantheon</label>'),
    '#pantheonFilter needs an explicit label'
  );
  assert.ok(html.includes('for="sortFilter">Sort</label>'), '#sortFilter needs an explicit label');
  assert.ok(
    html.includes('<a href="/" class="cn-logo-row">'),
    'cn-logo-row must take its accessible name from its contents (no overriding aria-label)'
  );
});

// ---- (v) lexicon show-all toggle is a real button -----------------------------------

test('(v) lexicon show-all toggle is a button so aria-pressed is allowed', () => {
  const html = read('lexicon/index.html');
  assert.ok(
    html.includes('<button type="button" class="filter-toggle" id="filter-show-all"'),
    'filter-show-all must be a <button type="button">'
  );
  assert.ok(
    !html.includes('<label class="filter-toggle" id="filter-show-all"'),
    'filter-show-all must not be a <label> (aria-pressed is not allowed on label)'
  );
});

run();
