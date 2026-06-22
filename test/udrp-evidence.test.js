/**
 * PÚNYCODEX — UDRP Evidence & Case Tracking Tests (Phase 16)
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

const testDbPath = prepareTestDb(__filename);
const { migrateEnterpriseGovernance } = require('../platform/db/migrate-enterprise-governance.js');
const { migrateRegulatory } = require('../platform/db/migrate-regulatory.js');

const db = new Database(testDbPath);
migrateEnterpriseGovernance({ db });
migrateRegulatory({ db });

process.env.PUNYCODEX_TEST_DB_PATH = testDbPath;

const udrpService = require('../platform/api/udrp-service.js');
const { closeDb } = require('../platform/db/operational.js');

const DOMAIN = 'xn--pple-wmc.com';
const CLASSIFICATION = {
  verdict: 'homograph-spoof',
  severity: 'critical',
  reason: 'Cyrillic homograph of a protected identity at registrable-domain level',
  canonicalMatch: { id: 'apple', name: 'Apple', type: 'brand' },
};

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ UDRP Evidence Tests\n');
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
  console.log(`\nUDRP Evidence: ${passed} passed, ${failed} failed`);
  await closeDb();
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

test('createUdrpCase and getUdrpStatus track a case', async () => {
  const created = await udrpService.createUdrpCase({
    caseId: 'D2026-0001',
    domain: DOMAIN,
    complainant: 'Apple Inc.',
    respondent: 'Privacy Protection Service',
    status: 'active',
  });
  assert.strictEqual(created.case_id, 'D2026-0001');
  assert.strictEqual(created.domain, DOMAIN);

  const status = udrpService.getUdrpStatus(DOMAIN);
  assert.ok(status);
  assert.strictEqual(status.case_id, 'D2026-0001');
});

test('generateEvidencePackage completes in under 30 seconds', async () => {
  const started = Date.now();
  const pkg = await udrpService.generateEvidencePackage(DOMAIN, CLASSIFICATION);
  const duration = Date.now() - started;

  assert.ok(pkg.reportId);
  assert.strictEqual(pkg.domain, DOMAIN);
  assert.strictEqual(pkg.forum, 'WIPO');
  assert.strictEqual(pkg.recommendedAction, 'file_udrp');
  assert.ok(pkg.chainOfCustodyHash);
  assert.strictEqual(pkg.chainOfCustodyHash.length, 64);
  assert.ok(duration < 30_000, `evidence package took ${duration} ms`);
});

test('generateEvidencePackage stores the package on an existing case', async () => {
  const pkg = await udrpService.generateEvidencePackage(DOMAIN, CLASSIFICATION);
  const status = udrpService.getUdrpStatus(DOMAIN);
  assert.ok(status.evidence_package);
  const stored = JSON.parse(status.evidence_package);
  assert.strictEqual(stored.reportId, pkg.reportId);
});

test('recordOutcome updates the case to decided', async () => {
  const updated = await udrpService.recordOutcome('D2026-0001', 'transfer_to_complainant');
  assert.strictEqual(updated.status, 'decided');
  assert.strictEqual(updated.outcome, 'transfer_to_complainant');
  assert.ok(updated.decided_at);
});

runSuite();
