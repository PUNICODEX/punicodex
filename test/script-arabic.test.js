/**
 * PuniCodex — Arabic script risk module tests
 */

const assert = require('node:assert');
const { analyzeArabic, isArabic, hasArabic } = require('../platform/api/script-modules/arabic.js');

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
  console.log(`\nscript-arabic: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('detects Arabic script presence', () => {
  assert.ok(isArabic('ب'));
  assert.ok(hasArabic('ابت'));
  assert.strictEqual(analyzeArabic('ابت').present, true);
  assert.strictEqual(analyzeArabic('abc').present, false);
});

test('clean Arabic has low risk', () => {
  const result = analyzeArabic('ابتثج');
  assert.strictEqual(result.riskScore, 0);
  assert.deepStrictEqual(result.risks, []);
});

test('detects Kashida elongation', () => {
  const result = analyzeArabic('ابــت');
  assert.ok(result.risks.includes('kashida-elongation'));
  assert.ok(result.riskScore > 0);
});

test('flags leading or trailing Kashida as higher risk', () => {
  const result = analyzeArabic('ـابت');
  assert.ok(result.risks.includes('kashida-elongation'));
  assert.ok(result.riskScore >= 0.4);
});

test('detects dotless/dotted mix', () => {
  const result = analyzeArabic('ٮب');
  assert.ok(result.risks.includes('dotless-dotted-mix'));
  assert.ok(result.riskScore >= 0.4);
});

test('detects contextual presentation-form anomaly', () => {
  const result = analyzeArabic('ﺍﺏ');
  assert.ok(result.risks.includes('contextual-form-anomaly'));
  assert.ok(result.riskScore > 0);
});

test('detects joiner manipulation', () => {
  const result = analyzeArabic('اب‌ت');
  assert.ok(result.risks.includes('joiner-manipulation'));
});

test('detects mixed Arabic + Latin script', () => {
  const result = analyzeArabic('اپلapple');
  assert.ok(result.risks.includes('mixed-script'));
  assert.ok(result.riskScore > 0);
});

test('Persian "اپل" is identified as Arabic-family text', () => {
  const result = analyzeArabic('اپل');
  assert.strictEqual(result.present, true);
  assert.strictEqual(result.scriptFamily, 'Arabic');
});

run();
