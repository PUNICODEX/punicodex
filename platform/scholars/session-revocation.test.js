/**
 * PuniCodex — Scholars session revocation & credential policy tests
 *
 * Guards the immediate-revocation contract and the password policy:
 *   - disabling an account kills its sessions instantly (student AND curator)
 *   - requireAuth rejects non-active accounts even with a valid, unexpired token
 *   - admin password resets revoke the target's existing sessions
 *   - changing your own password revokes all OTHER sessions, keeps the current one
 *   - weak passwords are rejected everywhere a password is set
 *   - cache delByPrefix purges only the intended namespace
 *
 * Run standalone: node platform/scholars/session-revocation.test.js
 */

'use strict';

const assert = require('node:assert');

process.env.PUNICODEX_BCRYPT_ROUNDS = process.env.PUNICODEX_BCRYPT_ROUNDS || '4';

const {
  setupTestDb,
  startScholarsServer,
  createStudentBatch,
  createSessions,
} = require('./test-helpers');

setupTestDb('revocation');

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  return { name, fn };
}

const tests = [];
async function run() {
  const ctx = await startScholarsServer();
  const { request, sessionHeader, dbLayer, hashPassword, cleanup } = ctx;
  const { institutionId, adminSessionId } = ctx.ctx;

  const curator = dbLayer.createUserWithPassword({
    email: 'curator@punicodex.com',
    institutionId: null,
    role: 'curator',
    displayName: 'Curator',
    department: null,
    passwordHash: hashPassword('CuratorPass123!'),
    accountStatus: 'active',
  });
  const curatorId = curator.lastInsertRowid;
  const farFuture = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const curatorSessionId = `curator-session-${Date.now()}`;
  dbLayer.createSession({ id: curatorSessionId, userId: curatorId, expiresAt: farFuture });

  tests.push(
    test('disabling a student revokes their sessions immediately', async () => {
      const [student] = createStudentBatch({
        dbLayer,
        hashPassword,
        institutionId,
        count: 1,
        prefix: 'revoke-disable',
      });
      const [sess] = createSessions({ dbLayer, users: [student] });

      // Sanity: session works before disable.
      const before = await request('GET', '/api/v1/scholars/auth/session', {
        headers: sessionHeader(sess.sessionId),
      });
      assert.strictEqual(before.status, 200, 'session valid before disable');

      const del = await request('DELETE', `/api/v1/scholars/institution/students/${student.id}`, {
        headers: sessionHeader(adminSessionId),
      });
      assert.strictEqual(del.status, 200, `disable succeeded (${del.status})`);

      // Public session probe now reports no user…
      const after = await request('GET', '/api/v1/scholars/auth/session', {
        headers: sessionHeader(sess.sessionId),
      });
      assert.strictEqual(after.status, 200);
      assert.strictEqual(after.body?.data?.user, null, 'session probe reports revoked user');

      // …and a protected endpoint rejects the token outright.
      const protectedRes = await request('GET', '/api/v1/scholars/notifications', {
        headers: sessionHeader(sess.sessionId),
      });
      assert.strictEqual(
        protectedRes.status,
        401,
        `revoked session rejected on protected endpoint, got ${protectedRes.status}`
      );
    }),

    test('requireAuth rejects a non-active account even with an unexpired token', async () => {
      const [student] = createStudentBatch({
        dbLayer,
        hashPassword,
        institutionId,
        count: 1,
        prefix: 'revoke-status',
      });
      const [sess] = createSessions({ dbLayer, users: [student] });
      // Disable directly in the DB, leaving the session row in place.
      dbLayer.updateUserStatus(student.id, 'disabled');

      const res = await request('GET', '/api/v1/scholars/notifications', {
        headers: sessionHeader(sess.sessionId),
      });
      assert.strictEqual(res.status, 403, `expected 403, got ${res.status}`);
      assert.strictEqual(res.body?.code, 'account_inactive');

      // The session itself was destroyed — a second attempt is 401.
      const again = await request('GET', '/api/v1/scholars/notifications', {
        headers: sessionHeader(sess.sessionId),
      });
      assert.strictEqual(
        again.status,
        401,
        `session destroyed after rejection, got ${again.status}`
      );
    }),

    test('disabling a curator revokes curator power immediately', async () => {
      const before = await request('GET', '/api/v1/scholars/stats', {
        headers: sessionHeader(curatorSessionId),
      });
      assert.strictEqual(before.status, 200, 'curator access works before disable');

      // A second curator disables the first.
      const curator2 = dbLayer.createUserWithPassword({
        email: 'curator2@punicodex.com',
        institutionId: null,
        role: 'curator',
        displayName: 'Curator Two',
        department: null,
        passwordHash: hashPassword('CuratorPass123!'),
        accountStatus: 'active',
      });
      const c2Session = `curator2-session-${Date.now()}`;
      dbLayer.createSession({
        id: c2Session,
        userId: curator2.lastInsertRowid,
        expiresAt: farFuture,
      });

      const patch = await request('PATCH', `/api/v1/scholars/users/${curatorId}/status`, {
        body: { accountStatus: 'disabled' },
        headers: sessionHeader(c2Session),
      });
      assert.strictEqual(patch.status, 200, `status patch succeeded (${patch.status})`);

      const after = await request('GET', '/api/v1/scholars/stats', {
        headers: sessionHeader(curatorSessionId),
      });
      assert.ok(
        after.status === 401 || after.status === 403,
        `disabled curator lost access immediately, got ${after.status}`
      );
    }),

    test('admin password reset revokes the student\u2019s existing sessions', async () => {
      const [student] = createStudentBatch({
        dbLayer,
        hashPassword,
        institutionId,
        count: 1,
        prefix: 'revoke-reset',
      });
      const [sess] = createSessions({ dbLayer, users: [student] });

      const reset = await request(
        'POST',
        `/api/v1/scholars/institution/students/${student.id}/reset-password`,
        { headers: sessionHeader(adminSessionId) }
      );
      assert.strictEqual(reset.status, 200, `reset succeeded (${reset.status})`);
      assert.ok(reset.body?.data?.tempPassword, 'temp password returned');

      const after = await request('GET', '/api/v1/scholars/auth/session', {
        headers: sessionHeader(sess.sessionId),
      });
      assert.strictEqual(after.status, 200);
      assert.strictEqual(after.body?.data?.user, null, 'old session dead after reset');

      // The new temp password logs in cleanly.
      const login = await request('POST', '/api/v1/scholars/auth/login', {
        body: { email: student.email, password: reset.body.data.tempPassword },
      });
      assert.strictEqual(login.status, 200, `login with temp password works (${login.status})`);
    }),

    test('changing your own password revokes other sessions but keeps the current one', async () => {
      const [student] = createStudentBatch({
        dbLayer,
        hashPassword,
        institutionId,
        count: 1,
        prefix: 'revoke-ownpw',
      });
      const [s1, s2] = createSessions({ dbLayer, users: [student, student] });

      const change = await request('POST', '/api/v1/scholars/auth/password', {
        body: { currentPassword: student.password, newPassword: 'NewStrongPass1!' },
        headers: sessionHeader(s1.sessionId),
      });
      assert.strictEqual(change.status, 200, `password change succeeded (${change.status})`);

      const current = await request('GET', '/api/v1/scholars/auth/session', {
        headers: sessionHeader(s1.sessionId),
      });
      assert.strictEqual(current.status, 200);
      assert.ok(current.body?.data?.user, 'current session survives own password change');

      const other = await request('GET', '/api/v1/scholars/auth/session', {
        headers: sessionHeader(s2.sessionId),
      });
      assert.strictEqual(other.status, 200);
      assert.strictEqual(other.body?.data?.user, null, 'other session revoked');
    }),

    test('weak passwords are rejected when a student is created', async () => {
      const res = await request('POST', '/api/v1/scholars/institution/students', {
        body: {
          email: 'weakpw@loadtest.academy',
          displayName: 'Weak PW',
          department: 'Classics',
          password: 'password',
        },
        headers: sessionHeader(adminSessionId),
      });
      assert.strictEqual(res.status, 400, `weak password rejected, got ${res.status}`);
    }),

    test('weak passwords are rejected on own password change', async () => {
      const [student] = createStudentBatch({
        dbLayer,
        hashPassword,
        institutionId,
        count: 1,
        prefix: 'revoke-weakown',
      });
      const [sess] = createSessions({ dbLayer, users: [student] });
      const res = await request('POST', '/api/v1/scholars/auth/password', {
        body: { currentPassword: student.password, newPassword: 'short' },
        headers: sessionHeader(sess.sessionId),
      });
      assert.strictEqual(res.status, 400, `weak new password rejected, got ${res.status}`);
    }),

    test('cache delByPrefix purges only the intended namespace', async () => {
      const cache = require('./cache');
      await cache.set('scholars:search:/api/v1/scholars/search?q=a', { success: true, data: 1 });
      await cache.set('scholars:search:/api/v1/scholars/search?q=b', { success: true, data: 2 });
      await cache.set('scholars:temple:/api/v1/scholars/temples/zeus', { success: true, data: 3 });

      await cache.delByPrefix('scholars:search:');

      assert.strictEqual(await cache.get('scholars:search:/api/v1/scholars/search?q=a'), null);
      assert.strictEqual(await cache.get('scholars:search:/api/v1/scholars/search?q=b'), null);
      assert.deepStrictEqual(await cache.get('scholars:temple:/api/v1/scholars/temples/zeus'), {
        success: true,
        data: 3,
      });
    })
  );

  for (const { name, fn } of tests) {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      failed++;
      failures.push({ name, err });
      console.error(`  ✗ ${name}`);
      console.error(`    ${err.message}`);
    }
  }

  await cleanup();

  console.log(`\nSession Revocation Tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log(`${passed} assertions passed`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
