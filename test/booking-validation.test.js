/**
 * Shared Booking Validation Tests
 */

const assert = require('node:assert');
const { getCharLimits, validateMeta } = require('../platform/api/booking-validation.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function run() {
  console.log('\n▸ Booking Validation Tests\n');
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
  console.log(`\nBooking Validation: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('getCharLimits scales with slot width', () => {
  assert.deepStrictEqual(getCharLimits(1200), { heading: 60, subtitle: 100 });
  assert.deepStrictEqual(getCharLimits(900), { heading: 36, subtitle: 60 });
  assert.deepStrictEqual(getCharLimits(600), { heading: 36, subtitle: 60 });
  assert.deepStrictEqual(getCharLimits(400), { heading: 24, subtitle: 40 });
  assert.deepStrictEqual(getCharLimits(200), { heading: 12, subtitle: 20 });
});

test('validateMeta allows content within limits', () => {
  assert.strictEqual(validateMeta(1200, 'Short heading', 'Short subtitle'), null);
});

test('validateMeta rejects headings that are too long', () => {
  const err = validateMeta(1200, 'a'.repeat(61), 'subtitle');
  assert.ok(err);
  assert.ok(err.includes('Heading'));
});

test('validateMeta rejects subtitles that are too long', () => {
  const err = validateMeta(1200, 'heading', 'a'.repeat(101));
  assert.ok(err);
  assert.ok(err.includes('Subtitle'));
});

test('validateMeta allows empty optional values', () => {
  assert.strictEqual(validateMeta(1200, null, undefined), null);
});

run();
