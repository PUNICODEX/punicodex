/**
 * PÚNYCODEX — Master Test Runner
 * Runs all Node.js test suites and reports combined results.
 * Run: node test/run-all.js
 */

const { execSync } = require('node:child_process');
const path = require('node:path');

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

const SUITES = [
  { name: 'Lexicon Validator', cmd: 'node type/js/validate.js' },
  { name: 'Engine Unit Tests', cmd: 'node type/js/test-engine.js' },
  { name: 'Link Checker', cmd: 'node test/links.js' },
  { name: 'SEO Validator', cmd: 'node scripts/validate-seo.js' },
  { name: 'Philological Accuracy', cmd: 'node scripts/validate-accuracy.js' },
];

const results = [];
let totalPass = 0;
let _totalFail = 0;

console.log(`${C.bold}╔══════════════════════════════════════════════════╗${C.reset}`);
console.log(`${C.bold}║     PÚNYCODEX — Master Test Runner              ║${C.reset}`);
console.log(`${C.bold}╚══════════════════════════════════════════════════╝${C.reset}`);

for (const suite of SUITES) {
  console.log(`\n${C.cyan}▸ ${suite.name}${C.reset}`);
  try {
    const output = execSync(suite.cmd, {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000,
    });
    console.log(output.trimEnd());
    results.push({ name: suite.name, ok: true });
    // Try to extract pass count from output
    const match = output.match(/(\d+) assertions passed|All (\d+) tests passed/);
    if (match) {
      totalPass += parseInt(match[1] || match[2], 10);
    }
  } catch (err) {
    console.log(err.stdout ? err.stdout.toString().trimEnd() : '');
    if (err.stderr) console.log(err.stderr.toString());
    results.push({ name: suite.name, ok: false });
    _totalFail++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`${C.bold}Results:${C.reset}`);
results.forEach((r) => {
  const icon = r.ok ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
  console.log(`  ${icon} ${r.name}`);
});

if (totalPass > 0) {
  console.log(
    `\n  ${C.dim}Total assertions passed:${C.reset} ${C.green}${totalPass.toLocaleString()}${C.reset}`
  );
}

const allOk = results.every((r) => r.ok);
if (allOk) {
  console.log(`\n  ${C.green}✓ All suites passed${C.reset}`);
  process.exit(0);
} else {
  console.log(`\n  ${C.red}✗ ${results.filter((r) => !r.ok).length} suite(s) failed${C.reset}`);
  process.exit(1);
}
