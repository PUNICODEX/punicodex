/**
 * PÚNYCODEX — Feature Drift Monitor Tests (Phase 14)
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

const testDbPath = prepareTestDb(__filename);
const { migrateMLOps } = require('../platform/db/migrate-mlops.js');
const db = new Database(testDbPath);
migrateMLOps({ db });

process.env.PUNYCODEX_TEST_DB_PATH = testDbPath;

const drift = require('../platform/api/drift-monitor.js');
const { run, all, get, insert, closeDb } = require('../platform/db/operational.js');

const dbLike = { all, run, get, insert };
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Drift Monitor Tests\n');
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
  console.log(`\nDrift Monitor: ${passed} passed, ${failed} failed`);
  await closeDb();
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

test('bucketFor maps values to 0-100 range', () => {
  assert.strictEqual(drift.bucketFor(0), 0);
  assert.strictEqual(drift.bucketFor(0.5), 50);
  assert.strictEqual(drift.bucketFor(1), 100);
  assert.strictEqual(drift.bucketFor(1.5), 100);
});

test('recordFeatureSample aggregates into drift_samples', async () => {
  await run(`DELETE FROM drift_samples`);
  await drift.recordFeatureSample(
    dbLike,
    { scriptEntropy: 1.2, confusableDensity: 0.3, normalizationDistance: 0.1 },
    { modelVersion: 'v2.0.0', windowStart: '2026-06-01', tenantId: 't1' }
  );
  await drift.recordFeatureSample(
    dbLike,
    { scriptEntropy: 1.2, confusableDensity: 0.3, normalizationDistance: 0.1 },
    { modelVersion: 'v2.0.0', windowStart: '2026-06-01', tenantId: 't1' }
  );

  const row = await get(
    `SELECT count FROM drift_samples
     WHERE feature_name = $1 AND model_version = $2 AND window_start = $3`,
    ['script_entropy', 'v2.0.0', '2026-06-01']
  );
  assert.ok(row);
  assert.strictEqual(row.count, 2);
});

test('getFeatureDistribution returns bucket counts', async () => {
  const distribution = await drift.getFeatureDistribution(dbLike, 'script_entropy', {
    modelVersion: 'v2.0.0',
    from: '2026-06-01',
    to: '2026-06-01',
  });
  assert.ok(distribution.length > 0);
  assert.ok(distribution.every((r) => Number.isInteger(r.count)));
});

test('klDivergence is zero for identical distributions', () => {
  const dist = [{ bucket: 50, count: 10 }];
  assert.strictEqual(drift.klDivergence(dist, dist), 0);
});

test('klDivergence is positive when distributions differ', () => {
  const baseline = [{ bucket: 0, count: 10 }];
  const current = [{ bucket: 100, count: 10 }];
  assert.ok(drift.klDivergence(baseline, current) > 0);
});

test('computeDrift flags features that exceed threshold', async () => {
  await run(`DELETE FROM drift_samples`);

  // Baseline window: all samples at bucket 0.
  for (let i = 0; i < 10; i++) {
    await drift.recordFeatureSample(
      dbLike,
      { scriptEntropy: 0, confusableDensity: 0, normalizationDistance: 0 },
      { modelVersion: 'v2.0.0', windowStart: '2026-05-01', tenantId: 't1' }
    );
  }

  // Current window: all samples at bucket 100.
  for (let i = 0; i < 10; i++) {
    await drift.recordFeatureSample(
      dbLike,
      { scriptEntropy: 2, confusableDensity: 1, normalizationDistance: 1 },
      { modelVersion: 'v2.0.0', windowStart: '2026-06-01', tenantId: 't1' }
    );
  }

  const results = await drift.computeDrift(
    dbLike,
    { modelVersion: 'v2.0.0', from: '2026-05-01', to: '2026-05-31' },
    { modelVersion: 'v2.0.0', from: '2026-06-01', to: '2026-06-30' },
    ['script_entropy', 'confusable_density']
  );

  assert.strictEqual(results.length, 2);
  assert.ok(results.every((r) => r.alert));
  assert.ok(results.every((r) => r.divergence > 0));
});

test('getDriftReport includes alerting summary', async () => {
  const report = await drift.getDriftReport(dbLike, {
    baseline: { modelVersion: 'v2.0.0', from: '2026-05-01', to: '2026-05-31' },
    current: { modelVersion: 'v2.0.0', from: '2026-06-01', to: '2026-06-30' },
    features: ['script_entropy'],
  });
  assert.ok(report.generatedAt);
  assert.ok(Array.isArray(report.features));
  assert.ok(Number.isInteger(report.alertCount));
});

runSuite();
