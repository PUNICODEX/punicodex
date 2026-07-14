/**
 * Hero Canvas Background Regression Tests
 *
 * Ensures bespoke flagship canvas effects do not fill the entire hero
 * background with a bright primary/secondary color, which makes the
 * hero text unreadable. The preferred style is a dark void base with
 * subtle thematic accents.
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
  console.log(`\nHero Canvas Background Regression: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const EFFECTS_DIR = path.join(__dirname, '..', 'templates', 'flagship', 'effects');

function readEffectFiles() {
  return fs
    .readdirSync(EFFECTS_DIR)
    .filter((f) => f.endsWith('.js'))
    .map((f) => ({
      name: f,
      content: fs.readFileSync(path.join(EFFECTS_DIR, f), 'utf8'),
    }));
}

function stripComments(code) {
  return code.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

test('no effect fills the full canvas with solid primary color', () => {
  const badPattern =
    /ctx\.fillStyle\s*=\s*`rgb\(\$\{(P|primary)\.r\}[^`]*`\s*;[\s\S]{0,120}ctx\.fillRect\s*\(\s*0\s*,\s*0\s*,\s*width\s*,\s*height\s*\)/;
  for (const { name, content } of readEffectFiles()) {
    assert.ok(
      !badPattern.test(stripComments(content)),
      `${name}: must not fill the full canvas with solid rgb(P/primary)`
    );
  }
});

test('no effect fills the full canvas with primary/secondary at high opacity', () => {
  // Match rgba(P/primary/S/secondary, 0.XX) followed by fillRect(0,0,width,height)
  const highOpacityPattern =
    /ctx\.fillStyle\s*=\s*`rgba\(\$\{(P|S|primary|secondary)\.r\}[^`]*0\.([2-9][0-9]|[3-9])`\s*;[\s\S]{0,120}ctx\.fillRect\s*\(\s*0\s*,\s*0\s*,\s*width\s*,\s*height\s*\)/;
  for (const { name, content } of readEffectFiles()) {
    assert.ok(
      !highOpacityPattern.test(stripComments(content)),
      `${name}: must not fill the full canvas with primary/secondary at >= 0.30 opacity`
    );
  }
});

test('no full-background gradient uses primary/secondary above 0.30 opacity', () => {
  // Look for addColorStop on a gradient assigned to fillStyle that fills the canvas.
  const fullBgPattern = /ctx\.fillRect\s*\(\s*0\s*,\s*0\s*,\s*width\s*,\s*height\s*\)/g;
  const highStopPattern =
    /addColorStop\s*\(\s*[01](\.\d+)?\s*,\s*`rgba\(\$\{(P|S|primary|secondary)\.r\}[^`]*0\.([3-9][0-9]|[2-9])`\s*\)/;

  for (const { name, content } of readEffectFiles()) {
    const clean = stripComments(content);
    // Only flag if there is a high-opacity primary/secondary stop AND a full-canvas fill.
    if (highStopPattern.test(clean) && fullBgPattern.test(clean)) {
      assert.fail(
        `${name}: full-canvas gradient must not use primary/secondary above 0.30 opacity`
      );
    }
  }
});

run();
