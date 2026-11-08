const assert = require('node:assert');

process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
const { prepareTestDb } = require('./helpers/test-db');
prepareTestDb(__filename);

const identity = require('../platform/api/identity');
const operational = require('../platform/db/operational');
const { getIdentityAnalytics } = require('../platform/api/identity-analytics');

function req() {
  return {
    headers: { 'x-forwarded-for': '198.51.100.24', 'user-agent': 'identity-analytics-test' },
    body: {},
  };
}
function res() {
  const headers = {};
  return {
    headers,
    cookie(name, value) {
      headers[`cookie-${name}`] = value;
    },
  };
}

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
  console.log('\n▸ Identity Analytics\n');

  await test('server events rotate daily and contain no raw identity or credential material', async () => {
    const registration = await identity.register({
      email: 'telemetry@identity.test',
      password: 'telemetry-pass-12',
    });
    assert.ok(registration.token);
    await identity.setPassword({
      token: registration.token,
      password: 'telemetry-pass-12',
      req: req(),
      res: res(),
    });
    const login = await identity.login({
      email: 'telemetry@identity.test',
      password: 'telemetry-pass-12',
      req: req(),
      res: res(),
    });
    await identity.updateInitiation(login.account.id, { currentChapter: 4, completed: false });
    await identity.updateInitiation(login.account.id, { currentChapter: 24, completed: true });
    await require('../platform/api/product-analytics').recordProductEvent('store_order_paid', {
      accountId: login.account.id,
      path: '/account/orders/',
      properties: { orderRef: 'SO-TEST-1', productId: 'zeus-tee', grossCents: 3800 },
    });

    const rows = await operational.all(
      `SELECT event_name, session_hash, properties FROM site_analytics_events_v2
        WHERE event_name IN ('identity_register', 'identity_activate', 'identity_login', 'initiation_progress', 'store_order_paid')`
    );
    assert.ok(rows.length >= 5, JSON.stringify(rows));
    for (const row of rows) {
      assert.strictEqual(row.session_hash.length, 24);
      assert.ok(!row.session_hash.includes(login.account.id));
      assert.ok(!row.properties.includes('telemetry@identity.test'));
      assert.ok(!row.properties.includes(registration.token));
      assert.ok(!row.properties.includes(login.token));
    }
    const progress = rows.filter((row) => row.event_name === 'initiation_progress');
    assert.ok(progress.some((row) => row.properties.includes('"completed":true')));
  });

  await test('aggregate analytics reports account, invitation, initiation, and order signals without identities', async () => {
    const account = await identity.getAccountByEmail('telemetry@identity.test');
    const scholarsDb = require('../platform/db/scholars');
    const institution = scholarsDb.createInstitution({
      name: 'Telemetry University',
      slug: 'telemetry-university',
      domain: 'identity.test',
    });
    scholarsDb.updateInstitutionSponsorship(institution.lastInsertRowid, {
      sponsorshipStatus: 'active',
    });
    scholarsDb.createUserWithPassword({
      email: 'dean@telemetry.test',
      institutionId: institution.lastInsertRowid,
      role: 'inst_admin',
      department: 'Classics',
      passwordHash: identity.passwordHash('dean-pass-12'),
      accountStatus: 'active',
    });
    const dean = await identity.provisionFromLegacy('dean@telemetry.test');
    const invitations = await identity.createInvitations(dean.id, {
      emails: ['scholar@telemetry.test'],
      department: 'Classics',
    });
    const token = decodeURIComponent(invitations[0].setupPath.split('token=')[1]);
    await identity.acceptInvitation({ token, password: 'scholar-pass-12', req: req(), res: res() });
    await operational.run(
      `INSERT INTO store_orders
         (order_ref, product_id, product_name, quantity, unit_price_cents, gross_cents, customer_email, status)
       VALUES ('SO-TEST-1', 'zeus-tee', 'Zeus Temple Tee', 1, 3800, 3800, 'telemetry@identity.test', 'paid')`
    );
    const data = await getIdentityAnalytics({ days: 30 });
    assert.ok(data.accounts.total > 0);
    assert.ok(data.events.byName.identity_login >= 1);
    assert.ok(data.events.byName.institution_invitation_created >= 1);
    assert.ok(data.events.byName.institution_invitation_accepted >= 1);
    assert.ok(data.events.byName.store_order_paid >= 1);
    assert.ok(data.initiation.completed >= 1);
    assert.ok(data.orders.grossCents >= 3800);
    assert.ok(data.invitations.byStatus.accepted >= 1);
    assert.ok(!JSON.stringify(data).includes('telemetry@identity.test'));
    assert.ok(!JSON.stringify(data).includes('scholar@telemetry.test'));
    assert.ok(!JSON.stringify(data).includes(account.id));
  });

  console.log('  ✓ all identity analytics contracts passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
