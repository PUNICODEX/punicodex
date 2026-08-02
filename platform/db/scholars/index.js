/**
 * PuniCodex — Scholarly Edition Database Layer
 *
 * CRUD and query helpers for the Scholars tables.
 * Uses the shared better-sqlite3 connection from platform/db/connection.js.
 */

const { getDb } = require('../connection');

function json(value) {
  return JSON.stringify(value);
}

function parseJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

// ─────────────────────────────────────────────────────────────
// Institutions
// ─────────────────────────────────────────────────────────────

function createInstitution({ name, slug, domain, accreditation, metadata = {} }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_institutions (name, slug, domain, accreditation, metadata)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(name, slug, domain, accreditation, json(metadata));
}

function getInstitutionById(id) {
  const db = getDb();
  return normalizeInstitution(
    db.prepare('SELECT * FROM scholars_institutions WHERE id = ?').get(id)
  );
}

function getInstitutionBySlug(slug) {
  const db = getDb();
  return normalizeInstitution(
    db.prepare('SELECT * FROM scholars_institutions WHERE slug = ?').get(slug)
  );
}

function getInstitutionByDomain(domain) {
  const db = getDb();
  return normalizeInstitution(
    db.prepare('SELECT * FROM scholars_institutions WHERE domain = ?').get(domain)
  );
}

function normalizeInstitution(row) {
  if (!row) return null;
  return {
    ...row,
    metadata: parseJson(row.metadata, {}),
    department_allowlist: parseJson(row.department_allowlist, []),
  };
}

function countInstitutions() {
  const db = getDb();
  return db.prepare('SELECT COUNT(*) AS count FROM scholars_institutions').get().count;
}

function listInstitutions({ status, sponsorshipStatus } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (sponsorshipStatus) {
    conditions.push('sponsorship_status = ?');
    params.push(sponsorshipStatus);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`SELECT * FROM scholars_institutions ${where} ORDER BY name`)
    .all(...params);
  return rows.map((r) => normalizeInstitution(r));
}

function updateInstitutionSponsorship(id, { sponsorshipStatus, sponsorshipExpiresAt }) {
  const db = getDb();
  const fields = [];
  const params = [];
  if (sponsorshipStatus !== undefined) {
    fields.push('sponsorship_status = ?');
    params.push(sponsorshipStatus);
  }
  if (sponsorshipExpiresAt !== undefined) {
    fields.push('sponsorship_expires_at = ?');
    params.push(sponsorshipExpiresAt);
  }
  if (fields.length === 0) return { changes: 0 };
  return db
    .prepare(`UPDATE scholars_institutions SET ${fields.join(', ')} WHERE id = ?`)
    .run(...params, id);
}

function updateInstitutionAllowlist(id, departmentAllowlist) {
  const db = getDb();
  return db
    .prepare('UPDATE scholars_institutions SET department_allowlist = ? WHERE id = ?')
    .run(json(departmentAllowlist), id);
}

/**
 * Flip every active sponsorship whose expiry timestamp has passed to
 * 'expired'. Uses SQLite's datetime() so both 'YYYY-MM-DD HH:MM:SS' and ISO
 * 8601 stored values compare correctly. Returns the number of rows flipped.
 * Read-time enforcement lives in scholars/authz.js#isActiveSponsorship; this
 * is the housekeeping pass that keeps the stored status honest.
 */
function expireLapsedSponsorships() {
  const db = getDb();
  return db
    .prepare(
      `UPDATE scholars_institutions
       SET sponsorship_status = 'expired'
       WHERE sponsorship_status = 'active'
         AND sponsorship_expires_at IS NOT NULL
         AND datetime(sponsorship_expires_at) <= datetime('now')`
    )
    .run().changes;
}

// ─────────────────────────────────────────────────────────────
// Sponsorship applications
// ─────────────────────────────────────────────────────────────

function createSponsorshipApplication({
  institutionName,
  domain,
  contactName,
  contactEmail,
  departmentFocus = '',
  message = '',
}) {
  const db = getDb();
  return db
    .prepare(
      `INSERT INTO scholars_sponsorship_applications
        (institution_name, domain, contact_name, contact_email, department_focus, message)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(institutionName, domain, contactName, contactEmail, departmentFocus, message);
}

function getSponsorshipApplicationById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM scholars_sponsorship_applications WHERE id = ?').get(id);
}

function listSponsorshipApplications({ status, limit = 100, offset = 0 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db
    .prepare(
      `SELECT * FROM scholars_sponsorship_applications ${where}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);
}

function countSponsorshipApplications({ status } = {}) {
  const db = getDb();
  if (status) {
    return db
      .prepare('SELECT COUNT(*) AS c FROM scholars_sponsorship_applications WHERE status = ?')
      .get(status).c;
  }
  return db.prepare('SELECT COUNT(*) AS c FROM scholars_sponsorship_applications').get().c;
}

function updateSponsorshipApplicationStatus(
  id,
  status,
  { reviewComment = null, reviewedBy = null, createdInstitutionId = null } = {}
) {
  const db = getDb();
  return db
    .prepare(
      `UPDATE scholars_sponsorship_applications
       SET status = ?, review_comment = ?, reviewed_by = ?, created_institution_id = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(status, reviewComment, reviewedBy, createdInstitutionId, id);
}

function createInstitutionWithAdmin({
  name,
  slug,
  domain,
  accreditation,
  metadata = {},
  sponsorshipStatus = 'pending',
  sponsorshipExpiresAt = null,
  departmentAllowlist = [],
  adminEmail,
  adminPasswordHash,
  adminDisplayName,
  adminDepartment,
}) {
  const db = getDb();
  return db.transaction(() => {
    const institutionStmt = db.prepare(`
      INSERT INTO scholars_institutions
        (name, slug, domain, accreditation, metadata, sponsorship_status, sponsorship_expires_at, department_allowlist)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const institutionResult = institutionStmt.run(
      name,
      slug,
      domain,
      accreditation,
      json(metadata),
      sponsorshipStatus,
      sponsorshipExpiresAt,
      json(departmentAllowlist)
    );
    const institutionId = institutionResult.lastInsertRowid;

    const adminStmt = db.prepare(`
      INSERT INTO scholars_users
        (email, institution_id, role, department, display_name, password_hash, account_status)
      VALUES (?, ?, 'inst_admin', ?, ?, ?, 'active')
    `);
    const adminResult = adminStmt.run(
      adminEmail,
      institutionId,
      adminDepartment,
      adminDisplayName,
      adminPasswordHash
    );

    return {
      institutionId,
      adminId: adminResult.lastInsertRowid,
    };
  })();
}

// ─────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────

function countUsers() {
  const db = getDb();
  return db.prepare('SELECT COUNT(*) AS count FROM scholars_users').get().count;
}

function listUsers({ role, institutionId, accountStatus, q } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];
  if (role) {
    conditions.push('u.role = ?');
    params.push(role);
  }
  if (institutionId !== undefined) {
    conditions.push('u.institution_id = ?');
    params.push(institutionId);
  }
  if (accountStatus) {
    conditions.push('u.account_status = ?');
    params.push(accountStatus);
  }
  if (q) {
    conditions.push('(u.email LIKE ? OR u.display_name LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db
    .prepare(`
    SELECT u.*, i.name AS institution_name
    FROM scholars_users u
    LEFT JOIN scholars_institutions i ON u.institution_id = i.id
    ${where}
    ORDER BY u.created_at DESC
  `)
    .all(...params);
}

function createUser({ email, institutionId, role = 'student', department, orcid, displayName }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_users (email, institution_id, role, department, orcid, display_name, account_status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `);
  return stmt.run(email, institutionId, role, department, orcid, displayName);
}

function createUserWithPassword({
  email,
  institutionId,
  role = 'student',
  department,
  orcid,
  displayName,
  passwordHash,
  accountStatus = 'pending',
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_users
      (email, institution_id, role, department, orcid, display_name, password_hash, account_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    email,
    institutionId,
    role,
    department,
    orcid,
    displayName,
    passwordHash,
    accountStatus
  );
}

function updateUserPassword(id, passwordHash) {
  const db = getDb();
  return db
    .prepare(`
      UPDATE scholars_users
      SET password_hash = ?, password_changed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
    .run(passwordHash, id);
}

function updateUserStatus(id, accountStatus) {
  const db = getDb();
  return db
    .prepare('UPDATE scholars_users SET account_status = ? WHERE id = ?')
    .run(accountStatus, id);
}

function updateUserRole(id, role) {
  const db = getDb();
  return db.prepare('UPDATE scholars_users SET role = ? WHERE id = ?').run(role, id);
}

function updateUserProfile(id, { displayName, department }) {
  const db = getDb();
  const fields = [];
  const params = [];
  if (displayName !== undefined) {
    fields.push('display_name = ?');
    params.push(displayName);
  }
  if (department !== undefined) {
    fields.push('department = ?');
    params.push(department);
  }
  if (fields.length === 0) return { changes: 0 };
  return db
    .prepare(`UPDATE scholars_users SET ${fields.join(', ')} WHERE id = ?`)
    .run(...params, id);
}

function incrementLoginAttempts(id, { maxAttempts = 5, lockoutMinutes = 15 } = {}) {
  const db = getDb();
  const user = getUserById(id);
  if (!user) return null;
  const attempts = (user.login_attempts || 0) + 1;
  const lockedUntil =
    attempts >= maxAttempts
      ? new Date(Date.now() + lockoutMinutes * 60 * 1000).toISOString()
      : user.locked_until;
  return db
    .prepare('UPDATE scholars_users SET login_attempts = ?, locked_until = ? WHERE id = ?')
    .run(attempts, lockedUntil, id);
}

function resetLoginAttempts(id) {
  const db = getDb();
  return db
    .prepare('UPDATE scholars_users SET login_attempts = 0, locked_until = NULL WHERE id = ?')
    .run(id);
}

function isUserLocked(user) {
  if (!user?.locked_until) return false;
  return new Date(user.locked_until) > new Date();
}

function getUserWithInstitutionByEmail(email) {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT u.*, i.name AS institution_name, i.slug AS institution_slug,
             i.domain AS institution_domain, i.sponsorship_status,
             i.sponsorship_expires_at, i.department_allowlist
      FROM scholars_users u
      LEFT JOIN scholars_institutions i ON u.institution_id = i.id
      WHERE u.email = ?
    `)
    .get(email);
  if (!row) return null;
  row.department_allowlist = parseJson(row.department_allowlist, []);
  return row;
}

function isDepartmentAllowed(department, institution) {
  if (!institution?.department_allowlist) return true;
  const allowlist = Array.isArray(institution.department_allowlist)
    ? institution.department_allowlist
    : parseJson(institution.department_allowlist, []);
  if (allowlist.length === 0) return true;
  return allowlist.includes(department);
}

function getUserById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM scholars_users WHERE id = ?').get(id) || null;
}

function getUserByEmail(email) {
  const db = getDb();
  return db.prepare('SELECT * FROM scholars_users WHERE email = ?').get(email) || null;
}

function updateUserLastSeen(id) {
  const db = getDb();
  db.prepare('UPDATE scholars_users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
}

function listUsersByInstitution(institutionId) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM scholars_users WHERE institution_id = ? ORDER BY created_at')
    .all(institutionId);
}

function listStudentsByInstitution(institutionId, { status, accountStatus, department } = {}) {
  const db = getDb();
  const conditions = ['u.institution_id = ?', "u.role = 'student'"];
  const params = [institutionId];
  if (status) {
    conditions.push('u.status = ?');
    params.push(status);
  }
  if (accountStatus) {
    conditions.push('u.account_status = ?');
    params.push(accountStatus);
  }
  if (department) {
    conditions.push('u.department = ?');
    params.push(department);
  }
  const where = conditions.join(' AND ');
  return db
    .prepare(`
      SELECT u.*, i.name AS institution_name
      FROM scholars_users u
      LEFT JOIN scholars_institutions i ON u.institution_id = i.id
      WHERE ${where}
      ORDER BY u.created_at DESC
    `)
    .all(...params);
}

function countUsersByInstitution(institutionId) {
  const db = getDb();
  return db
    .prepare('SELECT COUNT(*) AS count FROM scholars_users WHERE institution_id = ?')
    .get(institutionId).count;
}

function countEditsByInstitution(institutionId, { status, department } = {}) {
  const db = getDb();
  let sql = `
    SELECT COUNT(*) AS count
    FROM scholars_edits e
    JOIN scholars_users u ON e.user_id = u.id
    WHERE u.institution_id = ?
  `;
  const params = [institutionId];
  if (status) {
    sql += ' AND e.status = ?';
    params.push(status);
  }
  if (department) {
    sql += ' AND u.department = ?';
    params.push(department);
  }
  return db.prepare(sql).get(...params).count;
}

function countAttributedSectionsByInstitution(institutionId, { department } = {}) {
  const db = getDb();
  let sql = `
    SELECT COUNT(DISTINCT s.id) AS count
    FROM scholars_sections s
    JOIN scholars_users u ON s.updated_by = u.id
    WHERE u.institution_id = ? AND s.status = 'published'
  `;
  const params = [institutionId];
  if (department) {
    sql += ' AND u.department = ?';
    params.push(department);
  }
  return db.prepare(sql).get(...params).count;
}

// ─────────────────────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────────────────────

function createSession({ id, userId, expiresAt, ipHash, userAgent }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_sessions (id, user_id, expires_at, ip_hash, user_agent)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(id, userId, expiresAt, ipHash, userAgent);
}

function getSessionById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM scholars_sessions WHERE id = ?').get(id);
  if (row && new Date(row.expires_at) < new Date()) {
    deleteSession(id);
    return null;
  }
  return row || null;
}

function getSessionWithUser(id) {
  const db = getDb();
  const row = db
    .prepare(`
    SELECT s.*, u.email, u.role, u.institution_id, u.display_name, u.status AS user_status,
           u.account_status AS user_account_status, u.department
    FROM scholars_sessions s
    JOIN scholars_users u ON s.user_id = u.id
    WHERE s.id = ?
  `)
    .get(id);
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    deleteSession(id);
    return null;
  }
  return row;
}

function deleteSession(id) {
  const db = getDb();
  db.prepare('DELETE FROM scholars_sessions WHERE id = ?').run(id);
}

/**
 * Revoke every session belonging to a user, optionally keeping one session
 * alive (used when a user changes their own password and stays signed in).
 * Returns the number of sessions removed.
 */
function deleteSessionsForUser(userId, { exceptId = null } = {}) {
  const db = getDb();
  if (exceptId) {
    return db
      .prepare('DELETE FROM scholars_sessions WHERE user_id = ? AND id != ?')
      .run(userId, exceptId);
  }
  return db.prepare('DELETE FROM scholars_sessions WHERE user_id = ?').run(userId);
}

// ─────────────────────────────────────────────────────────────
// Temples
// ─────────────────────────────────────────────────────────────

function createTemple({ entryId, name, pantheon, tier, manifestVersion }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_temples (entry_id, name, pantheon, tier, manifest_version)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(entryId, name, pantheon, tier, manifestVersion);
}

function getTempleByEntryId(entryId) {
  const db = getDb();
  return db.prepare('SELECT * FROM scholars_temples WHERE entry_id = ?').get(entryId) || null;
}

function getTempleById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM scholars_temples WHERE id = ?').get(id) || null;
}

function countTemples() {
  const db = getDb();
  return db.prepare('SELECT COUNT(*) AS count FROM scholars_temples').get().count;
}

function listTemples({ pantheon } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM scholars_temples';
  const params = [];
  if (pantheon) {
    sql += ' WHERE pantheon = ?';
    params.push(pantheon);
  }
  sql += ' ORDER BY name';
  return db.prepare(sql).all(...params);
}

function incrementSnapshotVersion(entryId) {
  const db = getDb();
  db.prepare(`
    UPDATE scholars_temples
    SET snapshot_version = snapshot_version + 1, updated_at = CURRENT_TIMESTAMP
    WHERE entry_id = ?
  `).run(entryId);
}

function setTempleFrozen(entryId, isFrozen) {
  const db = getDb();
  db.prepare('UPDATE scholars_temples SET is_frozen = ? WHERE entry_id = ?').run(
    isFrozen ? 1 : 0,
    entryId
  );
}

// ─────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────

function countSections({ status } = {}) {
  const db = getDb();
  let sql = 'SELECT COUNT(*) AS count FROM scholars_sections';
  const params = [];
  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }
  return db.prepare(sql).get(...params).count;
}

function createSection({
  templeId,
  key,
  label,
  body = '',
  sources = [],
  media = [],
  editorNotes = '',
  status = 'empty',
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_sections (temple_id, key, label, body, sources, media, editor_notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(templeId, key, label, body, json(sources), json(media), editorNotes, status);
}

function getSectionById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM scholars_sections WHERE id = ?').get(id);
  if (!row) return null;
  row.sources = parseJson(row.sources, []);
  row.media = parseJson(row.media, []);
  return row;
}

function getSectionByTempleAndKey(templeId, key) {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM scholars_sections WHERE temple_id = ? AND key = ?')
    .get(templeId, key);
  if (!row) return null;
  row.sources = parseJson(row.sources, []);
  row.media = parseJson(row.media, []);
  return row;
}

function listSectionsByTemple(templeId) {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM scholars_sections WHERE temple_id = ? ORDER BY id')
    .all(templeId);
  return rows.map((r) => ({
    ...r,
    sources: parseJson(r.sources, []),
    media: parseJson(r.media, []),
  }));
}

function searchSections({ q, pantheon, limit = 20, offset = 0 } = {}) {
  const db = getDb();
  const term = `%${q}%`;
  const params = [term, term];
  let where = '(s.label LIKE ? OR s.body LIKE ?)';
  if (pantheon) {
    where += ' AND t.pantheon = ?';
    params.push(pantheon);
  }

  const countRow = db
    .prepare(`
    SELECT COUNT(*) AS c
    FROM scholars_sections s
    JOIN scholars_temples t ON s.temple_id = t.id
    WHERE ${where}
  `)
    .get(...params);

  const rows = db
    .prepare(`
    SELECT s.*, t.id AS temple_id, t.entry_id, t.name, t.pantheon, t.tier, t.is_frozen
    FROM scholars_sections s
    JOIN scholars_temples t ON s.temple_id = t.id
    WHERE ${where}
    ORDER BY t.name COLLATE NOCASE, s.label COLLATE NOCASE
    LIMIT ? OFFSET ?
  `)
    .all(...params, limit, offset);

  return {
    total: countRow.c,
    rows: rows.map((r) => ({
      ...r,
      sources: parseJson(r.sources, []),
      media: parseJson(r.media, []),
    })),
  };
}

function updateSection({ id, body, sources, media, editorNotes, status, updatedBy }) {
  const db = getDb();
  const current = getSectionById(id);
  if (!current) throw new Error(`Section ${id} not found`);
  const stmt = db.prepare(`
    UPDATE scholars_sections
    SET body = ?, sources = ?, media = ?, editor_notes = ?, status = ?, version = version + 1, updated_at = CURRENT_TIMESTAMP, updated_by = ?
    WHERE id = ?
  `);
  return stmt.run(
    body ?? current.body,
    json(sources ?? current.sources),
    json(media ?? current.media),
    editorNotes ?? current.editor_notes,
    status ?? current.status,
    updatedBy ?? current.updated_by,
    id
  );
}

// ─────────────────────────────────────────────────────────────
// Edits
// ─────────────────────────────────────────────────────────────

function countPendingEdits() {
  const db = getDb();
  return db.prepare("SELECT COUNT(*) AS count FROM scholars_edits WHERE status = 'pending'").get()
    .count;
}

function createEdit({
  sectionId,
  userId,
  proposedBody,
  proposedSources = [],
  proposedMedia = [],
  editorNotes = '',
  qualityReason = '',
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_edits (section_id, user_id, proposed_body, proposed_sources, proposed_media, editor_notes, quality_reason)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    sectionId,
    userId,
    proposedBody,
    json(proposedSources),
    json(proposedMedia),
    editorNotes,
    qualityReason
  );
}

function getEditById(id) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM scholars_edits WHERE id = ?').get(id);
  if (!row) return null;
  row.proposed_sources = parseJson(row.proposed_sources, []);
  row.proposed_media = parseJson(row.proposed_media, []);
  return row;
}

function listPendingEdits({ sectionId, userId, institutionId, limit = 100, offset = 0 } = {}) {
  const db = getDb();
  const conditions = ['e.status = ?'];
  const params = ['pending'];
  if (sectionId) {
    conditions.push('e.section_id = ?');
    params.push(sectionId);
  }
  if (userId) {
    conditions.push('e.user_id = ?');
    params.push(userId);
  }
  if (institutionId) {
    conditions.push('u.institution_id = ?');
    params.push(institutionId);
  }
  const where = conditions.join(' AND ');
  const rows = db
    .prepare(`
    SELECT e.*, u.email, u.display_name, u.institution_id, s.key AS section_key, s.label AS section_label, t.entry_id
    FROM scholars_edits e
    JOIN scholars_users u ON e.user_id = u.id
    JOIN scholars_sections s ON e.section_id = s.id
    JOIN scholars_temples t ON s.temple_id = t.id
    WHERE ${where}
    ORDER BY e.created_at ASC
    LIMIT ? OFFSET ?
  `)
    .all(...params, limit, offset);
  return rows.map((r) => ({
    ...r,
    proposed_sources: parseJson(r.proposed_sources, []),
    proposed_media: parseJson(r.proposed_media, []),
  }));
}

function updateEditStatus(id, status, comment) {
  const db = getDb();
  db.prepare(
    'UPDATE scholars_edits SET status = ?, comment = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(status, comment, id);
}

/**
 * List every edit a user has authored, newest first — powers the student
 * dashboard ("My Submissions"). Includes section/temple context so the UI can
 * link each submission back to its temple.
 */
function listEditsForUser(userId, { limit = 200, offset = 0 } = {}) {
  const db = getDb();
  const rows = db
    .prepare(`
    SELECT e.*, s.key AS section_key, s.label AS section_label, t.entry_id, t.name AS temple_name
    FROM scholars_edits e
    JOIN scholars_sections s ON e.section_id = s.id
    JOIN scholars_temples t ON s.temple_id = t.id
    WHERE e.user_id = ?
    ORDER BY e.created_at DESC
    LIMIT ? OFFSET ?
  `)
    .all(userId, limit, offset);
  return rows.map((r) => ({
    ...r,
    proposed_sources: parseJson(r.proposed_sources, []),
    proposed_media: parseJson(r.proposed_media, []),
  }));
}

// ─────────────────────────────────────────────────────────────
// Reviews
// ─────────────────────────────────────────────────────────────

function createReview({ editId, reviewerId, decision, comment }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_reviews (edit_id, reviewer_id, decision, comment)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(editId, reviewerId, decision, comment);
}

function getReviewsForEdit(editId) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM scholars_reviews WHERE edit_id = ? ORDER BY reviewed_at')
    .all(editId);
}

// ─────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────

function createNotification({ userId, type, title, body, data = {} }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_notifications (user_id, type, title, body, data)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(userId, type, title, body, json(data));
}

function listNotificationsForUser(userId, { limit = 50, offset = 0, unreadOnly = false } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM scholars_notifications WHERE user_id = ?';
  const params = [userId];
  if (unreadOnly) {
    sql += ' AND is_read = 0';
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  const rows = db.prepare(sql).all(...params, limit, offset);
  return rows.map((r) => ({ ...r, data: parseJson(r.data, {}) }));
}

function markNotificationRead(id, userId) {
  const db = getDb();
  const result = db
    .prepare('UPDATE scholars_notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return result.changes > 0;
}

function dismissNotification(id, userId) {
  const db = getDb();
  const result = db
    .prepare('DELETE FROM scholars_notifications WHERE id = ? AND user_id = ?')
    .run(id, userId);
  return result.changes > 0;
}

function listReviewersForInstitution(institutionId) {
  const db = getDb();
  return db
    .prepare(`
      SELECT id, email, display_name, role, department
      FROM scholars_users
      WHERE institution_id = ?
        AND role IN ('reviewer', 'dept_admin', 'inst_admin', 'curator')
        AND status = 'active'
        AND account_status = 'active'
    `)
    .all(institutionId);
}

// ─────────────────────────────────────────────────────────────
// History
// ─────────────────────────────────────────────────────────────

function createHistoryRecord({ sectionId, editId, body, sources, media, attribution, diff }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_history (section_id, edit_id, body, sources, media, attribution, diff)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(sectionId, editId, body, json(sources), json(media), json(attribution), diff);
}

// NOTE: this feeds the PUBLIC, unauthenticated GET /sections/:id/history.
// Public attribution is a display name; the contributor's email address is
// not attribution, it is PII, and it must never appear in this projection.
function getHistoryForSection(sectionId, { limit = 100, offset = 0 } = {}) {
  const db = getDb();
  const rows = db
    .prepare(`
    SELECT h.*, u.display_name
    FROM scholars_history h
    LEFT JOIN scholars_edits e ON h.edit_id = e.id
    LEFT JOIN scholars_users u ON e.user_id = u.id
    WHERE h.section_id = ?
    ORDER BY h.applied_at DESC
    LIMIT ? OFFSET ?
  `)
    .all(sectionId, limit, offset);
  return rows.map((r) => ({
    ...r,
    sources: parseJson(r.sources, []),
    media: parseJson(r.media, []),
    attribution: parseJson(r.attribution, {}),
  }));
}

// ─────────────────────────────────────────────────────────────
// Media
// ─────────────────────────────────────────────────────────────

function createMedia({
  filename,
  url,
  mimeType,
  sizeBytes,
  caption = '',
  license = '',
  source = '',
  creator = '',
  uploadedBy,
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_media (filename, url, mime_type, size_bytes, caption, license, source, creator, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    filename,
    url,
    mimeType,
    sizeBytes,
    caption,
    license,
    source,
    creator,
    uploadedBy
  );
}

function getMediaById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM scholars_media WHERE id = ?').get(id) || null;
}

function listMedia({ status, uploadedBy, limit = 100, offset = 0 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('m.status = ?');
    params.push(status);
  }
  if (uploadedBy !== undefined) {
    conditions.push('m.uploaded_by = ?');
    params.push(uploadedBy);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`
      SELECT m.*, u.email AS uploader_email, u.display_name AS uploader_name
      FROM scholars_media m
      LEFT JOIN scholars_users u ON m.uploaded_by = u.id
      ${where}
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, offset);
  return rows;
}

function countMedia({ status, uploadedBy } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (uploadedBy !== undefined) {
    conditions.push('uploaded_by = ?');
    params.push(uploadedBy);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`SELECT COUNT(*) AS count FROM scholars_media ${where}`).get(...params).count;
}

function updateMediaStatus(id, status) {
  const db = getDb();
  return db.prepare('UPDATE scholars_media SET status = ? WHERE id = ?').run(status, id);
}

// ─────────────────────────────────────────────────────────────
// Creative Marketplace
// ─────────────────────────────────────────────────────────────

function normalizeCreativeAsset(row) {
  if (!row) return null;
  return {
    ...row,
    metadata: parseJson(row.metadata, {}),
    tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
  };
}

function normalizeCreativePurchase(row) {
  if (!row) return null;
  return {
    ...row,
    metadata: parseJson(row.metadata, {}),
  };
}

function normalizeCreativePayout(row) {
  if (!row) return null;
  return {
    ...row,
    metadata: parseJson(row.metadata, {}),
  };
}

function createCreativeAsset({
  creatorId,
  institutionId,
  title,
  description,
  department,
  inspirationEntryId,
  licenseType,
  priceCents,
  previewPath,
  originalPath,
  thumbnailPath,
  metadata = {},
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO creative_assets
      (creator_id, institution_id, title, description, department, inspiration_entry_id,
       license_type, price_cents, preview_path, original_path, thumbnail_path, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    creatorId,
    institutionId,
    title,
    description,
    department,
    inspirationEntryId || null,
    licenseType || 'single_use',
    priceCents || 0,
    previewPath || null,
    originalPath || null,
    thumbnailPath || null,
    json(metadata)
  );
}

function getCreativeAssetById(id) {
  const db = getDb();
  return normalizeCreativeAsset(db.prepare('SELECT * FROM creative_assets WHERE id = ?').get(id));
}

function getCreativeAssetWithCreator(id) {
  const db = getDb();
  return normalizeCreativeAsset(
    db
      .prepare(`
        SELECT a.*, u.display_name AS creator_name, u.email AS creator_email,
               i.name AS institution_name
        FROM creative_assets a
        JOIN scholars_users u ON a.creator_id = u.id
        LEFT JOIN scholars_institutions i ON a.institution_id = i.id
        WHERE a.id = ?
      `)
      .get(id)
  );
}

function updateCreativeAsset(id, fields) {
  const db = getDb();
  const allowed = [
    'title',
    'description',
    'department',
    'inspiration_entry_id',
    'license_type',
    'price_cents',
    'preview_path',
    'original_path',
    'thumbnail_path',
    'metadata',
  ];
  const setFields = [];
  const params = [];
  for (const key of allowed) {
    if (fields[key] !== undefined) {
      setFields.push(`${key} = ?`);
      params.push(key === 'metadata' ? json(fields[key]) : fields[key]);
    }
  }
  if (setFields.length === 0) return { changes: 0 };
  setFields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  return db
    .prepare(`UPDATE creative_assets SET ${setFields.join(', ')} WHERE id = ?`)
    .run(...params);
}

function updateCreativeAssetStatus(id, status) {
  const db = getDb();
  return db
    .prepare('UPDATE creative_assets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(status, id);
}

function deleteCreativeAsset(id) {
  const db = getDb();
  return db.prepare('DELETE FROM creative_assets WHERE id = ?').run(id);
}

function buildAssetWhereClause(filters) {
  const conditions = [];
  const params = [];
  if (filters.status) {
    conditions.push('a.status = ?');
    params.push(filters.status);
  }
  if (filters.creatorId !== undefined) {
    conditions.push('a.creator_id = ?');
    params.push(filters.creatorId);
  }
  if (filters.institutionId !== undefined) {
    conditions.push('a.institution_id = ?');
    params.push(filters.institutionId);
  }
  if (filters.department) {
    conditions.push('a.department = ?');
    params.push(filters.department);
  }
  if (filters.inspirationEntryId) {
    conditions.push('a.inspiration_entry_id = ?');
    params.push(filters.inspirationEntryId);
  }
  if (filters.tag) {
    conditions.push(
      'EXISTS (SELECT 1 FROM creative_asset_tags t WHERE t.asset_id = a.id AND t.tag = ?)'
    );
    params.push(filters.tag);
  }
  if (filters.q) {
    conditions.push('(a.title LIKE ? OR a.description LIKE ?)');
    params.push(`%${filters.q}%`, `%${filters.q}%`);
  }
  return { where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function listCreativeAssets(filters = {}, { limit = 20, offset = 0 } = {}) {
  const db = getDb();
  const { where, params } = buildAssetWhereClause(filters);
  const rows = db
    .prepare(`
      SELECT a.*, u.display_name AS creator_name, i.name AS institution_name,
             GROUP_CONCAT(t.tag, ',') AS tags
      FROM creative_assets a
      JOIN scholars_users u ON a.creator_id = u.id
      LEFT JOIN scholars_institutions i ON a.institution_id = i.id
      LEFT JOIN creative_asset_tags t ON t.asset_id = a.id
      ${where}
      GROUP BY a.id
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, offset);
  return rows.map((r) => normalizeCreativeAsset(r));
}

function countCreativeAssets(filters = {}) {
  const db = getDb();
  const { where, params } = buildAssetWhereClause(filters);
  return db
    .prepare(`
      SELECT COUNT(*) AS count FROM creative_assets a
      ${where}
    `)
    .get(...params).count;
}

function setCreativeAssetTags(assetId, tags) {
  const db = getDb();
  return db.transaction(() => {
    db.prepare('DELETE FROM creative_asset_tags WHERE asset_id = ?').run(assetId);
    const stmt = db.prepare('INSERT INTO creative_asset_tags (asset_id, tag) VALUES (?, ?)');
    for (const tag of tags) {
      stmt.run(assetId, String(tag).trim().toLowerCase());
    }
  })();
}

function listCreativeAssetTags(assetId) {
  const db = getDb();
  return db
    .prepare('SELECT tag FROM creative_asset_tags WHERE asset_id = ? ORDER BY tag')
    .all(assetId)
    .map((r) => r.tag);
}

function listCreativeReviewsByCreator(creatorId) {
  const db = getDb();
  return db
    .prepare(`
      SELECT r.id, r.asset_id, r.decision, r.comment, r.reviewed_at,
             a.title AS asset_title, u.display_name AS reviewer_name
      FROM creative_reviews r
      JOIN creative_assets a ON r.asset_id = a.id
      JOIN scholars_users u ON r.reviewer_id = u.id
      WHERE a.creator_id = ?
      ORDER BY r.reviewed_at DESC
    `)
    .all(creatorId);
}

function createCreativePurchase({
  assetId,
  licenseeBookingId,
  licenseeEmail,
  licenseType,
  priceCents,
  platformFeeCents,
  creatorPayoutCents,
  universityCreditCents,
  stripeSessionId,
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO creative_purchases
      (asset_id, licensee_booking_id, licensee_email, license_type, price_cents,
       platform_fee_cents, creator_payout_cents, university_credit_cents, stripe_session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(
    assetId || null,
    licenseeBookingId || null,
    licenseeEmail || null,
    licenseType || 'single_use',
    priceCents || 0,
    platformFeeCents || 0,
    creatorPayoutCents || 0,
    universityCreditCents || 0,
    stripeSessionId || null
  );
}

function getCreativePurchaseById(id) {
  const db = getDb();
  return normalizeCreativePurchase(
    db.prepare('SELECT * FROM creative_purchases WHERE id = ?').get(id)
  );
}

function getCreativePurchaseByStripeSessionId(stripeSessionId) {
  const db = getDb();
  return normalizeCreativePurchase(
    db.prepare('SELECT * FROM creative_purchases WHERE stripe_session_id = ?').get(stripeSessionId)
  );
}

function updateCreativePurchaseStatus(id, { status, stripeSessionId }) {
  const db = getDb();
  const fields = [];
  const params = [];
  if (status !== undefined) {
    fields.push('status = ?');
    params.push(status);
  }
  if (stripeSessionId !== undefined) {
    fields.push('stripe_session_id = ?');
    params.push(stripeSessionId);
  }
  if (fields.length === 0) return { changes: 0 };
  fields.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id);
  return db
    .prepare(`UPDATE creative_purchases SET ${fields.join(', ')} WHERE id = ?`)
    .run(...params);
}

function listCreativePurchasesByAsset(assetId) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM creative_purchases WHERE asset_id = ? ORDER BY created_at DESC')
    .all(assetId)
    .map((r) => normalizeCreativePurchase(r));
}

function listCreativePurchasesByLicensee(licenseeEmail) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM creative_purchases WHERE licensee_email = ? ORDER BY created_at DESC')
    .all(licenseeEmail)
    .map((r) => normalizeCreativePurchase(r));
}

function listCreativePurchasesByCreator(creatorId) {
  const db = getDb();
  return db
    .prepare(`
      SELECT p.* FROM creative_purchases p
      JOIN creative_assets a ON p.asset_id = a.id
      WHERE a.creator_id = ?
      ORDER BY p.created_at DESC
    `)
    .all(creatorId)
    .map((r) => normalizeCreativePurchase(r));
}

function createCreativeReview({ assetId, reviewerId, decision, comment }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO creative_reviews (asset_id, reviewer_id, decision, comment)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(assetId, reviewerId, decision, comment || null);
}

function listCreativeReviews(assetId) {
  const db = getDb();
  return db
    .prepare(`
      SELECT r.*, u.display_name AS reviewer_name
      FROM creative_reviews r
      JOIN scholars_users u ON r.reviewer_id = u.id
      WHERE r.asset_id = ?
      ORDER BY r.reviewed_at DESC
    `)
    .all(assetId);
}

function createCreativePayout({ assetId, creatorId, purchaseId, amountCents, metadata = {} }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO creative_payouts (asset_id, creator_id, purchase_id, amount_cents, metadata)
    VALUES (?, ?, ?, ?, ?)
  `);
  return stmt.run(assetId, creatorId, purchaseId || null, amountCents, json(metadata));
}

function listCreativePayouts(creatorId, { status } = {}) {
  const db = getDb();
  let sql = 'SELECT * FROM creative_payouts WHERE creator_id = ?';
  const params = [creatorId];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC';
  return db
    .prepare(sql)
    .all(...params)
    .map((r) => normalizeCreativePayout(r));
}

function getCreativeDashboardForCreator(creatorId) {
  getDb();
  const assets = listCreativeAssets({ creatorId }, { limit: 1000, offset: 0 });
  const purchases = listCreativePurchasesByCreator(creatorId);
  const payouts = listCreativePayouts(creatorId);
  const totalEarningsCents = payouts.reduce((sum, p) => sum + p.amount_cents, 0);
  const pendingEarningsCents = payouts
    .filter((p) => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount_cents, 0);
  return { assets, purchases, payouts, totalEarningsCents, pendingEarningsCents };
}

function getCreativeDashboardForInstitution(institutionId) {
  const db = getDb();
  const assets = listCreativeAssets({ institutionId }, { limit: 1000, offset: 0 });
  const totalEarningsCents = db
    .prepare(`
      SELECT COALESCE(SUM(p.creator_payout_cents), 0) AS total
      FROM creative_purchases p
      JOIN creative_assets a ON p.asset_id = a.id
      WHERE a.institution_id = ? AND p.status = 'paid'
    `)
    .get(institutionId).total;
  const pendingReviewCount = assets.filter((a) => a.status === 'pending_review').length;
  const approvedCount = assets.filter((a) => a.status === 'approved').length;
  return { assets, totalEarningsCents, pendingReviewCount, approvedCount };
}

function getActiveAllAccessPass(licenseeEmail) {
  const db = getDb();
  return normalizeCreativePurchase(
    db
      .prepare(`
        SELECT * FROM creative_purchases
        WHERE licensee_email = ?
          AND license_type = 'all_access_pass'
          AND status = 'paid'
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .get(licenseeEmail.toLowerCase().trim())
  );
}

function markCreativePayoutPaid(id) {
  const db = getDb();
  return db
    .prepare(
      `UPDATE creative_payouts SET status = 'paid', paid_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .run(id);
}

function listCreativePayoutsForInstitution(institutionId, { status } = {}) {
  const db = getDb();
  let sql = `
    SELECT p.*, u.display_name AS creator_name, u.email AS creator_email, a.title AS asset_title
    FROM creative_payouts p
    JOIN scholars_users u ON p.creator_id = u.id
    LEFT JOIN creative_assets a ON p.asset_id = a.id
    WHERE a.institution_id = ?
  `;
  const params = [institutionId];
  if (status) {
    sql += ' AND p.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY p.created_at DESC';
  return db
    .prepare(sql)
    .all(...params)
    .map((r) => normalizeCreativePayout(r));
}

function recordCreativeAnalyticsEvent({ assetId, eventType, licenseeEmail, metadata = {} }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO creative_analytics_events (asset_id, event_type, licensee_email, metadata)
    VALUES (?, ?, ?, ?)
  `);
  return stmt.run(assetId || null, eventType, licenseeEmail || null, json(metadata));
}

function getCreativeAnalyticsSummary(assetId, { days = 30 } = {}) {
  const db = getDb();
  const views = db
    .prepare(`
      SELECT COUNT(*) AS count FROM creative_analytics_events
      WHERE asset_id = ? AND event_type = 'view' AND created_at >= DATE('now', ?)
    `)
    .get(assetId, `-${days} days`).count;
  const purchases = db
    .prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(price_cents), 0) AS revenue_cents
      FROM creative_purchases
      WHERE asset_id = ? AND status = 'paid' AND created_at >= DATE('now', ?)
    `)
    .get(assetId, `-${days} days`);
  const dailyViews = db
    .prepare(`
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM creative_analytics_events
      WHERE asset_id = ? AND event_type = 'view' AND created_at >= DATE('now', ?)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `)
    .all(assetId, `-${days} days`);
  return {
    views,
    purchases: purchases.count,
    revenueCents: purchases.revenue_cents,
    dailyViews,
  };
}

function getCreatorAnalyticsSummary(creatorId, { days = 30 } = {}) {
  const db = getDb();
  const views = db
    .prepare(`
      SELECT COUNT(*) AS count FROM creative_analytics_events e
      JOIN creative_assets a ON e.asset_id = a.id
      WHERE a.creator_id = ? AND e.event_type = 'view' AND e.created_at >= DATE('now', ?)
    `)
    .get(creatorId, `-${days} days`).count;
  const purchases = db
    .prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(p.price_cents), 0) AS revenue_cents
      FROM creative_purchases p
      JOIN creative_assets a ON p.asset_id = a.id
      WHERE a.creator_id = ? AND p.status = 'paid' AND p.created_at >= DATE('now', ?)
    `)
    .get(creatorId, `-${days} days`);
  const payouts = db
    .prepare(`
      SELECT COALESCE(SUM(amount_cents), 0) AS total_cents
      FROM creative_payouts
      WHERE creator_id = ? AND status = 'paid'
    `)
    .get(creatorId).total_cents;
  return {
    views,
    purchases: purchases.count,
    revenueCents: purchases.revenue_cents,
    payoutsCents: payouts,
  };
}

function getInstitutionCreativeAnalytics(institutionId, { days = 30 } = {}) {
  const db = getDb();
  const views = db
    .prepare(`
      SELECT COUNT(*) AS count FROM creative_analytics_events e
      JOIN creative_assets a ON e.asset_id = a.id
      WHERE a.institution_id = ? AND e.event_type = 'view' AND e.created_at >= DATE('now', ?)
    `)
    .get(institutionId, `-${days} days`).count;
  const purchases = db
    .prepare(`
      SELECT COUNT(*) AS count, COALESCE(SUM(p.price_cents), 0) AS revenue_cents
      FROM creative_purchases p
      JOIN creative_assets a ON p.asset_id = a.id
      WHERE a.institution_id = ? AND p.status = 'paid' AND p.created_at >= DATE('now', ?)
    `)
    .get(institutionId, `-${days} days`);
  const topAssets = db
    .prepare(`
      SELECT a.id, a.title, COUNT(e.id) AS views
      FROM creative_assets a
      LEFT JOIN creative_analytics_events e ON a.id = e.asset_id AND e.event_type = 'view'
        AND e.created_at >= DATE('now', ?)
      WHERE a.institution_id = ?
      GROUP BY a.id
      ORDER BY views DESC
      LIMIT 10
    `)
    .all(`-${days} days`, institutionId);
  return {
    views,
    purchases: purchases.count,
    revenueCents: purchases.revenue_cents,
    topAssets,
  };
}

function getPublicCreatorProfile(creatorId) {
  const db = getDb();
  const user = db
    .prepare(`
      SELECT u.id, u.display_name, u.email, u.department, i.name AS institution_name
      FROM scholars_users u
      LEFT JOIN scholars_institutions i ON u.institution_id = i.id
      WHERE u.id = ? AND u.role = 'student' AND u.account_status = 'active'
    `)
    .get(creatorId);
  if (!user) return null;
  const assets = listCreativeAssets({ creatorId, status: 'approved' }, { limit: 100, offset: 0 });
  return { ...user, assets };
}

// ─────────────────────────────────────────────────────────────
// Audit log
// ─────────────────────────────────────────────────────────────

function audit({ actorId, action, resourceType, resourceId, details = {}, ipHash }) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO scholars_audit_log (actor_id, action, resource_type, resource_id, details, ip_hash)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  return stmt.run(actorId, action, resourceType, String(resourceId), json(details), ipHash);
}

function listAuditLog({ action, resourceType, limit = 100, offset = 0 } = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];
  if (action) {
    conditions.push('action = ?');
    params.push(action);
  }
  if (resourceType) {
    conditions.push('resource_type = ?');
    params.push(resourceType);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(`
      SELECT * FROM scholars_audit_log
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `)
    .all(...params, limit, offset);
  return rows.map((r) => ({ ...r, details: parseJson(r.details, {}) }));
}

// ─────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────

function countEditsByDay(days = 30) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM scholars_edits
      WHERE created_at >= DATE('now', ?)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `
    )
    .all(`-${days} days`);
}

function countApprovalsByDay(days = 30) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT DATE(reviewed_at) AS day, COUNT(*) AS count
      FROM scholars_reviews
      WHERE decision = 'approved' AND reviewed_at >= DATE('now', ?)
      GROUP BY DATE(reviewed_at)
      ORDER BY day ASC
    `
    )
    .all(`-${days} days`);
}

function topContributingInstitutions(limit = 10) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT i.id, i.name, COUNT(e.id) AS edit_count
      FROM scholars_edits e
      JOIN scholars_users u ON e.user_id = u.id
      LEFT JOIN scholars_institutions i ON u.institution_id = i.id
      GROUP BY i.id
      ORDER BY edit_count DESC
      LIMIT ?
    `
    )
    .all(limit);
}

function topEditedTemples(limit = 10) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT t.id, t.entry_id, t.name, COUNT(e.id) AS edit_count
      FROM scholars_edits e
      JOIN scholars_sections s ON e.section_id = s.id
      JOIN scholars_temples t ON s.temple_id = t.id
      GROUP BY t.id
      ORDER BY edit_count DESC
      LIMIT ?
    `
    )
    .all(limit);
}

function countViewsByDay(days = 30) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT DATE(created_at) AS day, COUNT(*) AS count
      FROM scholars_audit_log
      WHERE action = 'temple_view' AND created_at >= DATE('now', ?)
      GROUP BY DATE(created_at)
      ORDER BY day ASC
    `
    )
    .all(`-${days} days`);
}

// ─── Institution-scoped analytics ───

function countEditsByDayForInstitution(institutionId, days = 30) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT DATE(e.created_at) AS day, COUNT(*) AS count
      FROM scholars_edits e
      JOIN scholars_users u ON e.user_id = u.id
      WHERE u.institution_id = ? AND e.created_at >= DATE('now', ?)
      GROUP BY DATE(e.created_at)
      ORDER BY day ASC
    `
    )
    .all(institutionId, `-${days} days`);
}

function countApprovalsByDayForInstitution(institutionId, days = 30) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT DATE(r.reviewed_at) AS day, COUNT(*) AS count
      FROM scholars_reviews r
      JOIN scholars_edits e ON r.edit_id = e.id
      JOIN scholars_users u ON e.user_id = u.id
      WHERE u.institution_id = ? AND r.decision = 'approved' AND r.reviewed_at >= DATE('now', ?)
      GROUP BY DATE(r.reviewed_at)
      ORDER BY day ASC
    `
    )
    .all(institutionId, `-${days} days`);
}

function topEditedTemplesForInstitution(institutionId, limit = 10) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT t.id, t.entry_id, t.name, COUNT(e.id) AS edit_count
      FROM scholars_edits e
      JOIN scholars_users u ON e.user_id = u.id
      JOIN scholars_sections s ON e.section_id = s.id
      JOIN scholars_temples t ON s.temple_id = t.id
      WHERE u.institution_id = ?
      GROUP BY t.id
      ORDER BY edit_count DESC
      LIMIT ?
    `
    )
    .all(institutionId, limit);
}

// ─────────────────────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────────────────────

function withTransaction(fn) {
  const db = getDb();
  return db.transaction(fn)();
}

module.exports = {
  json,
  parseJson,
  // Institutions
  createInstitution,
  createInstitutionWithAdmin,
  getInstitutionById,
  getInstitutionBySlug,
  getInstitutionByDomain,
  listInstitutions,
  countInstitutions,
  updateInstitutionSponsorship,
  updateInstitutionAllowlist,
  expireLapsedSponsorships,
  // Sponsorship applications
  createSponsorshipApplication,
  getSponsorshipApplicationById,
  listSponsorshipApplications,
  countSponsorshipApplications,
  updateSponsorshipApplicationStatus,
  isDepartmentAllowed,
  // Users
  createUser,
  createUserWithPassword,
  updateUserPassword,
  updateUserStatus,
  updateUserRole,
  updateUserProfile,
  getUserById,
  getUserByEmail,
  getUserWithInstitutionByEmail,
  updateUserLastSeen,
  listUsersByInstitution,
  listStudentsByInstitution,
  countUsersByInstitution,
  listUsers,
  countUsers,
  incrementLoginAttempts,
  resetLoginAttempts,
  isUserLocked,
  // Sessions
  createSession,
  getSessionById,
  getSessionWithUser,
  deleteSession,
  deleteSessionsForUser,
  // Temples
  createTemple,
  getTempleByEntryId,
  getTempleById,
  listTemples,
  countTemples,
  incrementSnapshotVersion,
  setTempleFrozen,
  // Sections
  createSection,
  getSectionById,
  getSectionByTempleAndKey,
  listSectionsByTemple,
  searchSections,
  updateSection,
  countSections,
  // Edits
  createEdit,
  getEditById,
  listPendingEdits,
  listEditsForUser,
  updateEditStatus,
  countPendingEdits,
  countEditsByInstitution,
  countAttributedSectionsByInstitution,
  // Reviews
  createReview,
  getReviewsForEdit,
  // Notifications
  createNotification,
  listNotificationsForUser,
  markNotificationRead,
  dismissNotification,
  listReviewersForInstitution,
  // History
  createHistoryRecord,
  getHistoryForSection,
  // Media
  createMedia,
  getMediaById,
  listMedia,
  countMedia,
  updateMediaStatus,
  // Creative Marketplace
  createCreativeAsset,
  getCreativeAssetById,
  getCreativeAssetWithCreator,
  updateCreativeAsset,
  updateCreativeAssetStatus,
  deleteCreativeAsset,
  listCreativeAssets,
  countCreativeAssets,
  setCreativeAssetTags,
  listCreativeAssetTags,
  createCreativePurchase,
  getCreativePurchaseById,
  getCreativePurchaseByStripeSessionId,
  updateCreativePurchaseStatus,
  listCreativePurchasesByAsset,
  listCreativePurchasesByLicensee,
  listCreativePurchasesByCreator,
  createCreativeReview,
  listCreativeReviews,
  listCreativeReviewsByCreator,
  createCreativePayout,
  listCreativePayouts,
  markCreativePayoutPaid,
  listCreativePayoutsForInstitution,
  getActiveAllAccessPass,
  recordCreativeAnalyticsEvent,
  getCreativeAnalyticsSummary,
  getCreatorAnalyticsSummary,
  getInstitutionCreativeAnalytics,
  getPublicCreatorProfile,
  getCreativeDashboardForCreator,
  getCreativeDashboardForInstitution,
  // Audit
  audit,
  listAuditLog,
  // Analytics
  countEditsByDay,
  countEditsByDayForInstitution,
  countApprovalsByDayForInstitution,
  topEditedTemplesForInstitution,
  countApprovalsByDay,
  topContributingInstitutions,
  topEditedTemples,
  countViewsByDay,
  // Transactions
  withTransaction,
};
