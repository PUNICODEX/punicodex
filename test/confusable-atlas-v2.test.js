/**
 * PÚNYCODEX — Confusable Atlas V2 Tests
 */

const assert = require('node:assert');
const {
  buildSkeleton,
  skeletonSimilarity,
  findCanonicalLookalike,
  getScriptRisk,
  perceptualSimilarity,
  CONFUSABLE_TO_ASCII,
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
  console.log(`\nConfusable Atlas V2: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// Core folding
test('Cyrillic а folds to a', () => {
  assert.strictEqual(buildSkeleton('а'), 'a');
  assert.strictEqual(buildSkeleton('аres'), 'ares');
});

test('Greek ο folds to o', () => {
  assert.strictEqual(buildSkeleton('ο'), 'o');
  assert.strictEqual(buildSkeleton('gοοgle'), 'google');
});

test('Armenian գ folds to g', () => {
  assert.strictEqual(buildSkeleton('գ'), 'g');
  assert.strictEqual(buildSkeleton('գabriel'), 'gabriel');
});

test('Georgian გ folds to g', () => {
  assert.strictEqual(buildSkeleton('გ'), 'g');
  assert.strictEqual(buildSkeleton('გeorge'), 'george');
});

test('contextual rn → m', () => {
  assert.strictEqual(buildSkeleton('arnazon'), 'amazon');
});

test('contextual vv → w', () => {
  assert.strictEqual(buildSkeleton('vvv'), 'wv');
});

test('contextual cl → d', () => {
  assert.strictEqual(buildSkeleton('clement'), 'dement');
});

test('contextual nn → m', () => {
  assert.strictEqual(buildSkeleton('fanne'), 'fame');
});

test('contextual ii → n', () => {
  assert.strictEqual(buildSkeleton('iim'), 'nm');
});

test('fullwidth Ａ folds to A', () => {
  assert.strictEqual(buildSkeleton('Ａ'), 'a');
  assert.strictEqual(buildSkeleton('Ａpple'), 'apple');
});

test('fullwidth １ folds to l', () => {
  assert.strictEqual(buildSkeleton('１'), 'l');
});

test('math bold 𝐀 folds to A', () => {
  assert.strictEqual(buildSkeleton('𝐀'), 'a');
  assert.strictEqual(buildSkeleton('𝐀pple'), 'apple');
});

test('math bold 𝐚 folds to a', () => {
  assert.strictEqual(buildSkeleton('𝐚'), 'a');
});

test('enclosed alphanumerics fold to ASCII', () => {
  assert.strictEqual(buildSkeleton('Ⓐ'), 'a');
  assert.strictEqual(buildSkeleton('ⓐ'), 'a');
  // ① NFKCs to '1', which the atlas folds to 'l'.
  assert.strictEqual(buildSkeleton('①'), 'l');
});

test('small capital ᴀ folds to a', () => {
  assert.strictEqual(buildSkeleton('ᴀ'), 'a');
});

test('IPA ɑ folds to a', () => {
  assert.strictEqual(buildSkeleton('ɑ'), 'a');
});

test('skeletonSimilarity is 1 for visually identical strings', () => {
  assert.strictEqual(skeletonSimilarity('аres', 'ares'), 1);
  assert.strictEqual(skeletonSimilarity('𝐀pple', 'apple'), 1);
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

test('findCanonicalLookalike threshold behavior', () => {
  const result = findCanonicalLookalike('аres', ['ares', 'zeus', 'thor'], 1.01);
  assert.strictEqual(result, null);
});

test('script risk is high for Latin + Cyrillic', () => {
  assert.ok(getScriptRisk('Latin', 'Cyrillic') > 0.8);
});

test('script risk is zero for same script', () => {
  assert.strictEqual(getScriptRisk('Latin', 'Latin'), 0);
});

test('CONFUSABLE_TO_ASCII is a Map', () => {
  assert.ok(CONFUSABLE_TO_ASCII instanceof Map);
  assert.strictEqual(CONFUSABLE_TO_ASCII.get('а'), 'a');
});

test('perceptualSimilarity is 1 for pure ASCII matches', () => {
  assert.strictEqual(perceptualSimilarity('apple', 'apple'), 1);
});

test('perceptualSimilarity is near 1 for perfect homoglyphs', () => {
  const score = perceptualSimilarity('аres', 'ares');
  assert.ok(score >= 0.97, `expected >= 0.97, got ${score}`);
});

test('perceptualSimilarity drops for stylistic variants', () => {
  const score = perceptualSimilarity('𝒜pple', 'apple');
  assert.ok(score < 1, `expected < 1, got ${score}`);
  assert.ok(score > 0.7, `expected > 0.7, got ${score}`);
});

test('Arabic-Indic digit ٥ folds to 5', () => {
  assert.strictEqual(buildSkeleton('٥'), '5');
});

test('Persian keheh ک folds to k', () => {
  assert.strictEqual(buildSkeleton('ک'), 'k');
});

run();
