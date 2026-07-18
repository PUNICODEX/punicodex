/**
 * PuniCodex — Scholars Department Admin Tests
 *
 * Exercises the department-scoped institution-management endpoints with a
 * dept_admin caller: scoped actions succeed, cross-department and
 * cross-institution targets are rejected, and institution-admin-only actions
 * stay closed. Also proves the provisioning endpoints deliver the one-time
 * temp password through the transactional email module.
 */

process.env.PUNICODEX_SCHOLARS_DISABLE_RATE_LIMIT = '1';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';

const assert = require('node:assert');
const { setupTestDb, startScholarsServer, createSessions } = require('./test-helpers');

setupTestDb('dept-admin');

const emailModule = require('../api/email');

let passed = 0;
let failed = 0;
const testQueue = [];

function test(name, fn) {
  testQueue.push({ name, fn });
}

async function runAllTests() {
  for (const { name, fn } of testQueue) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }
}

let api;
const ctx = {};

const emailCalls = [];

async function setup() {
  api = await startScholarsServer();
  const { dbLayer, hashPassword } = api;
  const institutionId = api.ctx.institutionId;

  const makeUser = (email, role, department, instId = institutionId) =>
    dbLayer.createUserWithPassword({
      email,
      institutionId: instId,
      role,
      displayName: email.split('@')[0],
      department,
      passwordHash: hashPassword('DeptPass123!'),
      accountStatus: 'active',
    }).lastInsertRowid;

  ctx.institutionId = institutionId;
  ctx.deptAdminClassicsId = makeUser('dept-classics@loadtest.academy', 'dept_admin', 'Classics');
  ctx.deptAdminHistoryId = makeUser('dept-history@loadtest.academy', 'dept_admin', 'History');
  ctx.deptAdminNoDeptId = makeUser('dept-nodept@loadtest.academy', 'dept_admin', null);
  ctx.studentClassicsId = makeUser('s-classics@loadtest.academy', 'student', 'Classics');
  ctx.studentClassics2Id = makeUser('s-classics-2@loadtest.academy', 'student', 'Classics');
  ctx.studentClassics3Id = makeUser('s-classics-3@loadtest.academy', 'student', 'Classics');
  ctx.studentHistoryId = makeUser('s-history@loadtest.academy', 'student', 'History');
  ctx.curatorId = makeUser('curator@loadtest.academy', 'curator', 'Classics');

  const otherInstitution = dbLayer.createInstitution({
    name: 'Other Academy',
    slug: 'other-academy',
    domain: 'other.academy',
    accreditation: 'test',
  });
  ctx.otherInstitutionId = otherInstitution.lastInsertRowid;
  dbLayer.updateInstitutionSponsorship(ctx.otherInstitutionId, { sponsorshipStatus: 'active' });
  dbLayer.updateInstitutionAllowlist(ctx.otherInstitutionId, ['Classics']);
  ctx.studentOtherInstId = makeUser(
    's-other@other.academy',
    'student',
    'Classics',
    ctx.otherInstitutionId
  );

  const sessions = createSessions({
    dbLayer,
    users: [
      { id: ctx.deptAdminClassicsId },
      { id: ctx.deptAdminHistoryId },
      { id: ctx.deptAdminNoDeptId },
      { id: ctx.curatorId },
    ],
  });
  ctx.deptClassicsSession = sessions[0].sessionId;
  ctx.deptHistorySession = sessions[1].sessionId;
  ctx.deptNoDeptSession = sessions[2].sessionId;
  ctx.curatorSession = sessions[3].sessionId;

  // Spy on the transactional email module. The router resolves the notify
  // function through the module exports object at call time, so replacing
  // the property intercepts provisioning emails without a RESEND_API_KEY.
  emailModule.notifyScholarsAccountProvisioned = async (args) => {
    emailCalls.push({ ...args });
    return { success: true, mocked: true };
  };
}

async function teardown() {
  if (api) await api.cleanup();
}

function lastEmailCall() {
  return emailCalls[emailCalls.length - 1] || null;
}

// ─── Dashboard scoping ───

test('dept_admin can fetch the institution dashboard scoped to their department', async () => {
  const res = await api.request('GET', '/api/v1/scholars/institution/', {
    headers: api.sessionHeader(ctx.deptClassicsSession),
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.department, 'Classics');
  assert.strictEqual(res.body.data.institution.name, 'Load Test Academy');
  const departments = new Set(res.body.data.users.map((u) => u.department));
  assert.deepStrictEqual([...departments], ['Classics']);
});

test('dept_admin dashboard stats count only their department', async () => {
  const res = await api.request('GET', '/api/v1/scholars/institution/', {
    headers: api.sessionHeader(ctx.deptClassicsSession),
  });
  assert.strictEqual(res.status, 200);
  const classicsStudents = res.body.data.users.filter((u) => u.role === 'student');
  assert.strictEqual(res.body.data.stats.studentCount, classicsStudents.length);
});

test('inst_admin dashboard remains institution-wide', async () => {
  const res = await api.request('GET', '/api/v1/scholars/institution/', {
    headers: api.sessionHeader(api.ctx.adminSessionId),
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.data.department, null);
  const departments = new Set(res.body.data.users.map((u) => u.department));
  assert.ok(departments.has('Classics') && departments.has('History'));
});

test('dept_admin without an assigned department gets 400 on the dashboard', async () => {
  const res = await api.request('GET', '/api/v1/scholars/institution/', {
    headers: api.sessionHeader(ctx.deptNoDeptSession),
  });
  assert.strictEqual(res.status, 400);
});

test('reviewer cannot fetch the institution dashboard', async () => {
  const res = await api.request('GET', '/api/v1/scholars/institution/', {
    headers: api.sessionHeader(api.ctx.reviewerSessionId),
  });
  assert.strictEqual(res.status, 403);
});

test('unauthenticated request cannot fetch the institution dashboard', async () => {
  const res = await api.request('GET', '/api/v1/scholars/institution/');
  assert.strictEqual(res.status, 401);
});

// ─── Student listing ───

test('dept_admin lists only students from their own department', async () => {
  const res = await api.request('GET', '/api/v1/scholars/institution/students/', {
    headers: api.sessionHeader(ctx.deptClassicsSession),
  });
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.length >= 3);
  for (const student of res.body.data) {
    assert.strictEqual(student.department, 'Classics');
  }
});

test('inst_admin still lists students across all departments', async () => {
  const res = await api.request('GET', '/api/v1/scholars/institution/students/', {
    headers: api.sessionHeader(api.ctx.adminSessionId),
  });
  assert.strictEqual(res.status, 200);
  const departments = new Set(res.body.data.map((u) => u.department));
  assert.ok(departments.has('Classics') && departments.has('History'));
});

// ─── Student provisioning ───

test('dept_admin can provision a student into their own department', async () => {
  const before = emailCalls.length;
  const res = await api.request('POST', '/api/v1/scholars/institution/students/', {
    headers: api.sessionHeader(ctx.deptClassicsSession),
    body: { email: 'new-classics@loadtest.academy', displayName: 'New Classics' },
  });
  assert.strictEqual(res.status, 201);
  assert.ok(res.body.data.tempPassword);

  const created = api.dbLayer.getUserById(res.body.data.userId);
  assert.strictEqual(created.department, 'Classics');
  assert.strictEqual(created.role, 'student');

  assert.strictEqual(emailCalls.length, before + 1);
  const call = lastEmailCall();
  assert.strictEqual(call.email, 'new-classics@loadtest.academy');
  assert.strictEqual(call.displayName, 'New Classics');
  assert.strictEqual(call.institutionName, 'Load Test Academy');
  assert.strictEqual(call.tempPassword, res.body.data.tempPassword);
});

test('dept_admin can provision a student naming their own department explicitly', async () => {
  const res = await api.request('POST', '/api/v1/scholars/institution/students/', {
    headers: api.sessionHeader(ctx.deptClassicsSession),
    body: {
      email: 'new-classics-2@loadtest.academy',
      displayName: 'New Classics Two',
      department: 'Classics',
    },
  });
  assert.strictEqual(res.status, 201);
});

test('dept_admin cannot provision a student into another department', async () => {
  const res = await api.request('POST', '/api/v1/scholars/institution/students/', {
    headers: api.sessionHeader(ctx.deptClassicsSession),
    body: {
      email: 'new-history@loadtest.academy',
      displayName: 'New History',
      department: 'History',
    },
  });
  assert.strictEqual(res.status, 403);
});

test('reviewer cannot provision students', async () => {
  const res = await api.request('POST', '/api/v1/scholars/institution/students/', {
    headers: api.sessionHeader(api.ctx.reviewerSessionId),
    body: { email: 'nope@loadtest.academy', displayName: 'Nope' },
  });
  assert.strictEqual(res.status, 403);
});

// ─── Student updates ───

test('dept_admin can update a student in their own department', async () => {
  const res = await api.request(
    'PATCH',
    `/api/v1/scholars/institution/students/${ctx.studentClassicsId}`,
    {
      headers: api.sessionHeader(ctx.deptClassicsSession),
      body: { displayName: 'Renamed Student' },
    }
  );
  assert.strictEqual(res.status, 200);
  assert.strictEqual(
    api.dbLayer.getUserById(ctx.studentClassicsId).display_name,
    'Renamed Student'
  );
});

test('dept_admin can toggle account status for a student in their department', async () => {
  const res = await api.request(
    'PATCH',
    `/api/v1/scholars/institution/students/${ctx.studentClassicsId}`,
    {
      headers: api.sessionHeader(ctx.deptClassicsSession),
      body: { accountStatus: 'disabled' },
    }
  );
  assert.strictEqual(res.status, 200);
  assert.strictEqual(api.dbLayer.getUserById(ctx.studentClassicsId).account_status, 'disabled');
  await api.request('PATCH', `/api/v1/scholars/institution/students/${ctx.studentClassicsId}`, {
    headers: api.sessionHeader(ctx.deptClassicsSession),
    body: { accountStatus: 'active' },
  });
});

test('dept_admin cannot update a student in another department', async () => {
  const res = await api.request(
    'PATCH',
    `/api/v1/scholars/institution/students/${ctx.studentHistoryId}`,
    {
      headers: api.sessionHeader(ctx.deptClassicsSession),
      body: { displayName: 'Should Not Stick' },
    }
  );
  assert.strictEqual(res.status, 403);
});

test('dept_admin cannot update a student in another institution', async () => {
  const res = await api.request(
    'PATCH',
    `/api/v1/scholars/institution/students/${ctx.studentOtherInstId}`,
    {
      headers: api.sessionHeader(ctx.deptClassicsSession),
      body: { displayName: 'Should Not Stick' },
    }
  );
  assert.strictEqual(res.status, 403);
});

test('dept_admin cannot move a student between departments', async () => {
  const res = await api.request(
    'PATCH',
    `/api/v1/scholars/institution/students/${ctx.studentClassics2Id}`,
    {
      headers: api.sessionHeader(ctx.deptClassicsSession),
      body: { department: 'History' },
    }
  );
  assert.strictEqual(res.status, 403);
  assert.strictEqual(api.dbLayer.getUserById(ctx.studentClassics2Id).department, 'Classics');
});

test('inst_admin can still move a student between departments', async () => {
  const res = await api.request(
    'PATCH',
    `/api/v1/scholars/institution/students/${ctx.studentClassics2Id}`,
    {
      headers: api.sessionHeader(api.ctx.adminSessionId),
      body: { department: 'History' },
    }
  );
  assert.strictEqual(res.status, 200);
  assert.strictEqual(api.dbLayer.getUserById(ctx.studentClassics2Id).department, 'History');
});

// ─── Password resets ───

test('dept_admin can reset the password of a student in their department', async () => {
  const before = emailCalls.length;
  const res = await api.request(
    'POST',
    `/api/v1/scholars/institution/students/${ctx.studentClassics3Id}/reset-password`,
    { headers: api.sessionHeader(ctx.deptClassicsSession) }
  );
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.tempPassword);

  assert.strictEqual(emailCalls.length, before + 1);
  const call = lastEmailCall();
  assert.strictEqual(call.email, 's-classics-3@loadtest.academy');
  assert.strictEqual(call.institutionName, 'Load Test Academy');
  assert.strictEqual(call.tempPassword, res.body.data.tempPassword);
});

test('dept_admin cannot reset the password of a student in another department', async () => {
  const res = await api.request(
    'POST',
    `/api/v1/scholars/institution/students/${ctx.studentHistoryId}/reset-password`,
    { headers: api.sessionHeader(ctx.deptClassicsSession) }
  );
  assert.strictEqual(res.status, 403);
});

test('dept_admin cannot reset the password of the institution admin', async () => {
  const res = await api.request(
    'POST',
    `/api/v1/scholars/institution/students/${api.ctx.adminId}/reset-password`,
    { headers: api.sessionHeader(ctx.deptClassicsSession) }
  );
  assert.strictEqual(res.status, 403);
});

// ─── Disabling students ───

test('dept_admin can disable a student in their own department', async () => {
  const target = api.dbLayer.createUserWithPassword({
    email: 's-delete-me@loadtest.academy',
    institutionId: ctx.institutionId,
    role: 'student',
    displayName: 'Delete Me',
    department: 'Classics',
    passwordHash: api.hashPassword('DeptPass123!'),
    accountStatus: 'active',
  }).lastInsertRowid;

  const res = await api.request('DELETE', `/api/v1/scholars/institution/students/${target}`, {
    headers: api.sessionHeader(ctx.deptClassicsSession),
  });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(api.dbLayer.getUserById(target).account_status, 'disabled');
});

test('dept_admin cannot disable a student in another department', async () => {
  const res = await api.request(
    'DELETE',
    `/api/v1/scholars/institution/students/${ctx.studentHistoryId}`,
    { headers: api.sessionHeader(ctx.deptClassicsSession) }
  );
  assert.strictEqual(res.status, 403);
  assert.strictEqual(api.dbLayer.getUserById(ctx.studentHistoryId).account_status, 'active');
});

// ─── Institution-admin-only actions stay closed ───

test('dept_admin cannot promote a student to reviewer', async () => {
  const res = await api.request('POST', '/api/v1/scholars/institution/reviewers/', {
    headers: api.sessionHeader(ctx.deptClassicsSession),
    body: { userId: ctx.studentClassicsId },
  });
  assert.strictEqual(res.status, 403);
  assert.strictEqual(api.dbLayer.getUserById(ctx.studentClassicsId).role, 'student');
});

test('dept_admin cannot list institution reviewers', async () => {
  const res = await api.request('GET', '/api/v1/scholars/institution/reviewers/', {
    headers: api.sessionHeader(ctx.deptClassicsSession),
  });
  assert.strictEqual(res.status, 403);
});

test('dept_admin cannot fetch institution analytics', async () => {
  const res = await api.request('GET', '/api/v1/scholars/institution/analytics/', {
    headers: api.sessionHeader(ctx.deptClassicsSession),
  });
  assert.strictEqual(res.status, 403);
});

test('dept_admin cannot create institutions', async () => {
  const res = await api.request('POST', '/api/v1/scholars/institutions/', {
    headers: api.sessionHeader(ctx.deptClassicsSession),
    body: { name: 'Rogue University', domain: 'rogue.edu', adminEmail: 'admin@rogue.edu' },
  });
  assert.strictEqual(res.status, 403);
});

test('dept_admin cannot update the institution allowlist', async () => {
  const res = await api.request(
    'PATCH',
    `/api/v1/scholars/institutions/${ctx.institutionId}/allowlist`,
    {
      headers: api.sessionHeader(ctx.deptClassicsSession),
      body: { departmentAllowlist: ['Classics', 'History', 'Rogue Studies'] },
    }
  );
  assert.strictEqual(res.status, 403);
});

// ─── Sponsorship approval provisioning email ───

test('sponsorship approval emails the one-time temp password to the new admin', async () => {
  const application = api.dbLayer.createSponsorshipApplication({
    institutionName: 'Emailed University',
    domain: 'emailed.university',
    contactName: 'Provost Email',
    contactEmail: 'provost@emailed.university',
    departmentFocus: 'Classics',
    message: '',
  });

  const before = emailCalls.length;
  const res = await api.request(
    'POST',
    `/api/v1/scholars/sponsorship/applications/${application.lastInsertRowid}/approve/`,
    { headers: api.sessionHeader(ctx.curatorSession), body: {} }
  );
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.data.adminPassword);

  assert.strictEqual(emailCalls.length, before + 1);
  const call = lastEmailCall();
  assert.strictEqual(call.email, 'provost@emailed.university');
  assert.strictEqual(call.displayName, 'Provost Email');
  assert.strictEqual(call.institutionName, 'Emailed University');
  assert.strictEqual(call.tempPassword, res.body.data.adminPassword);
});

async function main() {
  console.log('\n▸ Scholars Department Admin Tests\n');
  await setup();
  await runAllTests();
  await teardown();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
