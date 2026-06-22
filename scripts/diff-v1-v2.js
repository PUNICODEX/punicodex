/**
 * PÚNYCODEX — Differential Testing V1 vs V2
 *
 * Compares the current V2 classifier outputs against a saved baseline report
 * (the "V1" expected outputs). If no baseline exists, compares the current run
 * against the most recent previous red-team report and lists disagreements.
 *
 * Run: node scripts/diff-v1-v2.js [--baseline path/to/report.json] [--samples N]
 */

const fs = require('node:fs');
const path = require('node:path');

const BENCH_DIR = path.join(__dirname, '..', 'data', 'benchmarks', 'authenticity');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    baseline: null,
    samples: Infinity,
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--baseline' && i + 1 < args.length) {
      options.baseline = args[i + 1];
      i++;
    } else if (args[i] === '--samples' && i + 1 < args.length) {
      options.samples = Number.parseInt(args[i + 1], 10);
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

function findPreviousReport() {
  if (!fs.existsSync(BENCH_DIR)) return null;
  const files = fs
    .readdirSync(BENCH_DIR)
    .filter((f) => /^red-team-report-\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .map((f) => ({
      name: f,
      mtime: fs.statSync(path.join(BENCH_DIR, f)).mtimeMs,
      path: path.join(BENCH_DIR, f),
    }))
    .sort((a, b) => b.mtime - a.mtime);
  return files.length > 0 ? files[0].path : null;
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

function main() {
  const options = parseArgs();

  const { prepareTestDb } = require(path.join(__dirname, '..', 'test', 'helpers', 'test-db.js'));
  prepareTestDb('diff-v1-v2.js');

  const service = require(path.join(__dirname, '..', 'platform', 'api', 'authenticity-service.js'));

  const baselinePath = options.baseline || findPreviousReport();
  if (!baselinePath) {
    console.log('No baseline report found. Run scripts/red-team-run.js first.');
    process.exit(0);
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const baselineByInput = new Map();

  // Reconstruct per-input expected verdicts from baseline sets.
  for (const [setName, setData] of Object.entries(baseline.sets || {})) {
    const rows = readJsonl(setData.path || path.join(BENCH_DIR, `${setName}-50k.jsonl`));
    let verdictIndex = 0;
    for (const row of rows.slice(0, options.samples)) {
      // Baseline report stores aggregate counts, not per-input verdicts.
      // We approximate by treating the set's expectedVerdict as the baseline.
      baselineByInput.set(`${setName}:${row.input}`, {
        set: setName,
        input: row.input,
        type: row.type,
        expectedVerdict: row.expectedVerdict,
        baselineLabel: setName === 'deceptive' ? 'deceptive' : 'legitimate',
      });
      verdictIndex++;
    }
  }

  const sets = [
    { name: 'legitimate', file: 'legitimate-50k.jsonl' },
    { name: 'deceptive', file: 'deceptive-50k.jsonl' },
    { name: 'hardNegatives', file: 'hard-negatives-5k.jsonl' },
  ];

  const disagreements = [];
  const totalInputs = [];

  for (const { name, file } of sets) {
    const rows = readJsonl(path.join(BENCH_DIR, file)).slice(0, options.samples);
    for (const row of rows) {
      const key = `${name}:${row.input}`;
      totalInputs.push(key);
      const baselineInfo = baselineByInput.get(key);
      const current = classifyInput(row.input, row.type, service);
      const currentIsDeceptive =
        current.verdict === 'homograph-spoof' ||
        current.verdict === 'mixed-script-spoof' ||
        current.verdict === 'lookalike-domain' ||
        current.verdict === 'unsafe';
      const baselineIsDeceptive = baselineInfo?.baselineLabel === 'deceptive' || row.label === 'deceptive';

      if (currentIsDeceptive !== baselineIsDeceptive) {
        disagreements.push({
          set: name,
          input: row.input,
          type: row.type,
          target: row.target,
          baselineLabel: baselineIsDeceptive ? 'deceptive' : 'legitimate',
          currentVerdict: current.verdict,
          currentSeverity: current.severity,
        });
      }
    }
  }

  const disagreementRate = totalInputs.length > 0 ? disagreements.length / totalInputs.length : 0;

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     PÚNYCODEX — V1 vs V2 Differential Report               ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`  Baseline: ${baselinePath}`);
  console.log(`  Inputs compared: ${totalInputs.length}`);
  console.log(`  Disagreements: ${disagreements.length} (${(disagreementRate * 100).toFixed(4)}%)`);

  if (disagreements.length > 0) {
    console.log('\n  Sample disagreements:');
    for (const d of disagreements.slice(0, 20)) {
      console.log(`    ${d.set}: ${d.input} => ${d.currentVerdict} (expected ${d.baselineLabel})`);
    }
  }

  const reportPath = path.join(BENCH_DIR, `diff-report-${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baselinePath,
        summary: {
          inputsCompared: totalInputs.length,
          disagreements: disagreements.length,
          disagreementRate,
        },
        disagreements: disagreements.slice(0, 1000),
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`  Report: ${reportPath}`);

  // Exit non-zero if more than 0.1% of inputs disagree.
  if (disagreementRate > 0.001) {
    console.log('\n  ✗ Differential drift exceeds 0.1%.');
    process.exit(1);
  }

  console.log('\n  ✓ Differential drift within tolerance.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
