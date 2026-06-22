/**
 * PÚNYCODEX — RTL attack detector tests
 */

const assert = require('node:assert');
const {
  analyzeRtl,
  hasBidiOverride,
  computeVisualOrder,
} = require('../platform/api/script-modules/rtl.js');

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
      passed += 1;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed += 1;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nrtl-attacks: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('plain ASCII has no RTL risk', () => {
  const result = analyzeRtl('apple.com');
  assert.strictEqual(result.hasBidiOverride, false);
  assert.strictEqual(result.riskScore, 0);
  assert.strictEqual(result.orderMismatch, false);
});

test('detects RLO character', () => {
  const input = 'apple\u202ecom';
  assert.ok(hasBidiOverride(input));
  const result = analyzeRtl(input);
  assert.strictEqual(result.hasBidiOverride, true);
  assert.strictEqual(result.riskScore, 1);
  assert.ok(result.bidiChars.length > 0);
});

test('detects LRO character', () => {
  const input = '\u202dapple';
  const result = analyzeRtl(input);
  assert.strictEqual(result.hasBidiOverride, true);
  assert.strictEqual(result.riskScore, 1);
});

test('detects isolate override characters', () => {
  const input = 'a\u2067bc';
  const result = analyzeRtl(input);
  assert.strictEqual(result.hasBidiOverride, true);
});

test('detects bidirectional marks without override', () => {
  const input = 'a\u200fb';
  const result = analyzeRtl(input);
  assert.strictEqual(result.hasBidiOverride, false);
  assert.strictEqual(result.hasBidiMark, true);
  assert.ok(result.riskScore > 0);
});

test('visual order diverges when override is present', () => {
  const input = 'abc\u202e';
  const result = analyzeRtl(input);
  assert.strictEqual(result.orderMismatch, true);
  assert.notStrictEqual(result.visualOrder, result.logicalOrder);
});

test('visual order equals logical order when no override', () => {
  const input = 'abc';
  assert.strictEqual(computeVisualOrder(input), input);
});

run();
