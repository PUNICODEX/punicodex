/**
 * PuniCodex — Admin Portal Authentication & RBAC
 *
 * Per-user admin identity for the unified admin portal, alongside (not
 * replacing) the legacy shared-password admin auth in platform/api/admin.js.
 *
 * - Bootstrap: when admin_users is empty and ADMIN_PASSWORD is configured,
 *   one superadmin is seeded (email from ADMIN_EMAIL or admin@punicodex.com).
 *   When ADMIN_PASSWORD is unset the portal stays unconfigured (login → 503);
 *   no default/known password is ever seeded.
 * - Sessions reuse the admin_sessions table (8h TTL, sha256-hashed tokens)
 *   with admin_user_id linking the session to a portal user. Legacy tokens
 *   minted by POST /api/admin/login have admin_user_id NULL and therefore do
 *   NOT authenticate as portal users.
 * - Password change/reset and account disable destroy the user's sessions
 *   immediately (deleteSessionsForUser), mirroring the Scholars model.
 *
 * Role matrix (enforced server-side by requirePortal):
 *   superadmin — everything, including user management
 *   ops        — crawler/analytics/observability
 *   leasing    — bookings/applications/patrons/revenue
 *   scholars   — scholarly approvals + university applications
 *   viewer     — read-only GETs
 */

const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const { get, all, run } = require('../db/operational');
const { getDb } = require('../db/connection');
const { migrate: migrateAdminUsers } = require('../db/migrate-admin-users');
const { hashToken } = require('./admin');
const { logAction } = require('./admin-actions');
const emailModule = require('./email');

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours (matches legacy admin sessions)
const BCRYPT_ROUNDS = Number(process.env.PUNICODEX_BCRYPT_ROUNDS) || 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const MIN_PASSWORD_LENGTH = 8;

const ROLES = ['superadmin', 'ops', 'leasing', 'scholars', 'viewer'];

const ROLE_PERMISSIONS = {
  superadmin: ['read', 'ops', 'leasing', 'scholars', 'users'],
  ops: ['read', 'ops'],
  leasing: ['read', 'leasing'],
  scholars: ['read', 'scholars'],
  viewer: ['read'],
};

// Cold-start schema: idempotent. Runs lazily before the first DB use (once
// per serverless instance) instead of at require time, so importing this
// module stays cheap on cold start.
let authSchemaReady = false;
function ensureAuthSchema() {
  if (authSchemaReady) return;
  migrateAdminUsers(getDb());
  authSchemaReady = true;
}

function roleCan(role, permission) {
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}

function portalError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

function sanitizeUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    tempPassword: Boolean(row.temp_password),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
  };
}

function generateTempPassword(length = 16) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

// ─────────────────────────────────────────────────────────────
// Bootstrap
// ─────────────────────────────────────────────────────────────

async function countAdminUsers() {
  ensureAuthSchema();
  const row = await get('SELECT COUNT(*) as c FROM admin_users');
  // Postgres returns COUNT(*) as a string; SQLite returns a number. Normalize
  // so strict comparisons (e.g. === 0) behave identically on both drivers.
  return Number(row?.c ?? 0);
}

async function getUserByEmail(email) {
  ensureAuthSchema();
  return get('SELECT * FROM admin_users WHERE email = $1', [email]);
}

async function getUserById(id) {
  ensureAuthSchema();
  return get('SELECT * FROM admin_users WHERE id = $1', [id]);
}

/**
 * Seed the first superadmin from environment configuration.
 * Never seeds a default/known password: without ADMIN_PASSWORD this skips.
 */
async function bootstrap() {
  ensureAuthSchema();
  const count = await countAdminUsers();
  if (count > 0) return { seeded: false, reason: 'already_provisioned' };

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return { seeded: false, reason: 'admin_password_not_configured' };
  }

  const email = (process.env.ADMIN_EMAIL || 'admin@punicodex.com').toLowerCase().trim();
  const passwordHash = bcrypt.hashSync(adminPassword, BCRYPT_ROUNDS);
  await run(
    `INSERT INTO admin_users (email, password_hash, display_name, role, status, temp_password)
     VALUES ($1, $2, $3, 'superadmin', 'active', 0)`,
    [email, passwordHash, 'Portal Administrator']
  );
  await logAction({
    action: 'portal.bootstrap',
    target: `admin_users:${email}`,
    meta: { role: 'superadmin' },
  });
  return { seeded: true, email };
}

// ─────────────────────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────────────────────

// Session resolution cache. Resolving a portal token costs a database round
// trip on every request — with cross-region Postgres that is hundreds of
// milliseconds per portal page. The resolved { user, role } is cached per
// token hash for up to 30s.
//
// TRADE-OFF: this intentionally weakens immediate revocation by up to the
// TTL. A session destroyed on ANOTHER warm instance (logout, password
// change/reset, account disable) may keep authenticating here for ≤30s.
// Every mutation path on THIS instance invalidates synchronously —
// deleteSession, deleteSessionsForUser (which covers password change/reset
// and account disable), and user-management updates — so same-instance
// revocation stays immediate; the window only applies across
// concurrently-warm instances.
const SESSION_CACHE_TTL_MS = 30 * 1000;
const SESSION_CACHE_MAX = 1000;
const sessionCache = new Map(); // tokenHash → { user, role, userId, sessionExpiresAt, cachedAt }

function cacheResolvedSession(tokenHash, row) {
  if (sessionCache.size >= SESSION_CACHE_MAX) {
    // Map iterates in insertion order: drop the oldest entry.
    sessionCache.delete(sessionCache.keys().next().value);
  }
  sessionCache.set(tokenHash, {
    user: sanitizeUser(row),
    role: row.role,
    userId: row.id,
    sessionExpiresAt: row.expires_at || null,
    cachedAt: Date.now(),
  });
}

function invalidateSessionCacheForUser(userId) {
  for (const [key, entry] of sessionCache) {
    if (entry.userId === userId) sessionCache.delete(key);
  }
}

async function createSession(userId) {
  ensureAuthSchema();
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await run('INSERT INTO admin_sessions (token, expires_at, admin_user_id) VALUES ($1, $2, $3)', [
    tokenHash,
    expiresAt,
    userId,
  ]);
  return token;
}

async function deleteSession(token) {
  ensureAuthSchema();
  const tokenHash = hashToken(token);
  await run('DELETE FROM admin_sessions WHERE token = $1', [tokenHash]);
  sessionCache.delete(tokenHash);
}

async function deleteSessionsForUser(userId) {
  ensureAuthSchema();
  await run('DELETE FROM admin_sessions WHERE admin_user_id = $1', [userId]);
  invalidateSessionCacheForUser(userId);
}

/**
 * Resolve an x-admin-token to a portal user. Returns { user, role } or null.
 * Legacy shared-password sessions (admin_user_id NULL) are not portal
 * sessions and resolve to null here — they still work on legacy endpoints.
 */
async function resolveUser(token) {
  if (!token || typeof token !== 'string') return null;
  ensureAuthSchema();
  const tokenHash = hashToken(token);

  const cached = sessionCache.get(tokenHash);
  if (cached && Date.now() - cached.cachedAt < SESSION_CACHE_TTL_MS) {
    if (cached.sessionExpiresAt && new Date(cached.sessionExpiresAt) < new Date()) {
      sessionCache.delete(tokenHash);
      await deleteSession(token);
      return null;
    }
    return { user: cached.user, role: cached.role };
  }

  // One JOIN instead of sequential session-then-user queries: a single round
  // trip per uncached request. Legacy sessions (admin_user_id NULL) and
  // orphaned sessions simply match no row and resolve to null.
  const row = await get(
    `SELECT u.*, s.token, s.expires_at
     FROM admin_sessions s
     JOIN admin_users u ON u.id = s.admin_user_id
     WHERE s.token = $1`,
    [tokenHash]
  );
  if (!row) return null;
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    await deleteSession(token);
    return null;
  }
  // Immediate revocation: a disabled account loses access on the next
  // uncached request and all of its sessions are destroyed so they cannot
  // be reused.
  if (row.status !== 'active') {
    await deleteSessionsForUser(row.id);
    return null;
  }
  cacheResolvedSession(tokenHash, row);
  return { user: sanitizeUser(row), role: row.role };
}

/**
 * Guard for portal handlers. Resolves the portal session and enforces the
 * role matrix. Returns { user, role } or false after writing 401/403.
 */
async function requirePortal(req, res, permission = 'read') {
  const token = req.headers['x-admin-token'];
  const resolved = token ? await resolveUser(token) : null;
  if (!resolved) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  if (permission && !roleCan(resolved.role, permission)) {
    res.status(403).json({ error: 'Forbidden', required: permission, role: resolved.role });
    return false;
  }
  return resolved;
}

// ─────────────────────────────────────────────────────────────
// Login / logout
// ─────────────────────────────────────────────────────────────

let dummyHash = null;
function getDummyHash() {
  // Constant-time-ish unknown-user path: run the same bcrypt comparison
  // against a valid hash so account existence is not leaked by timing.
  if (!dummyHash) {
    dummyHash = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_ROUNDS);
  }
  return dummyHash;
}

async function login(email, password) {
  ensureAuthSchema();
  // Type guard: a truthy non-string email throws on .toLowerCase() and a
  // truthy non-string password crashes bcrypt.compareSync — both surfaced as
  // 500s. Reject them with the same invalid-credentials failure the route
  // already maps to 401.
  if (typeof email !== 'string' || typeof password !== 'string') {
    return { success: false, code: 'invalid_credentials', message: 'Email and password required' };
  }
  const normalized = email.toLowerCase().trim();
  if (!normalized || !password) {
    return { success: false, code: 'invalid_credentials', message: 'Email and password required' };
  }

  // First-run bootstrap. When ADMIN_PASSWORD is not configured the portal
  // stays closed: no account exists and none can be created here.
  if ((await countAdminUsers()) === 0) {
    const result = await bootstrap();
    if (!result.seeded) {
      return {
        success: false,
        code: 'portal_unconfigured',
        message: 'Admin portal is not configured',
      };
    }
  }

  const user = await getUserByEmail(normalized);
  if (!user) {
    bcrypt.compareSync(password, getDummyHash());
    return { success: false, code: 'invalid_credentials', message: 'Invalid email or password' };
  }

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return {
      success: false,
      code: 'account_locked',
      message: 'Account is temporarily locked. Try again later.',
    };
  }

  if (user.status !== 'active') {
    return {
      success: false,
      code: 'account_inactive',
      message: 'Account is disabled. Contact a superadmin.',
    };
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    const attempts = (user.login_attempts || 0) + 1;
    const lockedUntil =
      attempts >= MAX_LOGIN_ATTEMPTS
        ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000).toISOString()
        : null;
    await run('UPDATE admin_users SET login_attempts = $1, locked_until = $2 WHERE id = $3', [
      attempts,
      lockedUntil,
      user.id,
    ]);
    const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - attempts);
    return {
      success: false,
      code: 'invalid_credentials',
      message: `Invalid email or password. ${remaining} attempts remaining.`,
    };
  }

  await run(
    'UPDATE admin_users SET login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
    [user.id]
  );

  const token = await createSession(user.id);
  return {
    success: true,
    token,
    user: sanitizeUser({ ...user, last_login_at: new Date().toISOString() }),
    role: user.role,
    requirePasswordChange: Boolean(user.temp_password),
  };
}

async function logout(token) {
  if (token) await deleteSession(token);
}

// ─────────────────────────────────────────────────────────────
// User management (superadmin only — enforced at the handler)
// ─────────────────────────────────────────────────────────────

async function listUsers() {
  ensureAuthSchema();
  const rows = await all('SELECT * FROM admin_users ORDER BY created_at ASC');
  return rows.map(sanitizeUser);
}

async function countActiveSuperadmins() {
  ensureAuthSchema();
  const row = await get(
    "SELECT COUNT(*) as c FROM admin_users WHERE role = 'superadmin' AND status = 'active'"
  );
  return row?.c || 0;
}

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function validateRole(role) {
  return ROLES.includes(role);
}

async function createUser({ email, password, displayName, role } = {}, actor) {
  ensureAuthSchema();
  // Same type guard as login(): non-string truthy emails crash .toLowerCase(),
  // and non-string display names crash the SQL bind below.
  const normalized = typeof email === 'string' ? email.toLowerCase().trim() : '';
  if (!validateEmail(normalized)) throw portalError(400, 'A valid email is required');
  if (!validateRole(role)) throw portalError(400, `role must be one of: ${ROLES.join(', ')}`);
  const safeDisplayName = typeof displayName === 'string' && displayName ? displayName : null;

  let tempPassword = null;
  let finalPassword = password;
  if (finalPassword == null || finalPassword === '') {
    tempPassword = generateTempPassword();
    finalPassword = tempPassword;
  }
  if (typeof finalPassword !== 'string' || finalPassword.length < MIN_PASSWORD_LENGTH) {
    throw portalError(400, `password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const passwordHash = bcrypt.hashSync(finalPassword, BCRYPT_ROUNDS);
  let row;
  try {
    await run(
      `INSERT INTO admin_users (email, password_hash, display_name, role, status, temp_password)
       VALUES ($1, $2, $3, $4, 'active', $5)`,
      [normalized, passwordHash, safeDisplayName, role, tempPassword ? 1 : 0]
    );
    row = await getUserByEmail(normalized);
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw portalError(409, 'A user with this email already exists');
    }
    throw err;
  }

  await logAction({
    adminUserId: actor?.user?.id ?? null,
    action: 'portal.user.create',
    target: `admin_users:${row.id}`,
    meta: { email: normalized, role, tempPassword: Boolean(tempPassword), by: actor?.user?.email },
  });

  return { user: sanitizeUser(row), tempPassword };
}

async function updateUser(id, { displayName, role, status } = {}, actor) {
  ensureAuthSchema();
  const target = await getUserById(id);
  if (!target) throw portalError(404, 'User not found');

  if (role !== undefined && !validateRole(role)) {
    throw portalError(400, `role must be one of: ${ROLES.join(', ')}`);
  }
  if (status !== undefined && !['active', 'disabled'].includes(status)) {
    throw portalError(400, "status must be 'active' or 'disabled'");
  }
  // displayName is bound raw below — reject non-strings before the SQL bind.
  if (displayName !== undefined && displayName !== null && typeof displayName !== 'string') {
    throw portalError(400, 'displayName must be a string');
  }

  const actorId = actor?.user?.id ?? null;
  if (role !== undefined && role !== target.role) {
    if (actorId === target.id) throw portalError(400, 'You cannot change your own role');
    if (target.role === 'superadmin' && (await countActiveSuperadmins()) <= 1) {
      throw portalError(400, 'Cannot demote the last active superadmin');
    }
  }
  if (status !== undefined && status !== target.status) {
    if (actorId === target.id) throw portalError(400, 'You cannot change your own status');
    if (
      status === 'disabled' &&
      target.role === 'superadmin' &&
      (await countActiveSuperadmins()) <= 1
    ) {
      throw portalError(400, 'Cannot disable the last active superadmin');
    }
  }

  await run(
    `UPDATE admin_users
     SET display_name = COALESCE($1, display_name),
         role = COALESCE($2, role),
         status = COALESCE($3, status),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $4`,
    [displayName ?? null, role ?? null, status ?? null, id]
  );

  // Disabling an account revokes access immediately.
  if (status === 'disabled' && target.status !== 'disabled') {
    await deleteSessionsForUser(target.id);
  }
  // Role/status/display changes must not be served from the session cache:
  // drop the user's cached resolutions so the next request re-reads the row.
  invalidateSessionCacheForUser(target.id);

  await logAction({
    adminUserId: actorId,
    action: 'portal.user.update',
    target: `admin_users:${id}`,
    meta: { displayName, role, status, by: actor?.user?.email },
  });

  return sanitizeUser(await getUserById(id));
}

async function disableUser(id, actor) {
  ensureAuthSchema();
  const target = await getUserById(id);
  if (!target) throw portalError(404, 'User not found');
  if (actor?.user?.id === target.id) throw portalError(400, 'You cannot disable your own account');
  if (target.role === 'superadmin' && (await countActiveSuperadmins()) <= 1) {
    throw portalError(400, 'Cannot disable the last active superadmin');
  }

  await run(
    "UPDATE admin_users SET status = 'disabled', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
    [id]
  );
  await deleteSessionsForUser(id);

  await logAction({
    adminUserId: actor?.user?.id ?? null,
    action: 'portal.user.disable',
    target: `admin_users:${id}`,
    meta: { email: target.email, by: actor?.user?.email },
  });

  return sanitizeUser(await getUserById(id));
}

async function resetPassword(id, actor) {
  ensureAuthSchema();
  const target = await getUserById(id);
  if (!target) throw portalError(404, 'User not found');

  const tempPassword = generateTempPassword();
  const passwordHash = bcrypt.hashSync(tempPassword, BCRYPT_ROUNDS);
  await run(
    'UPDATE admin_users SET password_hash = $1, temp_password = 1, login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, id]
  );
  // One-time credential: every existing session is destroyed immediately.
  await deleteSessionsForUser(id);

  await logAction({
    adminUserId: actor?.user?.id ?? null,
    action: 'portal.user.reset-password',
    target: `admin_users:${id}`,
    meta: { email: target.email, by: actor?.user?.email },
  });

  // One-time credential, delivered by transactional email (fire-and-forget;
  // a delivery failure never blocks the reset). The temp password is also
  // returned exactly once as a fallback relay channel.
  emailModule
    .notifyAdminPasswordReset({ email: target.email, tempPassword })
    .catch(() => {});
  return { user: sanitizeUser(await getUserById(id)), tempPassword };
}

async function changePassword(userId, { currentPassword, newPassword } = {}) {
  ensureAuthSchema();
  const target = await getUserById(userId);
  if (!target) throw portalError(404, 'User not found');
  // typeof guard first: a truthy non-string currentPassword crashes
  // bcrypt.compareSync (500); treat it exactly like a wrong password (401).
  if (
    typeof currentPassword !== 'string' ||
    !currentPassword ||
    !bcrypt.compareSync(currentPassword, target.password_hash)
  ) {
    throw portalError(401, 'Current password is incorrect');
  }
  if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
    throw portalError(400, `newPassword must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  const passwordHash = bcrypt.hashSync(newPassword, BCRYPT_ROUNDS);
  await run(
    'UPDATE admin_users SET password_hash = $1, temp_password = 0, login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, userId]
  );
  // Password change revokes every session; the user signs in again.
  await deleteSessionsForUser(userId);

  await logAction({
    adminUserId: userId,
    action: 'portal.user.change-password',
    target: `admin_users:${userId}`,
    meta: { email: target.email },
  });

  return { changed: true };
}

module.exports = {
  ROLES,
  ROLE_PERMISSIONS,
  roleCan,
  bootstrap,
  login,
  logout,
  resolveUser,
  requirePortal,
  listUsers,
  getUserById,
  createUser,
  updateUser,
  disableUser,
  resetPassword,
  changePassword,
  deleteSessionsForUser,
  generateTempPassword,
  sanitizeUser,
};
