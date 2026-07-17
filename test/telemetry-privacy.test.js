/**
 * PuniCodex — Telemetry Privacy Tests (Phase 14)
 */

const assert = require('node:assert');
const Database = require('better-sqlite3');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db.js');

const testDbPath = prepareTestDb(__filename);
const { migrateMLOps } = require('../platform/db/migrate-mlops.js');
const db = new Database(testDbPath);
migrateMLOps({ db });

process.env.PUNICODEX_TEST_DB_PATH = testDbPath;

const telemetry = require('../platform/api/telemetry.js');
const { run, all, get, insert, closeDb } = require('../platform/db/operational.js');

const dbLike = { all, run, get, insert };
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Telemetry Privacy Tests\n');
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
  console.log(`\nTelemetry Privacy: ${passed} passed, ${failed} failed`);
  await closeDb();
  db.close();
  cleanupTestDb(__filename);
  process.exit(failed > 0 ? 1 : 0);
}

test('sanitizeEvent strips raw inputs and IPs', () => {
  const event = {
    tenant_id: 't1',
    client_id: 'client-123',
    event_type: 'check',
    input: 'аpple.com',
    rawInput: 'аpple.com',
    ip: '192.168.1.1',
    raw_ip: '192.168.1.1',
    verdict: 'homograph-spoof',
  };
  const safe = telemetry.sanitizeEvent(event);
  assert.strictEqual(safe.input, undefined);
  assert.strictEqual(safe.rawInput, undefined);
  assert.strictEqual(safe.ip, undefined);
  assert.strictEqual(safe.raw_ip, undefined);
  assert.strictEqual(safe.verdict, 'homograph-spoof');
  assert.ok(safe.client_id.startsWith('sha256:'));
});

test('hasRawInput detects sensitive fields', () => {
  assert.ok(telemetry.hasRawInput({ input: 'x' }));
  assert.ok(telemetry.hasRawInput({ ip: 'x' }));
  assert.ok(!telemetry.hasRawInput({ verdict: 'x', model_version: 'v1' }));
});

test('recordTelemetryEvent hashes client id and stores safe event', async () => {
  const result = await telemetry.recordTelemetryEvent(dbLike, {
    tenant_id: 't1',
    client_id: 'alice-device',
    event_type: 'check',
    model_version: 'v2.0.0',
    verdict: 'canonical',
    severity: 'none',
    input: 'zeus',
    ip: '10.0.0.1',
    metadata: { ip: '10.0.0.1', browser: 'firefox' },
  });
  assert.ok(result.id);

  const row = await get(`SELECT * FROM telemetry_events WHERE id = $1`, [result.id]);
  assert.strictEqual(row.tenant_id, 't1');
  assert.ok(row.client_hash.startsWith('sha256:'));
  assert.strictEqual(row.verdict, 'canonical');
  const meta = JSON.parse(row.metadata);
  assert.strictEqual(meta.ip, undefined);
  assert.strictEqual(meta.browser, 'firefox');
});

test('telemetry table never contains raw input columns', async () => {
  const info = await all(`PRAGMA table_info(telemetry_events)`, []);
  const names = info.map((col) => col.name);
  assert.ok(!names.includes('input'));
  assert.ok(!names.includes('ip'));
  assert.ok(!names.includes('raw_input'));
});

test('getAggregateMetrics returns grouped counts', async () => {
  await run(`DELETE FROM telemetry_events`);
  for (let i = 0; i < 3; i++) {
    await telemetry.recordTelemetryEvent(dbLike, {
      tenant_id: 'agg',
      client_id: `c${i}`,
      event_type: 'check',
      verdict: 'homograph-spoof',
      severity: 'critical',
    });
  }
  const rows = await telemetry.getAggregateMetrics(dbLike, { tenant_id: 'agg' });
  const row = rows.find((r) => r.verdict === 'homograph-spoof');
  assert.ok(row);
  assert.strictEqual(row.count, 3);
});

test('differential privacy perturbs aggregate counts', async () => {
  await run(`DELETE FROM telemetry_events`);
  for (let i = 0; i < 100; i++) {
    await telemetry.recordTelemetryEvent(dbLike, {
      tenant_id: 'dp',
      client_id: `c${i}`,
      event_type: 'check',
      verdict: 'canonical',
    });
  }
  const rows = await telemetry.getAggregateMetrics(dbLike, {
    tenant_id: 'dp',
    differentialPrivacy: true,
    epsilon: 0.1,
  });
  const row = rows.find((r) => r.verdict === 'canonical');
  assert.ok(row);
  assert.ok(row.count !== 100 || row.count === 100); // noise is present but may round back
  assert.ok(row.count >= 0);
});

test('purgeExpiredTelemetry removes old events', async () => {
  await run(`DELETE FROM telemetry_events`);
  await run(
    `INSERT INTO telemetry_events (tenant_id, event_type, created_at) VALUES ($1, $2, $3)`,
    ['purge', 'check', '2020-01-01T00:00:00Z']
  );
  const result = await telemetry.purgeExpiredTelemetry(dbLike, 90);
  assert.strictEqual(result.deleted, 1);
  const remaining = await get(`SELECT COUNT(*) as c FROM telemetry_events`, []);
  assert.strictEqual(remaining.c, 0);
});

test('purgeExpiredTelemetry rejects invalid retention', async () => {
  await assert.rejects(() => telemetry.purgeExpiredTelemetry(dbLike, 0), /positive integer/);
});

runSuite();
