/**
 * PÚNYCODEX — Scholarly Edition Edit Quality Gate Tests
 */

const assert = require('node:assert');
const { scoreEdit, validateEdit, MIN_SCORE } = require('./quality');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('Running edit quality gate tests...');

test('empty edit fails validation', () => {
  const result = validateEdit({ body: '', sources: [] });
  assert.strictEqual(result.valid, false);
  assert(result.errors.some((e) => e.includes('Body is required')));
  assert(result.errors.some((e) => e.includes('source')));
});

test('short body fails validation', () => {
  const result = validateEdit({ body: 'Too short.', sources: [{ citation: 'Hesiod' }] });
  assert.strictEqual(result.valid, false);
  assert(result.errors.some((e) => e.includes('20 characters')));
});

test('source missing citation fails validation', () => {
  const result = validateEdit({
    body: 'This body is long enough to pass the length check.',
    sources: [{}],
  });
  assert.strictEqual(result.valid, false);
  assert(result.errors.some((e) => e.includes('citation')));
});

test('valid edit returns warnings but no errors', () => {
  const result = validateEdit({
    body: 'Zeus is the king of the Olympian gods and ruler of the sky.',
    sources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
  });
  assert.strictEqual(result.valid, true);
  assert(result.warnings.length > 0);
});

test('score rewards length, citations, and authoritative sources', () => {
  const score = scoreEdit({
    body: 'Zeus is the king of the Olympian gods and ruler of the sky in Greek mythology. He is attested in the Iliad and the Odyssey, and his cult was widespread.',
    sources: [
      { citation: 'Hesiod, Theogony' },
      { citation: 'Homer, Iliad' },
      { citation: 'Oxford Classical Dictionary' },
    ],
  });
  assert(score >= MIN_SCORE, `expected score >= ${MIN_SCORE}, got ${score}`);
});

test('low-quality edit scores below minimum', () => {
  const score = scoreEdit({
    body: 'Just a few words here.',
    sources: [{ citation: 'Random blog' }],
  });
  assert(score < MIN_SCORE, `expected score < ${MIN_SCORE}, got ${score}`);
});

test('structured body earns section bonus', () => {
  const plainScore = scoreEdit({
    body: 'Zeus is the king of the gods. He rules the sky.',
    sources: [{ citation: 'Hesiod, Theogony' }],
  });
  const structuredScore = scoreEdit({
    body: '## Overview\nZeus is the king of the gods.\n## Sources\nHesiod, Theogony.',
    sources: [{ citation: 'Hesiod, Theogony' }],
  });
  assert(structuredScore > plainScore, 'structured body should score higher');
});

console.log('Edit quality gate tests complete.');
