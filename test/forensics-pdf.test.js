/**
 * PÚNYCODEX — Forensics PDF Tests
 *
 * Verifies that the forensics PDF generator produces a valid PDF buffer for
 * high/critical verdicts.
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('forensics-pdf.test.js');

const { classifyTerm } = require('../platform/api/authenticity-service');
const { buildEvidence } = require('../platform/api/evidence-builder');
const { generateForensicsPdf } = require('../platform/api/forensics-pdf');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
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
  console.log(`\nForensics PDF: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('generates a valid PDF buffer for a homograph spoof', () => {
  const input = 'арollōn'; // Cyrillic а
  const result = classifyTerm(input);
  const evidence = buildEvidence(input, result);
  const { buffer, contentType, reportId } = generateForensicsPdf(input, result, evidence);

  assert.ok(Buffer.isBuffer(buffer), 'expected buffer');
  assert.strictEqual(buffer.toString('ascii', 0, 5), '%PDF-', 'expected PDF header');
  assert.ok(buffer.toString('ascii').includes('%%EOF'), 'expected PDF footer');
  assert.strictEqual(contentType, 'application/pdf');
  assert.ok(reportId && typeof reportId === 'string', 'expected reportId');
});

test('PDF includes key evidence fields', () => {
  const input = 'gооgle'; // Cyrillic о
  const result = classifyTerm(input);
  const evidence = buildEvidence(input, result);
  const { buffer } = generateForensicsPdf(input, result, evidence);
  const text = buffer.toString('ascii');
  assert.ok(text.includes('PUNYCODEX'), 'expected title');
  assert.ok(text.includes(input) || text.includes('Input:'), 'expected input field');
  assert.ok(text.includes(result.verdict), 'expected verdict');
  assert.ok(text.includes('CHARACTER ATTESTATION'), 'expected character attestation section');
  assert.ok(text.includes('CHAIN OF CUSTODY'), 'expected chain of custody section');
});

run();
