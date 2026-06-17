/**
 * PÚNYCODEX — Multimodal tests
 */

const assert = require('node:assert');
const { searchByGlyph, describeGlyph } = require('../platform/api/glyph-search');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err.message);
    process.exitCode = 1;
  }
}

console.log('Multimodal Tests');

test('glyph search finds entries containing a Greek letter', () => {
  const results = searchByGlyph('Ζ', 5);
  assert.ok(results.length > 0);
  assert.ok(results.every((r) => (r.unicode || '').includes('Ζ') || (r.greek || '').includes('Ζ')));
});

test('glyph description returns code point', () => {
  const desc = describeGlyph('Ω');
  assert.strictEqual(desc.glyph, 'Ω');
  assert.ok(desc.codePoint.startsWith('U+'));
});

if (!process.exitCode) {
  console.log('\n✓ All Multimodal tests passed');
} else {
  console.log('\n✗ Some Multimodal tests failed');
  process.exit(1);
}
