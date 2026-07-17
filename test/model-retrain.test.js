/**
 * PuniCodex — Model Retrain Tests (Phase 14)
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

const testDbPath = prepareTestDb(__filename);
const { migrateMLOps } = require('../platform/db/migrate-mlops.js');
const db = new Database(testDbPath);
migrateMLOps({ db });

process.env.PUNICODEX_TEST_DB_PATH = testDbPath;

const retrain = require('../scripts/retrain-authenticity-model.js');
const { run, all, get, insert, closeDb } = require('../platform/db/operational.js');

const dbLike = { all, run, get, insert };
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Model Retrain Tests\n');
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
  console.log(`\nModel Retrain: ${passed} passed, ${failed} failed`);
  await closeDb();
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

const TMP = path.join(__dirname, 'tmp', 'model-retrain');
function ensureTmp() {
  if (!fs.existsSync(TMP)) {
    fs.mkdirSync(TMP, { recursive: true });
  }
}

function writeJson(file, data) {
  ensureTmp();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function buildReport(f1) {
  return {
    generatedAt: new Date().toISOString(),
    budgets: { tpr: { met: true }, fpr: { met: true } },
    summary: {
      totalSamples: 100,
      overall: { tpr: 1, fpr: 0, fnr: 0, precision: 1, recall: 1, f1 },
    },
    sets: { legitimate: {}, deceptive: {}, hardNegatives: {} },
    performance: { totalDurationMs: 10 },
    errors: [],
  };
}

test('bumpVersion increments patch', () => {
  assert.strictEqual(retrain.bumpVersion('v2.0.0'), 'v2.0.1');
  assert.strictEqual(retrain.bumpVersion('v2.1.5'), 'v2.1.6');
});

test('loadModelVersion returns defaults when file missing', () => {
  const version = retrain.loadModelVersion(path.join(TMP, 'missing'));
  assert.strictEqual(version.version, 'v2.0.0');
  assert.strictEqual(version.model, 'authenticity-ensemble');
});

test('trainModel produces a new deterministic version', () => {
  const previous = { version: 'v2.0.0', benchmarkF1: 0.99 };
  const model = retrain.trainModel([{ input: 'аpple' }, { input: 'zeus' }], previous);
  assert.strictEqual(model.version, 'v2.0.1');
  assert.strictEqual(model.trainingSamples, 2);
  assert.ok(model.trainedAt);
});

test('main deploys when F1 improves by at least 0.1%', async () => {
  ensureTmp();
  const modelsDir = path.join(TMP, 'deploy', 'models');
  const reportDir = path.join(TMP, 'deploy', 'reports');
  const reportFile = path.join(TMP, 'deploy', 'report.json');
  writeJson(reportFile, buildReport(0.995));

  fs.mkdirSync(modelsDir, { recursive: true });
  writeJson(path.join(modelsDir, 'model-version.json'), {
    model: 'authenticity-ensemble',
    version: 'v2.0.0',
    releasedAt: new Date().toISOString(),
    benchmarkF1: 0.99,
  });

  const result = await retrain.main({
    modelsDir,
    reportDir,
    benchmarkReport: reportFile,
    trainingData: [{ input: 'аpple' }],
  });

  assert.strictEqual(result.improved, true);
  assert.strictEqual(result.deployedVersion, result.modelVersion);
  assert.ok(fs.existsSync(path.join(modelsDir, 'model-version.json')));
  const active = JSON.parse(fs.readFileSync(path.join(modelsDir, 'model-version.json'), 'utf8'));
  assert.strictEqual(active.benchmarkF1, 0.995);
  assert.strictEqual(active.version, result.modelVersion);
});

test('main rolls back when F1 does not improve', async () => {
  ensureTmp();
  const modelsDir = path.join(TMP, 'rollback', 'models');
  const reportDir = path.join(TMP, 'rollback', 'reports');
  const reportFile = path.join(TMP, 'rollback', 'report.json');
  writeJson(reportFile, buildReport(0.989));

  fs.mkdirSync(modelsDir, { recursive: true });
  writeJson(path.join(modelsDir, 'model-version.json'), {
    model: 'authenticity-ensemble',
    version: 'v2.0.0',
    releasedAt: new Date().toISOString(),
    benchmarkF1: 0.99,
  });

  const result = await retrain.main({
    modelsDir,
    reportDir,
    benchmarkReport: reportFile,
    trainingData: [{ input: 'аpple' }],
  });

  assert.strictEqual(result.improved, false);
  assert.strictEqual(result.rolledBack, true);
  assert.strictEqual(result.deployedVersion, 'v2.0.0');
  const active = JSON.parse(fs.readFileSync(path.join(modelsDir, 'model-version.json'), 'utf8'));
  assert.strictEqual(active.version, 'v2.0.0');
});

test('main writes candidate and summary reports', async () => {
  ensureTmp();
  const modelsDir = path.join(TMP, 'reports', 'models');
  const reportDir = path.join(TMP, 'reports', 'reports');
  const reportFile = path.join(TMP, 'reports', 'report.json');
  writeJson(reportFile, buildReport(0.999));

  fs.mkdirSync(modelsDir, { recursive: true });
  writeJson(path.join(modelsDir, 'model-version.json'), {
    model: 'authenticity-ensemble',
    version: 'v2.0.0',
    releasedAt: new Date().toISOString(),
    benchmarkF1: 0.99,
  });

  const result = await retrain.main({
    modelsDir,
    reportDir,
    benchmarkReport: reportFile,
  });

  assert.ok(fs.existsSync(result.reportPath));
  assert.ok(fs.existsSync(result.candidateDir));
  assert.ok(fs.existsSync(path.join(reportDir, `retrain-summary-${result.modelVersion}.json`)));
});

test('main records retrain run in DB when db provided', async () => {
  ensureTmp();
  const modelsDir = path.join(TMP, 'db-run', 'models');
  const reportDir = path.join(TMP, 'db-run', 'reports');
  const reportFile = path.join(TMP, 'db-run', 'report.json');
  writeJson(reportFile, buildReport(0.999));

  fs.mkdirSync(modelsDir, { recursive: true });
  writeJson(path.join(modelsDir, 'model-version.json'), {
    model: 'authenticity-ensemble',
    version: 'v2.0.0',
    benchmarkF1: 0.99,
  });

  const result = await retrain.main({
    modelsDir,
    reportDir,
    benchmarkReport: reportFile,
    db: dbLike,
  });

  assert.ok(result.runId);
  const row = await get(`SELECT * FROM model_retrain_runs WHERE id = $1`, [result.runId]);
  assert.ok(row);
  assert.strictEqual(row.status, 'deployed');
});

runSuite();
