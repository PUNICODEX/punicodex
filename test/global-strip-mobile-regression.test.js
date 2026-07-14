/**
 * Global Strip Mobile Layout Regression Tests
 *
 * Ensures the PUNYCODEX global strip on flagship temples keeps its
 * compact, inline link layout on mobile. A previous regression collapsed
 * the links into a multi-row grid; these tests guard against that.
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
  console.log(`\nGlobal Strip Mobile Regression: ${passed} passed, ${failed} failed`);
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

function globalStripUsesFlexLayout(css, sourceName) {
  const clean = stripComments(css);
  const mobileBlocks = extractMediaBlocks(clean).filter((b) =>
    /max-width\s*:\s*\d+px/.test(b.query)
  );

  for (const block of mobileBlocks) {
    if (!block.body.includes('.global-strip') && !block.body.includes('.global-links')) {
      continue;
    }

    const badGrid =
      /\.global-links\s*\{[^}]*display\s*:\s*grid/i.test(block.body) ||
      /\.global-links\s*\{[^}]*grid-template-columns/i.test(block.body);
    assert.ok(
      !badGrid,
      `${sourceName}: mobile global-links must not use grid layout in ${block.query}`
    );

    const brandGrid = /\.global-strip-inner\s*\{[^}]*display\s*:\s*grid/i.test(block.body);
    assert.ok(
      !brandGrid,
      `${sourceName}: mobile global-strip-inner must not use grid layout in ${block.query}`
    );
  }

  const hasFlexLinks = /\.global-links\s*\{[^}]*display\s*:\s*flex/i.test(clean);
  assert.ok(hasFlexLinks, `${sourceName}: global-links must declare display: flex`);
}

function tabNavIsCompactOnMobile(css, sourceName) {
  const clean = stripComments(css);
  const mobileBlocks = extractMediaBlocks(clean).filter((b) =>
    /max-width\s*:\s*\d+px/.test(b.query)
  );

  for (const block of mobileBlocks) {
    if (!block.body.includes('.tab-nav')) continue;

    const navHeightMatch = block.body.match(/\.tab-nav\s*\{[^}]*--nav-height\s*:\s*(\d+)px/i);
    if (navHeightMatch) {
      const height = parseInt(navHeightMatch[1], 10);
      assert.ok(
        height >= 70 && height <= 120,
        `${sourceName}: mobile .tab-nav --nav-height (${height}px) must be between 70px and 120px in ${block.query}`
      );
    }

    const logoHeightMatch = block.body.match(
      /\.tab-nav\s+\.nav-logo-img\s*\{[^}]*height\s*:\s*(\d+)px/i
    );
    if (logoHeightMatch) {
      const height = parseInt(logoHeightMatch[1], 10);
      assert.ok(
        height >= 60 && height <= 110,
        `${sourceName}: mobile .tab-nav .nav-logo-img height (${height}px) must be between 60px and 110px in ${block.query}`
      );
    }

    const logoWidthMatch = block.body.match(
      /\.tab-nav\s+\.nav-logo-img\s*\{[^}]*max-width\s*:\s*min\((\d+)px/i
    );
    if (logoWidthMatch) {
      const width = parseInt(logoWidthMatch[1], 10);
      assert.ok(
        width >= 120 && width <= 230,
        `${sourceName}: mobile .tab-nav .nav-logo-img max-width (${width}px) must be between 120px and 230px in ${block.query}`
      );
    }
  }
}

test('temple-base.css keeps global strip links inline on mobile', () => {
  const css = readCss('css', 'temple-base.css');
  globalStripUsesFlexLayout(css, 'css/temple-base.css');
});

test('flagship.css keeps global strip links inline on mobile', () => {
  const css = readCss('templates', 'flagship', 'flagship.css');
  globalStripUsesFlexLayout(css, 'templates/flagship/flagship.css');
});

test('temple-base.css keeps flagship tab nav compact on mobile', () => {
  const css = readCss('css', 'temple-base.css');
  tabNavIsCompactOnMobile(css, 'css/temple-base.css');
});

test('temple-base.css keeps mobile nav positioned and overflow-safe', () => {
  const css = readCss('css', 'temple-base.css');
  const clean = stripComments(css);
  const mobileBlocks = extractMediaBlocks(clean).filter((b) =>
    /max-width\s*:\s*\d+px/.test(b.query)
  );

  let foundNavLinksBlock = false;
  for (const block of mobileBlocks) {
    if (!block.body.includes('.nav-links')) continue;
    foundNavLinksBlock = true;
    assert.ok(
      /\.nav-links\s*\{[^}]*top\s*:\s*100%/.test(block.body),
      'css/temple-base.css: mobile .nav-links must be positioned at top: 100% so it follows the nav height'
    );
    assert.ok(
      /\.nav-links\s*\{[^}]*box-sizing\s*:\s*border-box/i.test(block.body),
      'css/temple-base.css: mobile .nav-links must use border-box to avoid horizontal overflow'
    );
  }
  assert.ok(foundNavLinksBlock, 'css/temple-base.css: mobile .nav-links block not found');

  const globalStripBlock = mobileBlocks.find((b) => b.body.includes('.global-strip-inner'));
  assert.ok(globalStripBlock, 'css/temple-base.css: mobile global strip block not found');
  const hasWrap = /\.global-strip-inner\s*\{[^}]*flex-wrap\s*:\s*wrap/i.test(globalStripBlock.body);
  const hasNoWrapWithScroll =
    /\.global-strip-inner\s*\{[^}]*flex-wrap\s*:\s*nowrap/i.test(globalStripBlock.body) &&
    (/\.global-links\s*\{[^}]*overflow-x\s*:\s*auto/i.test(globalStripBlock.body) ||
      /\.global-links\s*\{[^}]*overflow\s*:\s*hidden/i.test(globalStripBlock.body));
  assert.ok(
    hasWrap || hasNoWrapWithScroll,
    'css/temple-base.css: mobile .global-strip-inner must either wrap or use nowrap with overflow-safe scrolling'
  );
});

test('px-core.js binds the shared mobile nav toggle', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'px-core.js'), 'utf8');
  assert.ok(
    js.includes("document.querySelectorAll('.nav-toggle')"),
    'px-core.js must query .nav-toggle elements'
  );
  assert.ok(
    /toggle\.classList\.toggle\(['"]active['"]\)/.test(js),
    'px-core.js must toggle the active class on the toggle'
  );
  assert.ok(
    /navLinks\.classList\.toggle\(['"]active['"], active\)/.test(js),
    'px-core.js must toggle the active class on nav-links'
  );
});

test('base temples load px-core.js for shared nav handling', () => {
  const template = fs.readFileSync(path.join(root, 'scripts', 'generate-temples.js'), 'utf8');
  assert.ok(
    template.includes('https://punycodex.com/js/px-core.js'),
    'generate-temples.js must load px-core.js before temple-base.js'
  );
});

test('temple-base.js does not add a conflicting nav-toggle handler', () => {
  const js = fs.readFileSync(path.join(root, 'js', 'temple-base.js'), 'utf8');
  const hasToggleQuery = js.includes("document.getElementById('nav-toggle')");
  const hasToggleListener = /navToggle\.addEventListener\(['"]click['"]/.test(js);
  assert.ok(
    !hasToggleQuery || !hasToggleListener,
    'temple-base.js must not bind its own click handler to #nav-toggle; px-core.js owns this'
  );
});

run();
