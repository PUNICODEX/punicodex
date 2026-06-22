/**
 * PÚNYCODEX — Confusable Atlas Tests
 */

const assert = require('node:assert');
const {
  buildSkeleton,
  skeletonSimilarity,
  findCanonicalLookalike,
  getScriptRisk,
} = require('../platform/api/confusable-atlas');

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
  console.log(`\nConfusable Atlas: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('buildSkeleton folds Cyrillic homographs to ASCII', () => {
  assert.strictEqual(buildSkeleton('аres'), 'ares'); // Cyrillic а
  assert.strictEqual(buildSkeleton('ареs'), 'apes'); // Cyrillic а, р, е
});

test('buildSkeleton applies contextual substitutions', () => {
  assert.strictEqual(buildSkeleton('arnazon'), 'amazon'); // rn -> m
  assert.strictEqual(buildSkeleton('vvv'), 'wv'); // vv -> w (greedy left-to-right)
});

test('skeletonSimilarity is 1 for visually identical strings', () => {
  assert.strictEqual(skeletonSimilarity('аres', 'ares'), 1);
});

test('skeletonSimilarity is high for near-identical homographs', () => {
  const score = skeletonSimilarity('pаypal', 'paypal'); // Cyrillic а
  assert.ok(score > 0.8, `expected > 0.8, got ${score}`);
});

test('findCanonicalLookalike matches above threshold', () => {
  const result = findCanonicalLookalike('аres', ['ares', 'zeus', 'thor']);
  assert.ok(result);
  assert.strictEqual(result.candidate, 'ares');
  assert.strictEqual(result.score, 1);
});

test('findCanonicalLookalike returns null below threshold', () => {
  const result = findCanonicalLookalike('xyz', ['ares', 'zeus']);
  assert.strictEqual(result, null);
});

test('script risk is high for Latin + Cyrillic', () => {
  assert.ok(getScriptRisk('Latin', 'Cyrillic') > 0.8);
});

test('script risk is zero for same script', () => {
  assert.strictEqual(getScriptRisk('Latin', 'Latin'), 0);
});

run();
