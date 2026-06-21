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
  { name: 'Oracle Tests', cmd: 'node test/oracle.test.js' },
  { name: 'Search v2 Tests', cmd: 'node test/search-v2.test.js' },
  { name: 'Browser Shell Tests', cmd: 'node test/browser-shell.test.js' },
  { name: 'Workspace Tests', cmd: 'node test/workspaces.test.js' },
  { name: 'Gamification Tests', cmd: 'node test/gamification.test.js' },
  { name: 'Marketplace Tests', cmd: 'node test/marketplace.test.js' },
  { name: 'Agents Tests', cmd: 'node test/agents.test.js' },
  { name: 'Multimodal Tests', cmd: 'node test/multimodal.test.js' },
  { name: 'Partner Tests', cmd: 'node test/partners.test.js' },
  { name: 'API v1 Integration Tests', cmd: 'node test/api-v1.test.js' },
  { name: 'API Auth Tests', cmd: 'node test/api-auth.test.js' },
  { name: 'Rate Limiter Tests', cmd: 'node test/rate-limiter.test.js' },
  { name: 'Foundation Tests', cmd: 'node test/foundations.test.js' },
  { name: 'Search Service Tests', cmd: 'node test/search.test.js' },
  { name: 'Crawler DB Tests', cmd: 'node test/crawler-db.test.js' },
  { name: 'API v2 Integration Tests', cmd: 'node test/api-v2.test.js' },
  { name: 'Observability Tests', cmd: 'node test/observability.test.js' },
  { name: 'Ecosystem Tests', cmd: 'node test/ecosystem.test.js' },
  { name: 'Protocol Tests', cmd: 'node test/protocol.test.js' },
  { name: 'Homograph Defense Tests', cmd: 'node test/homograph-defense.test.js' },
  { name: 'Tenant Ads Tests', cmd: 'node test/tenant-ads.test.js' },
  { name: 'Names Service Tests', cmd: 'node test/names-service.test.js' },
  { name: 'Keyboard Completeness Tests', cmd: 'node test/keyboard-completeness.test.js' },
  { name: 'Event Crawler Tests', cmd: 'node test/event-crawler.test.js' },
  { name: 'Spam Classifier Tests', cmd: 'node test/spam-classifier.test.js' },
  { name: 'LTR Tests', cmd: 'node test/ltr.test.js' },
  { name: 'Generated Artifacts Tests', cmd: 'node test/generated-artifacts.test.js' },
  { name: 'Frontend Smoke Tests', cmd: 'node test/frontend-smoke.test.js' },
  { name: 'Link Checker', cmd: 'node test/links.js' },
  { name: 'SEO Validator', cmd: 'node scripts/validate-seo.js' },
  { name: 'Philological Accuracy', cmd: 'node scripts/validate-accuracy.js' },
  { name: 'Flywheel Integrity', cmd: 'node scripts/validate-flywheel.js' },
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
