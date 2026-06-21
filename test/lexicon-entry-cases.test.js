/**
 * PÚNYCODEX — Lexicon Entry Smoke Cases
 *
 * One focused test per canonical lexicon entry. These are intentionally
 * lightweight schema checks that complement the heavy validator assertions
 * in type/js/validate.js and give the master runner a clear test-case count.
 */

const assert = require('node:assert');
const { LEXICON } = require('../type/js/lexicon');

const VALID_TIERS = new Set(['dual', '1', '2']);

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

for (const entry of LEXICON) {
  test(`${entry.id} has required fields`, () => {
    assert.ok(entry.id && typeof entry.id === 'string', 'id must be a non-empty string');
    assert.ok(entry.ascii && typeof entry.ascii === 'string', 'ascii must be a non-empty string');
    assert.ok(
      entry.unicode && typeof entry.unicode === 'string',
      'unicode must be a non-empty string'
    );
    assert.ok(
      entry.pantheon && typeof entry.pantheon === 'string',
      'pantheon must be a non-empty string'
    );
    assert.ok(
      VALID_TIERS.has(entry.tier),
      `tier must be one of ${[...VALID_TIERS].join(', ')}; got ${entry.tier}`
    );
  });

  test(`${entry.id} has a valid breakdown`, () => {
    assert.ok(Array.isArray(entry.breakdown), 'breakdown must be an array');
    assert.ok(entry.breakdown.length > 0, 'breakdown must not be empty');
    for (const step of entry.breakdown) {
      assert.ok(step && typeof step === 'object', 'each breakdown step must be an object');
      assert.strictEqual(typeof step.char, 'string', 'breakdown step must have char string');
      assert.strictEqual(typeof step.to, 'string', 'breakdown step must have to string');
    }
  });
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
  console.log(`\nLexicon Entry Cases: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log(`All ${passed} tests passed`);
  }
  process.exit(failed > 0 ? 1 : 0);
}

run();
