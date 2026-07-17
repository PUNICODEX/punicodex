/**
 * PuniCodex — Indic script risk module tests
 */

const assert = require('node:assert');
const { analyzeIndic, isIndic, hasIndic } = require('../platform/api/script-modules/indic.js');

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
  console.log(`\nscript-indic: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('detects Indic script presence', () => {
  assert.ok(isIndic('न'));
  assert.ok(hasIndic('नमस्ते'));
  assert.strictEqual(analyzeIndic('नमस्ते').present, true);
  assert.strictEqual(analyzeIndic('hello').present, false);
});

test('clean Devanagari has low risk', () => {
  const result = analyzeIndic('नमस्ते');
  assert.strictEqual(result.riskScore, 0);
  assert.deepStrictEqual(result.risks, []);
});

test('detects ZWJ manipulation', () => {
  const result = analyzeIndic('न‍म');
  assert.ok(result.risks.includes('zwj-manipulation'));
  assert.ok(result.riskScore >= 0.3);
});

test('detects ZWNJ manipulation', () => {
  const result = analyzeIndic('न‌म');
  assert.ok(result.risks.includes('zwnj-manipulation'));
});

test('detects vowel sign stacking', () => {
  // Devanagari dependent vowels stacked next to each other.
  const result = analyzeIndic('नाि');
  assert.ok(result.risks.includes('vowel-sign-stacking'));
});

test('flags mixing multiple Indic scripts', () => {
  const result = analyzeIndic('नमস্তে');
  assert.ok(result.risks.includes('mixed-indic-scripts'));
  assert.ok(result.riskScore >= 0.3);
});

test('flags Indic mixed with Latin', () => {
  const result = analyzeIndic('नमste');
  assert.ok(result.risks.includes('mixed-script'));
  assert.ok(result.riskScore > 0);
});

test('Devanagari "ऑपल" is treated as legitimate Indic text', () => {
  const result = analyzeIndic('ऑपल');
  assert.strictEqual(result.present, true);
  assert.strictEqual(result.riskScore, 0);
});

run();
