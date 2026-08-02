/**
 * operational.transaction Postgres-mode contract test.
 *
 * Regression for the production booking outage: sql.begin() hands callbacks
 * a raw TransactionSql, but every caller destructures {get, all, run, insert}.
 * wrapTransactionSql must bridge the two — tagged-template calls with correct
 * parameter ordering, count-based run(), and RETURNING-id insert().
 */

const assert = require('node:assert');
const { wrapTransactionSql } = require('../platform/db/operational.js');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

// A fake TransactionSql in the driver's exact calling convention:
// tsql(strings, ...values). Records every call and returns canned rows.
function makeFakeTsql(responders = {}) {
  const calls = [];
  const tsql = (strings, ...values) => {
    const text = strings.join('?');
    calls.push({ text, values });
    for (const [match, rows] of Object.entries(responders)) {
      if (text.includes(match)) {
        const out = [...rows];
        out.count = rows.count ?? rows.length;
        return Promise.resolve(out);
      }
    }
    const out = [];
    out.count = 0;
    return Promise.resolve(out);
  };
  tsql.calls = calls;
  return tsql;
}

test('get() returns the first row with parameters in order', async () => {
  const tsql = makeFakeTsql({ 'FROM ad_slots': [{ id: 57, status: 'available' }] });
  const t = wrapTransactionSql(tsql);
  const row = await t.get('SELECT * FROM ad_slots WHERE id = $1', [57]);
  assert.deepStrictEqual(row, { id: 57, status: 'available' });
  assert.deepStrictEqual(tsql.calls[0].values, [57]);
});

test('all() returns every row', async () => {
  const tsql = makeFakeTsql({ 'FROM ad_slots': [{ id: 1 }, { id: 2 }] });
  const t = wrapTransactionSql(tsql);
  const rows = await t.all('SELECT * FROM ad_slots WHERE site_slug = $1', ['ares']);
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual(tsql.calls[0].values, ['ares']);
});

test('run() maps the driver count to {changes}', async () => {
  const tsql = makeFakeTsql({});
  const t = wrapTransactionSql(tsql);
  const out = await t.run(
    'UPDATE discount_codes SET used_count = used_count + 1 WHERE id = $1 AND used_count < $2',
    [7, 3]
  );
  assert.deepStrictEqual(out, { changes: 0 });
  assert.deepStrictEqual(tsql.calls[0].values, [7, 3]);
});

test('insert() requires RETURNING id and returns the id', async () => {
  const tsql = makeFakeTsql({ 'INSERT INTO bookings': [{ id: 42 }] });
  const t = wrapTransactionSql(tsql);
  const id = await t.insert('INSERT INTO bookings (slot_id, email) VALUES ($1, $2) RETURNING id', [
    57,
    'x@example.com',
  ]);
  assert.strictEqual(id, 42);
  await assert.rejects(
    () => t.insert('INSERT INTO bookings (slot_id) VALUES ($1)', [57]),
    /RETURNING id/
  );
});

test('multi-param SQL keeps placeholders aligned after conversion', async () => {
  const tsql = makeFakeTsql({ 'FROM discount_codes': [{ id: 3 }] });
  const t = wrapTransactionSql(tsql);
  const row = await t.get(
    'SELECT * FROM discount_codes WHERE code = $1 AND applies_to = $2 AND id = $3',
    ['X', 'ares', 3]
  );
  assert.deepStrictEqual(row, { id: 3 });
  assert.deepStrictEqual(tsql.calls[0].values, ['X', 'ares', 3]);
});

(async () => {
  let failures = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failures++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
  if (failures) {
    console.error(`\n${failures} test(s) failed`);
    process.exit(1);
  }
  console.log(`\nAll ${tests.length} operational-transaction contract tests passed`);
})();
