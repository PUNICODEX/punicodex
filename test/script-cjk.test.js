/**
 * PÚNYCODEX — CJK script risk module tests
 */

const assert = require('node:assert');
const {
  analyzeCjk,
  isCjk,
  hasCjk,
  hasFullwidthAscii,
} = require('../platform/api/script-modules/cjk.js');

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
  console.log(`\nscript-cjk: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('detects CJK script presence', () => {
  assert.ok(isCjk('東'));
  assert.ok(hasCjk('東京'));
  assert.strictEqual(analyzeCjk('東京').present, true);
  assert.strictEqual(analyzeCjk('tokyo').present, false);
});

test('pure CJK text has low risk', () => {
  const result = analyzeCjk('東京大学');
  assert.strictEqual(result.riskScore, 0);
  assert.deepStrictEqual(result.risks, []);
});

test('detects fullwidth ASCII forms', () => {
  assert.ok(hasFullwidthAscii('ＡＢＣ'));
  const result = analyzeCjk('ＡＢＣ');
  assert.ok(result.risks.includes('fullwidth-form'));
  assert.ok(result.riskScore >= 0.4);
});

test('detects kana lookalike mixed with Latin', () => {
  const result = analyzeCjk('カ力abc');
  assert.ok(result.risks.includes('kana-lookalike'));
  assert.ok(result.riskScore > 0);
});

test('kana lookalike without Latin remains low risk', () => {
  const result = analyzeCjk('カ力');
  assert.strictEqual(result.riskScore, 0);
});

test('detects simplified/traditional collision', () => {
  const result = analyzeCjk('国國');
  assert.ok(result.risks.includes('simplified-traditional-collision'));
});

test('flags CJK mixed with Latin', () => {
  const result = analyzeCjk('東abc');
  assert.ok(result.risks.includes('mixed-script'));
  assert.ok(result.riskScore > 0);
});

run();
