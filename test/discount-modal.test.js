/**
 * Discount code in the sponsorship modal — generated-output contract.
 *
 * Every flagship temple page must carry the discount field, the dynamic
 * price display (original struck through when a code applies), and the
 * validation wiring (debounced /api/discount/validate call, slotId +
 * leaseMonths in the payload, discountCode in the booking POST, and the
 * complimentary path that skips Stripe and goes straight to upload).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const ARCHETYPES = require('../js/archetypes-v2.js');
const BUILT = (ARCHETYPES.ARCHETYPES || ARCHETYPES).filter((a) => a.built).map((a) => a.id);

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('flagship templates carry the discount field and dynamic pricing elements', () => {
  const html = fs.readFileSync(path.join(ROOT, 'templates/flagship/index.html'), 'utf8');
  assert.ok(html.includes('id="booking-discount"'), 'discount input missing from template');
  assert.ok(html.includes('id="booking-discount-note"'), 'discount note missing');
  assert.ok(html.includes('id="booking-price-original"'), 'struck-through original price missing');
});

test('flagship template JS wires validation, dynamic pricing, and the complimentary path', () => {
  const js = fs.readFileSync(path.join(ROOT, 'templates/flagship/flagship.js'), 'utf8');
  for (const needle of [
    '/api/discount/validate/',
    'validateDiscountCode',
    'discountCode: discountCode || undefined',
    'data.complimentary',
    'booking-price-original',
    'complimentary placement: no card, no checkout, no auto-renewal',
  ]) {
    assert.ok(js.includes(needle), `flagship.js missing: ${needle}`);
  }
  // The display math mirrors the server's computePrice base rules.
  assert.ok(
    js.includes('currentSlotPriceCents * 12 * 0.9') && js.includes('computeDisplayPrice'),
    'display must compute off the lease base like the server'
  );
});

test('every generated flagship page carries the discount field', () => {
  const missing = [];
  for (const id of BUILT) {
    const file = path.join(ROOT, 'sites', id, 'index.html');
    if (!fs.existsSync(file)) {
      missing.push(`${id}: no page`);
      continue;
    }
    const html = fs.readFileSync(file, 'utf8');
    if (!html.includes('id="booking-discount"')) missing.push(`${id}: index.html`);
    const js = fs.readFileSync(path.join(ROOT, 'sites', id, 'script.js'), 'utf8');
    if (!js.includes('validateDiscountCode')) missing.push(`${id}: script.js`);
  }
  assert.deepStrictEqual(missing.slice(0, 10), [], missing.slice(0, 10).join('\n'));
  assert.strictEqual(missing.length, 0, `${missing.length} pages missing the discount field`);
});

test('generated flagship script parses as valid JS (sample of temples)', () => {
  for (const id of [...BUILT.slice(0, 10), 'ares', 'nike', 'zeus']) {
    const js = fs.readFileSync(path.join(ROOT, 'sites', id, 'script.js'), 'utf8');
    try {
      new Function(js);
    } catch (err) {
      assert.fail(`${id}/script.js parse failure: ${err.message}`);
    }
  }
});

(async () => {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
  if (failures) {
    console.error(`\n${failures} test(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${tests.length} discount-modal tests passed`);
})();
