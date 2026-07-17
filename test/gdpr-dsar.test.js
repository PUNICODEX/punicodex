/**
 * PuniCodex — GDPR / CCPA Data-Subject Rights Tests (Phase 16)
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

process.env.PUNICODEX_TEST_DB_PATH = testDbPath;

const privacyService = require('../platform/api/privacy-service.js');
const abuseService = require('../platform/api/abuse-service.js');
const auditLog = require('../platform/api/audit-log.js');
const { run, all, get, insert, closeDb } = require('../platform/db/operational.js');

const dbLike = { all, run, get, insert };
const CLIENT_ID = 'user-phase16@example.com';
const CLIENT_HASH = privacyService.hashClientId(CLIENT_ID);

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ GDPR / DSAR Tests\n');
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
  console.log(`\nGDPR / DSAR: ${passed} passed, ${failed} failed`);
  await closeDb();
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

test('createDsarRequest sets a 30-day deadline', async () => {
  const request = await privacyService.createDsarRequest({
    clientId: CLIENT_ID,
    type: 'export',
    tenantId: 'test-tenant',
  });
  assert.ok(request.request_id);
  assert.strictEqual(request.request_type, 'export');
  assert.strictEqual(request.status, 'pending');

  const created = new Date(request.created_at).getTime();
  const deadline = new Date(request.deadline_at).getTime();
  const days = (deadline - created) / (1000 * 60 * 60 * 24);
  assert.ok(days >= 29 && days <= 31, `deadline offset was ${days} days`);
});

test('exportDataForUser returns the DSAR request', async () => {
  const exported = privacyService.exportDataForUser(CLIENT_HASH);
  assert.strictEqual(exported.clientHash, CLIENT_HASH);
  assert.ok(exported.dsarRequests.length >= 1);
  assert.ok(exported.dsarRequests.some((r) => r.request_type === 'export'));
});

test('deleteUserData removes raw inputs and anonymizes report identities', async () => {
  await run(
    `INSERT INTO raw_inputs (tenant_id, input_hash, input_preview, created_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
    ['test-tenant', CLIENT_HASH, 'preview-of-input']
  );

  const abuse = await abuseService.createAbuseReport({
    reporterContact: CLIENT_ID,
    domain: 'example.com',
    category: 'other',
  });
  assert.ok(abuse);

  const beforeExport = privacyService.exportDataForUser(CLIENT_HASH);
  assert.strictEqual(beforeExport.rawInputs.length, 1);
  assert.ok(beforeExport.abuseReports.length >= 1);

  const deletion = await privacyService.deleteUserData(CLIENT_HASH);
  assert.strictEqual(deletion.rawInputsDeleted, 1);
  assert.ok(deletion.abuseReportsAnonymized >= 1);

  const afterExport = privacyService.exportDataForUser(CLIENT_HASH);
  assert.strictEqual(afterExport.rawInputs.length, 0);
});

test('scheduleDueDeletions completes overdue delete requests and logs audit events', async () => {
  const deleteRequest = await privacyService.createDsarRequest({
    clientHash: CLIENT_HASH,
    type: 'delete',
  });

  const afterDeadline = new Date(deleteRequest.deadline_at);
  afterDeadline.setUTCDate(afterDeadline.getUTCDate() + 1);

  const processed = await privacyService.scheduleDueDeletions(afterDeadline.toISOString());
  assert.ok(processed.length >= 1);
  assert.ok(processed.some((p) => p.requestId === deleteRequest.request_id));

  const completed = privacyService.getDsarRequest(deleteRequest.request_id);
  assert.strictEqual(completed.status, 'completed');
  assert.ok(completed.completed_at);
  assert.ok(completed.result);

  const audit = await auditLog.queryAuditLogs(dbLike, {
    tenant_id: 'system',
    action: 'user_data_deleted',
  });
  assert.ok(audit.logs.length >= 1);
});

test('lawful access requests are tracked separately', async () => {
  const request = privacyService.createLawfulAccessRequest({
    requesterAuthority: 'Example Court',
    requestType: 'production',
    legalBasis: 'subpoena',
    targetClientHash: CLIENT_HASH,
    scope: 'identity and classification records',
    dueDate: new Date().toISOString(),
  });
  assert.ok(request.request_id);
  const fetched = privacyService.getLawfulAccessRequest(request.request_id);
  assert.strictEqual(fetched.requester_authority, 'Example Court');
});

runSuite();
