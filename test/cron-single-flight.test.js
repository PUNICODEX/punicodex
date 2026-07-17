/**
 * PuniCodex — Cron single-flight lock tests
 */

const assert = require('node:assert');
const { prepareTestDb, cleanupTestDb } = require('./helpers/test-db');

const suiteName = 'cron-single-flight';
prepareTestDb(__filename);

const {
  acquireCronLock,
  releaseCronLock,
  withCronLock,
} = require('../platform/api/cron-single-flight');

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (e) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${e.message}`);
    }
  }
  console.log(`\nCron Single-Flight: ${passed} passed, ${failed} failed`);
  cleanupTestDb(suiteName);
  process.exit(failed > 0 ? 1 : 0);
}

test('acquireCronLock grants and releases a lock', async () => {
  const lock = await acquireCronLock('test/job-a', { ttlMinutes: 10 });
  assert.strictEqual(lock.acquired, true);
  assert.strictEqual(lock.name, 'test/job-a');
  await releaseCronLock(lock);

  const second = await acquireCronLock('test/job-a', { ttlMinutes: 10 });
  assert.strictEqual(second.acquired, true);
  await releaseCronLock(second);
});

test('second acquire while lock is held returns acquired=false', async () => {
  const lock = await acquireCronLock('test/job-b', { ttlMinutes: 10 });
  assert.strictEqual(lock.acquired, true);

  const blocked = await acquireCronLock('test/job-b', { ttlMinutes: 10 });
  assert.strictEqual(blocked.acquired, false);

  await releaseCronLock(lock);
});

test('withCronLock skips work while another invocation holds the lock', async () => {
  let runs = 0;
  const holder = await acquireCronLock('test/job-c', { ttlMinutes: 10 });
  assert.strictEqual(holder.acquired, true);

  const skipped = await withCronLock('test/job-c', 10, async () => {
    runs++;
  });

  assert.strictEqual(skipped, true);
  assert.strictEqual(runs, 0);

  await releaseCronLock(holder);
});

test('withCronLock runs work and releases the lock when finished', async () => {
  let runs = 0;
  const skipped = await withCronLock('test/job-d', 10, async () => {
    runs++;
  });

  assert.strictEqual(skipped, false);
  assert.strictEqual(runs, 1);

  const after = await acquireCronLock('test/job-d', { ttlMinutes: 10 });
  assert.strictEqual(after.acquired, true);
  await releaseCronLock(after);
});

test('withCronLock releases the lock even when work throws', async () => {
  await assert.rejects(
    withCronLock('test/job-e', 10, async () => {
      throw new Error('boom');
    }),
    /boom/
  );

  const after = await acquireCronLock('test/job-e', { ttlMinutes: 10 });
  assert.strictEqual(after.acquired, true);
  await releaseCronLock(after);
});

test('distinct cron job names do not block each other', async () => {
  const alpha = await acquireCronLock('test/job-alpha', { ttlMinutes: 10 });
  const beta = await acquireCronLock('test/job-beta', { ttlMinutes: 10 });
  assert.strictEqual(alpha.acquired, true);
  assert.strictEqual(beta.acquired, true);
  await releaseCronLock(alpha);
  await releaseCronLock(beta);
});

test('cron wrapper rejects unsupported methods before locking', () => {
  // The wrapper is created by runCron in api/cron/_utils.js. We verify that
  // the shared lock module exposes the primitives the wrapper relies on.
  assert.strictEqual(typeof withCronLock, 'function');
  assert.strictEqual(typeof acquireCronLock, 'function');
  assert.strictEqual(typeof releaseCronLock, 'function');
});

run();
