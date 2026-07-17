/**
 * PuniCodex — Red-Team Runner
 *
 * Loads authenticity benchmarks, runs every input through the Name Authenticity
 * Shield, and enforces formal error budgets:
 *   - TPR ≥ 99.99% (deceptive samples flagged as deceptive)
 *   - FPR ≤ 0.001% (legitimate samples not flagged as deceptive)
 *
 * Outputs a dated JSON report under data/benchmarks/authenticity/ and exits
 * with a non-zero code if budgets are not met.
 *
 * Run: node scripts/red-team-run.js [--benchmarks path/to/dir] [--samples N]
 */

const fs = require('node:fs');
const path = require('node:path');
const { performance } = require('node:perf_hooks');

const BENCH_DIR = path.join(__dirname, '..', 'data', 'benchmarks', 'authenticity');
const REPORT_DIR = BENCH_DIR;

const TPR_BUDGET = 0.9999;
const FPR_BUDGET = 0.00001;

const DECEPTIVE_VERDICTS = new Set([
  'homograph-spoof',
  'mixed-script-spoof',
  'lookalike-domain',
  'unsafe',
]);

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    benchmarks: BENCH_DIR,
    samples: Infinity,
    output: null,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--benchmarks' && i + 1 < args.length) {
      options.benchmarks = args[i + 1];
      i++;
    } else if (args[i] === '--samples' && i + 1 < args.length) {
      options.samples = Number.parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--output' && i + 1 < args.length) {
      options.output = args[i + 1];
      i++;
    }
  }
  return options;
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function isDeceptive(result) {
  return DECEPTIVE_VERDICTS.has(result.verdict);
}

function classifyInput(input, type, service) {
  switch (type) {
    case 'domain':
      return service.classifyDomain(input);
    case 'url':
      return service.classifyUrl(input);
    case 'term':
    default:
      return service.classifyTerm(input);
  }
}

function computeMetrics(tp, fp, tn, fn) {
  const tpr = tp + fn > 0 ? tp / (tp + fn) : 1;
  const fpr = fp + tn > 0 ? fp / (fp + tn) : 0;
  const fnr = tp + fn > 0 ? fn / (tp + fn) : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tpr;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { tpr, fpr, fnr, precision, recall, f1 };
}

function formatPercent(n) {
  return `${(n * 100).toFixed(4)}%`;
}

async function main() {
  const options = parseArgs();

  // Initialize test DB so the service can connect without mutating prod data.
  const { prepareTestDb } = require(path.join(__dirname, '..', 'test', 'helpers', 'test-db.js'));
  prepareTestDb('red-team-run.js');

  const service = require(path.join(__dirname, '..', 'platform', 'api', 'authenticity-service.js'));

  const legitimate = readJsonl(path.join(options.benchmarks, 'legitimate-50k.jsonl'));
  const deceptive = readJsonl(path.join(options.benchmarks, 'deceptive-50k.jsonl'));
  const hardNegatives = readJsonl(path.join(options.benchmarks, 'hard-negatives-5k.jsonl'));

  const sampleCap = Number.isFinite(options.samples) ? options.samples : Infinity;

  const runSet = (rows, expectedLabel) => {
    const capped = rows.slice(0, sampleCap);
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;
    const errors = [];
    const latencies = [];
    const start = performance.now();

    for (const row of capped) {
      const t0 = performance.now();
      try {
        const result = classifyInput(row.input, row.type, service);
        const detected = isDeceptive(result);
        const expectedDeceptive = expectedLabel === 'deceptive' || row.label === 'deceptive';

        if (expectedDeceptive && detected) tp++;
        else if (expectedDeceptive && !detected) fn++;
        else if (!expectedDeceptive && detected) fp++;
        else tn++;
      } catch (e) {
        errors.push({ input: row.input, error: e.message, stack: e.stack });
        // A crash on a deceptive sample is a false negative; on a legitimate sample, a false positive.
        if (expectedLabel === 'deceptive' || row.label === 'deceptive') fn++;
        else fp++;
      }
      latencies.push(performance.now() - t0);
    }

    return {
      total: capped.length,
      tp,
      fp,
      tn,
      fn,
      errors,
      latencies,
      durationMs: performance.now() - start,
    };
  };

  const legitimateResult = runSet(legitimate, 'legitimate');
  const deceptiveResult = runSet(deceptive, 'deceptive');
  const hardResult = runSet(hardNegatives, 'hard-negative');

  const overallTp = legitimateResult.tp + deceptiveResult.tp + hardResult.tp;
  const overallFp = legitimateResult.fp + deceptiveResult.fp + hardResult.fp;
  const overallTn = legitimateResult.tn + deceptiveResult.tn + hardResult.tn;
  const overallFn = legitimateResult.fn + deceptiveResult.fn + hardResult.fn;

  const metrics = computeMetrics(overallTp, overallFp, overallTn, overallFn);
  const deceptiveOnly = computeMetrics(
    deceptiveResult.tp,
    deceptiveResult.fp,
    deceptiveResult.tn,
    deceptiveResult.fn
  );
  const legitimateOnly = computeMetrics(
    legitimateResult.tp,
    legitimateResult.fp,
    legitimateResult.tn,
    legitimateResult.fn
  );

  const allErrors = [
    ...legitimateResult.errors,
    ...deceptiveResult.errors,
    ...hardResult.errors,
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    budgets: {
      tpr: { min: TPR_BUDGET, achieved: metrics.tpr, met: metrics.tpr >= TPR_BUDGET },
      fpr: { max: FPR_BUDGET, achieved: metrics.fpr, met: metrics.fpr <= FPR_BUDGET },
    },
    summary: {
      totalSamples: overallTp + overallFp + overallTn + overallFn,
      overall: metrics,
      deceptive: deceptiveOnly,
      legitimate: legitimateOnly,
      hardNegatives: {
        total: hardResult.total,
        tp: hardResult.tp,
        fp: hardResult.fp,
        tn: hardResult.tn,
        fn: hardResult.fn,
      },
    },
    sets: {
      legitimate: {
        path: path.join(options.benchmarks, 'legitimate-50k.jsonl'),
        ...legitimateResult,
        latencies: undefined,
      },
      deceptive: {
        path: path.join(options.benchmarks, 'deceptive-50k.jsonl'),
        ...deceptiveResult,
        latencies: undefined,
      },
      hardNegatives: {
        path: path.join(options.benchmarks, 'hard-negatives-5k.jsonl'),
        ...hardResult,
        latencies: undefined,
      },
    },
    performance: {
      totalDurationMs: legitimateResult.durationMs + deceptiveResult.durationMs + hardResult.durationMs,
      meanLatencyMs: mean([].concat(
        legitimateResult.latencies,
        deceptiveResult.latencies,
        hardResult.latencies
      )),
      maxLatencyMs: safeMax([
        ...legitimateResult.latencies,
        ...deceptiveResult.latencies,
        ...hardResult.latencies,
      ]),
    },
    errors: allErrors.slice(0, 100),
  };

  const date = new Date().toISOString().split('T')[0];
  const reportPath = options.output || path.join(REPORT_DIR, `red-team-report-${date}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     PuniCodex — Red-Team Authenticity Report               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Total samples: ${report.summary.totalSamples}`);
  console.log(`  TPR: ${formatPercent(metrics.tpr)} (budget ≥ ${formatPercent(TPR_BUDGET)}) ${metrics.tpr >= TPR_BUDGET ? '✓' : '✗'}`);
  console.log(`  FPR: ${formatPercent(metrics.fpr)} (budget ≤ ${formatPercent(FPR_BUDGET)}) ${metrics.fpr <= FPR_BUDGET ? '✓' : '✗'}`);
  console.log(`  FNR: ${formatPercent(metrics.fnr)}`);
  console.log(`  Precision: ${formatPercent(metrics.precision)}`);
  console.log(`  Recall: ${formatPercent(metrics.recall)}`);
  console.log(`  F1: ${formatPercent(metrics.f1)}`);
  console.log(`  Crashes: ${allErrors.length}`);
  console.log(`  Report: ${reportPath}`);

  if (!report.budgets.tpr.met || !report.budgets.fpr.met || allErrors.length > 0) {
    console.log('\n  ✗ Red-team budgets not met.');
    process.exit(1);
  }

  console.log('\n  ✓ All red-team budgets met.');
  process.exit(0);
}

function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function safeMax(arr) {
  if (!arr || arr.length === 0) return 0;
  return Math.max(...arr);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
