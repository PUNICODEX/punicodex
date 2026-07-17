/**
 * PuniCodex — Brand Dispute Service Tests
 *
 * Covers dispute creation, review, appeal, listing, and retrieval.
 */

const assert = require('node:assert');
const { prepareTestDb } = require('./helpers/test-db.js');

prepareTestDb('dispute-service.test.js');

const {
  createDispute,
  reviewDispute,
  appealDispute,
  listDisputes,
  getDispute,
} = require('../platform/api/dispute-service');

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
  console.log(`\nDispute Service: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

test('createDispute inserts a pending dispute', () => {
  const dispute = createDispute({
    identityId: 'apple-brand',
    contestedInput: 'аpple',
    contestedDomain: 'аpple.com',
    evidence: { source: 'test', note: 'Cyrillic a' },
    reviewerNotes: 'Under review',
  });
  assert.ok(dispute);
  assert.strictEqual(dispute.identityId, 'apple-brand');
  assert.strictEqual(dispute.decision, 'pending');
  assert.strictEqual(dispute.appealCount, 0);
});

test('getDispute retrieves a created dispute', () => {
  const created = createDispute({
    identityId: 'google-brand',
    contestedInput: 'g00gle',
  });
  const fetched = getDispute(created.id);
  assert.ok(fetched);
  assert.strictEqual(fetched.id, created.id);
  assert.strictEqual(fetched.identityId, 'google-brand');
});

test('reviewDispute updates decision and decidedAt', () => {
  const dispute = createDispute({
    identityId: 'microsoft-brand',
    contestedInput: 'microsoft',
  });
  const reviewed = reviewDispute(dispute.id, 'confirmed', 'Confirmed by reviewer');
  assert.strictEqual(reviewed.decision, 'confirmed');
  assert.ok(reviewed.decidedAt);
  assert.strictEqual(reviewed.reviewerNotes, 'Confirmed by reviewer');
});

test('reviewDispute with pending clears decidedAt', () => {
  const dispute = createDispute({
    identityId: 'meta-brand',
    contestedInput: 'meta',
  });
  reviewDispute(dispute.id, 'confirmed', 'Confirmed');
  const reset = reviewDispute(dispute.id, 'pending', 'Re-opened');
  assert.strictEqual(reset.decision, 'pending');
  assert.strictEqual(reset.decidedAt, null);
});

test('reviewDispute throws for invalid decision', () => {
  const dispute = createDispute({
    identityId: 'tesla-brand',
    contestedInput: 'tesla',
  });
  assert.throws(() => reviewDispute(dispute.id, 'invalid', 'note'), /decision must be/);
});

test('appealDispute increments appeal count and resets decision', () => {
  const dispute = createDispute({
    identityId: 'netflix-brand',
    contestedInput: 'netflix',
  });
  reviewDispute(dispute.id, 'confirmed', 'Confirmed');
  const appealed = appealDispute(dispute.id, 'Operator appealed');
  assert.strictEqual(appealed.decision, 'pending');
  assert.strictEqual(appealed.appealCount, 1);
  assert.ok(appealed.reviewerNotes.includes('Operator appealed'));
});

test('listDisputes filters by identityId', () => {
  createDispute({ identityId: 'paypal-brand', contestedInput: 'paypal' });
  createDispute({ identityId: 'nike-brand', contestedInput: 'nike' });
  const result = listDisputes({ identityId: 'paypal-brand' });
  assert.ok(result.items.length >= 1);
  assert.ok(result.items.every((d) => d.identityId === 'paypal-brand'));
});

test('listDisputes filters by decision', () => {
  const dispute = createDispute({ identityId: 'amazon-brand', contestedInput: 'amazon' });
  reviewDispute(dispute.id, 'false-positive', 'Not a spoof');
  const result = listDisputes({ decision: 'false-positive' });
  assert.ok(result.items.length >= 1);
  assert.ok(result.items.some((d) => d.identityId === 'amazon-brand'));
});

test('listDisputes returns total count and pagination', () => {
  const before = listDisputes({ limit: 1000 }).total;
  createDispute({ identityId: 'apple-brand', contestedInput: 'apple-paginated' });
  const after = listDisputes({ limit: 1000 }).total;
  assert.strictEqual(after, before + 1);
});

test('createDispute requires identityId and contestedInput', () => {
  assert.throws(
    () => createDispute({ contestedInput: 'foo' }),
    /identityId and contestedInput are required/
  );
  assert.throws(
    () => createDispute({ identityId: 'foo' }),
    /identityId and contestedInput are required/
  );
});

test('getDispute returns null for missing id', () => {
  const fetched = getDispute(999999);
  assert.strictEqual(fetched, null);
});

test('appealDispute throws for missing id', () => {
  assert.throws(() => appealDispute(999999, 'notes'), /Dispute 999999 not found/);
});

run();
