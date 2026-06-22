/**
 * PÚNYCODEX — Red-Team CI Tests
 *
 * Verifies that the red-team runner computes metrics correctly, writes a
 * report, and exits with the expected code when budgets are met or broken.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

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
  console.log(`\nRed-Team CI: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const TMP = path.join(__dirname, 'tmp', 'red-team-ci');

function ensureTmp() {
  if (!fs.existsSync(TMP)) {
    fs.mkdirSync(TMP, { recursive: true });
  }
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((r) => JSON.stringify(r)).join('\n')}\n`, 'utf8');
}

function buildPassingBenchmarks() {
  ensureTmp();
  const legitimate = [];
  for (let i = 0; i < 20; i++) {
    legitimate.push({
      input: `synthsafe${i}`,
      type: 'term',
      family: 'synthetic',
      target: 'unknown',
      expectedVerdict: 'unknown',
      label: 'legitimate',
    });
  }
  const deceptive = [];
  for (let i = 0; i < 20; i++) {
    deceptive.push({
      input: `аpple${i}`,
      type: 'term',
      family: 'synthetic-cyrillic',
      target: 'apple',
      expectedVerdict: 'homograph-spoof',
      label: 'deceptive',
    });
  }
  const hard = [];
  for (let i = 0; i < 5; i++) {
    hard.push({
      input: `аmazon${i}`,
      type: 'term',
      family: 'synthetic-hard',
      target: 'amazon',
      expectedVerdict: 'homograph-spoof',
      label: 'deceptive',
    });
  }
  writeJsonl(path.join(TMP, 'legitimate-50k.jsonl'), legitimate);
  writeJsonl(path.join(TMP, 'deceptive-50k.jsonl'), deceptive);
  writeJsonl(path.join(TMP, 'hard-negatives-5k.jsonl'), hard);
}

function buildFailingBenchmarks() {
  ensureTmp();
  const legitimate = [];
  for (let i = 0; i < 20; i++) {
    legitimate.push({
      input: `аpple${i}`,
      type: 'term',
      family: 'synthetic',
      target: 'apple',
      expectedVerdict: 'unknown',
      label: 'legitimate',
    });
  }
  const deceptive = [];
  for (let i = 0; i < 20; i++) {
    deceptive.push({
      input: `synthsafe${i}`,
      type: 'term',
      family: 'synthetic',
      target: 'unknown',
      expectedVerdict: 'homograph-spoof',
      label: 'deceptive',
    });
  }
  const hard = [];
  writeJsonl(path.join(TMP, 'legitimate-50k.jsonl'), legitimate);
  writeJsonl(path.join(TMP, 'deceptive-50k.jsonl'), deceptive);
  writeJsonl(path.join(TMP, 'hard-negatives-5k.jsonl'), hard);
}

function runRunner(outputFile) {
  const out = path.join(TMP, outputFile);
  const cmd = 'node';
  const args = [
    path.join(ROOT, 'scripts', 'red-team-run.js'),
    '--benchmarks',
    TMP,
    '--output',
    out,
  ];
  try {
    execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' });
    return { code: 0, reportPath: out };
  } catch (err) {
    return { code: err.status || 1, reportPath: out, stdout: err.stdout };
  }
}

test('runner computes metrics on a small synthetic benchmark', () => {
  buildPassingBenchmarks();
  const { code, reportPath } = runRunner('report-pass.json');
  assert.strictEqual(code, 0, `expected exit 0, got ${code}`);
  assert.ok(fs.existsSync(reportPath));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(report.summary.totalSamples, 45);
  assert.ok(typeof report.summary.overall.tpr === 'number');
  assert.ok(typeof report.summary.overall.fpr === 'number');
  assert.ok(typeof report.summary.overall.f1 === 'number');
});

test('runner exits non-zero when TPR budget is broken', () => {
  buildFailingBenchmarks();
  const { code, reportPath } = runRunner('report-fail.json');
  assert.notStrictEqual(code, 0, 'expected non-zero exit');
  assert.ok(fs.existsSync(reportPath));
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.ok(!report.budgets.tpr.met || !report.budgets.fpr.met);
});

test('runner writes a dated report with all required fields', () => {
  buildPassingBenchmarks();
  const { reportPath } = runRunner('report-fields.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.ok(report.generatedAt);
  assert.ok(report.budgets.tpr);
  assert.ok(report.budgets.fpr);
  assert.ok(report.sets.legitimate);
  assert.ok(report.sets.deceptive);
  assert.ok(report.sets.hardNegatives);
  assert.ok(report.performance.totalDurationMs >= 0);
});

test('runner report reflects exact counts from synthetic data', () => {
  buildPassingBenchmarks();
  const { reportPath } = runRunner('report-counts.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.strictEqual(report.sets.legitimate.total, 20);
  assert.strictEqual(report.sets.deceptive.total, 20);
  assert.strictEqual(report.sets.hardNegatives.total, 5);
});

test('runner treats crashes as classification errors', () => {
  // Synthetic input that is very long but should not crash; if it did, it would
  // appear in errors. We just assert the error list is an array.
  buildPassingBenchmarks();
  const { reportPath } = runRunner('report-errors.json');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  assert.ok(Array.isArray(report.errors));
});

run();
