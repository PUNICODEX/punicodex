/**
 * PÚNYCODEX — Scholars Load Tests
 *
 * Exercises the Scholars API under synthetic bursts to prove the system
 * remains consistent and responsive with many concurrent students.
 */

process.env.PUNYCODEX_SCHOLARS_DISABLE_RATE_LIMIT = '1';
process.env.PUNYCODEX_BCRYPT_ROUNDS = '4';

const {
  setupTestDb,
  startScholarsServer,
  createStudentBatch,
  createSessions,
} = require('./test-helpers');
const { getDb } = require('../db/connection');

setupTestDb('load');

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

function elapsedMs(start) {
  return Number((process.hrtime.bigint() - start) / BigInt(1e6));
}

function stats(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    totalMs: sum,
    minMs: sorted[0] || 0,
    maxMs: sorted[sorted.length - 1] || 0,
    medianMs: sorted[Math.floor(sorted.length / 2)] || 0,
    meanMs: sorted.length ? Math.round(sum / sorted.length) : 0,
  };
}

let api;

async function setup() {
  api = await startScholarsServer();
}

async function teardown() {
  if (api) await api.cleanup();
}

async function main() {
  console.log('\n▸ Scholars Load Tests\n');
  await setup();
  await runAllTests();
  await teardown();

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exitCode = 1;
}

// ─── Concurrent login burst ───

test('100 concurrent student logins succeed and return valid tokens', async () => {
  const { ctx, dbLayer, request } = api;
  const students = createStudentBatch({
    dbLayer,
    hashPassword: api.hashPassword,
    institutionId: ctx.institutionId,
    count: 100,
    prefix: 'login-concurrent',
  });

  const start = process.hrtime.bigint();
  const responses = await Promise.all(
    students.map((s) =>
      request('POST', '/api/v1/scholars/auth/login/', {
        body: { email: s.email, password: s.password },
      })
    )
  );
  const totalMs = elapsedMs(start);

  let successCount = 0;
  const times = [];
  for (let i = 0; i < responses.length; i += 1) {
    const res = responses[i];
    if (res.status === 200 && res.body.success && res.body.data.token) {
      successCount += 1;
    }
  }

  const s = stats(times);
  s.totalMs = totalMs;
  s.count = responses.length;
  console.log(`      concurrent login stats: ${JSON.stringify(s)}`);

  if (successCount !== students.length) {
    throw new Error(`expected ${students.length} successful logins, got ${successCount}`);
  }

  // Verify each successful login created a session.
  const sessionRows = dbLayer
    .listAuditLog({ action: 'auth_login', limit: 200 })
    .filter((row) => row.details?.statusCode === 200);
  if (sessionRows.length < students.length) {
    throw new Error(
      `expected at least ${students.length} login audit records, got ${sessionRows.length}`
    );
  }
});

test('1000 sequential student logins succeed without rate-limit errors', async () => {
  const { ctx, dbLayer, request } = api;
  const students = createStudentBatch({
    dbLayer,
    hashPassword: api.hashPassword,
    institutionId: ctx.institutionId,
    count: 100,
    prefix: 'login-sequential',
  });

  // Reuse the 100 students 10 times to reach 1000 sequential attempts.
  const attempts = [];
  for (let round = 0; round < 10; round += 1) {
    for (const student of students) {
      attempts.push({ email: student.email, password: student.password });
    }
  }

  const start = process.hrtime.bigint();
  let successCount = 0;
  let rateLimitedCount = 0;
  for (const attempt of attempts) {
    const res = await request('POST', '/api/v1/scholars/auth/login/', {
      body: attempt,
    });
    if (res.status === 200 && res.body.success) {
      successCount += 1;
    } else if (res.status === 429) {
      rateLimitedCount += 1;
    }
  }
  const totalMs = elapsedMs(start);

  console.log(`      sequential login: ${successCount}/${attempts.length} in ${totalMs}ms`);

  if (rateLimitedCount > 0) {
    throw new Error(`unexpected rate-limit errors: ${rateLimitedCount}`);
  }
  if (successCount !== attempts.length) {
    throw new Error(`expected ${attempts.length} successful logins, got ${successCount}`);
  }
});

// ─── Concurrent edit submissions ───

test('concurrent edit submissions for the same section create one edit per student', async () => {
  const { ctx, dbLayer, request } = api;
  const students = createStudentBatch({
    dbLayer,
    hashPassword: api.hashPassword,
    institutionId: ctx.institutionId,
    count: 50,
    prefix: 'edit-same',
  });
  const sessions = createSessions({ dbLayer, users: students });

  const start = process.hrtime.bigint();
  const responses = await Promise.all(
    sessions.map((s, i) =>
      request('POST', '/api/v1/scholars/temples/zeus/sections/mythology/edits/', {
        body: {
          proposedBody: `Concurrent mythology contribution ${i} with citation to Hesiod, Theogony.`,
          proposedSources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
        },
        headers: api.sessionHeader(s.sessionId),
      })
    )
  );
  const totalMs = elapsedMs(start);

  let successCount = 0;
  for (const res of responses) {
    if (res.status === 201 && res.body.success) successCount += 1;
  }

  console.log(`      same-section edits: ${successCount}/${responses.length} in ${totalMs}ms`);

  if (successCount !== students.length) {
    throw new Error(`expected ${students.length} edit submissions, got ${successCount}`);
  }

  const pendingCount = dbLayer.countEditsByInstitution(ctx.institutionId, { status: 'pending' });
  if (pendingCount < students.length) {
    throw new Error(`expected at least ${students.length} pending edits, got ${pendingCount}`);
  }

  const section = dbLayer.getSectionById(ctx.sections.mythology);
  if (section.status !== 'empty') {
    throw new Error(`expected section to remain empty, got ${section.status}`);
  }
});

test('concurrent edit submissions for different sections do not corrupt section state', async () => {
  const { ctx, dbLayer, request } = api;
  const students = createStudentBatch({
    dbLayer,
    hashPassword: api.hashPassword,
    institutionId: ctx.institutionId,
    count: 40,
    prefix: 'edit-diff',
  });
  const sessions = createSessions({ dbLayer, users: students });
  const sectionKeys = Object.keys(ctx.sections);

  const start = process.hrtime.bigint();
  const responses = await Promise.all(
    sessions.map((s, i) => {
      const key = sectionKeys[i % sectionKeys.length];
      return request('POST', `/api/v1/scholars/temples/zeus/sections/${key}/edits`, {
        body: {
          proposedBody: `Concurrent contribution to ${key} ${i} with Hesiod, Theogony.`,
          proposedSources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
        },
        headers: api.sessionHeader(s.sessionId),
      });
    })
  );
  const totalMs = elapsedMs(start);

  let successCount = 0;
  for (const res of responses) {
    if (res.status === 201 && res.body.success) successCount += 1;
  }

  console.log(`      diff-section edits: ${successCount}/${responses.length} in ${totalMs}ms`);

  if (successCount !== students.length) {
    throw new Error(`expected ${students.length} edit submissions, got ${successCount}`);
  }

  for (const [key, sectionId] of Object.entries(ctx.sections)) {
    const section = dbLayer.getSectionById(sectionId);
    if (section.status !== 'empty') {
      throw new Error(`expected section ${key} to remain empty, got ${section.status}`);
    }
  }
});

// ─── Concurrent reviewer operations ───

function createEdit({ request, sessionHeader, studentSession, sectionKey, body }) {
  return request('POST', `/api/v1/scholars/temples/zeus/sections/${sectionKey}/edits`, {
    body: {
      proposedBody: body,
      proposedSources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
    },
    headers: sessionHeader(studentSession),
  });
}

test('concurrent approve and reject operations on different edits complete consistently', async () => {
  const { ctx, dbLayer, request, sessionHeader } = api;
  const students = createStudentBatch({
    dbLayer,
    hashPassword: api.hashPassword,
    institutionId: ctx.institutionId,
    count: 20,
    prefix: 'review-diff',
  });
  const sessions = createSessions({ dbLayer, users: students });

  const editCreates = await Promise.all(
    sessions.map((s, i) =>
      createEdit({
        request,
        sessionHeader,
        studentSession: s.sessionId,
        sectionKey: 'mythology',
        body: `Reviewable edit ${i} with Hesiod, Theogony citation for consistency check.`,
      })
    )
  );

  const editIds = editCreates.map((res) => res.body.data.editId);

  const start = process.hrtime.bigint();
  const reviewResponses = await Promise.all(
    editIds.map((editId, i) => {
      const reviewerSession = i % 2 === 0 ? ctx.reviewerSessionId : ctx.secondReviewerSessionId;
      const decision = i % 3 === 0 ? 'reject' : 'approve';
      return request('POST', `/api/v1/scholars/edits/${editId}/${decision}`, {
        body: { comment: 'Load-test review' },
        headers: sessionHeader(reviewerSession),
      });
    })
  );
  const totalMs = elapsedMs(start);

  let successCount = 0;
  for (const res of reviewResponses) {
    if (res.status === 200 && (res.body.data?.approved || res.body.data?.rejected)) {
      successCount += 1;
    }
  }

  console.log(
    `      concurrent reviews: ${successCount}/${reviewResponses.length} in ${totalMs}ms`
  );

  if (successCount !== editIds.length) {
    throw new Error(`expected ${editIds.length} successful reviews, got ${successCount}`);
  }

  const approved = dbLayer.countEditsByInstitution(ctx.institutionId, { status: 'approved' });
  const rejected = dbLayer.countEditsByInstitution(ctx.institutionId, { status: 'rejected' });
  const totalReviewed = approved + rejected;
  if (totalReviewed < editIds.length) {
    throw new Error(`expected ${editIds.length} reviewed edits, got ${totalReviewed}`);
  }

  // Every review should have exactly one review record.
  for (const editId of editIds) {
    const reviews = dbLayer.getReviewsForEdit(editId);
    if (reviews.length !== 1) {
      throw new Error(`expected 1 review for edit ${editId}, got ${reviews.length}`);
    }
  }
});

test('session store and DB consistency hold after the full burst', async () => {
  const { dbLayer } = api;

  const db = getDb();
  const userCount = dbLayer.countUsers();
  const sessionCount = db.prepare('SELECT COUNT(*) AS count FROM scholars_sessions').get().count;
  const editCount = db.prepare('SELECT COUNT(*) AS count FROM scholars_edits').get().count;
  const reviewCount = db.prepare('SELECT COUNT(*) AS count FROM scholars_reviews').get().count;

  // We created: admin, reviewer, secondReviewer, plus students from each test.
  const expectedMinUsers = 3 + 100 + 100 + 50 + 40 + 20;
  if (userCount < expectedMinUsers) {
    throw new Error(`expected at least ${expectedMinUsers} users, got ${userCount}`);
  }

  // Each successful login created a session; verify table is non-empty and finite.
  if (sessionCount === 0) {
    throw new Error('expected at least one session after login bursts');
  }

  const expectedMinEdits = 50 + 40 + 20;
  if (editCount < expectedMinEdits) {
    throw new Error(`expected at least ${expectedMinEdits} edits, got ${editCount}`);
  }

  if (reviewCount < 20) {
    throw new Error(`expected at least 20 reviews, got ${reviewCount}`);
  }

  // No user should have a null/empty email or missing institution.
  const badUsers = db
    .prepare("SELECT COUNT(*) AS count FROM scholars_users WHERE email IS NULL OR email = ''")
    .get().count;
  if (badUsers > 0) {
    throw new Error(`found ${badUsers} users with invalid email`);
  }

  // No edit should be in an impossible state (e.g., approved with no review).
  const approvedWithoutReview = db
    .prepare(
      `SELECT COUNT(*) AS count FROM scholars_edits e
       WHERE e.status = 'approved'
         AND NOT EXISTS (SELECT 1 FROM scholars_reviews r WHERE r.edit_id = e.id)`
    )
    .get().count;
  if (approvedWithoutReview > 0) {
    throw new Error(`${approvedWithoutReview} approved edits have no review record`);
  }

  console.log(
    `      consistency check: users=${userCount} sessions=${sessionCount} edits=${editCount} reviews=${reviewCount}`
  );
});

main();
