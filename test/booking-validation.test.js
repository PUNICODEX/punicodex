/**
 * Shared Booking Validation Tests
 */

const assert = require('node:assert');
const {
  getCharLimits,
  validateMeta,
  validateCompanyName,
  COMPANY_NAME_MAX,
} = require('../platform/api/booking-validation.js');

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

/* company_name is the one booking field an unpaid sponsor can put in front of
   every visitor: it renders on public temple pages while the booking is still
   only 'reserved'. The renderer's textContent is the defence against markup;
   these guard the second layer. */

test('validateCompanyName accepts ordinary trade names', () => {
  for (const name of ['Coca-Cola', 'Ac & Me (Ltd)', 'Ø Studio', '日本電気', "O'Neill", '']) {
    assert.strictEqual(validateCompanyName(name), null, `rejected a legitimate name: ${name}`);
  }
  assert.strictEqual(validateCompanyName(null), null, 'absent name is allowed');
  assert.strictEqual(validateCompanyName(undefined), null, 'absent name is allowed');
});

test('validateCompanyName rejects control characters', () => {
  // Built from char codes so the bytes survive editing: NUL, unit separator,
  // newline, DEL, and a C1 control.
  for (const code of [0x00, 0x1f, 0x0a, 0x7f, 0x85]) {
    const bad = `Acme${String.fromCharCode(code)}Corp`;
    const err = validateCompanyName(bad);
    assert.ok(err, `accepted control char U+${code.toString(16).padStart(4, '0')}`);
    assert.ok(err.includes('control'), err);
  }
});

test('validateCompanyName bounds length and type', () => {
  assert.strictEqual(validateCompanyName('a'.repeat(COMPANY_NAME_MAX)), null, 'at the limit is fine');
  const tooLong = validateCompanyName('a'.repeat(COMPANY_NAME_MAX + 1));
  assert.ok(tooLong && tooLong.includes('exceeds'), tooLong);
  const wrongType = validateCompanyName(42);
  assert.ok(wrongType && wrongType.includes('string'), wrongType);
});

test('validateCompanyName leaves markup to the renderer rather than mangling names', () => {
  // Deliberate: angle brackets are legal in a name and stripping them here
  // would give false confidence. Escaping belongs at the sink (textContent).
  assert.strictEqual(validateCompanyName('<script>alert(1)</script>'), null);
});

run();
