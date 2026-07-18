/**
 * PUNICODEX — Enterprise governance API routes.
 *
 * Mounts under /api/v1/tenants/:tenantId/...
 * Also usable from the API v2 catch-all router via exported handlers.
 */

const { Router } = require('express');
const crypto = require('node:crypto');
const { all, run, get, insert } = require('../db/operational.js');
const { error } = require('./api-response.js');
const rbac = require('./rbac.js');
const auditLog = require('./audit-log.js');
const retention = require('./retention.js');

const VALID_USER_ROLES = new Set(['superadmin', 'tenant_admin', 'analyst', 'viewer', 'api']);

const dbLike = { all, run, get, insert };

function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

function actorId(auth) {
  if (auth.type === 'superadmin') {
    return `admin:${auth.adminToken.slice(0, 8)}`;
  }
  return String(auth.keyId);
}

function actorType(auth) {
  return auth.type === 'superadmin' ? 'user' : 'api_key';
}

async function authenticate(req) {
  const adminToken = req.headers['x-admin-token'];
  if (adminToken) {
    const { validateAdminToken } = require('./admin.js');
    const valid = await validateAdminToken(adminToken);
    if (valid) {
      return { type: 'superadmin', role: 'superadmin', adminToken };
    }
  }

  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/);
  if (match) {
    const key = match[1];
    const keyHash = crypto.createHash('sha256').update(key).digest('hex');
    const keyRow = await get('SELECT * FROM api_keys_v2 WHERE key_hash = $1 AND revoked = 0', [
      keyHash,
    ]);
    if (keyRow) {
      await run('UPDATE api_keys_v2 SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1', [
        keyRow.id,
      ]);
      let scopes = [];
      try {
        scopes = JSON.parse(keyRow.scopes || '[]');
      } catch {
        scopes = [];
      }
      return {
        type: 'api_key',
        keyId: keyRow.id,
        tenantId: keyRow.tenant_id,
        userId: keyRow.user_id,
        scopes,
      };
    }
  }

  return null;
}

async function requireTenantAdminPlus(auth, tenantId) {
  if (auth?.type === 'superadmin') return;
  if (auth?.type === 'api_key' && auth.userId) {
    const user = await get(
      `SELECT role FROM tenant_users
       WHERE id = $1 AND tenant_id = $2 AND status = $3`,
      [auth.userId, tenantId, 'active']
    );
    if (user && rbac.hasPermission(user.role, 'manage_users')) return;
  }
  throw new rbac.UnauthorizedError('tenant_admin or higher required');
}

async function requireAuditAccess(auth, tenantId) {
  if (auth?.type === 'superadmin') return;
  if (auth?.type === 'api_key' && auth.userId) {
    const user = await get(
      `SELECT role FROM tenant_users
       WHERE id = $1 AND tenant_id = $2 AND status = $3`,
      [auth.userId, tenantId, 'active']
    );
    if (user && rbac.hasPermission(user.role, 'view_audit')) return;
  }
  throw new rbac.UnauthorizedError('Audit access required');
}

// Shared authorization preamble for every governance handler. Returns the
// authenticated caller, or null after sending an error response. Maps the
// service-layer UnauthorizedError to a 401/403 in the standard error
// envelope instead of letting it escape as a 500.
async function authorize(req, res, check) {
  const auth = await authenticate(req);
  if (!auth) {
    error(res, 'UNAUTHORIZED', 'Authentication required.', { status: 401 });
    return null;
  }
  try {
    await check(auth, req.params.tenantId);
  } catch (err) {
    if (err instanceof rbac.UnauthorizedError) {
      error(res, 'FORBIDDEN', err.message, { status: 403 });
      return null;
    }
    throw err;
  }
  return auth;
}

async function listUsers(req, res) {
  const auth = await authorize(req, res, requireTenantAdminPlus);
  if (!auth) return;
  const users = await rbac.listTenantUsers(dbLike, req.params.tenantId);
  res.json({ users });
}

async function addUser(req, res) {
  const auth = await authorize(req, res, requireTenantAdminPlus);
  if (!auth) return;

  const { email, role = 'viewer' } = req.body || {};
  if (!email?.includes('@')) {
    error(res, 'VALIDATION_ERROR', 'Valid email required', { status: 400 });
    return;
  }
  if (!VALID_USER_ROLES.has(role)) {
    error(res, 'VALIDATION_ERROR', 'Invalid role', { status: 400 });
    return;
  }

  const tenantId = req.params.tenantId;
  const emailHash = hashEmail(email);

  try {
    const id = await insert(
      `INSERT INTO tenant_users (tenant_id, email_hash, role, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [tenantId, emailHash, role, 'active']
    );

    await auditLog.appendAuditLog(dbLike, {
      tenant_id: tenantId,
      actor_type: actorType(auth),
      actor_id: actorId(auth),
      action: 'tenant.user.create',
      resource_type: 'tenant_user',
      resource_id: String(id),
      metadata: { role },
    });

    res.status(201).json({ id, tenantId, role, status: 'active' });
  } catch (err) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      error(res, 'CONFLICT', 'User already exists in tenant', { status: 409 });
      return;
    }
    throw err;
  }
}

async function changeRole(req, res) {
  const auth = await authorize(req, res, requireTenantAdminPlus);
  if (!auth) return;

  const { role } = req.body || {};
  const userId = parseInt(req.params.userId, 10);
  if (Number.isNaN(userId)) {
    error(res, 'VALIDATION_ERROR', 'Invalid user id', { status: 400 });
    return;
  }
  if (!VALID_USER_ROLES.has(role)) {
    error(res, 'VALIDATION_ERROR', 'Invalid role', { status: 400 });
    return;
  }

  const ok = await rbac.assignRole(dbLike, userId, role);
  if (!ok) {
    error(res, 'NOT_FOUND', 'User not found', { status: 404 });
    return;
  }

  await auditLog.appendAuditLog(dbLike, {
    tenant_id: req.params.tenantId,
    actor_type: actorType(auth),
    actor_id: actorId(auth),
    action: 'tenant.user.role_change',
    resource_type: 'tenant_user',
    resource_id: String(userId),
    metadata: { newRole: role },
  });

  res.json({ success: true, userId, role });
}

async function queryAudit(req, res) {
  const auth = await authorize(req, res, requireAuditAccess);
  if (!auth) return;

  const result = await auditLog.queryAuditLogs(dbLike, {
    tenant_id: req.params.tenantId,
    action: req.query.action,
    resource_type: req.query.resource_type,
    from: req.query.from,
    to: req.query.to,
    limit: parseInt(req.query.limit || '50', 10),
    offset: parseInt(req.query.offset || '0', 10),
  });
  res.json(result);
}

async function exportAudit(req, res) {
  const auth = await authorize(req, res, requireAuditAccess);
  if (!auth) return;

  const format = req.query.format || 'json';
  if (!['json', 'csv', 'cef'].includes(format)) {
    error(res, 'VALIDATION_ERROR', 'format must be json, csv, or cef', { status: 400 });
    return;
  }

  const data = await auditLog.exportAuditLogs(dbLike, req.params.tenantId, format);
  const contentType = format === 'json' ? 'application/json' : 'text/plain';
  res.setHeader('Content-Type', contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="audit-${req.params.tenantId}.${format}"`
  );
  res.send(data);
}

async function verifyAudit(req, res) {
  const auth = await authorize(req, res, requireAuditAccess);
  if (!auth) return;

  const result = await auditLog.verifyAuditChain(dbLike, req.params.tenantId);
  res.json(result);
}

async function purgeRetention(req, res) {
  const auth = await authorize(req, res, requireTenantAdminPlus);
  if (!auth) return;

  const days = parseInt(req.body?.retentionDays || '90', 10);
  if (!Number.isFinite(days) || days < 1) {
    error(res, 'VALIDATION_ERROR', 'retentionDays must be >= 1', { status: 400 });
    return;
  }

  const result = await retention.purgeExpiredRawInputs(dbLike, days);
  await auditLog.appendAuditLog(dbLike, {
    tenant_id: req.params.tenantId,
    actor_type: actorType(auth),
    actor_id: actorId(auth),
    action: 'tenant.retention.purge',
    resource_type: 'raw_inputs',
    resource_id: '*',
    metadata: { retentionDays: days, deleted: result.deleted },
  });

  res.json(result);
}

const handlers = {
  listUsers,
  addUser,
  changeRole,
  queryAudit,
  exportAudit,
  verifyAudit,
  purgeRetention,
};

function createRouter() {
  const router = Router();
  router.get('/:tenantId/users', listUsers);
  router.post('/:tenantId/users', addUser);
  router.patch('/:tenantId/users/:userId/role', changeRole);
  router.get('/:tenantId/audit', queryAudit);
  router.get('/:tenantId/audit/export', exportAudit);
  router.post('/:tenantId/audit/verify', verifyAudit);
  router.post('/:tenantId/retention/purge', purgeRetention);
  return router;
}

module.exports = {
  createRouter,
  handlers,
};
