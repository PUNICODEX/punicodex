/**
 * PÚNYCODEX — Evidence Object v2 Tests
 *
 * Verifies that every authenticity API response includes a defensible
 * evidence object with the required fields.
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('evidence-object.test.js');

const {
  classifyTerm,
  classifyDomain,
  classifyUrl,
} = require('../platform/api/authenticity-service');
const { buildEvidence } = require('../platform/api/evidence-builder');

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
  console.log(`\nEvidence Object: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

function assertEvidenceShape(evidence, input) {
  assert.ok(evidence, 'expected evidence object');
  assert.strictEqual(typeof evidence.verdict, 'string');
  assert.ok(typeof evidence.confidence === 'number' || evidence.confidence === null);
  assert.strictEqual(typeof evidence.modelVersion, 'string');
  assert.ok(evidence.generatedAt, 'expected generatedAt');
  assert.ok(Array.isArray(evidence.characterMap), 'expected characterMap array');
  assert.ok(evidence.characterMap.length >= [...input].length, 'characterMap should cover input');
  assert.ok(evidence.renderedComparison, 'expected renderedComparison');
  assert.strictEqual(evidence.renderedComparison.input, input);
  assert.ok(Array.isArray(evidence.renderedComparison.diffHeatmap), 'expected diffHeatmap');
  assert.ok(Array.isArray(evidence.identityMatches), 'expected identityMatches array');
  assert.ok(Array.isArray(evidence.recommendations), 'expected recommendations array');
  assert.ok(evidence.analysis, 'expected analysis object');
  assert.ok(Array.isArray(evidence.analysis.confusables), 'expected analysis.confusables');
}

test('term classification includes evidence object', () => {
  const input = 'арollōn'; // Cyrillic а
  const result = classifyTerm(input);
  const evidence = buildEvidence(input, result);
  assertEvidenceShape(evidence, input);
  assert.ok(
    evidence.identityMatches.some((m) => m.id === 'apollon'),
    'expected apollon identity match'
  );
});

test('domain classification includes evidence with domainMetadata', () => {
  const input = 'арollōn.com';
  const result = classifyDomain(input);
  const evidence = buildEvidence(input, result);
  assertEvidenceShape(evidence, input);
  assert.ok(evidence.domainMetadata, 'expected domainMetadata');
  assert.ok(
    evidence.domainMetadata.registrableDomain.includes('com'),
    'expected .com registrable domain'
  );
});

test('URL classification includes evidence with parts-based input', () => {
  const input = 'https://secure.com/login?user=google';
  const result = classifyUrl(input);
  const evidence = buildEvidence(input, result);
  assertEvidenceShape(evidence, input);
});

test('evidence characterMap exposes confusable mapping', () => {
  const input = 'gооgle'; // Cyrillic о
  const evidence = buildEvidence(input, classifyTerm(input));
  const cyrillicO = evidence.characterMap.find((c) => c.char === 'о');
  assert.ok(cyrillicO, 'expected Cyrillic о in characterMap');
  assert.strictEqual(cyrillicO.script, 'Cyrillic');
  assert.strictEqual(cyrillicO.confusableMapping, 'o');
  assert.ok(cyrillicO.deviationScore > 0.5, 'expected high deviation for confusable');
});

test('evidence renderedComparison contains skeleton fold', () => {
  const input = 'gооgle';
  const evidence = buildEvidence(input, classifyTerm(input));
  assert.strictEqual(evidence.renderedComparison.skeletonInput, 'google');
});

run();
