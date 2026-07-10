/**
 * Original Script Provenance Mobile Layout Regression Tests
 *
 * Ensures the provenance section on flagship lore pages remains readable,
 * overflow-safe, and well-structured on narrow viewports. A previous
 * regression left the transmission chain and sign grid poorly adapted to
 * mobile; these tests guard against that.
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
  console.log(`\nProvenance Mobile Regression: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const root = path.join(__dirname, '..');

function readCss(...parts) {
  return fs.readFileSync(path.join(root, ...parts), 'utf8');
}

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

function extractMediaBlocks(css) {
  const blocks = [];
  const regex = /@media\s+\([^)]*\)\s*\{/g;
  let match;
  while ((match = regex.exec(css)) !== null) {
    const start = match.index + match[0].length - 1;
    let depth = 0;
    let end = start;
    for (let i = start; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    blocks.push({
      query: match[0].replace(/\s*\{\s*$/, ''),
      body: css.slice(start + 1, end),
    });
  }
  return blocks;
}

function provenanceHasMobileOverrides(css, sourceName) {
  const clean = stripComments(css);
  const mobileBlocks = extractMediaBlocks(clean).filter((b) =>
    /max-width\s*:\s*\d+px/.test(b.query)
  );

  const provenanceBlocks = mobileBlocks.filter(
    (b) => b.body.includes('.section-provenance') || b.body.includes('.provenance-panel')
  );
  assert.ok(
    provenanceBlocks.length >= 2,
    `${sourceName}: expected at least two mobile media queries targeting provenance components`
  );

  const hasPanelPadding = provenanceBlocks.some((b) =>
    /\.provenance-panel\s*\{[^}]*padding/i.test(b.body)
  );
  assert.ok(
    hasPanelPadding,
    `${sourceName}: mobile provenance panel must declare padding to keep content from touching edges`
  );

  const hasScriptOverflowWrap =
    /\.script-specimen\s*\{[^}]*overflow-wrap\s*:\s*anywhere/i.test(clean) ||
    /\.script-specimen\s*\{[^}]*word-break\s*:\s*break-word/i.test(clean);
  assert.ok(
    hasScriptOverflowWrap,
    `${sourceName}: .script-specimen must allow long glyphs to wrap instead of overflowing`
  );
}

function transmissionChainIsVerticalOnMobile(css, sourceName) {
  const clean = stripComments(css);
  const mobileBlocks = extractMediaBlocks(clean).filter((b) =>
    /max-width\s*:\s*\d+px/.test(b.query)
  );

  const chainBlocks = mobileBlocks.filter((b) => b.body.includes('.transmission-chain'));
  assert.ok(
    chainBlocks.length > 0,
    `${sourceName}: no mobile media query targets .transmission-chain`
  );

  const vertical = chainBlocks.some((b) =>
    /\.transmission-chain\s*\{[^}]*flex-direction\s*:\s*column/i.test(b.body)
  );
  assert.ok(
    vertical,
    `${sourceName}: .transmission-chain must switch to flex-direction: column on mobile`
  );

  const arrowRotated = chainBlocks.some((b) =>
    /\.transmission-arrow\s*\{[^}]*transform\s*:\s*rotate\(90deg\)/i.test(b.body)
  );
  assert.ok(
    arrowRotated,
    `${sourceName}: .transmission-arrow must rotate 90° on mobile so the chain reads top-to-bottom`
  );
}

function signGridIsCompactOnMobile(css, sourceName) {
  const clean = stripComments(css);
  const mobileBlocks = extractMediaBlocks(clean).filter((b) =>
    /max-width\s*:\s*\d+px/.test(b.query)
  );

  const gridBlocks = mobileBlocks.filter((b) => b.body.includes('.sign-grid'));
  assert.ok(gridBlocks.length > 0, `${sourceName}: no mobile media query targets .sign-grid`);

  const compact = gridBlocks.some(
    (b) =>
      /\.sign-grid\s*\{[^}]*grid-template-columns\s*:\s*repeat\(2/i.test(b.body) ||
      /\.sign-grid\s*\{[^}]*grid-template-columns\s*:\s*1fr/i.test(b.body)
  );
  assert.ok(compact, `${sourceName}: .sign-grid must collapse to one or two columns on mobile`);
}

function provenancePanelIsOverflowSafe(css, sourceName) {
  const clean = stripComments(css);
  assert.ok(
    /\.provenance-panel\s*\{[^}]*box-sizing\s*:\s*border-box/i.test(clean) ||
      /\*\s*,\s*\*::before\s*,\s*\*::after\s*\{[^}]*box-sizing\s*:\s*border-box/i.test(clean),
    `${sourceName}: provenance panel (or universal reset) must use border-box to prevent overflow`
  );
}

test('temple-base.css has mobile overrides for provenance section', () => {
  const css = readCss('css', 'temple-base.css');
  provenanceHasMobileOverrides(css, 'css/temple-base.css');
});

test('temple-base.css makes transmission chain vertical on mobile', () => {
  const css = readCss('css', 'temple-base.css');
  transmissionChainIsVerticalOnMobile(css, 'css/temple-base.css');
});

test('temple-base.css collapses sign grid on mobile', () => {
  const css = readCss('css', 'temple-base.css');
  signGridIsCompactOnMobile(css, 'css/temple-base.css');
});

test('temple-base.css keeps provenance panel overflow-safe', () => {
  const css = readCss('css', 'temple-base.css');
  provenancePanelIsOverflowSafe(css, 'css/temple-base.css');
});

run();
