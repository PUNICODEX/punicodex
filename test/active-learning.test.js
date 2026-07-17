/**
 * PuniCodex — Active Learning Tests (Phase 14)
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

function sha256(data) {
  return crypto.createHash('sha256').update(String(data)).digest('hex');
}

const testDbPath = prepareTestDb(__filename);
const { migrateMLOps } = require('../platform/db/migrate-mlops.js');
const db = new Database(testDbPath);
migrateMLOps({ db });

process.env.PUNICODEX_TEST_DB_PATH = testDbPath;

const activeLearning = require('../platform/api/active-learning.js');
const { run, all, get, insert, closeDb } = require('../platform/db/operational.js');

const dbLike = { all, run, get, insert };
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Active Learning Tests\n');
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message}`);
    }
  }
  console.log(`\nActive Learning: ${passed} passed, ${failed} failed`);
  await closeDb();
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

test('isUncertain accepts probabilities in 0.4-0.7 range', () => {
  assert.ok(activeLearning.isUncertain(0.55));
  assert.ok(activeLearning.isUncertain(0.4));
  assert.ok(activeLearning.isUncertain(0.7));
  assert.ok(!activeLearning.isUncertain(0.39));
  assert.ok(!activeLearning.isUncertain(0.71));
});

test('computePriorityScore rewards boundary and feature density', () => {
  const score = activeLearning.computePriorityScore('x', 0.55, {
    scriptEntropy: 1.2,
    confusableDensity: 0.5,
    mixedScriptFlag: true,
  });
  assert.ok(score > 0);
});

test('queueUncertainSample stores uncertain prediction', async () => {
  await run(`DELETE FROM active_learning_queue`);
  const result = await activeLearning.queueUncertainSample(dbLike, 'hêrmes', {
    probability: 0.55,
    verdict: 'transliteration-uncertain',
    features: { scriptEntropy: 0.5 },
  });
  assert.strictEqual(result.queued, true);
  assert.ok(result.id);
  assert.ok(result.priority > 0);
});

test('queueUncertainSample rejects out-of-range probability', async () => {
  const result = await activeLearning.queueUncertainSample(dbLike, 'zeus', {
    probability: 0.95,
    verdict: 'canonical',
  });
  assert.strictEqual(result.queued, false);
  assert.strictEqual(result.reason, 'probability_out_of_range');
});

test('queueUncertainSample respects queue cap', async () => {
  await run(`DELETE FROM active_learning_queue`);
  for (let i = 0; i < 5; i++) {
    await activeLearning.queueUncertainSample(
      dbLike,
      `sample${i}`,
      { probability: 0.55, verdict: 'unknown' },
      { maxQueueSize: 5 }
    );
  }
  const result = await activeLearning.queueUncertainSample(
    dbLike,
    'overflow',
    { probability: 0.55, verdict: 'unknown' },
    { maxQueueSize: 5 }
  );
  assert.strictEqual(result.queued, false);
  assert.strictEqual(result.reason, 'queue_full');
});

test('active learning queue never exceeds configured cap', async () => {
  await run(`DELETE FROM active_learning_queue`);
  for (let i = 0; i < 1005; i++) {
    await activeLearning.queueUncertainSample(
      dbLike,
      `cap${i}`,
      { probability: 0.55, verdict: 'unknown' },
      { maxQueueSize: 1000 }
    );
  }
  const size = await activeLearning.getQueueSize(dbLike);
  assert.strictEqual(size, 1000);
});

test('queueUncertainSample deduplicates unreviewed entries', async () => {
  await run(`DELETE FROM active_learning_queue`);
  await activeLearning.queueUncertainSample(dbLike, 'duplicate', {
    probability: 0.55,
    verdict: 'unknown',
  });
  const second = await activeLearning.queueUncertainSample(dbLike, 'duplicate', {
    probability: 0.55,
    verdict: 'unknown',
  });
  assert.strictEqual(second.queued, false);
  assert.strictEqual(second.reason, 'already_queued');
});

test('getReviewQueue returns highest priority items first', async () => {
  await run(`DELETE FROM active_learning_queue`);
  await activeLearning.queueUncertainSample(dbLike, 'low', {
    probability: 0.4,
    verdict: 'unknown',
    features: { scriptEntropy: 0 },
  });
  await activeLearning.queueUncertainSample(dbLike, 'high', {
    probability: 0.55,
    verdict: 'unknown',
    features: { scriptEntropy: 2, confusableDensity: 1 },
  });
  const queue = await activeLearning.getReviewQueue(dbLike, { limit: 10 });
  assert.strictEqual(queue[0].input, 'high');
});

test('submitReviewerFeedback marks sample reviewed and records label', async () => {
  await run(`DELETE FROM active_learning_queue`);
  await activeLearning.queueUncertainSample(dbLike, 'feedback', {
    probability: 0.55,
    verdict: 'unknown',
  });
  const result = await activeLearning.submitReviewerFeedback(
    dbLike,
    sha256('feedback'),
    'false-positive',
    'reviewer-1',
    'legitimate brand variant'
  );
  assert.strictEqual(result.updated, true);
  const reviewed = await get(
    `SELECT reviewed, reviewer_decision FROM active_learning_queue WHERE input = $1`,
    ['feedback']
  );
  assert.strictEqual(reviewed.reviewed, 1);
  assert.strictEqual(reviewed.reviewer_decision, 'false-positive');
});

test('recordAppeal stores hard negative feedback', async () => {
  await run(`DELETE FROM active_learning_queue`);
  await run(`DELETE FROM reviewer_feedback`);
  await activeLearning.recordAppeal(dbLike, 'not-a-spof', 'user-42', 'this is my domain');
  const feedback = await get(`SELECT decision FROM reviewer_feedback WHERE input_hash = $1`, [
    sha256('not-a-spof'),
  ]);
  assert.ok(feedback);
  assert.strictEqual(feedback.decision, 'false-positive');
});

runSuite();
