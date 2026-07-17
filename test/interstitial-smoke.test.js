/**
 * PuniCodex — Interstitial Page Smoke Tests
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nInterstitial Smoke: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

const htmlPath = path.join(__dirname, '..', 'platform', 'public', 'interstitial.html');
const html = fs.readFileSync(htmlPath, 'utf8');

test('HTML parses query parameters from script', () => {
  assert.ok(html.includes("params.get('url')"));
  assert.ok(html.includes("params.get('verdict')"));
  assert.ok(html.includes("params.get('severity')"));
  assert.ok(html.includes("params.get('reason')"));
  assert.ok(html.includes("params.get('target')"));
  assert.ok(html.includes("params.get('identity')"));
  assert.ok(html.includes("params.get('locale')"));
});

test('HTML loads i18n bundle dynamically', () => {
  assert.ok(html.includes('/i18n/authenticity/'));
  assert.ok(html.includes('.json'));
  assert.ok(html.includes('data-i18n'));
});

test('page renders dynamic content placeholders', () => {
  assert.ok(html.includes('id="target-url"'));
  assert.ok(html.includes('id="target-verdict"'));
  assert.ok(html.includes('id="target-severity"'));
  assert.ok(html.includes('id="target-identity"'));
  assert.ok(html.includes('id="tier-badge"'));
  assert.ok(html.includes('id="explanation"'));
  assert.ok(html.includes('id="alt-list"'));
});

test('page includes ARIA live region and keyboard navigable controls', () => {
  assert.ok(html.includes('aria-live="polite"'));
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes('role="main"'));
});

test('page includes report, proceed, back, and appeal buttons', () => {
  assert.ok(html.includes('id="report-btn"'));
  assert.ok(html.includes('id="proceed-btn"'));
  assert.ok(html.includes('id="back-btn"'));
  assert.ok(html.includes('id="appeal-btn"'));
});

test('page includes locale selector with all supported languages', () => {
  assert.ok(html.includes('id="locale-select"'));
  assert.ok(html.includes('value="ar"'));
  assert.ok(html.includes('value="zh"'));
  assert.ok(html.includes('value="hi"'));
});

run();
