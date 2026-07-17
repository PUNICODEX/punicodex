/**
 * PUNICODEX — Role-Based Access Control (RBAC) for enterprise tenants.
 */

const VALID_ROLES = new Set(['superadmin', 'tenant_admin', 'analyst', 'viewer', 'api']);

const ROLE_PERMISSIONS = {
  superadmin: new Set(['*']),
  tenant_admin: new Set(['manage_users', 'manage_policy', 'view_audit', 'export_audit']),
  analyst: new Set(['view_audit', 'view_reports', 'update_disputes']),
  viewer: new Set(['view_reports']),
  api: new Set(['api_read', 'api_write']),
};

class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.code = 'UNAUTHORIZED';
    this.status = 403;
  }
}

function hasPermission(role, permission) {
  if (!VALID_ROLES.has(role)) return false;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.has('*') || permissions.has(permission);
}

function requirePermission(role, permission) {
  if (!hasPermission(role, permission)) {
    throw new UnauthorizedError(`Role '${role}' lacks permission '${permission}'`);
  }
}

async function listTenantUsers(db, tenantId) {
  return db.all(
    `SELECT id, tenant_id, email_hash, role, status, created_at
     FROM tenant_users
     WHERE tenant_id = $1
     ORDER BY created_at DESC`,
    [tenantId]
  );
}

async function assignRole(db, userId, role) {
  if (!VALID_ROLES.has(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  const result = await db.run('UPDATE tenant_users SET role = $1 WHERE id = $2', [role, userId]);
  return result.changes > 0;
}

module.exports = {
  hasPermission,
  requirePermission,
  listTenantUsers,
  assignRole,
  UnauthorizedError,
  VALID_ROLES,
  ROLE_PERMISSIONS,
};
