/**
 * Operational DB Helper Tests
 *
 * Verifies the shared query helpers and async transaction wrapper work
 * correctly on SQLite (and pass-through behavior is wired for Postgres).
 */

const assert = require('node:assert');

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

const {
  get,
  all,
  run,
  insert,
  transaction,
  isPostgres,
  translateForPostgres,
} = require('../platform/db/operational.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

async function runSuite() {
  console.log('\n▸ Operational DB Tests\n');
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
  console.log(`\nOperational DB: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

test('isPostgres reflects environment', () => {
  assert.strictEqual(isPostgres(), false);
});

test('translateForPostgres rewrites date(col) to a Postgres cast', () => {
  assert.strictEqual(
    translateForPostgres('SELECT date(created_at) FROM t WHERE date(created_at) >= $1'),
    'SELECT (created_at)::date FROM t WHERE (created_at)::date >= $1'
  );
  assert.strictEqual(
    translateForPostgres('GROUP BY date(s.first_seen_at)'),
    'GROUP BY (s.first_seen_at)::date'
  );
  // Aliased selects survive intact.
  assert.strictEqual(
    translateForPostgres('date(e.created_at) AS event_day'),
    '(e.created_at)::date AS event_day'
  );
  // Never touches a bare column named "date" or non-column arguments.
  assert.strictEqual(translateForPostgres('SELECT date FROM t'), 'SELECT date FROM t');
  assert.strictEqual(translateForPostgres("date('now')"), "date('now')");
  // substr(col, 1, 10) gains a text cast (PG substr has no timestamptz overload).
  assert.strictEqual(
    translateForPostgres('substr(created_at, 1, 10) AS day'),
    'substr((created_at)::text, 1, 10) AS day'
  );
  // strftime('%s', col) becomes an epoch extraction.
  assert.strictEqual(
    translateForPostgres("CAST(strftime('%s', e.created_at) AS INTEGER) >= $2"),
    'CAST(EXTRACT(EPOCH FROM e.created_at) AS INTEGER) >= $2'
  );
});

test('get returns a single row', async () => {
  await run('INSERT INTO search_queries (query, result_count) VALUES ($1, $2)', [
    'operational-get-test',
    5,
  ]);
  const row = await get('SELECT id, query FROM search_queries WHERE query = $1', [
    'operational-get-test',
  ]);
  assert.ok(row);
  assert.strictEqual(row.query, 'operational-get-test');
});

test('all returns multiple rows', async () => {
  await run('INSERT INTO search_queries (query, result_count) VALUES ($1, $2)', [
    'operational-all-a',
    1,
  ]);
  await run('INSERT INTO search_queries (query, result_count) VALUES ($1, $2)', [
    'operational-all-b',
    2,
  ]);
  const rows = await all('SELECT * FROM search_queries WHERE query LIKE $1', ['operational-all-%']);
  assert.ok(Array.isArray(rows));
  assert.ok(rows.length >= 2);
});

test('run reports changes', async () => {
  const result = await run('INSERT INTO search_queries (query, result_count) VALUES ($1, $2)', [
    'operational-run-test',
    7,
  ]);
  assert.strictEqual(result.changes, 1);
});

test('insert returns the new row id', async () => {
  const id = await insert(
    'INSERT INTO search_queries (query, result_count) VALUES ($1, $2) RETURNING id',
    ['operational-insert-test', 9]
  );
  assert.ok(Number.isInteger(id));
  const row = await get('SELECT * FROM search_queries WHERE id = $1', [id]);
  assert.strictEqual(row.query, 'operational-insert-test');
});

test('insert throws without RETURNING id', async () => {
  try {
    await insert('INSERT INTO search_queries (query, result_count) VALUES ($1, $2)', ['bad', 1]);
    assert.fail('expected error');
  } catch (err) {
    assert.ok(err.message.includes('RETURNING id'));
  }
});

test('transaction commits all operations on success', async () => {
  await transaction(async ({ insert: txInsert }) => {
    await txInsert(
      'INSERT INTO search_queries (query, result_count) VALUES ($1, $2) RETURNING id',
      ['tx-commit-a', 1]
    );
    await txInsert(
      'INSERT INTO search_queries (query, result_count) VALUES ($1, $2) RETURNING id',
      ['tx-commit-b', 2]
    );
  });

  const rows = await all('SELECT * FROM search_queries WHERE query LIKE $1', ['tx-commit-%']);
  assert.strictEqual(rows.length, 2);
});

test('transaction rolls back all operations on failure', async () => {
  try {
    await transaction(async ({ run: txRun }) => {
      await txRun('INSERT INTO search_queries (query, result_count) VALUES ($1, $2)', [
        'tx-rollback',
        99,
      ]);
      throw new Error('intentional failure');
    });
    assert.fail('expected transaction to throw');
  } catch (err) {
    assert.strictEqual(err.message, 'intentional failure');
  }

  const row = await get('SELECT * FROM search_queries WHERE query = $1', ['tx-rollback']);
  assert.strictEqual(row, undefined);
});

runSuite();
