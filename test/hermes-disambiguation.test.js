/**
 * PÚNYCODEX — Hermès Disambiguation Tests
 *
 * Validates that the brand identity for Hermès coexists with the lexicon
 * identity for the Greek deity Hermês.
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('hermes-disambiguation.test.js');

const { migrateIdentities } = require('../platform/db/migrate-identities');
const { findIdentities, findIdentityByDomain } = require('../platform/api/identity-kernel');
const { classifyTerm, classifyDomain, VERDICTS } = require('../platform/api/authenticity-service');

migrateIdentities();

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
  console.log(`\nHermès Disambiguation: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('"Hermès" exact matches hermes-brand', () => {
  const matches = findIdentities('Hermès');
  const brand = matches.find((m) => m.identity.id === 'hermes-brand');
  assert.ok(brand, 'Hermès should exactly match the Hermès brand identity');
  assert.strictEqual(brand.matchType, 'exact');
});

test('"Hermes" exact matches both hermes-brand and lexicon hermes', () => {
  const matches = findIdentities('Hermes');
  const brand = matches.find((m) => m.identity.id === 'hermes-brand');
  const lexicon = matches.find((m) => m.identity.id === 'hermes');
  assert.ok(brand, 'Hermes should match the Hermès brand identity');
  assert.ok(lexicon, 'Hermes should also match the lexicon deity Hermês');
});

test('Cyrillic "Hеrmès" visually matches the brand', () => {
  const input = 'Hеrmès'; // U+0435 Cyrillic е
  const matches = findIdentities(input);
  const brand = matches.find((m) => m.identity.id === 'hermes-brand');
  assert.ok(
    brand,
    `Cyrillic Hеrmès should visually match Hermès brand, got ${matches.map((m) => m.identity.id).join(', ')}`
  );
  assert.strictEqual(brand.matchType, 'visual');
  assert.ok(brand.score >= 0.85, `expected visual score >= 0.85, got ${brand.score}`);
});

test('"hermes.com" if allowed returns the brand identity', () => {
  const identity = findIdentityByDomain('hermes.com');
  assert.ok(identity, 'hermes.com should resolve to an identity');
  assert.strictEqual(identity.id, 'hermes-brand');
});

test('"hermès.net" not allowed returns no domain identity', () => {
  const identity = findIdentityByDomain('hermès.net');
  assert.strictEqual(identity, null);
});

test('authenticity service treats "Hermès" as canonical lexicon match', () => {
  const r = classifyTerm('Hermès');
  assert.strictEqual(r.verdict, VERDICTS.CANONICAL);
  assert.strictEqual(r.canonicalMatch.id, 'hermes');
});

test('authenticity service treats Cyrillic "Hеrmès" as a homograph spoof', () => {
  const r = classifyTerm('Hеrmès'); // U+0435 Cyrillic е
  assert.strictEqual(r.verdict, VERDICTS.HOMOGRAPH_SPOOF);
  assert.ok(r.canonicalMatch, 'spoof should carry a canonical match');
  assert.ok(
    ['hermes', 'hermes-brand'].includes(r.canonicalMatch.id),
    `expected Hermès-related match, got ${r.canonicalMatch.id}`
  );
});

test('authenticity service treats "hermes.com" as canonical identity domain', () => {
  const r = classifyDomain('hermes.com');
  assert.strictEqual(r.verdict, VERDICTS.CANONICAL);
  assert.strictEqual(r.canonicalMatch.id, 'hermes-brand');
});

run();
