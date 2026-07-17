/**
 * PuniCodex — Normalization Attack Tests
 *
 * Verifies detection of precomposed vs decomposed forms, overlong NFD stacks,
 * NFKC distance, invisible characters, and bidirectional overrides.
 */

const assert = require('node:assert');
const {
  decompose,
  computeVisualDeviation,
  hasInvisibleChars,
  hasBidirectionalOverride,
} = require('../platform/api/name-decomposer');

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
  console.log(`\nNormalization Attacks: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// Precomposed é vs e + combining acute
test('precomposed é and e + combining acute decompose to same NFKC base', () => {
  const pre = decompose('é');
  const combined = decompose('e\u0301');
  assert.strictEqual(pre.normalized, combined.normalized);
  assert.strictEqual(pre.normalized, 'é');
  assert.ok(combined.chars.some((c) => c.isCombiningDiacritic));
});

test('precomposed é and combining acute stack both have low deviation', () => {
  const pre = computeVisualDeviation('é');
  const combined = computeVisualDeviation('e\u0301');
  assert.ok(pre < 0.2, `expected pre < 0.2, got ${pre}`);
  assert.ok(combined < 0.2, `expected combined < 0.2, got ${combined}`);
});

// Overlong NFD stack
test('overlong NFD stack is detected as combining diacritics', () => {
  const overlong = 'e\u0301\u0301\u0301\u0301';
  const d = decompose(overlong);
  const combiningCount = d.chars.filter((c) => c.isCombiningDiacritic).length;
  assert.strictEqual(combiningCount, 4);
});

// NFKC distance detection
test('fullwidth forms normalize away under NFKC', () => {
  const d = decompose('Ａpple');
  assert.strictEqual(d.normalized, 'Apple');
});

test('mathematical bold forms normalize away under NFKC', () => {
  const d = decompose('𝐀pple');
  assert.strictEqual(d.normalized, 'Apple');
});

// Invisible char detection
test('zero width space is detected as invisible', () => {
  const d = decompose('a\u200Bb');
  assert.ok(d.hasInvisibleChars);
  assert.strictEqual(d.invisibleChars.length, 1);
  assert.ok(hasInvisibleChars('a\u200Bb'));
});

test('variation selectors are detected as invisible', () => {
  const d = decompose('a\uFE0Fb');
  assert.ok(d.hasInvisibleChars);
  assert.ok(hasInvisibleChars('a\uFE0Fb'));
});

test('Mongolian vowel separator is detected as invisible', () => {
  const d = decompose('a\u180Eb');
  assert.ok(d.hasInvisibleChars);
  assert.ok(hasInvisibleChars('a\u180Eb'));
});

// Bidi override detection
test('LRO bidirectional override is detected', () => {
  const d = decompose('a\u202Db');
  assert.ok(d.hasBidirectionalOverride);
  assert.ok(hasBidirectionalOverride('a\u202Db'));
});

test('RLM directional mark is detected as bidirectional override', () => {
  const d = decompose('a\u200Fb');
  assert.ok(d.hasBidirectionalOverride);
  assert.ok(hasBidirectionalOverride('a\u200Fb'));
});

test('decompose marks invisible and bidi flags on individual chars', () => {
  const d = decompose('a\u200B\u202Db');
  const invisible = d.chars.find((c) => c.char === '\u200B');
  const bidi = d.chars.find((c) => c.char === '\u202D');
  assert.ok(invisible);
  assert.ok(invisible.isInvisible);
  assert.ok(bidi);
  assert.ok(bidi.isBidirectionalOverride);
});

run();
