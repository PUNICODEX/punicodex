/**
 * PÚNYCODEX — Runbook Existence Tests (Phase 20)
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RUNBOOK_DIR = path.join(ROOT, 'docs', 'runbooks');

const REQUIRED_RUNBOOKS = [
  'model-rollback.md',
  'blocklist-revert.md',
  'false-positive-storm.md',
  'ddos-response.md',
  'failover-edge-wasm.md',
];

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Runbook Existence Tests\n');
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
  console.log(`\nRunbook Existence: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('runbooks directory exists', () => {
  assert.ok(fs.existsSync(RUNBOOK_DIR), 'docs/runbooks directory missing');
  const stat = fs.statSync(RUNBOOK_DIR);
  assert.ok(stat.isDirectory());
});

for (const runbook of REQUIRED_RUNBOOKS) {
  test(`${runbook} exists and is documented`, () => {
    const filePath = path.join(RUNBOOK_DIR, runbook);
    assert.ok(fs.existsSync(filePath), `${runbook} missing`);
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('# Runbook'), `${runbook} missing runbook header`);
    assert.ok(content.includes('Trigger:'), `${runbook} missing trigger section`);
    assert.ok(content.includes('Immediate Actions'), `${runbook} missing immediate actions`);
  });
}

test('runbooks mention required operational systems', () => {
  const contents = REQUIRED_RUNBOOKS.map((rb) =>
    fs.readFileSync(path.join(RUNBOOK_DIR, rb), 'utf8')
  ).join('\n');
  assert.ok(contents.includes('Grafana') || contents.includes('PagerDuty'));
  assert.ok(contents.includes('status page'));
  assert.ok(contents.includes('post-incident') || contents.includes('Post-Incident'));
});

test('status page exists', () => {
  const statusPath = path.join(ROOT, 'platform', 'public', 'status.html');
  assert.ok(fs.existsSync(statusPath), 'status.html missing');
  const content = fs.readFileSync(statusPath, 'utf8');
  assert.ok(content.includes('System Status'));
  assert.ok(content.includes('SLO') || content.includes('Service Level'));
});

runSuite();
