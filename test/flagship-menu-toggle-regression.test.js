/**
 * Flagship Temple Mobile Menu Toggle Regression Tests
 *
 * Ensures the flagship temple tab navigation keeps a visible, working
 * hamburger menu on mobile and collapses tab links into a dropdown.
 * A previous regression hid the toggle and left tabs overflowing;
 * these tests guard against that.
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
  console.log(`\nFlagship Menu Toggle Regression: ${passed} passed, ${failed} failed`);
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

function tabNavToggleIsVisibleOnMobile(css, sourceName) {
  const clean = stripComments(css);
  const mobileBlocks = extractMediaBlocks(clean).filter((b) =>
    /max-width\s*:\s*\d+px/.test(b.query)
  );

  for (const block of mobileBlocks) {
    const hidesToggle = /\.tab-nav\s+\.nav-toggle\s*\{[^}]*display\s*:\s*none/i.test(block.body);
    assert.ok(
      !hidesToggle,
      `${sourceName}: mobile .tab-nav .nav-toggle must not be hidden in ${block.query}`
    );
  }

  const baseToggleVisible = /\.nav-toggle\s*\{[^}]*display\s*:\s*flex/i.test(clean);
  assert.ok(
    baseToggleVisible,
    `${sourceName}: .nav-toggle must declare display: flex for mobile visibility`
  );
}

function tabNavLinksCollapseOnMobile(css, sourceName) {
  const clean = stripComments(css);
  const mobileBlocks = extractMediaBlocks(clean).filter((b) =>
    /max-width\s*:\s*\d+px/.test(b.query)
  );

  let foundCollapse = false;
  for (const block of mobileBlocks) {
    if (!block.body.includes('.tab-nav-links')) continue;

    const hidesLinks = /\.tab-nav\s+\.tab-nav-links\s*\{[^}]*display\s*:\s*none/i.test(block.body);
    const showsActive = /\.tab-nav\s+\.tab-nav-links\.active\s*\{[^}]*display\s*:\s*flex/i.test(
      block.body
    );
    if (hidesLinks && showsActive) {
      foundCollapse = true;
    }
  }

  assert.ok(
    foundCollapse,
    `${sourceName}: mobile .tab-nav .tab-nav-links must hide by default and show when .active`
  );
}

function tabNavLockupFitsViewport(css, sourceName) {
  const clean = stripComments(css);
  const mobileBlocks = extractMediaBlocks(clean).filter((b) =>
    /max-width\s*:\s*\d+px/.test(b.query)
  );

  for (const block of mobileBlocks) {
    if (!block.body.includes('.tab-nav')) continue;

    const logoWidthMatch = block.body.match(
      /\.tab-nav\s+\.nav-logo-img\s*\{[^}]*max-width\s*:\s*min\((\d+)px/i
    );
    if (logoWidthMatch) {
      const width = parseInt(logoWidthMatch[1], 10);
      assert.ok(
        width >= 120 && width <= 200,
        `${sourceName}: mobile .tab-nav .nav-logo-img max-width (${width}px) must be between 120px and 200px to leave room for the toggle in ${block.query}`
      );
    }
  }
}

test('temple-base.css keeps flagship tab nav toggle visible on mobile', () => {
  const css = readCss('css', 'temple-base.css');
  tabNavToggleIsVisibleOnMobile(css, 'css/temple-base.css');
});

test('temple-base.css collapses flagship tab nav links on mobile', () => {
  const css = readCss('css', 'temple-base.css');
  tabNavLinksCollapseOnMobile(css, 'css/temple-base.css');
});

test('temple-base.css keeps flagship tab nav lockup narrow enough for the toggle', () => {
  const css = readCss('css', 'temple-base.css');
  tabNavLockupFitsViewport(css, 'css/temple-base.css');
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

test('flagship temple template includes the nav toggle and tab links', () => {
  const html = fs.readFileSync(path.join(root, 'templates', 'flagship', 'index.html'), 'utf8');
  assert.ok(
    html.includes('class="nav-toggle"'),
    'templates/flagship/index.html must include a nav-toggle button'
  );
  assert.ok(
    html.includes('class="nav-links tab-nav-links"'),
    'templates/flagship/index.html must include nav-links with tab-nav-links class'
  );
});

run();
