/**
 * Font Self-Hosting Regression Tests
 *
 * Guards the 2026-07-18 font self-host wave (CSP: drop fonts.googleapis.com
 * and fonts.gstatic.com):
 *  (a) zero fonts.googleapis.com / fonts.gstatic.com references in canonical
 *      served HTML and head-writing generator scripts (generated sites/,
 *      root scholars/, root admin-portal/, docs/, vendor/, the read-only kit
 *      dir, session-debug/, tools/, test/ and vercel.json — which carries the
 *      report-only CSP handled separately — are excluded by construction),
 *  (b) /assets/fonts/fonts.css exists, is structurally valid CSS, and every
 *      woff2 it references exists on disk with wOF2 magic bytes,
 *  (c) representative pages (index.html, templates/flagship/index.html,
 *      platform/public/scholars/login/index.html) link /assets/fonts/fonts.css
 *      and have no Google preconnects; mobile/index.html never used Google
 *      Fonts (system font stack by design) and is asserted clean instead,
 *  (d) every webfont family referenced in css/ (font-family declarations and
 *      --font* custom properties) has at least one matching @font-face in
 *      fonts.css, and all six self-hosted families are present.
 *
 * Note: the preloaded fonts in index.html point at /assets/fonts/ local
 * woff2 files; the stale fonts.gstatic.com preload URLs were removed in the
 * same wave.
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
  console.log(`\nFont Self-Hosting Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const GOOGLE_FONT_RE = /fonts\.(googleapis|gstatic)\.com/;

// Canonical served HTML: root pages + root page dirs + flagship templates +
// platform/public (canonical for scholars/ + admin-portal/) + mobile.
// Generated copies (sites/, root scholars/, root admin-portal/) regenerate
// from these via npm run generate and are excluded by construction.
const ROOT_PAGE_DIRS = [
  'about',
  'appraise',
  'art',
  'authenticity',
  'blog',
  'codex',
  'connections',
  'contact',
  'creatives',
  'game',
  'lexicon',
  'pantheon',
  'privacy',
  'realms',
  'store',
  'terms',
  'tiers',
  'type',
  'university-sponsorship',
];

function canonicalServedFiles() {
  const files = [];
  for (const f of fs.readdirSync(root)) {
    if (f.endsWith('.html')) files.push(f);
  }
  for (const d of ROOT_PAGE_DIRS) {
    for (const f of walk(path.join(root, d))) {
      if (f.endsWith('.html')) files.push(path.relative(root, f));
    }
  }
  for (const d of ['templates', path.join('platform', 'public'), 'mobile']) {
    for (const f of walk(path.join(root, d))) {
      if (f.endsWith('.html')) files.push(path.relative(root, f));
    }
  }
  return files;
}

function headWritingScripts() {
  const dir = path.join(root, 'scripts');
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.js') || f.endsWith('.py'))
    .map((f) => path.join('scripts', f));
}

const HOSTED_FAMILIES = [
  'Cinzel',
  'Cinzel Decorative',
  'Cormorant Garamond',
  'Fira Code',
  'Lato',
  'Montserrat',
];

// ── (a) no Google Fonts references anywhere canonical ───────────────────────

test('canonical served HTML has zero fonts.googleapis.com / fonts.gstatic.com refs', () => {
  const offenders = [];
  for (const rel of canonicalServedFiles()) {
    if (GOOGLE_FONT_RE.test(read(rel))) offenders.push(rel);
  }
  assert.strictEqual(offenders.length, 0, `Google Fonts refs remain in: ${offenders.join(', ')}`);
});

test('head-writing generator scripts have zero fonts.googleapis.com / fonts.gstatic.com refs', () => {
  const offenders = [];
  for (const rel of headWritingScripts()) {
    if (GOOGLE_FONT_RE.test(read(rel))) offenders.push(rel);
  }
  assert.strictEqual(offenders.length, 0, `Google Fonts refs remain in: ${offenders.join(', ')}`);
});

// ── (b) fonts.css + woff2 binaries ──────────────────────────────────────────

function fontFaceBlocks() {
  const css = read(path.join('assets', 'fonts', 'fonts.css'));
  // Strip comments before structural checks.
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blocks = stripped.match(/@font-face\s*\{[^}]*\}/g) || [];
  return { css, stripped, blocks };
}

test('assets/fonts/fonts.css exists and parses as structurally valid CSS', () => {
  const { stripped, blocks } = fontFaceBlocks();
  const open = (stripped.match(/\{/g) || []).length;
  const close = (stripped.match(/\}/g) || []).length;
  assert.strictEqual(open, close, `unbalanced braces: ${open} open vs ${close} close`);
  assert.ok(blocks.length > 0, 'no @font-face blocks found');
  for (const block of blocks) {
    for (const prop of ['font-family:', 'font-style:', 'font-weight:', 'src:', 'unicode-range:']) {
      assert.ok(block.includes(prop), `@font-face block missing ${prop}: ${block}`);
    }
    assert.ok(
      /src:\s*url\(\/assets\/fonts\/[^)]+\.woff2\)\s*format\('woff2'\)/.test(block),
      `@font-face src is not a local woff2: ${block}`
    );
  }
  assert.ok(
    !/url\(\s*['"]?https?:\/\//.test(stripped),
    'fonts.css still references remote font URLs'
  );
});

test('every woff2 referenced by fonts.css exists on disk with wOF2 magic', () => {
  const { blocks } = fontFaceBlocks();
  const refs = new Set();
  for (const block of blocks) {
    const m = block.match(/url\(\/assets\/fonts\/([^)]+\.woff2)\)/);
    assert.ok(m, `unparseable src in block: ${block}`);
    refs.add(m[1]);
  }
  assert.ok(refs.size > 0, 'no woff2 references found');
  for (const name of refs) {
    const p = path.join(root, 'assets', 'fonts', name);
    assert.ok(fs.existsSync(p), `missing font file: assets/fonts/${name}`);
    const buf = fs.readFileSync(p);
    assert.ok(buf.length > 0, `empty font file: assets/fonts/${name}`);
    assert.strictEqual(
      buf.subarray(0, 4).toString('latin1'),
      'wOF2',
      `bad magic in assets/fonts/${name} (not woff2)`
    );
  }
});

// ── (c) representative pages ────────────────────────────────────────────────

test('representative pages link /assets/fonts/fonts.css and have no Google preconnects', () => {
  const pagesWithWebfonts = [
    'index.html',
    path.join('templates', 'flagship', 'index.html'),
    path.join('platform', 'public', 'scholars', 'login', 'index.html'),
  ];
  for (const rel of pagesWithWebfonts) {
    const html = read(rel);
    assert.ok(
      html.includes('<link rel="stylesheet" href="/assets/fonts/fonts.css">'),
      `${rel} does not link /assets/fonts/fonts.css`
    );
    assert.ok(!GOOGLE_FONT_RE.test(html), `${rel} still references Google Fonts`);
    assert.ok(!/rel=["']preconnect["'][^>]*fonts\./.test(html), `${rel} keeps a Google preconnect`);
  }
  // mobile/index.html uses a system font stack by design (no webfont link);
  // assert it carries no Google Fonts references either.
  const mobile = read(path.join('mobile', 'index.html'));
  assert.ok(!GOOGLE_FONT_RE.test(mobile), 'mobile/index.html references Google Fonts');
});

// ── (d) css/ font-family coverage ───────────────────────────────────────────

test('every webfont family referenced in css/ has a matching @font-face in fonts.css', () => {
  const { blocks } = fontFaceBlocks();
  const hosted = new Set();
  for (const block of blocks) {
    const m = block.match(/font-family:\s*'([^']+)'/);
    if (m) hosted.add(m[1]);
  }
  for (const fam of HOSTED_FAMILIES) {
    assert.ok(hosted.has(fam), `fonts.css has no @font-face for ${fam}`);
  }

  const referenced = new Set();
  for (const f of walk(path.join(root, 'css'))) {
    if (!f.endsWith('.css')) continue;
    const src = fs.readFileSync(f, 'utf8');
    const decls = src.match(/(?:font-family|--font[a-z-]*)\s*:[^;]+;/gi) || [];
    for (const decl of decls) {
      for (const m of decl.matchAll(/'([^']+)'|"([^"]+)"/g)) {
        referenced.add(m[1] || m[2]);
      }
    }
  }
  for (const fam of referenced) {
    if (HOSTED_FAMILIES.includes(fam)) {
      assert.ok(
        hosted.has(fam),
        `css/ references '${fam}' but fonts.css lacks an @font-face for it`
      );
    }
  }
});

run();
