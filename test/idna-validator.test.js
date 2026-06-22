/**
 * PÚNYCODEX — IDNA Validator Tests
 */

const assert = require('node:assert');
const { validateIdna, validateLabel, LABEL_MAX_OCTETS } = require('../platform/api/idna-validator');

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
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nIDNA Validator: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('valid ASCII domain passes', () => {
  const r = validateIdna('example.com');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.labels.length, 2);
});

test('valid punycode domain passes', () => {
  const r = validateIdna('xn--pple-43d.com');
  assert.strictEqual(r.valid, true);
  assert.strictEqual(r.labels[0].decoded, 'аpple');
});

test('invalid punycode label fails', () => {
  const r = validateIdna('xn--not-valid.com');
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('invalid-punycode')));
});

test('label too long fails', () => {
  const longLabel = 'a'.repeat(LABEL_MAX_OCTETS + 1);
  const r = validateIdna(`${longLabel}.com`);
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('label-too-long')));
});

test('domain too long fails', () => {
  const many = 'a'.repeat(260);
  const r = validateIdna(`${many}.com`);
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('domain-too-long')));
});

test('leading hyphen fails', () => {
  const r = validateIdna('-example.com');
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('leading-hyphen')));
});

test('trailing hyphen fails', () => {
  const r = validateIdna('example-.com');
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('trailing-hyphen')));
});

test('empty label fails', () => {
  const r = validateIdna('example..com');
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.some((e) => e.includes('empty-label')));
});

test('mixed-script label emits warning', () => {
  const r = validateIdna('аpple.com');
  assert.ok(r.errors.some((e) => e === 'warning:mixed-script-label'));
  assert.strictEqual(r.valid, true);
});

test('Turkish i conflict emits warning', () => {
  const r = validateIdna('ınfoi.com');
  assert.ok(r.errors.some((e) => e === 'warning:turkish-i-conflict'));
});

test('disabling hyphen checks allows edge hyphens', () => {
  const r = validateIdna('-example.com', { checkHyphens: false });
  assert.strictEqual(r.valid, true);
});

test('registry policy violation is reported', () => {
  const r = validateIdna('пример.de', { etld: 'de' });
  assert.ok(r.errors.some((e) => e.startsWith('script-not-allowed-by-registry')));
});

test('validateLabel returns per-label result', () => {
  const r = validateLabel('xn--not-valid', 'com');
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.includes('invalid-punycode'));
});

test('empty domain fails', () => {
  const r = validateIdna('');
  assert.strictEqual(r.valid, false);
  assert.ok(r.errors.includes('empty-domain'));
});

run();
