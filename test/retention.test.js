/**
 * PuniCodex — Retention Tests
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

const testDbPath = prepareTestDb(__filename);
const { migrateEnterpriseGovernance } = require('../platform/db/migrate-enterprise-governance.js');
const db = new Database(testDbPath);
migrateEnterpriseGovernance({ db });

process.env.PUNICODEX_TEST_DB_PATH = testDbPath;

const retention = require('../platform/api/retention.js');
const { run, get, closeDb } = require('../platform/db/operational.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Retention Tests\n');
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
  console.log(`\nRetention: ${passed} passed, ${failed} failed`);
  await closeDb();
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

test('purgeExpiredRawInputs deletes old raw inputs', async () => {
  await run(`INSERT INTO raw_inputs (input_hash, is_aggregate, created_at) VALUES ($1, $2, $3)`, [
    'old',
    0,
    '2020-01-01T00:00:00Z',
  ]);
  const before = await get(`SELECT COUNT(*) as c FROM raw_inputs`);
  const result = await retention.purgeExpiredRawInputs({ run }, 90);
  const after = await get(`SELECT COUNT(*) as c FROM raw_inputs`);
  assert.strictEqual(result.deleted, 1);
  assert.strictEqual(after.c, before.c - 1);
});

test('purge preserves aggregate rows', async () => {
  await run(`INSERT INTO raw_inputs (input_hash, is_aggregate, created_at) VALUES ($1, $2, $3)`, [
    'agg-old',
    1,
    '2020-01-01T00:00:00Z',
  ]);
  const result = await retention.purgeExpiredRawInputs({ run }, 90);
  assert.strictEqual(result.deleted, 0);
  const row = await get(`SELECT * FROM raw_inputs WHERE input_hash = $1`, ['agg-old']);
  assert.ok(row);
});

test('no deletion within retention window', async () => {
  await run(`DELETE FROM raw_inputs`);
  await run(
    `INSERT INTO raw_inputs (input_hash, is_aggregate, created_at) VALUES ($1, $2, datetime('now'))`,
    ['recent', 0]
  );
  const result = await retention.purgeExpiredRawInputs({ run }, 90);
  assert.strictEqual(result.deleted, 0);
});

test('archiveOldPartitions is a placeholder', async () => {
  const result = await retention.archiveOldPartitions({ run }, 'raw_inputs', '2020-01-01');
  assert.strictEqual(result.archived, 0);
  assert.ok(result.message);
});

test('purge respects custom retention days', async () => {
  await run(`DELETE FROM raw_inputs`);
  await run(`INSERT INTO raw_inputs (input_hash, is_aggregate, created_at) VALUES ($1, $2, $3)`, [
    'custom',
    0,
    '2025-01-01T00:00:00Z',
  ]);
  const result = await retention.purgeExpiredRawInputs({ run }, 30);
  assert.strictEqual(result.deleted, 1);
});

runSuite();
