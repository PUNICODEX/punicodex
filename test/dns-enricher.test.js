/**
 * PÚNYCODEX — DNS Enricher Tests
 */

const assert = require('node:assert');
const { mockEnrichDomain, NEWLY_REGISTERED_DAYS } = require('../platform/api/dns-enricher');

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
  console.log(`\nDNS Enricher: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('mockEnrichDomain returns defaults', () => {
  const r = mockEnrichDomain('example.com');
  assert.strictEqual(r.resolves, false);
  assert.strictEqual(r.hasA, false);
  assert.strictEqual(r.hasMx, false);
  assert.strictEqual(r.hasNs, false);
  assert.deepStrictEqual(r.txtRecords, []);
  assert.strictEqual(r.ageDays, null);
});

test('mockEnrichDomain merges record overrides', () => {
  const r = mockEnrichDomain('example.com', {
    resolves: true,
    hasA: true,
    hasMx: true,
    txtRecords: ['v=spf1 include:_spf.example.com ~all'],
    ageDays: 5,
  });
  assert.strictEqual(r.resolves, true);
  assert.strictEqual(r.hasA, true);
  assert.strictEqual(r.hasMx, true);
  assert.strictEqual(r.ageDays, 5);
  assert.strictEqual(r.isNewlyRegistered, true);
  assert.deepStrictEqual(r.txtRecords, ['v=spf1 include:_spf.example.com ~all']);
});

test('newly registered threshold is respected', () => {
  const r = mockEnrichDomain('example.com', { ageDays: NEWLY_REGISTERED_DAYS + 1 });
  assert.strictEqual(r.isNewlyRegistered, false);
});

test('mockEnrichDomain preserves error field', () => {
  const r = mockEnrichDomain('example.com', { error: 'timeout' });
  assert.strictEqual(r.error, 'timeout');
});

test('mockEnrichDomain keeps hasNs false by default', () => {
  const r = mockEnrichDomain('example.com', { resolves: true });
  assert.strictEqual(r.hasNs, false);
});

test('mockEnrichDomain calculates isNewlyRegistered for null age', () => {
  const r = mockEnrichDomain('example.com', { resolves: true, ageDays: null });
  assert.strictEqual(r.isNewlyRegistered, null);
});

run();
