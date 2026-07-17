/**
 * PuniCodex — Authenticity Ensemble Classifier Tests
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('authenticity-ensemble.test.js');

const { classifyRisk } = require('../platform/api/authenticity-ensemble');

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
  console.log(`\nAuthenticity Ensemble: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('canonical term returns probability < 0.1', () => {
  const r = classifyRisk('zeus');
  assert.ok(r.probability < 0.1, `expected < 0.1, got ${r.probability}`);
});

test('Cyrillic homograph returns probability > 0.9', () => {
  const r = classifyRisk('аres'); // U+0430 Cyrillic a
  assert.ok(r.probability > 0.9, `expected > 0.9, got ${r.probability}`);
});

test('mixed-script spoof returns probability > 0.85', () => {
  const r = classifyRisk('ареs'); // Cyrillic а р е + Latin s
  assert.ok(r.probability > 0.85, `expected > 0.85, got ${r.probability}`);
});

test('invisible char with target returns probability > 0.9', () => {
  const r = classifyRisk('а\u200bres'); // Cyrillic a + zero-width space + res
  assert.ok(r.probability > 0.9, `expected > 0.9, got ${r.probability}`);
  assert.ok(r.features.invisibleCharFlag);
});

test('bidi override with target returns probability > 0.9', () => {
  const r = classifyRisk('g00gle\u202e'); // ASCII confusable + RLO
  assert.ok(r.probability > 0.9, `expected > 0.9, got ${r.probability}`);
  assert.ok(r.features.bidiOverrideFlag);
});

test('plain unknown ASCII returns probability < 0.3', () => {
  const r = classifyRisk('xyzabc123');
  assert.ok(r.probability < 0.3, `expected < 0.3, got ${r.probability}`);
});

test('variant returns low probability', () => {
  const r = classifyRisk('Apollōn'); // macron-only variant
  assert.ok(r.probability < 0.1, `expected < 0.1, got ${r.probability}`);
  assert.ok(r.features.variantRecognition);
});

test('g00gle returns high probability', () => {
  const r = classifyRisk('g00gle');
  assert.ok(r.probability > 0.9, `expected > 0.9, got ${r.probability}`);
});

test('modelVersion is present', () => {
  const r = classifyRisk('zeus');
  assert.strictEqual(r.modelVersion, 'v2.0.0');
});

test('rule override listed for bidi', () => {
  const r = classifyRisk('g00gle\u202e');
  assert.ok(r.ruleOverrides.length > 0);
  assert.ok(
    r.ruleOverrides.includes('bidi_override_with_target'),
    `expected bidi override, got ${r.ruleOverrides.join(', ')}`
  );
});

test('empty input returns probability 0', () => {
  const r = classifyRisk('');
  assert.strictEqual(r.probability, 0);
  assert.ok(r.ruleOverrides.includes('empty_input'));
});

test('canonical exact clamps probability and lists safe override', () => {
  const r = classifyRisk('Zeús');
  assert.ok(r.probability <= 0.05, `expected <= 0.05, got ${r.probability}`);
  assert.ok(r.ruleOverrides.includes('canonical_safe_clamp'));
});

run();
