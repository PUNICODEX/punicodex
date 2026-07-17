/**
 * PuniCodex — Abuse Reporting API Tests (Phase 16)
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

const abuseService = require('../platform/api/abuse-service.js');
const { closeDb } = require('../platform/db/operational.js');

const REPORTER = 'abuse-reporter-phase16@example.com';
const DOMAIN = 'xn--pple-wmc.com';

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Abuse Report Tests\n');
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
  console.log(`\nAbuse Report: ${passed} passed, ${failed} failed`);
  await closeDb();
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

test('createAbuseReport validates required fields', async () => {
  await assert.rejects(
    abuseService.createAbuseReport({ domain: '', category: 'phishing' }),
    /domain/
  );
  await assert.rejects(
    abuseService.createAbuseReport({ domain: DOMAIN, category: 'invalid' }),
    /category/
  );
});

test('createAbuseReport auto-escalates phishing reports', async () => {
  const report = await abuseService.createAbuseReport({
    reporterContact: REPORTER,
    domain: DOMAIN,
    category: 'phishing',
    description: 'Spoof login page',
  });
  assert.ok(report.report_id);
  assert.strictEqual(report.domain, DOMAIN);
  assert.strictEqual(report.status, 'escalated');
  assert.strictEqual(report.priority, 'high');
  assert.ok(report.escalated_at);
});

test('getAbuseReport and listAbuseReports retrieve reports', async () => {
  const report = await abuseService.createAbuseReport({
    reporterContact: REPORTER,
    domain: DOMAIN,
    category: 'homograph',
  });
  const fetched = abuseService.getAbuseReport(report.report_id);
  assert.ok(fetched);
  assert.strictEqual(fetched.id, report.id);

  const list = abuseService.listAbuseReports({ domain: DOMAIN, status: 'escalated' });
  assert.ok(list.length >= 1);
});

test('resolveAbuseReport updates status and records resolution', async () => {
  const report = await abuseService.createAbuseReport({
    reporterContact: REPORTER,
    domain: 'resolved-example.com',
    category: 'spam',
  });
  const resolved = await abuseService.resolveAbuseReport(report.report_id, {
    status: 'resolved',
    resolutionNote: 'No spoof detected after review',
  });
  assert.strictEqual(resolved.status, 'resolved');
  assert.strictEqual(resolved.resolution_note, 'No spoof detected after review');
  assert.ok(resolved.resolved_at);
});

test('rate limit blocks excessive reports from the same reporter', async () => {
  let blocked = false;
  for (let i = 0; i < abuseService.RATE_LIMIT_MAX_REPORTS + 1; i++) {
    try {
      await abuseService.createAbuseReport({
        reporterContact: REPORTER,
        domain: `rate-limit-${i}.test`,
        category: 'other',
      });
    } catch (err) {
      if (err.code === 'RATE_LIMIT_EXCEEDED') {
        blocked = true;
        break;
      }
      throw err;
    }
  }
  assert.strictEqual(blocked, true);
});

runSuite();
