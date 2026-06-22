/**
 * PÚNYCODEX — Model Card Tests
 *
 * Verifies that the authenticity model card exists and documents the required
 * sections.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const CARD_PATH = path.join(__dirname, '..', 'docs', 'authenticity-model-card.md');

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
  console.log(`\nModel Card: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('model card exists and is non-empty', () => {
  assert.ok(fs.existsSync(CARD_PATH), `model card not found at ${CARD_PATH}`);
  const content = fs.readFileSync(CARD_PATH, 'utf8');
  assert.ok(content.length > 500, 'model card is suspiciously short');
});

test('model card documents intended use and limitations', () => {
  const content = fs.readFileSync(CARD_PATH, 'utf8');
  assert.ok(/Intended Use/i.test(content), 'missing Intended Use section');
  assert.ok(/Limitations/i.test(content), 'missing Limitations section');
  assert.ok(/Performance Targets/i.test(content), 'missing Performance Targets section');
  assert.ok(/Evidence & Audit/i.test(content), 'missing Evidence & Audit section');
});

test('model card includes performance budgets', () => {
  const content = fs.readFileSync(CARD_PATH, 'utf8');
  assert.ok(/99\.99/i.test(content), 'missing TPR budget');
  assert.ok(/0\.001/i.test(content), 'missing FPR budget');
  assert.ok(/p99 latency/i.test(content), 'missing latency target');
});

run();
