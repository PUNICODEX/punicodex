/**
 * PÚNYCODEX — Scholarly Edition Authentication Tests
 */

const assert = require('node:assert');
const { prepareTestDb } = require('../../test/helpers/test-db.js');

prepareTestDb(__filename);

const { closeDb } = require('../db/connection');
const db = require('../db/scholars');
const auth = require('./auth');

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

function runMigrateScholars() {
  const { getDb } = require('../db/connection');
  const database = getDb();

  const { migrate: migrateScholars } = require('../db/migrate-scholars.js');
  migrateScholars(database);

  const { migrate: migrateQuality } = require('../db/migrate-scholars-quality.js');
  migrateQuality(database);
}

console.log('\n▸ Scholars Auth Tests\n');

runMigrateScholars();

let institutionId;
let activeStudentId;
let lockedStudentId;
let adminId;

async function setup() {
  const institution = db.createInstitution({
    name: 'Auth Test University',
    slug: 'auth-test-university',
    domain: 'auth.test',
    accreditation: 'test',
  });
  institutionId = institution.lastInsertRowid;

  db.updateInstitutionSponsorship(institutionId, { sponsorshipStatus: 'active' });
  db.updateInstitutionAllowlist(institutionId, ['Classics', 'History']);

  const activeStudent = db.createUserWithPassword({
    email: 'active@auth.test',
    institutionId,
    role: 'student',
    department: 'Classics',
    displayName: 'Active Student',
    passwordHash: auth.hashPassword('Str0ng!Pass'),
    accountStatus: 'active',
  });
  activeStudentId = activeStudent.lastInsertRowid;

  db.createUserWithPassword({
    email: 'pending@auth.test',
    institutionId,
    role: 'student',
    department: 'Classics',
    displayName: 'Pending Student',
    passwordHash: auth.hashPassword('Str0ng!Pass'),
    accountStatus: 'pending',
  });

  const lockedStudent = db.createUserWithPassword({
    email: 'locked@auth.test',
    institutionId,
    role: 'student',
    department: 'Classics',
    displayName: 'Locked Student',
    passwordHash: auth.hashPassword('Str0ng!Pass'),
    accountStatus: 'active',
  });
  lockedStudentId = lockedStudent.lastInsertRowid;
  for (let i = 0; i < 5; i += 1) {
    db.incrementLoginAttempts(lockedStudentId, { maxAttempts: 5 });
  }

  const admin = db.createUserWithPassword({
    email: 'admin@auth.test',
    institutionId,
    role: 'inst_admin',
    department: 'Classics',
    displayName: 'Institution Admin',
    passwordHash: auth.hashPassword('Str0ng!Pass'),
    accountStatus: 'active',
  });
  adminId = admin.lastInsertRowid;

  db.createUserWithPassword({
    email: 'reviewer@auth.test',
    institutionId,
    role: 'reviewer',
    department: 'History',
    displayName: 'Reviewer',
    passwordHash: auth.hashPassword('Str0ng!Pass'),
    accountStatus: 'active',
  });

  db.createUserWithPassword({
    email: 'curator@auth.test',
    institutionId,
    role: 'curator',
    department: 'Classics',
    displayName: 'Curator',
    passwordHash: auth.hashPassword('Str0ng!Pass'),
    accountStatus: 'active',
  });
}

async function runTests() {
  await setup();

  await test('hashPassword produces verifiable hash', async () => {
    const hash = auth.hashPassword('MyS3cur3!Pass');
    assert.ok(hash.startsWith('$2'));
    assert.ok(auth.verifyPassword('MyS3cur3!Pass', hash));
    assert.ok(!auth.verifyPassword('WrongPass', hash));
  });

  await test('login succeeds with valid credentials', async () => {
    const result = await auth.login('active@auth.test', 'Str0ng!Pass');
    assert.strictEqual(result.success, true);
    assert.ok(result.sessionId);
    assert.strictEqual(result.user.email, 'active@auth.test');
    assert.strictEqual(result.user.role, 'student');
    assert.strictEqual(result.user.accountStatus, 'active');
  });

  await test('login fails with invalid password', async () => {
    const result = await auth.login('active@auth.test', 'WrongPass');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, 'invalid_credentials');
  });

  await test('login fails for unknown email', async () => {
    const result = await auth.login('unknown@auth.test', 'Str0ng!Pass');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, 'invalid_credentials');
  });

  await test('login fails for pending account', async () => {
    const result = await auth.login('pending@auth.test', 'Str0ng!Pass');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, 'account_inactive');
  });

  await test('login fails for locked account', async () => {
    const result = await auth.login('locked@auth.test', 'Str0ng!Pass');
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.code, 'account_locked');
  });

  await test('login increments attempts on failure', async () => {
    const before = db.getUserById(activeStudentId).login_attempts;
    await auth.login('active@auth.test', 'WrongPass');
    const after = db.getUserById(activeStudentId).login_attempts;
    assert.strictEqual(after, before + 1);
  });

  await test('login resets attempts on success', async () => {
    db.incrementLoginAttempts(activeStudentId);
    await auth.login('active@auth.test', 'Str0ng!Pass');
    const user = db.getUserById(activeStudentId);
    assert.strictEqual(user.login_attempts, 0);
    assert.ok(!user.locked_until);
  });

  await test('successful login updates last_seen_at', async () => {
    const before = db.getUserById(activeStudentId).last_seen_at;
    // SQLite CURRENT_TIMESTAMP has second precision; wait long enough for a change.
    await new Promise((resolve) => setTimeout(resolve, 1100));
    await auth.login('active@auth.test', 'Str0ng!Pass');
    const after = db.getUserById(activeStudentId).last_seen_at;
    assert.ok(after);
    assert.notStrictEqual(new Date(before).toISOString(), new Date(after).toISOString());
  });

  await test('institution admin first login requires password change', async () => {
    const result = await auth.login('admin@auth.test', 'Str0ng!Pass');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.requirePasswordChange, true);
  });

  await test('institution admin subsequent login does not require password change', async () => {
    db.updateUserPassword(adminId, auth.hashPassword('Str0ng!Pass'));
    const result = await auth.login('admin@auth.test', 'Str0ng!Pass');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.requirePasswordChange, false);
  });

  await test('validateSession returns user for valid token', async () => {
    const loginResult = await auth.login('reviewer@auth.test', 'Str0ng!Pass');
    const session = await auth.validateSession(loginResult.sessionId);
    assert.ok(session);
    assert.strictEqual(session.email, 'reviewer@auth.test');
    assert.strictEqual(session.role, 'reviewer');
  });

  await test('validateSession returns null for invalid token', async () => {
    const session = await auth.validateSession('invalid-token');
    assert.strictEqual(session, null);
  });

  await test('logout deletes session', async () => {
    const loginResult = await auth.login('curator@auth.test', 'Str0ng!Pass');
    auth.logout(loginResult.sessionId);
    const session = await auth.validateSession(loginResult.sessionId);
    assert.strictEqual(session, null);
  });

  await test('requireAuth middleware rejects missing session', () => {
    const req = { cookies: {}, headers: {} };
    const res = {
      statusCode: null,
      jsonBody: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.jsonBody = body;
      },
    };
    let called = false;
    auth.requireAuth(req, res, () => {
      called = true;
    });
    assert.strictEqual(called, false);
    assert.strictEqual(res.statusCode, 401);
  });

  await test('requireAuth middleware accepts valid session', async () => {
    const loginResult = await auth.login('active@auth.test', 'Str0ng!Pass');
    const req = { cookies: {}, headers: { 'x-scholars-session': loginResult.sessionId } };
    const res = {
      status() {
        return this;
      },
      json() {},
    };
    let called = false;
    auth.requireAuth(req, res, () => {
      called = true;
    });
    assert.strictEqual(called, true);
    assert.strictEqual(req.user.email, 'active@auth.test');
  });

  await test('magic link helpers remain deprecated but functional', async () => {
    const result = await auth.requestMagicLink('magic@auth.test');
    assert.ok(result.token);
    assert.ok(result.loginUrl);
    const verified = auth.verifyMagicToken(result.token);
    assert.ok(verified);
    assert.ok(verified.sessionId);
  });

  closeDb();
  console.log('\nScholars auth tests complete.');
}

runTests();
