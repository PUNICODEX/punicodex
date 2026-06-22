/**
 * PÚNYCODEX — Audit Log Tests
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

const testDbPath = prepareTestDb(__filename);
const { migrateEnterpriseGovernance } = require('../platform/db/migrate-enterprise-governance.js');
const db = new Database(testDbPath);
migrateEnterpriseGovernance({ db });

process.env.PUNYCODEX_TEST_DB_PATH = testDbPath;

const auditLog = require('../platform/api/audit-log.js');
const { run, all, get, insert, closeDb } = require('../platform/db/operational.js');

const dbLike = { all, run, get, insert };
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Audit Log Tests\n');
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
  console.log(`\nAudit Log: ${passed} passed, ${failed} failed`);
  await closeDb();
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

async function seedTenant(id) {
  await run(`INSERT INTO tenants (id, name, plan) VALUES ($1, $2, $3)`, [id, 'Test', 'pro']);
}

test('appendAuditLog creates a log entry with a hash', async () => {
  await seedTenant('t1');
  const result = await auditLog.appendAuditLog(dbLike, {
    tenant_id: 't1',
    actor_type: 'system',
    actor_id: 'test',
    action: 'test.action',
    resource_type: 'test',
    resource_id: '1',
    metadata: { foo: 'bar' },
  });
  assert.ok(result.id);
  assert.ok(result.entryHash);
  assert.strictEqual(result.entryHash.length, 64);
});

test('verifyAuditChain returns valid for unmodified logs', async () => {
  const chain = await auditLog.verifyAuditChain(dbLike, 't1');
  assert.strictEqual(chain.valid, true);
});

test('tamper detection reports invalid chain', async () => {
  await run(`UPDATE audit_logs SET action = 'tampered' WHERE tenant_id = $1`, ['t1']);
  const chain = await auditLog.verifyAuditChain(dbLike, 't1');
  assert.strictEqual(chain.valid, false);
  assert.ok(chain.first_invalid_id);
});

test('queryAuditLogs supports filters', async () => {
  const result = await auditLog.queryAuditLogs(dbLike, {
    tenant_id: 't1',
    action: 'test.action',
  });
  assert.strictEqual(result.logs.length, 0);
  const allLogs = await auditLog.queryAuditLogs(dbLike, { tenant_id: 't1' });
  assert.ok(allLogs.total >= 1);
});

test('exportAuditLogs returns JSON', async () => {
  const data = await auditLog.exportAuditLogs(dbLike, 't1', 'json');
  const parsed = JSON.parse(data);
  assert.ok(Array.isArray(parsed));
});

test('exportAuditLogs returns CSV', async () => {
  const data = await auditLog.exportAuditLogs(dbLike, 't1', 'csv');
  assert.ok(data.includes('id,tenant_id'));
});

test('hash chain links entries', async () => {
  await seedTenant('t2');
  const r1 = await auditLog.appendAuditLog(dbLike, {
    tenant_id: 't2',
    actor_type: 'system',
    actor_id: 'a',
    action: 'a1',
  });
  const r2 = await auditLog.appendAuditLog(dbLike, {
    tenant_id: 't2',
    actor_type: 'system',
    actor_id: 'a',
    action: 'a2',
  });
  assert.strictEqual(r2.previousHash, r1.entryHash);
});

test('verifyAuditChain endpoint style returns valid after clean inserts', async () => {
  const chain = await auditLog.verifyAuditChain(dbLike, 't2');
  assert.strictEqual(chain.valid, true);
});

runSuite();
