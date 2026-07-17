/**
 * Academic Collaborators Strip Regression Tests
 *
 * Guards the redesigned pre-footer collaborators strip:
 *  - the mount contract injected into public pages (id, role, aria-label,
 *    versioned css/js assets),
 *  - the empty state renders a single quiet invitation row (not four
 *    identical "Reserve Your Place" boxes),
 *  - addSponsor() re-renders real sponsor cards (monogram fallback, tier),
 *  - the redesign dropped the particle canvas and gold shimmer/marquee
 *    animations, and honors prefers-reduced-motion.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cheerio = require('cheerio');

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
  console.log(`\nCollaborators Strip Tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const root = path.join(__dirname, '..');
const JS_PATH = path.join(root, 'js', 'university-collaborators.js');
const CSS_PATH = path.join(root, 'css', 'university-collaborators.css');
const INJECTOR_PATH = path.join(root, 'scripts', 'inject-university-collaborators.js');

function loadStripModule() {
  const code = fs.readFileSync(JS_PATH, 'utf8');
  const mount = { innerHTML: '' };
  const context = {
    document: {
      readyState: 'complete',
      getElementById: (id) => (id === 'university-collaborators-strip' ? mount : null),
      addEventListener: () => {},
    },
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(code, context);
  return { context, mount };
}

// ── Mount contract ────────────────────────────────────────

test('injected pages keep the strip mount contract', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const $ = cheerio.load(html);
  const mount = $('#university-collaborators-strip');
  assert.strictEqual(mount.length, 1, 'expected exactly one strip mount on the homepage');
  assert.strictEqual(mount.attr('role'), 'complementary', 'expected role=complementary');
  assert.strictEqual(
    mount.attr('aria-label'),
    'Academic Collaborators',
    'expected aria-label "Academic Collaborators"'
  );
  const assets = $('link[rel="stylesheet"], script[src]')
    .map((_, el) => $(el).attr('href') || $(el).attr('src'))
    .get();
  assert.ok(
    assets.some((h) => h.includes('/css/university-collaborators.css')),
    'expected the strip stylesheet to be linked'
  );
  assert.ok(
    assets.some((h) => h.includes('/js/university-collaborators.js')),
    'expected the strip script to be linked'
  );
});

test('injector serves cache-busted asset URLs and stays idempotent', () => {
  const src = fs.readFileSync(INJECTOR_PATH, 'utf8');
  assert.ok(
    src.includes("'/css/university-collaborators.css?v=2'"),
    'expected ?v=2 cache-bust on the stylesheet URL'
  );
  assert.ok(
    src.includes("'/js/university-collaborators.js?v=2'"),
    'expected ?v=2 cache-bust on the script URL'
  );
  assert.ok(
    src.includes('PUNICODEX-UNIVERSITY-COLLABORATORS-HEAD-START'),
    'expected head marker for idempotent injection'
  );
});

// ── Rendered states ───────────────────────────────────────

test('empty sponsor array renders a single invitation row', () => {
  const { mount } = loadStripModule();
  assert.ok(mount.innerHTML.length > 0, 'expected the strip to render');
  assert.ok(
    mount.innerHTML.includes('uc-invite'),
    'expected the invitation row when no sponsors exist'
  );
  assert.ok(
    mount.innerHTML.includes('/university-sponsorship/'),
    'expected the invitation to link to /university-sponsorship/'
  );
  assert.ok(
    !mount.innerHTML.includes('Reserve Your Place'),
    'must not render the old "Reserve Your Place" filler boxes'
  );
  const inviteCount = (mount.innerHTML.match(/uc-invite-link/g) || []).length;
  assert.strictEqual(inviteCount, 1, 'expected exactly one invitation link, not a grid of boxes');
  assert.ok(
    !mount.innerHTML.includes('uc-grid'),
    'expected no sponsor grid when the array is empty'
  );
});

test('addSponsor renders a real card with monogram and tier', () => {
  const { context, mount } = loadStripModule();
  const api = context.window.PUNICODEX.UniversityCollaborators;
  assert.ok(api, 'expected window.PUNICODEX.UniversityCollaborators to be exposed');
  assert.ok(Array.isArray(api.data), 'expected exposed data array');
  assert.strictEqual(typeof api.addSponsor, 'function', 'expected addSponsor()');
  assert.strictEqual(typeof api.render, 'function', 'expected render()');

  api.addSponsor({
    id: 'test-university',
    name: 'Test University of Athens',
    url: 'https://example.edu',
    tagline: 'Department of Classics',
    tier: 'founding',
  });

  assert.ok(mount.innerHTML.includes('uc-grid'), 'expected a sponsor grid after addSponsor');
  assert.ok(mount.innerHTML.includes('Test University of Athens'), 'expected sponsor name');
  assert.ok(mount.innerHTML.includes('Department of Classics'), 'expected sponsor tagline');
  assert.ok(mount.innerHTML.includes('uc-card-monogram'), 'expected monogram fallback (no logo)');
  assert.ok(mount.innerHTML.includes('Founding Partner'), 'expected human tier label');
  assert.ok(mount.innerHTML.includes('https://example.edu'), 'expected sponsor card to link out');
  assert.ok(
    !mount.innerHTML.includes('uc-invite'),
    'expected the invitation row to disappear once sponsors exist'
  );
});

test('addSponsor ignores invalid sponsors without breaking the strip', () => {
  const { context, mount } = loadStripModule();
  const api = context.window.PUNICODEX.UniversityCollaborators;
  api.addSponsor(null);
  api.addSponsor({ id: 'missing-name' });
  assert.ok(
    mount.innerHTML.includes('uc-invite'),
    'expected the invitation state to survive invalid addSponsor calls'
  );
});

// ── Design constraints (no gimmicks) ─────────────────────

test('strip JS no longer renders a particle canvas', () => {
  const src = fs.readFileSync(JS_PATH, 'utf8');
  assert.ok(!src.includes('canvas'), 'expected no canvas usage in the strip JS');
  assert.ok(!src.includes('requestAnimationFrame'), 'expected no animation loop');
  assert.ok(!src.includes('MIN_EMPTY_SLOTS'), 'expected the four filler-slot logic to be gone');
});

test('strip CSS has no particle, shimmer, or marquee animation', () => {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  assert.ok(!css.includes('uc-canvas'), 'expected no canvas styles');
  assert.ok(!css.includes('uc-gold-shimmer'), 'expected the gold shimmer to be removed');
  assert.ok(!css.includes('uc-marquee'), 'expected the marquee to be removed');
  assert.ok(!css.includes('@keyframes'), 'expected no keyframe animations at all');
  assert.ok(
    css.includes('prefers-reduced-motion'),
    'expected prefers-reduced-motion to be honored'
  );
});

test('strip CSS stays scoped to the mount element', () => {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const rules = css.match(/[^{}]+\{[^{}]*\}/g) || [];
  for (const rule of rules) {
    const selector = rule.slice(0, rule.indexOf('{')).trim();
    if (selector.startsWith('@') || selector.startsWith('from') || selector.startsWith('to')) {
      continue;
    }
    // Media-query inner rules arrive without their @media prefix; only check
    // top-level-looking selectors that mention an id or element start.
    if (selector.startsWith('#') || /^[a-z]/i.test(selector)) {
      assert.ok(
        selector.includes('#university-collaborators-strip'),
        `selector must stay scoped to the strip mount: ${selector}`
      );
    }
  }
});

run();
