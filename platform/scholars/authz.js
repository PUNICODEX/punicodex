/**
 * PuniCodex — Scholarly Edition Authorization (RBAC)
 *
 * B2B sponsorship model:
 * - Students submit edits only for temples/sections tied to their institution's
 *   active sponsorship and allowed departments.
 * - Reviewers and curators review edits under the same sponsorship/department
 *   constraints; curators may review across institutions.
 * - Institution admins manage only users within their own institution.
 */

const { isDepartmentAllowed, getInstitutionById } = require('../db/scholars');

const ROLES = ['student', 'reviewer', 'dept_admin', 'inst_admin', 'curator'];

const ROLE_RANK = {
  student: 0,
  reviewer: 1,
  dept_admin: 2,
  inst_admin: 3,
  curator: 4,
};

function hasRole(user, minRole) {
  if (!user?.role) return false;
  return ROLE_RANK[user.role] >= ROLE_RANK[minRole];
}

function isCurator(user) {
  return user?.role === 'curator';
}

function isReviewerOrHigher(user) {
  return hasRole(user, 'reviewer');
}

function isInstitutionAdmin(user) {
  return hasRole(user, 'inst_admin');
}

function isDepartmentAdmin(user) {
  return hasRole(user, 'dept_admin');
}

function sameInstitution(user, otherInstitutionId) {
  if (!user?.institutionId) return false;
  return user.institutionId === otherInstitutionId;
}

function isActiveUser(user) {
  if (user?.status !== 'active') return false;
  // accountStatus may be absent on legacy session objects; default to active.
  if (user.accountStatus && user.accountStatus !== 'active') return false;
  return true;
}

function isActiveSponsorship(institution) {
  if (institution?.sponsorship_status !== 'active') return false;
  // Sponsorship expiry: NULL means no expiry; a past timestamp lapses the
  // sponsorship even if the status column has not been flipped yet. Enforced
  // at read time so access ends the moment the term does.
  const expiresAt = parseSqliteUtc(institution.sponsorship_expires_at);
  if (expiresAt !== null && expiresAt <= Date.now()) return false;
  return true;
}

/**
 * Parse a SQLite datetime ('YYYY-MM-DD HH:MM:SS', treated as UTC) or an ISO
 * 8601 string into epoch milliseconds. Returns null for empty/unparseable
 * values.
 */
function parseSqliteUtc(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
  const t = Date.parse(withZone);
  return Number.isNaN(t) ? null : t;
}

function isFrozenTarget(target) {
  return target && (target.is_frozen === 1 || target.is_frozen === true);
}

/**
 * Check whether a user can submit an edit for a temple or section.
 *
 * Requirements:
 * - User account is active (status + account_status).
 * - Institution sponsorship is active.
 * - User's department is in the institution allowlist (when configured).
 * - Target temple/section is not frozen.
 *
 * Backward-compatible overload: `canSubmitEdit(user)` performs the legacy
 * active-student check used by older callers.
 */
function canSubmitEdit(user, institution, target) {
  if (user?.status !== 'active' || user?.accountStatus === 'disabled') return false;
  if (!hasRole(user, 'student')) return false;

  // Legacy single-argument call path.
  if (!institution && !target) {
    return user.accountStatus !== 'disabled';
  }

  const resolvedInstitution =
    institution ?? (user.institutionId ? getInstitutionById(user.institutionId) : null);
  if (!isActiveSponsorship(resolvedInstitution)) return false;
  if (!isDepartmentAllowed(user.department, resolvedInstitution)) return false;
  if (isFrozenTarget(target)) return false;
  return true;
}

/**
 * Check whether a user can review an edit.
 *
 * Requirements:
 * - User account is active.
 * - Institution sponsorship is active (for the edit's institution).
 * - User's department is in the institution allowlist (when configured).
 * - Reviewer is in the same institution, or is a curator.
 *
 * `editContext` may be an institution id, an institution object, or an edit
 * object containing `institution_id` / `institutionId`.
 */
function canReviewEdit(user, editContext, editAuthor) {
  if (!isActiveUser(user)) return false;

  let institution = null;
  if (editContext && typeof editContext === 'object') {
    // If the object looks like an institution row, use it directly.
    if (editContext.sponsorship_status !== undefined) {
      institution = editContext;
    } else {
      institution =
        editContext.institution ??
        getInstitutionById(editContext.institution_id ?? editContext.institutionId);
    }
  } else if (editContext !== undefined && editContext !== null) {
    institution = getInstitutionById(editContext);
  }

  if (isCurator(user)) {
    // Curators still need the target institution sponsorship to be in good standing.
    if (institution && !isActiveSponsorship(institution)) return false;
    return true;
  }
  if (!hasRole(user, 'reviewer')) return false;
  if (!isActiveSponsorship(institution)) return false;
  if (!isDepartmentAllowed(user.department, institution)) return false;
  if (editAuthor && user.id === editAuthor.id) return false;
  return sameInstitution(user, institution?.id);
}

function canApproveAny(user) {
  return isCurator(user);
}

function canManageInstitution(user, institutionId) {
  if (!isActiveUser(user)) return false;
  if (isCurator(user)) return true;
  if (!isInstitutionAdmin(user)) return false;
  return sameInstitution(user, institutionId);
}

/**
 * Check whether an admin can manage a student account.
 *
 * Institution admins (and curators) may manage students within their own
 * institution. Department admins may manage only students within their own
 * institution AND their own department; a dept_admin without an assigned
 * department manages nothing.
 *
 * `studentUser` may be a normalized user object (institutionId) or a raw DB
 * row (institution_id).
 */
function canManageStudent(admin, studentUser) {
  if (!admin || !studentUser) return false;
  if (!isActiveUser(admin)) return false;
  if (!isDepartmentAdmin(admin)) return false;
  const studentInstitutionId = studentUser.institutionId ?? studentUser.institution_id;
  if (!sameInstitution(admin, studentInstitutionId)) return false;
  const studentRole = studentUser.role;
  if (ROLE_RANK[studentRole] > ROLE_RANK.student) return false;
  if (!isInstitutionAdmin(admin)) {
    if (!admin.department || admin.department !== (studentUser.department ?? null)) return false;
  }
  return true;
}

function canFreezeTemple(user) {
  return isCurator(user);
}

function canRevertSection(user) {
  return isCurator(user);
}

// ─────────────────────────────────────────────────────────────
// Creative Marketplace permissions
// ─────────────────────────────────────────────────────────────

function canSubmitCreative(user, institution) {
  if (!isActiveUser(user)) return false;
  if (!hasRole(user, 'student')) return false;
  const resolvedInstitution =
    institution ?? (user.institutionId ? getInstitutionById(user.institutionId) : null);
  if (!isActiveSponsorship(resolvedInstitution)) return false;
  if (!isDepartmentAllowed(user.department, resolvedInstitution)) return false;
  return true;
}

function canReviewCreative(user, assetInstitutionId) {
  if (!isActiveUser(user)) return false;
  if (isCurator(user)) return true;
  if (!hasRole(user, 'reviewer')) return false;
  if (!sameInstitution(user, assetInstitutionId)) return false;
  return true;
}

function canManageCreative(user, asset) {
  if (!user || !asset) return false;
  if (isCurator(user)) return true;
  if (user.id === asset.creator_id) return true;
  if (isInstitutionAdmin(user) && sameInstitution(user, asset.institution_id)) return true;
  return false;
}

function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!hasRole(req.user, minRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

function requireCurator(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!isCurator(req.user)) return res.status(403).json({ error: 'Curator access required' });
  next();
}

function requireInstitutionAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!isInstitutionAdmin(req.user)) {
    return res.status(403).json({ error: 'Institution admin access required' });
  }
  next();
}

function requireDepartmentAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  if (!isDepartmentAdmin(req.user)) {
    return res.status(403).json({ error: 'Department admin access required' });
  }
  next();
}

module.exports = {
  ROLES,
  ROLE_RANK,
  hasRole,
  isCurator,
  isReviewerOrHigher,
  isInstitutionAdmin,
  isDepartmentAdmin,
  sameInstitution,
  isActiveUser,
  isActiveSponsorship,
  parseSqliteUtc,
  canSubmitEdit,
  canReviewEdit,
  canApproveAny,
  canManageInstitution,
  canManageStudent,
  canFreezeTemple,
  canRevertSection,
  canSubmitCreative,
  canReviewCreative,
  canManageCreative,
  requireRole,
  requireCurator,
  requireInstitutionAdmin,
  requireDepartmentAdmin,
};
