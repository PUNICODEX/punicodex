/**
 * PÚNYCODEX — Scholarly Edition Authorization Tests
 */

const assert = require('node:assert');
const { prepareTestDb } = require('../../test/helpers/test-db.js');

prepareTestDb(__filename);

const { closeDb } = require('../db/connection');
const db = require('../db/scholars');
const authz = require('./authz');

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
  const { getDb } = require('../db/connection');
  const database = getDb();

  const { migrate: migrateScholars } = require('../db/migrate-scholars.js');
  migrateScholars(database);

  const { migrate: migrateQuality } = require('../db/migrate-scholars-quality.js');
  migrateQuality(database);
}

console.log('\n▸ Scholars AuthZ Tests\n');

runMigrateScholars();

let activeInstitutionId;
let expiredInstitutionId;
let frozenTempleId;
let openTempleId;
let frozenSectionId;
let openSectionId;

function buildUser(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    email: overrides.email ?? 'user@test.edu',
    role: overrides.role ?? 'student',
    institutionId: overrides.institutionId ?? activeInstitutionId,
    department: overrides.department ?? 'Classics',
    status: overrides.status ?? 'active',
    accountStatus: overrides.accountStatus ?? 'active',
    ...overrides,
  };
}

function buildInstitution(overrides = {}) {
  return {
    id: overrides.id ?? activeInstitutionId,
    sponsorship_status: overrides.sponsorshipStatus ?? 'active',
    department_allowlist: overrides.departmentAllowlist ?? ['Classics', 'History'],
    ...overrides,
  };
}

function buildTarget(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    is_frozen: overrides.isFrozen ?? false,
    ...overrides,
  };
}

(() => {
  const activeInstitution = db.createInstitution({
    name: 'Active University',
    slug: 'active-university',
    domain: 'active.test',
    accreditation: 'test',
  });
  activeInstitutionId = activeInstitution.lastInsertRowid;
  db.updateInstitutionSponsorship(activeInstitutionId, { sponsorshipStatus: 'active' });
  db.updateInstitutionAllowlist(activeInstitutionId, ['Classics', 'History']);

  const expiredInstitution = db.createInstitution({
    name: 'Expired University',
    slug: 'expired-university',
    domain: 'expired.test',
    accreditation: 'test',
  });
  expiredInstitutionId = expiredInstitution.lastInsertRowid;
  db.updateInstitutionSponsorship(expiredInstitutionId, { sponsorshipStatus: 'expired' });

  const frozenTemple = db.createTemple({
    entryId: 'frozen-deity',
    name: 'Frozen Deity',
    pantheon: 'greek',
    tier: 'tier-1',
    manifestVersion: '0.1.0',
  });
  frozenTempleId = frozenTemple.lastInsertRowid;
  db.setTempleFrozen('frozen-deity', true);

  const openTemple = db.createTemple({
    entryId: 'open-deity',
    name: 'Open Deity',
    pantheon: 'greek',
    tier: 'tier-1',
    manifestVersion: '0.1.0',
  });
  openTempleId = openTemple.lastInsertRowid;

  const frozenSection = db.createSection({
    templeId: frozenTempleId,
    key: 'mythology',
    label: 'Mythology',
    body: '',
    sources: [],
    status: 'empty',
  });
  frozenSectionId = frozenSection.lastInsertRowid;

  const openSection = db.createSection({
    templeId: openTempleId,
    key: 'mythology',
    label: 'Mythology',
    body: '',
    sources: [],
    status: 'empty',
  });
  openSectionId = openSection.lastInsertRowid;
})();

test('student can submit edit to open section', () => {
  const user = buildUser({ role: 'student' });
  const institution = buildInstitution();
  const section = buildTarget({ id: openSectionId, isFrozen: false });
  assert.ok(authz.canSubmitEdit(user, institution, section));
});

test('student cannot submit edit to frozen section', () => {
  const user = buildUser({ role: 'student' });
  const institution = buildInstitution();
  const section = buildTarget({ id: frozenSectionId, isFrozen: true });
  assert.ok(!authz.canSubmitEdit(user, institution, section));
});

test('student cannot submit edit when account is disabled', () => {
  const user = buildUser({ role: 'student', accountStatus: 'disabled' });
  const institution = buildInstitution();
  const section = buildTarget({ id: openSectionId });
  assert.ok(!authz.canSubmitEdit(user, institution, section));
});

test('student cannot submit edit when institution sponsorship expired', () => {
  const user = buildUser({ role: 'student' });
  const institution = buildInstitution({
    id: expiredInstitutionId,
    sponsorshipStatus: 'expired',
  });
  const section = buildTarget({ id: openSectionId });
  assert.ok(!authz.canSubmitEdit(user, institution, section));
});

test('student cannot submit edit when department not in allowlist', () => {
  const user = buildUser({ role: 'student', department: 'Physics' });
  const institution = buildInstitution();
  const section = buildTarget({ id: openSectionId });
  assert.ok(!authz.canSubmitEdit(user, institution, section));
});

test('reviewer can review edit in same institution', () => {
  const user = buildUser({ role: 'reviewer' });
  const institution = buildInstitution();
  assert.ok(authz.canReviewEdit(user, institution));
});

test('reviewer cannot review edit in different institution', () => {
  const user = buildUser({ role: 'reviewer', institutionId: 999 });
  const institution = buildInstitution();
  assert.ok(!authz.canReviewEdit(user, institution));
});

test('curator can review edit across institutions', () => {
  const user = buildUser({ role: 'curator', institutionId: 999 });
  const institution = buildInstitution();
  assert.ok(authz.canReviewEdit(user, institution));
});

test('curator cannot review when target institution sponsorship expired', () => {
  const user = buildUser({ role: 'curator', institutionId: activeInstitutionId });
  const institution = buildInstitution({
    id: expiredInstitutionId,
    sponsorshipStatus: 'expired',
  });
  assert.ok(!authz.canReviewEdit(user, institution));
});

test('reviewer cannot review their own edit', () => {
  const user = buildUser({ role: 'reviewer', id: 42 });
  const institution = buildInstitution();
  const author = { id: 42 };
  assert.ok(!authz.canReviewEdit(user, institution, author));
});

function mockRes() {
  return {
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json() {},
  };
}

test('requireCurator middleware allows curator', () => {
  const req = { user: buildUser({ role: 'curator' }) };
  const res = mockRes();
  let called = false;
  authz.requireCurator(req, res, () => {
    called = true;
  });
  assert.ok(called);
});

test('requireCurator middleware rejects non-curator', () => {
  const req = { user: buildUser({ role: 'reviewer' }) };
  const res = mockRes();
  let called = false;
  authz.requireCurator(req, res, () => {
    called = true;
  });
  assert.ok(!called);
  assert.strictEqual(res.statusCode, 403);
});

test('requireInstitutionAdmin middleware allows institution admin', () => {
  const req = { user: buildUser({ role: 'inst_admin' }) };
  const res = mockRes();
  let called = false;
  authz.requireInstitutionAdmin(req, res, () => {
    called = true;
  });
  assert.ok(called);
});

test('requireInstitutionAdmin middleware rejects student', () => {
  const req = { user: buildUser({ role: 'student' }) };
  const res = mockRes();
  let called = false;
  authz.requireInstitutionAdmin(req, res, () => {
    called = true;
  });
  assert.ok(!called);
  assert.strictEqual(res.statusCode, 403);
});

test('canManageStudent allows admin to manage student in same institution', () => {
  const admin = buildUser({ role: 'inst_admin', institutionId: activeInstitutionId });
  const student = buildUser({
    role: 'student',
    institutionId: activeInstitutionId,
    id: 100,
  });
  assert.ok(authz.canManageStudent(admin, student));
});

test('canManageStudent rejects admin managing student in different institution', () => {
  const admin = buildUser({ role: 'inst_admin', institutionId: activeInstitutionId });
  const student = buildUser({ role: 'student', institutionId: 999, id: 100 });
  assert.ok(!authz.canManageStudent(admin, student));
});

test('canManageStudent rejects student trying to manage another student', () => {
  const admin = buildUser({ role: 'student', institutionId: activeInstitutionId });
  const student = buildUser({ role: 'student', institutionId: activeInstitutionId, id: 100 });
  assert.ok(!authz.canManageStudent(admin, student));
});

test('canManageStudent rejects admin managing another admin', () => {
  const admin = buildUser({ role: 'inst_admin', institutionId: activeInstitutionId });
  const otherAdmin = buildUser({ role: 'inst_admin', institutionId: activeInstitutionId, id: 100 });
  assert.ok(!authz.canManageStudent(admin, otherAdmin));
});

test('canManageInstitution allows admin to manage own institution', () => {
  const admin = buildUser({ role: 'inst_admin', institutionId: activeInstitutionId });
  assert.ok(authz.canManageInstitution(admin, activeInstitutionId));
});

test('canManageInstitution rejects admin managing other institution', () => {
  const admin = buildUser({ role: 'inst_admin', institutionId: activeInstitutionId });
  assert.ok(!authz.canManageInstitution(admin, 999));
});

closeDb();

console.log('\nScholars authz tests complete.');
