/**
 * PÚNYCODEX — Scholars Concurrency Tests
 *
 * Exercises race conditions and edge cases in the Scholars API:
 * duplicate student creation, password reset during login, simultaneous
 * approve/reject, and expired sponsorship.
 */

process.env.PUNYCODEX_SCHOLARS_DISABLE_RATE_LIMIT = '1';
process.env.PUNYCODEX_BCRYPT_ROUNDS = '4';

const { setupTestDb, startScholarsServer } = require('./test-helpers');
const { verifyPassword } = require('./auth');

setupTestDb('concurrency');

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

async function setup() {
  api = await startScholarsServer();
}

async function teardown() {
  if (api) await api.cleanup();
}

async function main() {
  console.log('\n▸ Scholars Concurrency Tests\n');
  await setup();
  await runAllTests();
  await teardown();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

// ─── Helpers ───

function createStudentSession(dbLayer, userId) {
  const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const sessionId = `student-session-${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  dbLayer.createSession({ id: sessionId, userId, expiresAt: farFuture });
  return sessionId;
}

// ─── Tests ───

test('two institution admins creating a student with the same email: one succeeds, one fails cleanly', async () => {
  const { ctx, dbLayer, request, sessionHeader, hashPassword } = api;

  // Create a second institution admin in the same institution.
  const secondAdmin = dbLayer.createUserWithPassword({
    email: 'admin2@loadtest.academy',
    institutionId: ctx.institutionId,
    role: 'inst_admin',
    displayName: 'Second Admin',
    department: 'Classics',
    passwordHash: hashPassword('AdminPass123!'),
    accountStatus: 'active',
  });
  const secondAdminId = secondAdmin.lastInsertRowid;
  const secondAdminSession = createStudentSession(dbLayer, secondAdminId);

  const targetEmail = 'duplicate-student@loadtest.academy';

  const [res1, res2] = await Promise.all([
    request('POST', '/api/v1/scholars/institution/students', {
      body: { email: targetEmail, displayName: 'Duplicate Student', department: 'Classics' },
      headers: sessionHeader(ctx.adminSessionId),
    }),
    request('POST', '/api/v1/scholars/institution/students', {
      body: { email: targetEmail, displayName: 'Duplicate Student', department: 'Classics' },
      headers: sessionHeader(secondAdminSession),
    }),
  ]);

  const successes = [res1, res2].filter((r) => r.status === 201 && r.body.success).length;
  const conflicts = [res1, res2].filter((r) => r.status === 409).length;

  if (successes !== 1) {
    throw new Error(`expected exactly 1 success, got ${successes}`);
  }
  if (conflicts !== 1) {
    throw new Error(`expected exactly 1 conflict response, got ${conflicts}`);
  }

  const users = dbLayer.listStudentsByInstitution(ctx.institutionId);
  const matching = users.filter((u) => u.email === targetEmail);
  if (matching.length !== 1) {
    throw new Error(`expected exactly 1 user with email ${targetEmail}, got ${matching.length}`);
  }
});

test('student password reset during login does not crash or corrupt the account', async () => {
  const { ctx, dbLayer, request, sessionHeader, hashPassword } = api;

  const student = dbLayer.createUserWithPassword({
    email: 'reset-race@loadtest.academy',
    institutionId: ctx.institutionId,
    role: 'student',
    displayName: 'Reset Race Student',
    department: 'Classics',
    passwordHash: hashPassword('OldPass123!'),
    accountStatus: 'active',
  });
  const studentId = student.lastInsertRowid;

  const [loginRes, resetRes] = await Promise.all([
    request('POST', '/api/v1/scholars/auth/login', {
      body: { email: 'reset-race@loadtest.academy', password: 'OldPass123!' },
    }),
    request('POST', `/api/v1/scholars/institution/students/${studentId}/reset-password`, {
      headers: sessionHeader(ctx.adminSessionId),
    }),
  ]);

  // Both requests should complete without a server error.
  if (loginRes.status >= 500) {
    throw new Error(`login returned server error ${loginRes.status}`);
  }
  if (resetRes.status !== 200) {
    throw new Error(`reset returned ${resetRes.status}: ${JSON.stringify(resetRes.body)}`);
  }

  const user = dbLayer.getUserById(studentId);
  if (!user.password_hash) {
    throw new Error('student password hash is missing after reset/login race');
  }

  // Verify the account is still usable: either the old password or the newly
  // reset temp password must authenticate.
  const tempPassword = resetRes.body.data.tempPassword;
  const oldPasswordValid = verifyPassword('OldPass123!', user.password_hash);
  const newPasswordValid = verifyPassword(tempPassword, user.password_hash);

  if (!oldPasswordValid && !newPasswordValid) {
    throw new Error('neither old nor new password verifies after reset/login race');
  }

  // Ensure no duplicate users were created.
  const matching = dbLayer
    .listStudentsByInstitution(ctx.institutionId)
    .filter((u) => u.email === 'reset-race@loadtest.academy');
  if (matching.length !== 1) {
    throw new Error(`expected 1 student account, got ${matching.length}`);
  }
});

test('reviewer approving and rejecting the same edit simultaneously: one succeeds, one fails cleanly', async () => {
  const { ctx, dbLayer, request, sessionHeader } = api;

  // Create a student and submit one edit.
  const student = dbLayer.createUserWithPassword({
    email: 'race-student@loadtest.academy',
    institutionId: ctx.institutionId,
    role: 'student',
    displayName: 'Race Student',
    department: 'Classics',
    passwordHash: api.hashPassword('StudentPass123!'),
    accountStatus: 'active',
  });
  const studentSession = createStudentSession(dbLayer, student.lastInsertRowid);

  const submitRes = await request(
    'POST',
    '/api/v1/scholars/temples/zeus/sections/mythology/edits',
    {
      body: {
        proposedBody:
          'This scholarly edit will be raced by an approve and reject operation, citing Hesiod.',
        proposedSources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
      },
      headers: sessionHeader(studentSession),
    }
  );
  if (submitRes.status !== 201) {
    throw new Error(`edit submission failed: ${submitRes.status}`);
  }
  const editId = submitRes.body.data.editId;

  // Fire approve and reject concurrently from two different reviewers.
  const [approveRes, rejectRes] = await Promise.all([
    request('POST', `/api/v1/scholars/edits/${editId}/approve`, {
      body: { comment: 'Approve in race' },
      headers: sessionHeader(ctx.reviewerSessionId),
    }),
    request('POST', `/api/v1/scholars/edits/${editId}/reject`, {
      body: { comment: 'Reject in race' },
      headers: sessionHeader(ctx.secondReviewerSessionId),
    }),
  ]);

  const approveOk = approveRes.status === 200 && approveRes.body.data?.approved;
  const rejectOk = rejectRes.status === 200 && rejectRes.body.data?.rejected;
  const oneFailedCleanly =
    approveRes.status === 400 && approveRes.body.error?.includes('Edit is not pending');
  const otherFailedCleanly =
    rejectRes.status === 400 && rejectRes.body.error?.includes('Edit is not pending');

  if (approveOk && rejectOk) {
    throw new Error('both approve and reject succeeded; race condition not handled');
  }

  if (!((approveOk && otherFailedCleanly) || (rejectOk && oneFailedCleanly))) {
    throw new Error(
      `unexpected race outcome: approve=${approveRes.status} reject=${rejectRes.status}`
    );
  }

  // Exactly one review record must exist for the edit.
  const reviews = dbLayer.getReviewsForEdit(editId);
  if (reviews.length !== 1) {
    throw new Error(`expected exactly 1 review for edit ${editId}, got ${reviews.length}`);
  }

  // The edit status must match the successful review decision.
  const edit = dbLayer.getEditById(editId);
  if (edit.status !== reviews[0].decision) {
    throw new Error(
      `edit status ${edit.status} does not match review decision ${reviews[0].decision}`
    );
  }
});

test('edit submission is rejected after institution sponsorship expires', async () => {
  const { ctx, dbLayer, request, sessionHeader } = api;

  const student = dbLayer.createUserWithPassword({
    email: 'expired-student@loadtest.academy',
    institutionId: ctx.institutionId,
    role: 'student',
    displayName: 'Expired Student',
    department: 'Classics',
    passwordHash: api.hashPassword('StudentPass123!'),
    accountStatus: 'active',
  });
  const studentSession = createStudentSession(dbLayer, student.lastInsertRowid);

  // Expire the institution sponsorship.
  dbLayer.updateInstitutionSponsorship(ctx.institutionId, {
    sponsorshipStatus: 'expired',
    sponsorshipExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  });

  const res = await request('POST', '/api/v1/scholars/temples/zeus/sections/mythology/edits', {
    body: {
      proposedBody: 'This should be rejected because sponsorship expired.',
      proposedSources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
    },
    headers: sessionHeader(studentSession),
  });

  if (res.status !== 403) {
    throw new Error(
      `expected 403 for expired sponsorship, got ${res.status}: ${JSON.stringify(res.body)}`
    );
  }

  if (!res.body.error?.includes('permission')) {
    throw new Error(`expected permission error, got ${JSON.stringify(res.body.error)}`);
  }
});

main();
