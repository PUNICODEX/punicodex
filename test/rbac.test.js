/**
 * PuniCodex — RBAC Tests
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

const testDbPath = prepareTestDb(__filename);
const { migrateEnterpriseGovernance } = require('../platform/db/migrate-enterprise-governance.js');
const db = new Database(testDbPath);
migrateEnterpriseGovernance({ db });

process.env.PUNICODEX_TEST_DB_PATH = testDbPath;

const rbac = require('../platform/api/rbac.js');
const { run, all, get, insert, closeDb } = require('../platform/db/operational.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ RBAC Tests\n');
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
  console.log(`\nRBAC: ${passed} passed, ${failed} failed`);
  await closeDb();
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

async function seedTenant() {
  await run(
    `INSERT INTO tenants (id, name, plan) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO NOTHING`,
    ['t1', 'Test Tenant', 'pro']
  );
}

test('superadmin has all permissions', () => {
  assert.strictEqual(rbac.hasPermission('superadmin', 'manage_users'), true);
  assert.strictEqual(rbac.hasPermission('superadmin', 'view_audit'), true);
  assert.strictEqual(rbac.hasPermission('superadmin', 'anything'), true);
});

test('tenant_admin has expected permissions and no superadmin-only ones', () => {
  assert.strictEqual(rbac.hasPermission('tenant_admin', 'manage_users'), true);
  assert.strictEqual(rbac.hasPermission('tenant_admin', 'view_audit'), true);
  assert.strictEqual(rbac.hasPermission('tenant_admin', 'export_audit'), true);
  assert.strictEqual(rbac.hasPermission('tenant_admin', 'api_write'), false);
});

test('analyst has view_audit and view_reports', () => {
  assert.strictEqual(rbac.hasPermission('analyst', 'view_audit'), true);
  assert.strictEqual(rbac.hasPermission('analyst', 'view_reports'), true);
  assert.strictEqual(rbac.hasPermission('analyst', 'manage_users'), false);
});

test('viewer only has view_reports', () => {
  assert.strictEqual(rbac.hasPermission('viewer', 'view_reports'), true);
  assert.strictEqual(rbac.hasPermission('viewer', 'view_audit'), false);
});

test('api role has api scopes', () => {
  assert.strictEqual(rbac.hasPermission('api', 'api_read'), true);
  assert.strictEqual(rbac.hasPermission('api', 'api_write'), true);
  assert.strictEqual(rbac.hasPermission('api', 'view_audit'), false);
});

test('requirePermission throws UnauthorizedError for missing permission', () => {
  try {
    rbac.requirePermission('viewer', 'manage_users');
    assert.fail('expected error');
  } catch (err) {
    assert.ok(err instanceof rbac.UnauthorizedError);
    assert.strictEqual(err.code, 'UNAUTHORIZED');
  }
});

test('listTenantUsers returns users for tenant', async () => {
  await seedTenant();
  await run(`INSERT INTO tenant_users (tenant_id, email_hash, role) VALUES ($1, $2, $3)`, [
    't1',
    'hash-a',
    'analyst',
  ]);
  await run(`INSERT INTO tenant_users (tenant_id, email_hash, role) VALUES ($1, $2, $3)`, [
    't1',
    'hash-b',
    'viewer',
  ]);
  const users = await rbac.listTenantUsers({ all }, 't1');
  assert.strictEqual(users.length, 2);
});

test('assignRole updates role', async () => {
  await seedTenant();
  const id = await insert(
    `INSERT INTO tenant_users (tenant_id, email_hash, role) VALUES ($1, $2, $3) RETURNING id`,
    ['t1', 'hash-c', 'viewer']
  );
  const ok = await rbac.assignRole({ run }, id, 'analyst');
  assert.strictEqual(ok, true);
  const row = await get(`SELECT role FROM tenant_users WHERE id = $1`, [id]);
  assert.strictEqual(row.role, 'analyst');
});

test('assignRole throws on invalid role', async () => {
  try {
    await rbac.assignRole({ run }, 1, 'god');
    assert.fail('expected error');
  } catch (err) {
    assert.ok(err.message.includes('Invalid role'));
  }
});

runSuite();
