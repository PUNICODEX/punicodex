/**
 * Safe JSON Parsing Tests
 */

const assert = require('node:assert');
const { safeJsonParse } = require('../platform/api/safe-json.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  console.log('\n▸ Safe JSON Tests\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nSafe JSON: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('parses valid JSON strings', () => {
  assert.deepStrictEqual(safeJsonParse('[1,2,3]'), [1, 2, 3]);
  assert.deepStrictEqual(safeJsonParse('{"a":1}'), { a: 1 });
});

test('returns fallback for invalid JSON', () => {
  const fallback = [];
  assert.strictEqual(safeJsonParse('not json', fallback), fallback);
  assert.strictEqual(safeJsonParse('{bad', null), null);
});

test('returns fallback for null, undefined, and empty input', () => {
  const arrFallback = [];
  const objFallback = {};
  assert.strictEqual(safeJsonParse(null, arrFallback), arrFallback);
  assert.strictEqual(safeJsonParse(undefined, objFallback), objFallback);
  assert.strictEqual(safeJsonParse('', arrFallback), arrFallback);
  assert.strictEqual(safeJsonParse('   ', arrFallback), arrFallback);
});

test('returns fallback for non-string input', () => {
  assert.deepStrictEqual(safeJsonParse(123, []), []);
  assert.deepStrictEqual(safeJsonParse({ a: 1 }, []), []);
});

run();
