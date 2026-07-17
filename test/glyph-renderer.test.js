/**
 * PuniCodex — Glyph Renderer Tests
 *
 * Validates the font-metric perceptual similarity backend used by the
 * Name Authenticity Shield V2. These tests do not require a native canvas
 * library; they exercise the pure-JavaScript glyph geometry pipeline.
 */

const assert = require('node:assert');
const {
  renderedSimilarity,
  computeVisualHash,
  getMetrics,
  normalizeForRendering,
} = require('../platform/api/glyph-renderer.js');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  console.log('\n▸ Glyph Renderer Tests\n');
  let passed = 0;
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nGlyph Renderer: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('renderedSimilarity returns 1 for identical strings', () => {
  assert.strictEqual(renderedSimilarity('apple', 'apple'), 1);
});

test('renderedSimilarity returns 0 for empty input', () => {
  assert.strictEqual(renderedSimilarity('', 'apple'), 0);
  assert.strictEqual(renderedSimilarity('apple', ''), 0);
});

test('Cyrillic а is visually similar to Latin a', () => {
  const score = renderedSimilarity('а', 'a');
  assert.ok(score >= 0.9, `Expected >= 0.9, got ${score}`);
});

test('Greek ο is visually similar to Latin o', () => {
  const score = renderedSimilarity('ο', 'o');
  assert.ok(score >= 0.9, `Expected >= 0.9, got ${score}`);
});

test('Cyrillic р is visually similar to Latin p', () => {
  const score = renderedSimilarity('р', 'p');
  assert.ok(score >= 0.9, `Expected >= 0.9, got ${score}`);
});

test('different Latin letters are not visually similar', () => {
  const score = renderedSimilarity('a', 'b');
  assert.ok(score < 0.6, `Expected < 0.6, got ${score}`);
});

test('contextual rn is visually similar to m', () => {
  const score = renderedSimilarity('rn', 'm');
  assert.ok(score >= 0.8, `Expected >= 0.8, got ${score}`);
});

test('contextual vv is visually similar to w', () => {
  const score = renderedSimilarity('vv', 'w');
  assert.ok(score >= 0.8, `Expected >= 0.8, got ${score}`);
});

test('contextual cl is visually similar to d', () => {
  const score = renderedSimilarity('cl', 'd');
  assert.ok(score >= 0.75, `Expected >= 0.75, got ${score}`);
});

test('fullwidth Latin folds to ASCII in rendering', () => {
  const score = renderedSimilarity('Ａ', 'A');
  assert.ok(score >= 0.9, `Expected >= 0.9, got ${score}`);
});

test('math bold Latin folds to ASCII in rendering', () => {
  const score = renderedSimilarity('𝐀', 'A');
  assert.ok(score >= 0.9, `Expected >= 0.9, got ${score}`);
});

test('Cyrillic homograph word is similar to ASCII target', () => {
  const score = renderedSimilarity('аррle', 'apple');
  assert.ok(score >= 0.85, `Expected >= 0.85, got ${score}`);
});

test('rendering normalization collapses rn inside longer strings', () => {
  const score = renderedSimilarity('arnazon', 'amazon');
  assert.ok(score >= 0.9, `Expected >= 0.9, got ${score}`);
});

test('rendering similarity penalizes length differences', () => {
  const score = renderedSimilarity('ap', 'apple');
  assert.ok(score < 0.8, `Expected < 0.8, got ${score}`);
});

test('computeVisualHash is deterministic', () => {
  assert.strictEqual(computeVisualHash('apple'), computeVisualHash('apple'));
});

test('computeVisualHash is equal for confusable equivalents', () => {
  assert.strictEqual(computeVisualHash('аpple'), computeVisualHash('apple'));
});

test('getMetrics returns default metrics for unknown scripts', () => {
  const m = getMetrics('中');
  assert.ok(typeof m.width === 'number');
  assert.ok(typeof m.height === 'number');
});

test('normalizeForRendering applies contextual substitutions', () => {
  assert.strictEqual(normalizeForRendering('arnazon'), 'amazon');
  assert.strictEqual(normalizeForRendering('vvv'), 'wv');
});

run();
