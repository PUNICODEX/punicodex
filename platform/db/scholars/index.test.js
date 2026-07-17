/**
 * PuniCodex — Scholarly Edition DB Layer Tests
 *
 * Uses a temporary copy of the SQLite database so production data is never touched.
 */

const assert = require('node:assert');

const { prepareTestDb } = require('../../../test/helpers/test-db.js');
prepareTestDb(__filename);

const { closeDb } = require('../connection');
const db = require('./index');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

function runMigrateScholars() {
  const { getDb } = require('../connection');
  const database = getDb();

  const { migrate: migrateScholars } = require('../migrate-scholars.js');
  migrateScholars(database);

  const { migrate: migrateQuality } = require('../migrate-scholars-quality.js');
  migrateQuality(database);
}

console.log('\n▸ Scholars DB Layer Tests\n');

runMigrateScholars();

// ─── Institutions ───
test('create and retrieve institution by slug', () => {
  const result = db.createInstitution({
    name: 'Test University',
    slug: 'test-university',
    domain: 'test.edu',
    accreditation: 'Regional',
  });
  assert.ok(result.lastInsertRowid > 0);
  const row = db.getInstitutionBySlug('test-university');
  assert.strictEqual(row.name, 'Test University');
  assert.strictEqual(row.domain, 'test.edu');
});

test('list institutions filters by status', () => {
  const rows = db.listInstitutions({ status: 'pending' });
  assert.ok(rows.length >= 1);
  assert.ok(rows.every((r) => r.status === 'pending'));
});

test('create institution with admin in transaction', () => {
  const result = db.createInstitutionWithAdmin({
    name: 'Sponsored College',
    slug: 'sponsored-college',
    domain: 'sponsored.edu',
    sponsorshipStatus: 'active',
    sponsorshipExpiresAt: '2027-01-01T00:00:00.000Z',
    departmentAllowlist: ['Classics', 'History'],
    adminEmail: 'admin@sponsored.edu',
    adminPasswordHash: 'admin-hash',
    adminDisplayName: 'Admin User',
    adminDepartment: 'Classics',
  });
  assert.ok(result.institutionId > 0);
  assert.ok(result.adminId > 0);

  const institution = db.getInstitutionBySlug('sponsored-college');
  assert.strictEqual(institution.sponsorship_status, 'active');
  assert.strictEqual(institution.sponsorship_expires_at, '2027-01-01T00:00:00.000Z');
  assert.deepStrictEqual(institution.department_allowlist, ['Classics', 'History']);

  const admin = db.getUserById(result.adminId);
  assert.strictEqual(admin.role, 'inst_admin');
  assert.strictEqual(admin.account_status, 'active');
});

test('update institution sponsorship and allowlist', () => {
  const institution = db.getInstitutionBySlug('sponsored-college');
  db.updateInstitutionSponsorship(institution.id, {
    sponsorshipStatus: 'expired',
    sponsorshipExpiresAt: '2025-01-01T00:00:00.000Z',
  });
  db.updateInstitutionAllowlist(institution.id, ['Classics', 'History', 'Anthropology']);

  const updated = db.getInstitutionById(institution.id);
  assert.strictEqual(updated.sponsorship_status, 'expired');
  assert.deepStrictEqual(updated.department_allowlist, ['Classics', 'History', 'Anthropology']);
});

test('department allowlist validation', () => {
  const institution = db.getInstitutionBySlug('sponsored-college');
  assert.ok(db.isDepartmentAllowed('Classics', institution));
  assert.ok(!db.isDepartmentAllowed('Physics', institution));
  assert.ok(db.isDepartmentAllowed('Anything', { department_allowlist: [] }));
  assert.ok(db.isDepartmentAllowed('Anything', null));
});

// ─── Users ───
let institutionId;
let studentId;
let reviewerId;

test('create and retrieve users', () => {
  const inst = db.getInstitutionBySlug('test-university');
  institutionId = inst.id;

  const studentResult = db.createUser({
    email: 'student@test.edu',
    institutionId,
    role: 'student',
    displayName: 'Test Student',
  });
  studentId = studentResult.lastInsertRowid;

  const reviewerResult = db.createUser({
    email: 'reviewer@test.edu',
    institutionId,
    role: 'reviewer',
    displayName: 'Test Reviewer',
  });
  reviewerId = reviewerResult.lastInsertRowid;

  const student = db.getUserByEmail('student@test.edu');
  assert.strictEqual(student.role, 'student');
  assert.strictEqual(student.account_status, 'active');
  const reviewer = db.getUserById(reviewerId);
  assert.strictEqual(reviewer.role, 'reviewer');
});

test('create user with password and update password', () => {
  const result = db.createUserWithPassword({
    email: 'password-user@test.edu',
    institutionId,
    role: 'student',
    displayName: 'Password User',
    passwordHash: 'hash-v1',
    accountStatus: 'pending',
  });
  assert.ok(result.lastInsertRowid > 0);

  const user = db.getUserByEmail('password-user@test.edu');
  assert.strictEqual(user.password_hash, 'hash-v1');
  assert.strictEqual(user.account_status, 'pending');

  db.updateUserPassword(user.id, 'hash-v2');
  const updated = db.getUserById(user.id);
  assert.strictEqual(updated.password_hash, 'hash-v2');
  assert.ok(updated.password_changed_at);
});

test('update user account status', () => {
  const user = db.getUserByEmail('password-user@test.edu');
  db.updateUserStatus(user.id, 'disabled');
  const updated = db.getUserById(user.id);
  assert.strictEqual(updated.account_status, 'disabled');
});

test('login attempt lockout', () => {
  const user = db.getUserByEmail('password-user@test.edu');
  db.updateUserStatus(user.id, 'active');
  db.resetLoginAttempts(user.id);
  for (let i = 0; i < 5; i += 1) {
    db.incrementLoginAttempts(user.id);
  }
  const locked = db.getUserById(user.id);
  assert.strictEqual(locked.login_attempts, 5);
  assert.ok(db.isUserLocked(locked));

  db.resetLoginAttempts(user.id);
  const reset = db.getUserById(user.id);
  assert.strictEqual(reset.login_attempts, 0);
  assert.ok(!db.isUserLocked(reset));
});

test('get user with institution by email', () => {
  const row = db.getUserWithInstitutionByEmail('student@test.edu');
  assert.ok(row);
  assert.strictEqual(row.email, 'student@test.edu');
  assert.strictEqual(row.institution_name, 'Test University');
  assert.ok(Array.isArray(row.department_allowlist));
});

test('list students by institution', () => {
  const students = db.listStudentsByInstitution(institutionId);
  assert.ok(students.some((u) => u.email === 'student@test.edu'));
  assert.ok(students.every((u) => u.role === 'student'));
});

// ─── Sessions ───
test('create, retrieve, and delete session', () => {
  const sessionId = 'test-session-123';
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.createSession({ id: sessionId, userId: reviewerId, expiresAt });

  const session = db.getSessionWithUser(sessionId);
  assert.ok(session);
  assert.strictEqual(session.user_id, reviewerId);
  assert.strictEqual(session.email, 'reviewer@test.edu');
  assert.strictEqual(session.role, 'reviewer');

  db.deleteSession(sessionId);
  assert.strictEqual(db.getSessionById(sessionId), null);
});

// ─── Temples ───
let templeId;

test('create and retrieve temple', () => {
  const result = db.createTemple({
    entryId: 'test-deity',
    name: 'Tést Déity',
    pantheon: 'greek',
    tier: 'tier-1',
    manifestVersion: '0.1.0',
  });
  templeId = result.lastInsertRowid;

  const byEntry = db.getTempleByEntryId('test-deity');
  assert.ok(byEntry);
  assert.strictEqual(byEntry.name, 'Tést Déity');

  const listed = db.listTemples({ pantheon: 'greek' });
  assert.ok(listed.some((t) => t.entry_id === 'test-deity'));
});

// ─── Sections ───
let sectionId;

test('create, list, and update section', () => {
  const result = db.createSection({
    templeId,
    key: 'mythology',
    label: 'Mythology',
    body: '',
    sources: [],
    status: 'empty',
  });
  sectionId = result.lastInsertRowid;

  const section = db.getSectionById(sectionId);
  assert.strictEqual(section.key, 'mythology');
  assert.deepStrictEqual(section.sources, []);

  const sections = db.listSectionsByTemple(templeId);
  assert.strictEqual(sections.length, 1);

  db.updateSection({
    id: sectionId,
    body: 'New mythological content.',
    sources: [{ citation: 'Test Source' }],
    status: 'published',
    updatedBy: studentId,
  });

  const updated = db.getSectionByTempleAndKey(templeId, 'mythology');
  assert.strictEqual(updated.body, 'New mythological content.');
  assert.strictEqual(updated.sources.length, 1);
  assert.strictEqual(updated.status, 'published');
  assert.strictEqual(updated.version, 1);
});

// ─── Edits ───
let editId;

test('create and list pending edits', () => {
  const result = db.createEdit({
    sectionId,
    userId: studentId,
    proposedBody: 'Proposed myth update.',
    proposedSources: [{ citation: 'Proposed Source' }],
  });
  editId = result.lastInsertRowid;

  const edit = db.getEditById(editId);
  assert.strictEqual(edit.proposed_body, 'Proposed myth update.');
  assert.strictEqual(edit.proposed_sources.length, 1);

  const pending = db.listPendingEdits({ institutionId });
  assert.ok(pending.some((e) => e.id === editId));
  assert.ok(pending.every((e) => e.status === 'pending'));
});

test('create edit with quality reason', () => {
  const result = db.createEdit({
    sectionId,
    userId: studentId,
    proposedBody: 'A more detailed proposed body that explains the mythological context.',
    proposedSources: [{ citation: 'Hesiod, Theogony', url: 'https://example.com/hesiod' }],
    qualityReason: 'Score 42/100 — moderate length, one source, authoritative source markers',
  });
  const edit = db.getEditById(result.lastInsertRowid);
  assert.strictEqual(
    edit.quality_reason,
    'Score 42/100 — moderate length, one source, authoritative source markers'
  );
});

// ─── Reviews ───
test('create review and update edit status', () => {
  db.createReview({ editId, reviewerId, decision: 'approved', comment: 'Looks good.' });
  db.updateEditStatus(editId, 'approved', 'Looks good.');

  const reviews = db.getReviewsForEdit(editId);
  assert.strictEqual(reviews.length, 1);
  assert.strictEqual(reviews[0].decision, 'approved');

  const edit = db.getEditById(editId);
  assert.strictEqual(edit.status, 'approved');
});

// ─── History ───
test('create and retrieve history record', () => {
  db.createHistoryRecord({
    sectionId,
    editId,
    body: 'Published myth.',
    sources: [{ citation: 'Source' }],
    media: [],
    attribution: { userId: studentId, reviewerId },
    diff: JSON.stringify({ previousBody: '' }),
  });

  const history = db.getHistoryForSection(sectionId);
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].body, 'Published myth.');
  assert.deepStrictEqual(history[0].sources, [{ citation: 'Source' }]);
});

// ─── Transactions ───
test('withTransaction commits multiple operations atomically', () => {
  let section2Id;
  db.withTransaction(() => {
    const result = db.createSection({
      templeId,
      key: 'original-script',
      label: 'Original Script & Provenance',
      body: 'Original script note.',
      status: 'published',
    });
    section2Id = result.lastInsertRowid;
    db.createHistoryRecord({
      sectionId: section2Id,
      body: 'Original script note.',
      sources: [],
      media: [],
      attribution: {},
    });
  });

  const section = db.getSectionById(section2Id);
  assert.ok(section);
  assert.strictEqual(section.body, 'Original script note.');
});

// ─── Media ───
let mediaId;

test('create and retrieve media', () => {
  const result = db.createMedia({
    filename: 'test-asset.png',
    url: '/uploads/scholars/test-asset.png',
    mimeType: 'image/png',
    sizeBytes: 1234,
    caption: 'Test caption',
    license: 'CC-BY-4.0',
    uploadedBy: studentId,
  });
  mediaId = result.lastInsertRowid;
  assert.ok(mediaId > 0);

  const media = db.getMediaById(mediaId);
  assert.strictEqual(media.filename, 'test-asset.png');
  assert.strictEqual(media.mime_type, 'image/png');
  assert.strictEqual(media.status, 'pending');
});

test('listMedia filters by status and uploader', () => {
  const pending = db.listMedia({ status: 'pending' });
  assert.ok(pending.some((m) => m.id === mediaId));
  const byUploader = db.listMedia({ uploadedBy: studentId });
  assert.ok(byUploader.some((m) => m.id === mediaId));
  const empty = db.listMedia({ status: 'approved' });
  assert.ok(!empty.some((m) => m.id === mediaId));
});

test('countMedia filters by status', () => {
  const pendingCount = db.countMedia({ status: 'pending' });
  assert.ok(pendingCount >= 1);
  const approvedCount = db.countMedia({ status: 'approved' });
  assert.strictEqual(approvedCount, 0);
});

test('updateMediaStatus changes status', () => {
  db.updateMediaStatus(mediaId, 'approved');
  const approved = db.getMediaById(mediaId);
  assert.strictEqual(approved.status, 'approved');
  db.updateMediaStatus(mediaId, 'rejected');
  const rejected = db.getMediaById(mediaId);
  assert.strictEqual(rejected.status, 'rejected');
});

// ─── Analytics ───
test('countEditsByDay returns array', () => {
  const rows = db.countEditsByDay(30);
  assert.ok(Array.isArray(rows));
  assert.ok(rows.length >= 1);
  assert.ok(rows.every((r) => typeof r.day === 'string' && typeof r.count === 'number'));
});

test('countApprovalsByDay returns array', () => {
  const rows = db.countApprovalsByDay(30);
  assert.ok(Array.isArray(rows));
  assert.ok(rows.every((r) => typeof r.day === 'string' && typeof r.count === 'number'));
});

test('topContributingInstitutions ranks by edit count', () => {
  const rows = db.topContributingInstitutions(10);
  assert.ok(Array.isArray(rows));
  assert.ok(rows.length >= 1);
  assert.ok(rows.every((r) => typeof r.name === 'string' && typeof r.edit_count === 'number'));
  assert.strictEqual(rows[0].name, 'Test University');
});

test('topEditedTemples ranks by edit count', () => {
  const rows = db.topEditedTemples(10);
  assert.ok(Array.isArray(rows));
  assert.ok(rows.length >= 1);
  assert.ok(rows.every((r) => typeof r.name === 'string' && typeof r.edit_count === 'number'));
  assert.strictEqual(rows[0].entry_id, 'test-deity');
});

test('countViewsByDay counts temple_view audit entries', () => {
  db.audit({
    actorId: studentId,
    action: 'temple_view',
    resourceType: 'temple',
    resourceId: 'test-deity',
    details: {},
  });
  const rows = db.countViewsByDay(30);
  assert.ok(Array.isArray(rows));
  assert.ok(rows.some((r) => r.count >= 1));
});

closeDb();

console.log('\nScholars DB layer tests complete.');
