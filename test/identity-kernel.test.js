/**
 * PuniCodex — Canonical Identity Kernel 2.0 Tests
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('identity-kernel.test.js');

const { migrateIdentities } = require('../platform/db/migrate-identities');
const {
  loadIdentities,
  findIdentities,
  findIdentityByDomain,
  buildIdentityMatch,
  registerIdentity,
} = require('../platform/api/identity-kernel');

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
  console.log(`\nIdentity Kernel: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('loadIdentities returns brand and lexicon identities', () => {
  const identities = loadIdentities();
  assert.ok(identities.length > 800, `expected >800 identities, got ${identities.length}`);
  const hermesBrand = identities.find((i) => i.id === 'hermes-brand');
  assert.ok(hermesBrand, 'hermes-brand identity missing');
  const zeus = identities.find((i) => i.id === 'zeus');
  assert.ok(zeus, 'lexicon zeus identity missing');
});

test('findIdentities exact match for "Hermès" returns hermes-brand', () => {
  const matches = findIdentities('Hermès');
  const brand = matches.find((m) => m.identity.id === 'hermes-brand');
  assert.ok(brand, `hermes-brand not found among ${matches.map((m) => m.identity.id).join(', ')}`);
  assert.strictEqual(brand.matchType, 'exact');
});

test('findIdentities exact match for "Hermes" includes hermes-brand', () => {
  const matches = findIdentities('Hermes');
  const brand = matches.find((m) => m.identity.id === 'hermes-brand');
  assert.ok(brand, 'hermes-brand should match exact alias "Hermes"');
});

test('findIdentities exact match for "Hermes" also includes lexicon hermes', () => {
  const matches = findIdentities('Hermes');
  const lexicon = matches.find((m) => m.identity.id === 'hermes');
  assert.ok(lexicon, 'lexicon hermes identity should match exact ASCII alias');
});

test('findIdentities folded match for "Hèrmès" returns Hermès brand', () => {
  const matches = findIdentities('Hèrmès');
  const brand = matches.find((m) => m.identity.id === 'hermes-brand');
  assert.ok(brand, 'Hèrmès should fold to Hermès brand');
  assert.strictEqual(brand.matchType, 'folded');
});

test('findIdentities visual/skeleton match for Cyrillic "Нermes" returns Hermès brand', () => {
  const input = 'Нermes'; // U+041D Cyrillic En + Latin ermes
  const matches = findIdentities(input);
  const brand = matches.find((m) => m.identity.id === 'hermes-brand');
  assert.ok(
    brand,
    `Cyrillic Нermes should visually match Hermès brand, got ${matches.map((m) => m.identity.id).join(', ')}`
  );
  assert.strictEqual(brand.matchType, 'visual');
  assert.ok(brand.score >= 0.85, `expected score >= 0.85, got ${brand.score}`);
});

test('findIdentities returns lexicon match for "Zeus"', () => {
  const matches = findIdentities('Zeus');
  const zeus = matches.find((m) => m.identity.id === 'zeus');
  assert.ok(zeus, 'Zeus should match lexicon identity');
  assert.strictEqual(zeus.matchType, 'exact');
});

test('findIdentities returns lexicon match for "zeus" (case-insensitive)', () => {
  const matches = findIdentities('zeus');
  const zeus = matches.find((m) => m.identity.id === 'zeus');
  assert.ok(zeus, 'lowercase zeus should match lexicon identity');
});

test('findIdentities includes a variant alias for apollon macron-only form', () => {
  const matches = findIdentities('Apollōn');
  const apollon = matches.find((m) => m.identity.id === 'apollon');
  assert.ok(apollon, 'Apollōn variant should match lexicon apollon identity');
});

test('findIdentityByDomain returns Apple for apple.com', () => {
  const identity = findIdentityByDomain('apple.com');
  assert.ok(identity, 'apple.com should resolve to an identity');
  assert.strictEqual(identity.id, 'apple-brand');
});

test('findIdentityByDomain returns null for evil-apple.com', () => {
  const identity = findIdentityByDomain('evil-apple.com');
  assert.strictEqual(identity, null);
});

test('findIdentityByDomain returns hermes-brand for hermes.com', () => {
  const identity = findIdentityByDomain('hermes.com');
  assert.ok(identity);
  assert.strictEqual(identity.id, 'hermes-brand');
});

test('findIdentityByDomain strips www and protocol', () => {
  const identity = findIdentityByDomain('https://www.apple.com/path');
  assert.ok(identity);
  assert.strictEqual(identity.id, 'apple-brand');
});

test('findIdentities with includeLexicon false excludes lexicon identities', () => {
  const matches = findIdentities('Zeus', { includeLexicon: false });
  const lexicon = matches.find((m) => m.identity.type === 'lexicon');
  assert.strictEqual(lexicon, undefined);
  const brand = matches.find((m) => m.identity.type === 'brand');
  assert.strictEqual(brand, undefined);
});

test('findIdentities visual match respects threshold', () => {
  const matches = findIdentities('xyzabc123-that-is-nothing-like-hermes', {
    matchTypes: ['visual'],
    threshold: 0.99,
  });
  const brand = matches.find((m) => m.identity.id === 'hermes-brand');
  assert.strictEqual(brand, undefined);
});

test('buildIdentityMatch returns canonicalMatch-shaped object', () => {
  const identities = loadIdentities();
  const apple = identities.find((i) => i.id === 'apple-brand');
  const match = buildIdentityMatch(apple, 'exact', 'Apple');
  assert.strictEqual(match.id, 'apple-brand');
  assert.strictEqual(match.name, 'Apple');
  assert.ok(match.type);
});

test('registerIdentity inserts a new identity and aliases', () => {
  const id = `test-brand-${Date.now()}`;
  const registered = registerIdentity({
    id,
    type: 'brand',
    name: 'TestBrand',
    ascii: 'TestBrand',
    unicode: 'TestBränd',
    aliases: ['TestBrand', 'testbrand.example'],
    allowed_domains: ['testbrand.example'],
    blocked_patterns: ['testbrand-*'],
    data: { note: 'test' },
  });
  assert.ok(registered);
  assert.strictEqual(registered.id, id);

  const matches = findIdentities('TestBrand');
  assert.ok(matches.some((m) => m.identity.id === id));
});

run();
