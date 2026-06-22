/**
 * PÚNYCODEX — Quarterly Authenticity Model Retrainer (Phase 14)
 *
 * Pulls curated training samples, retrains the ensemble, runs the benchmark
 * suite, A/B deploys the new model if F1 improved by at least 0.1%, and rolls
 * back if metrics regress.
 *
 * Run: node scripts/retrain-authenticity-model.js [--benchmarks dir] [--models dir]
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const DEFAULT_MODELS_DIR = path.join(ROOT, 'platform', 'models', 'authenticity');
const DEFAULT_BENCH_DIR = path.join(ROOT, 'data', 'benchmarks', 'authenticity');
const DEFAULT_REPORT_DIR = path.join(DEFAULT_BENCH_DIR, 'retrain-reports');
const IMPROVEMENT_THRESHOLD = 0.001; // 0.1% F1 improvement required to deploy

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    benchmarks: DEFAULT_BENCH_DIR,
    modelsDir: DEFAULT_MODELS_DIR,
    reportDir: DEFAULT_REPORT_DIR,
    trainingData: null,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--benchmarks' && i + 1 < args.length) {
      options.benchmarks = args[i + 1];
      i++;
    } else if (args[i] === '--models' && i + 1 < args.length) {
      options.modelsDir = args[i + 1];
      i++;
    } else if (args[i] === '--reports' && i + 1 < args.length) {
      options.reportDir = args[i + 1];
      i++;
    } else if (args[i] === '--training-data' && i + 1 < args.length) {
      options.trainingData = args[i + 1];
      i++;
    }
  }
  return options;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadModelVersion(modelsDir) {
  const versionPath = path.join(modelsDir, 'model-version.json');
  if (!fs.existsSync(versionPath)) {
    return {
      model: 'authenticity-ensemble',
      version: 'v2.0.0',
      releasedAt: new Date().toISOString(),
      benchmarkF1: 0,
    };
  }
  return JSON.parse(fs.readFileSync(versionPath, 'utf8'));
}

function bumpVersion(version) {
  const parts = String(version).split('.');
  const patch = Math.max(0, Number(parts[parts.length - 1]) || 0) + 1;
  parts[parts.length - 1] = String(patch);
  return parts.join('.');
}

function loadTrainingData(options) {
  if (options.trainingData && fs.existsSync(options.trainingData)) {
    return JSON.parse(fs.readFileSync(options.trainingData, 'utf8'));
  }
  return [];
}

function trainModel(trainingData, previousVersion) {
  // Placeholder for the real ensemble retraining pipeline. In production this
  // would fit a gradient-boosted or logistic model on the curated dataset and
  // produce signed artifacts. Here we simulate a deterministic weight update.
  const updateHash = trainingData.length > 0
    ? trainingData.map((row) => String(row.input || row)).join('')
    : String(Date.now());

  return {
    version: bumpVersion(previousVersion.version),
    previousVersion: previousVersion.version,
    weights: {
      ...(previousVersion.weights || {}),
      simulatedUpdate: String(updateHash.length),
    },
    trainedAt: new Date().toISOString(),
    trainingSamples: trainingData.length,
  };
}

function runBenchmark(benchmarkDir, outputFile) {
  const runner = path.join(ROOT, 'scripts', 'red-team-run.js');
  ensureDir(path.dirname(outputFile));
  try {
    execFileSync(
      'node',
      [runner, '--benchmarks', benchmarkDir, '--output', outputFile],
      { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }
    );
  } catch (_e) {
    // The runner exits non-zero when budgets are not met, but it still writes
    // a report that we can evaluate.
  }
  return JSON.parse(fs.readFileSync(outputFile, 'utf8'));
}

function writeReport(reportPath, data) {
  ensureDir(path.dirname(reportPath));
  fs.writeFileSync(reportPath, JSON.stringify(data, null, 2), 'utf8');
}

async function recordRetrainRun(db, result) {
  if (!db || !db.insert) return null;
  return db.insert(
    `INSERT INTO model_retrain_runs
       (model_version, previous_version, benchmark_f1, previous_benchmark_f1,
        status, report_path, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      result.modelVersion,
      result.previousVersion,
      result.benchmarkF1,
      result.previousBenchmarkF1,
      result.status,
      result.reportPath,
      result.trainedAt,
    ]
  );
}

async function main(options = {}) {
  const modelsDir = options.modelsDir || DEFAULT_MODELS_DIR;
  const benchDir = options.benchmarkDir || options.benchmarks || DEFAULT_BENCH_DIR;
  const reportDir = options.reportDir || DEFAULT_REPORT_DIR;

  ensureDir(modelsDir);
  ensureDir(reportDir);

  const previousVersion = loadModelVersion(modelsDir);
  const trainingData = loadTrainingData(options);
  const newModel = trainModel(trainingData, previousVersion);

  const candidateDir = path.join(modelsDir, newModel.version);
  ensureDir(candidateDir);

  const candidateVersionFile = path.join(candidateDir, 'model-version.json');
  fs.writeFileSync(
    candidateVersionFile,
    JSON.stringify({ ...previousVersion, ...newModel }, null, 2),
    'utf8'
  );

  const reportPath = path.join(reportDir, `retrain-report-${newModel.version}.json`);
  const report = options.benchmarkReport
    ? JSON.parse(fs.readFileSync(options.benchmarkReport, 'utf8'))
    : runBenchmark(benchDir, reportPath);

  const newF1 = report?.summary?.overall?.f1 ?? 0;
  const previousF1 = previousVersion.benchmarkF1 || 0;
  const improved = newF1 >= previousF1 + IMPROVEMENT_THRESHOLD;
  const status = improved ? 'deployed' : 'rolled_back';

  const result = {
    modelVersion: newModel.version,
    previousVersion: previousVersion.version,
    benchmarkF1: newF1,
    previousBenchmarkF1: previousF1,
    improved,
    rolledBack: !improved,
    status,
    reportPath,
    candidateDir,
    trainedAt: newModel.trainedAt,
  };

  if (improved) {
    const activeVersion = {
      ...previousVersion,
      version: newModel.version,
      releasedAt: newModel.trainedAt,
      benchmarkF1: newF1,
      previousVersion: previousVersion.version,
    };
    fs.writeFileSync(
      path.join(modelsDir, 'model-version.json'),
      JSON.stringify(activeVersion, null, 2),
      'utf8'
    );
    result.deployedVersion = newModel.version;
  } else {
    result.deployedVersion = previousVersion.version;
  }

  writeReport(reportPath, report);
  const summaryPath = path.join(reportDir, `retrain-summary-${newModel.version}.json`);
  writeReport(summaryPath, result);

  if (options.db) {
    result.runId = await recordRetrainRun(options.db, result);
  }

  return result;
}

module.exports = {
  parseArgs,
  loadModelVersion,
  bumpVersion,
  trainModel,
  runBenchmark,
  recordRetrainRun,
  main,
};

if (require.main === module) {
  main(parseArgs()).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
