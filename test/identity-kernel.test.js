const assert = require('node:assert');

process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
const { prepareTestDb } = require('./helpers/test-db');
prepareTestDb(__filename);

const identity = require('../platform/api/identity');
const operational = require('../platform/db/operational');
const scholarsDb = require('../platform/db/scholars');

function response() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    getHeader(name) {
      return this.headers[name.toLowerCase()];
    },
  };
}

function request(session) {
  return {
    headers: {
      'user-agent': 'identity-kernel-test',
      'x-forwarded-for': '203.0.113.10',
      ...(session
        ? { cookie: `punicodex_session=${session.token}; punicodex_csrf=${session.csrfToken}` }
        : {}),
    },
    body: {},
  };
}

async function activate(email, password = 'correct-horse-12') {
  const registration = await identity.register({ email, password });
  assert.ok(registration.token, 'pending registration issues an activation token');
  const res = response();
  const result = await identity.setPassword({
    token: registration.token,
    password,
    req: request(),
    res,
  });
  return { ...result, res };
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
  console.log('\n▸ Unified Identity Kernel\n');

  await test('registration activates once, issues secure sessions, and enforces CSRF', async () => {
    const session = await activate('customer@identity.test');
    assert.strictEqual(session.account.status, 'active');
    const setCookies = session.res.headers['set-cookie'];
    assert.ok(
      setCookies.some((value) => value.includes('punicodex_session=') && value.includes('HttpOnly'))
    );
    assert.ok(
      setCookies.some((value) => value.includes('punicodex_csrf=') && !value.includes('HttpOnly'))
    );

    const req = request(session);
    const writeRes = response();
    assert.strictEqual(await identity.requireAccount(req, writeRes, { write: true }), false);
    assert.strictEqual(writeRes.statusCode, 403);
    req.headers['x-csrf-token'] = session.csrfToken;
    const allowed = await identity.requireAccount(req, response(), { write: true });
    assert.strictEqual(allowed.account.email, 'customer@identity.test');

    const replay = await identity.register({
      email: 'customer@identity.test',
      password: 'correct-horse-12',
    });
    assert.strictEqual(replay.token, null, 'active accounts never receive a new activation token');
  });

  await test('password setup links are single-use and only the newest reset remains valid', async () => {
    await activate('reset-replay@identity.test');
    const first = await identity.forgot({ email: 'reset-replay@identity.test' });
    const second = await identity.forgot({ email: 'reset-replay@identity.test' });
    assert.ok(first.token && second.token && first.token !== second.token);
    await assert.rejects(
      identity.setPassword({
        token: first.token,
        password: 'superseded-pass-12',
        req: request(),
        res: response(),
      }),
      /invalid or has expired/
    );
    const reset = await identity.setPassword({
      token: second.token,
      password: 'newest-reset-pass-12',
      req: request(),
      res: response(),
    });
    assert.strictEqual(reset.account.status, 'active');
    await assert.rejects(
      identity.setPassword({
        token: second.token,
        password: 'replayed-reset-pass-12',
        req: request(),
        res: response(),
      }),
      /invalid or has expired/
    );
    const login = await identity.login({
      email: 'reset-replay@identity.test',
      password: 'newest-reset-pass-12',
      req: request(),
      res: response(),
    });
    assert.ok(login.token);
  });

  await test('legacy tenant credentials federate without a password reset and expose sponsor capabilities', async () => {
    const password = 'legacy-sponsor-12';
    await operational.run(
      `INSERT INTO tenant_accounts (email, password_hash, is_sponsor, status)
       VALUES ($1, $2, 1, 'active')`,
      ['sponsor@identity.test', identity.passwordHash(password)]
    );
    const account = await identity.provisionFromLegacy('sponsor@identity.test');
    const links = await identity.getIdentityLinks(account.id);
    assert.deepStrictEqual(
      links.map((link) => link.system),
      ['tenant']
    );
    const session = await identity.login({
      email: 'sponsor@identity.test',
      password,
      req: request(),
      res: response(),
    });
    const me = await identity.getMe(await identity.getAccountById(account.id));
    assert.ok(me.capabilities.includes('sponsorship.manage'));
    assert.ok(me.capabilities.includes('analytics.view'));
    assert.ok(session.token);
  });

  await test('direct legacy password changes synchronize on the next login', async () => {
    await operational.run(
      `INSERT INTO tenant_accounts (email, password_hash, is_sponsor, status)
       VALUES ($1, $2, 1, 'active')`,
      ['legacy-reset@identity.test', identity.passwordHash('old-password-12')]
    );
    await identity.provisionFromLegacy('legacy-reset@identity.test');
    await operational.run('UPDATE tenant_accounts SET password_hash = $1 WHERE email = $2', [
      identity.passwordHash('new-password-12'),
      'legacy-reset@identity.test',
    ]);
    const login = await identity.login({
      email: 'legacy-reset@identity.test',
      password: 'new-password-12',
      req: request(),
      res: response(),
    });
    assert.ok(login.token);
    const central = await identity.getAccountByEmail('legacy-reset@identity.test');
    assert.ok(identity.verifyPassword('new-password-12', central.password_hash));
  });

  await test('institution invitations and policies create the intended academic account only', async () => {
    const institution = scholarsDb.createInstitution({
      name: 'Identity University',
      slug: 'identity-university',
      domain: 'identity.test',
    });
    const institutionId = institution.lastInsertRowid;
    await operational.run("UPDATE scholars_institutions SET status = 'active' WHERE id = $1", [
      institutionId,
    ]);
    scholarsDb.updateInstitutionSponsorship(institutionId, { sponsorshipStatus: 'active' });
    scholarsDb.createUserWithPassword({
      email: 'dean@identity.test',
      institutionId,
      role: 'inst_admin',
      department: 'Classics',
      displayName: 'Dean',
      passwordHash: identity.passwordHash('dean-password-12'),
      accountStatus: 'active',
    });
    const dean = await identity.provisionFromLegacy('dean@identity.test');
    let capabilities = await identity.getCapabilities(dean);
    assert.ok(capabilities.includes('institution.invite'));
    assert.ok(!capabilities.includes('store.purchase'), 'institution commerce is opt-in');
    await identity.setInstitutionPolicy(dean.id, { capability: 'store.purchase', effect: 'allow' });
    capabilities = await identity.getCapabilities(dean);
    assert.ok(capabilities.includes('store.purchase'));

    const invitations = await identity.createInvitations(dean.id, {
      emails: ['student@identity.test', 'second@identity.test'],
      department: 'Classics',
    });
    assert.strictEqual(invitations.length, 2);
    const invitation = invitations[0];
    assert.ok(invitation.setupPath.includes('token='));
    const token = decodeURIComponent(invitation.setupPath.split('token=')[1]);
    const accepted = await identity.acceptInvitation({
      token,
      password: 'student-pass-12',
      req: request(),
      res: response(),
    });
    assert.strictEqual(accepted.account.email, 'student@identity.test');
    const student = await identity.getAccountByEmail('student@identity.test');
    const studentCapabilities = await identity.getCapabilities(student.id);
    assert.ok(studentCapabilities.includes('scholars.edit'));
    assert.ok(studentCapabilities.includes('creatives.upload'));
    assert.ok(
      studentCapabilities.includes('store.purchase'),
      'institution policy applies to invited students'
    );
    assert.ok(!studentCapabilities.includes('institution.invite'));
    await assert.rejects(
      identity.acceptInvitation({
        token,
        password: 'student-pass-12',
        req: request(),
        res: response(),
      }),
      /invalid or has expired/
    );

    const listing = await identity.listInvitations(dean.id);
    assert.strictEqual(
      listing.find((row) => row.email === 'student@identity.test').status,
      'accepted'
    );
    await identity.revokeInvitation(dean.id, invitations[1].id);
    assert.strictEqual(
      (await identity.listInvitations(dean.id)).find((row) => row.email === 'second@identity.test')
        .status,
      'revoked'
    );

    scholarsDb.updateInstitutionSponsorship(institutionId, {
      sponsorshipStatus: 'active',
      sponsorshipExpiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const expiredCapabilities = await identity.getCapabilities(dean.id);
    assert.ok(!expiredCapabilities.includes('scholars.edit'));
    assert.ok(!expiredCapabilities.includes('institution.invite'));
    await assert.rejects(
      identity.createInvitations(dean.id, {
        emails: ['expired-school@identity.test'],
        department: 'Classics',
      }),
      /Institution administration access is required/
    );
    scholarsDb.updateInstitutionSponsorship(institutionId, {
      sponsorshipStatus: 'active',
      sponsorshipExpiresAt: null,
    });
  });

  await test('department admins cannot invite outside their scope', async () => {
    scholarsDb.createUserWithPassword({
      email: 'department@identity.test',
      institutionId: scholarsDb.getInstitutionBySlug('identity-university').id,
      role: 'dept_admin',
      department: 'Classics',
      passwordHash: identity.passwordHash('department-pass-12'),
      accountStatus: 'active',
    });
    const admin = await identity.provisionFromLegacy('department@identity.test');
    await assert.rejects(
      identity.createInvitations(admin.id, {
        emails: ['outsider@identity.test'],
        department: 'History',
      }),
      /only within their own department/
    );
  });

  await test('admin institution grants are scoped, observable, and immediately revocable', async () => {
    const session = await activate('granted-dean@identity.test');
    const institution = scholarsDb.getInstitutionBySlug('identity-university');
    assert.ok(!(await identity.getCapabilities(session.account.id)).includes('institution.manage'));

    const granted = await identity.adminSetInstitutionAccess(42, session.account.id, {
      institutionId: institution.id,
      role: 'dept_admin',
      department: 'Classics',
    });
    assert.ok(granted.capabilities.includes('institution.manage'));
    assert.ok(granted.capabilities.includes('institution.invite'));
    assert.ok(!granted.capabilities.includes('sponsorship.book'));
    const departmentOverview = await identity.getInstitutionOverview(session.account.id);
    assert.strictEqual(departmentOverview.institution.department, 'Classics');
    assert.ok(departmentOverview.members.students >= 1);

    const elevated = await identity.adminSetInstitutionAccess(42, session.account.id, {
      institutionId: institution.id,
      role: 'inst_admin',
    });
    assert.strictEqual(elevated.identity.scholars[0].role, 'inst_admin');
    const institutionOverview = await identity.getInstitutionOverview(session.account.id);
    assert.strictEqual(institutionOverview.institution.department, null);
    assert.ok(institutionOverview.members.total >= departmentOverview.members.total);

    await identity.adminRevokeInstitutionAccess(42, session.account.id, institution.id);
    assert.ok(!(await identity.getCapabilities(session.account.id)).includes('institution.manage'));
    assert.strictEqual(await identity.resolveSession(request(session), response()), null);
    const audit = await identity.adminGetAccount(session.account.id);
    assert.ok(audit.audit.some((row) => row.action === 'admin.institution_access_granted'));
    assert.ok(audit.audit.some((row) => row.action === 'admin.institution_access_revoked'));
    await assert.rejects(
      identity.adminSetInstitutionAccess(42, session.account.id, {
        institutionId: institution.id,
        role: 'student',
      }),
      /valid institution and administration role/
    );
  });

  await test('session rotation replaces the old token and admin disable revokes every linked session', async () => {
    const session = await activate('revoke@identity.test');
    await operational.run('UPDATE account_sessions SET created_at = $1 WHERE token_hash = $2', [
      new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      identity.hashToken(session.token),
    ]);
    const rotated = await identity.resolveSession(request(session), response());
    assert.ok(rotated.session.token && rotated.session.token !== session.token);
    assert.ok((await identity.resolveSession(request(session), response())) === null);

    const admin = await identity.adminSetAccountStatus(42, session.account.id, 'disabled');
    assert.strictEqual(admin.status, 'disabled');
    assert.strictEqual(await identity.resolveSession(request(rotated.session), response()), null);
    const detail = await identity.adminGetAccount(session.account.id);
    assert.ok(detail.audit.some((row) => row.action === 'admin.account_disabled'));
  });

  console.log('  ✓ all identity kernel contracts passed');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
