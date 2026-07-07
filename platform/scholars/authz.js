/**
 * PÚNYCODEX — Scholarly Edition Authorization (RBAC)
 */

const ROLES = ['student', 'reviewer', 'dept_admin', 'inst_admin', 'curator'];

const ROLE_RANK = {
  student: 0,
  reviewer: 1,
  dept_admin: 2,
  inst_admin: 3,
  curator: 4,
};

function hasRole(user, minRole) {
  if (!user || !user.role) return false;
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

function sameInstitution(user, otherInstitutionId) {
  if (!user || !user.institutionId) return false;
  return user.institutionId === otherInstitutionId;
}

function canSubmitEdit(user) {
  return user && user.status === 'active' && hasRole(user, 'student');
}

function canReviewEdit(user, editInstitutionId) {
  if (!user || user.status !== 'active') return false;
  if (isCurator(user)) return true;
  if (!hasRole(user, 'reviewer')) return false;
  // Reviewers can review edits from their own institution or any if they are curator.
  return sameInstitution(user, editInstitutionId) || isCurator(user);
}

function canApproveAny(user) {
  return isCurator(user);
}

function canManageInstitution(user, institutionId) {
  if (!user || user.status !== 'active') return false;
  if (isCurator(user)) return true;
  if (!isInstitutionAdmin(user)) return false;
  return sameInstitution(user, institutionId);
}

function canFreezeTemple(user) {
  return isCurator(user);
}

function canRevertSection(user) {
  return isCurator(user);
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

module.exports = {
  ROLES,
  ROLE_RANK,
  hasRole,
  isCurator,
  isReviewerOrHigher,
  isInstitutionAdmin,
  sameInstitution,
  canSubmitEdit,
  canReviewEdit,
  canApproveAny,
  canManageInstitution,
  canFreezeTemple,
  canRevertSection,
  requireRole,
  requireCurator,
};
