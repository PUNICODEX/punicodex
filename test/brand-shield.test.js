/**
 * PuniCodex — Brand & Trademark Shield Tests
 *
 * Covers lookupBrand, checkDomainAgainstBrands, classifyBrandSpoof,
 * listBrandIdentities, and Hermès brand/courier disambiguation.
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('brand-shield.test.js');

const { migrateIdentities } = require('../platform/db/migrate-identities');
const {
  lookupBrand,
  checkDomainAgainstBrands,
  classifyBrandSpoof,
  listBrandIdentities,
  isBrandIdentity,
} = require('../platform/api/brand-shield');
const { VERDICTS, SEVERITIES } = require('../platform/api/authenticity-verdicts');

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
  console.log(`\nBrand Shield: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('lookupBrand returns Hermès for "Hermès"', () => {
  const match = lookupBrand('Hermès');
  assert.ok(match, 'expected a brand match');
  assert.strictEqual(match.id, 'hermes-brand');
  assert.strictEqual(match.name, 'Hermès');
});

test('checkDomainAgainstBrands matches allowed apple.com', () => {
  const result = checkDomainAgainstBrands('apple.com');
  assert.ok(result, 'expected a brand match');
  assert.strictEqual(result.matchType, 'allowed-domain');
  assert.strictEqual(result.identity.id, 'apple-brand');
});

test('checkDomainAgainstBrands flags evil-apple.com blocked pattern', () => {
  const result = checkDomainAgainstBrands('evil-apple.com');
  assert.ok(result, 'expected a blocked match');
  assert.strictEqual(result.matchType, 'blocked-pattern');
  assert.strictEqual(result.identity.id, 'apple-brand');
  assert.ok(result.blockedPattern, 'expected blocked pattern');
});

test('classifyBrandSpoof on Cyrillic аpple returns homograph-spoof', () => {
  const input = 'аpple'; // U+0430 Cyrillic a
  const result = classifyBrandSpoof(input);
  assert.strictEqual(result.verdict, VERDICTS.HOMOGRAPH_SPOOF);
  assert.ok(result.severity === SEVERITIES.HIGH || result.severity === SEVERITIES.CRITICAL);
  assert.ok(result.isBrandTarget);
  assert.ok(result.canonicalMatch);
  assert.strictEqual(result.canonicalMatch.id, 'apple-brand');
});

test('classifyBrandSpoof on plain "Apple" returns styled', () => {
  const result = classifyBrandSpoof('Apple');
  assert.strictEqual(result.verdict, VERDICTS.STYLED);
  assert.strictEqual(result.severity, SEVERITIES.LOW);
  assert.ok(result.isBrandTarget);
  assert.ok(result.canonicalMatch);
  assert.strictEqual(result.canonicalMatch.id, 'apple-brand');
});

test('Hermès disambiguation picks luxury brand by default', () => {
  const match = lookupBrand('Hermes');
  assert.ok(match);
  assert.strictEqual(match.id, 'hermes-brand');
  assert.strictEqual(match.name, 'Hermès');
});

test('Hermès disambiguation by courier domain picks courier brand', () => {
  const match = lookupBrand('Hermes', { domain: 'hermesworld.com' });
  assert.ok(match);
  assert.strictEqual(match.id, 'hermes-courier');
  assert.strictEqual(match.name, 'Hermes');
});

test('lookupBrand prefers luxury Hermès for hermes.com domain', () => {
  const match = lookupBrand('Hermes', { domain: 'hermes.com' });
  assert.ok(match);
  assert.strictEqual(match.id, 'hermes-brand');
});

test('Cyrillic Hеrmès is flagged as homograph spoof', () => {
  const input = 'Hеrmès'; // U+0435 Cyrillic e
  const result = classifyBrandSpoof(input);
  assert.strictEqual(result.verdict, VERDICTS.HOMOGRAPH_SPOOF);
  assert.ok(result.isBrandTarget);
  assert.ok(
    result.canonicalMatch.id === 'hermes-brand' || result.canonicalMatch.id === 'hermes-courier',
    `expected Hermès-related match, got ${result.canonicalMatch.id}`
  );
});

test('checkDomainAgainstBrands returns null for unrelated domain', () => {
  const result = checkDomainAgainstBrands('example-not-a-brand.org');
  assert.strictEqual(result, null);
});

test('listBrandIdentities includes Hermès brands and Apple', () => {
  const brands = listBrandIdentities();
  assert.ok(brands.length >= 3, `expected at least 3 brands, got ${brands.length}`);
  const ids = brands.map((b) => b.id);
  assert.ok(ids.includes('apple-brand'));
  assert.ok(ids.includes('hermes-brand'));
  assert.ok(ids.includes('hermes-courier'));
});

test('isBrandIdentity returns true only for brand types', () => {
  const brands = listBrandIdentities();
  assert.ok(brands.every((b) => isBrandIdentity(b)));
});

test('classifyBrandSpoof on unknown term returns unknown', () => {
  const result = classifyBrandSpoof('xyzabc-not-a-brand-123');
  assert.strictEqual(result.verdict, VERDICTS.UNKNOWN);
  assert.strictEqual(result.isBrandTarget, false);
  assert.strictEqual(result.canonicalMatch, null);
});

test('lookupBrand is case-insensitive', () => {
  const match = lookupBrand('APPLE');
  assert.ok(match);
  assert.strictEqual(match.id, 'apple-brand');
});

test('checkDomainAgainstBrands strips www and protocol', () => {
  const result = checkDomainAgainstBrands('https://www.apple.com/path');
  assert.ok(result);
  assert.strictEqual(result.matchType, 'allowed-domain');
  assert.strictEqual(result.identity.id, 'apple-brand');
});

test('classifyBrandSpoof allowed domain returns canonical', () => {
  const result = classifyBrandSpoof('apple', 'apple.com');
  assert.strictEqual(result.verdict, VERDICTS.CANONICAL);
  assert.strictEqual(result.allowedDomainMatch, true);
});

run();
