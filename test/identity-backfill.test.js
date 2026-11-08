const assert = require('node:assert');

process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
const { prepareTestDb } = require('./helpers/test-db');
prepareTestDb(__filename);

const identity = require('../platform/api/identity');
const operational = require('../platform/db/operational');
const { runBackfill } = require('../scripts/migrate-identity-backfill');

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err.stack || err.message}`);
    process.exit(1);
  }
}

async function run() {
  console.log('\n▸ Identity Backfill\n');
  await test('dry run reports legacy identities without writing accounts or links', async () => {
    await operational.run(
      "INSERT INTO tenant_accounts (email, password_hash, is_sponsor, status) VALUES ('backfill@identity.test', 'hash', 1, 'active')"
    );
    const before = await identity.getAccountByEmail('backfill@identity.test');
    assert.ok(!before);
    const report = await runBackfill({ apply: false, only: 'backfill@identity.test' });
    assert.strictEqual(report.mode, 'dry-run');
    assert.strictEqual(report.scanned, 1);
    assert.strictEqual(report.created, 0);
    assert.ok(!(await identity.getAccountByEmail('backfill@identity.test')));
  });

  await test('apply creates the canonical account and preserves legacy credentials and links', async () => {
    const report = await runBackfill({ apply: true, only: 'backfill@identity.test' });
    assert.strictEqual(report.created, 1);
    assert.strictEqual(report.linked, 1);
    const account = await identity.getAccountByEmail('backfill@identity.test');
    assert.ok(account);
    const links = await identity.getIdentityLinks(account.id);
    assert.deepStrictEqual(
      links.map((link) => link.system),
      ['tenant']
    );
  });

  await test('conflicting legacy ids are reported and never silently relinked', async () => {
    const account = await identity.getAccountByEmail('backfill@identity.test');
    const scholar = await operational.get('SELECT id FROM scholars_users WHERE email = $1', [
      'backfill@identity.test',
    ]);
    if (!scholar) {
      await operational.run(
        "INSERT INTO scholars_users (email, password_hash, role, status, account_status) VALUES ('backfill@identity.test', 'hash2', 'student', 'active', 'active')"
      );
    }
    await identity.linkIdentity(account.id, 'scholar', 999999);
    const report = await runBackfill({ apply: true, only: 'backfill@identity.test' });
    assert.strictEqual(report.conflicts.length, 1);
    assert.strictEqual(report.conflicts[0].code, 'identity_conflict');
    const links = await identity.getIdentityLinks(account.id);
    assert.strictEqual(links.find((link) => link.system === 'scholar').external_id, '999999');
  });

  console.log('  ✓ all identity backfill contracts passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
