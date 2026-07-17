/**
 * PuniCodex — Scholarly Edition Authentication
 *
 * Phase 2: password-based authentication for students and institution admins.
 * Magic-link helpers are kept as deprecated compatibility shims.
 */

const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const {
  getUserByEmail,
  createUser,
  createSession: dbCreateSession,
  getSessionWithUser,
  deleteSession,
  updateUserLastSeen,
  getInstitutionByDomain,
  getUserWithInstitutionByEmail,
  incrementLoginAttempts,
  resetLoginAttempts,
  isUserLocked,
} = require('../db/scholars');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAGIC_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const BCRYPT_ROUNDS = Number(process.env.PUNICODEX_BCRYPT_ROUNDS) || 12;
const MAX_LOGIN_ATTEMPTS = 5;

// In-memory store for magic tokens until email provider is wired.
const magicTokens = new Map();

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

function parseInstitutionDomain(email) {
  const match = email.match(/@([^@]+)$/);
  return match ? match[1].toLowerCase() : null;
}

// ─────────────────────────────────────────────────────────────
// Password helpers
// ─────────────────────────────────────────────────────────────

function hashPassword(password) {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function verifyPassword(password, hash) {
  if (!hash) return false;
  return bcrypt.compareSync(password, hash);
}

// ─────────────────────────────────────────────────────────────
// Session helpers
// ─────────────────────────────────────────────────────────────

function createSession(user, { ipHash = null, userAgent = null } = {}) {
  const sessionId = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  dbCreateSession({ id: sessionId, userId: user.id, expiresAt, ipHash, userAgent });
  return sessionId;
}

function validateSession(token) {
  if (!token || typeof token !== 'string') return null;
  const session = getSessionWithUser(token);
  if (!session) return null;
  // Immediate revocation: sessions belonging to non-active accounts are
  // destroyed on sight so /auth/session agrees with requireAuth.
  if (session.user_account_status && session.user_account_status !== 'active') {
    deleteSession(token);
    return null;
  }
  return session;
}

// ─────────────────────────────────────────────────────────────
// Password login
// ─────────────────────────────────────────────────────────────

/**
 * Authenticate a user with email and password.
 *
 * Returns { success: true, sessionId, user, requirePasswordChange } on success.
 * Returns { success: false, code, message } on failure.
 *
 * `requirePasswordChange` is true when an institution admin logs in for the
 * first time and has not yet set a permanent password.
 */
async function login(email, password, { ipHash = null, userAgent = null } = {}) {
  const normalized = (email || '').toLowerCase().trim();
  if (!normalized || !password) {
    return {
      success: false,
      code: 'invalid_credentials',
      message: 'Email and password are required',
    };
  }

  const user = getUserWithInstitutionByEmail(normalized);
  if (!user?.password_hash) {
    // Use constant-time comparison path to avoid leaking account existence.
    bcrypt.hashSync(password, BCRYPT_ROUNDS);
    return { success: false, code: 'invalid_credentials', message: 'Invalid email or password' };
  }

  if (isUserLocked(user)) {
    return {
      success: false,
      code: 'account_locked',
      message: 'Account is temporarily locked. Try again later.',
    };
  }

  if (user.account_status !== 'active') {
    return {
      success: false,
      code: 'account_inactive',
      message: `Account is ${user.account_status}. Contact your institution admin.`,
    };
  }

  const valid = verifyPassword(password, user.password_hash);
  if (!valid) {
    incrementLoginAttempts(user.id, { maxAttempts: MAX_LOGIN_ATTEMPTS });
    const remaining = Math.max(0, MAX_LOGIN_ATTEMPTS - ((user.login_attempts || 0) + 1));
    return {
      success: false,
      code: 'invalid_credentials',
      message: `Invalid email or password. ${remaining} attempts remaining.`,
    };
  }

  resetLoginAttempts(user.id);
  updateUserLastSeen(user.id);

  const sessionId = createSession(user, { ipHash, userAgent });

  const requirePasswordChange = user.role === 'inst_admin' && !user.password_changed_at;

  return {
    success: true,
    sessionId,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      institutionId: user.institution_id,
      displayName: user.display_name,
      status: user.status,
      accountStatus: user.account_status,
      department: user.department,
    },
    requirePasswordChange,
  };
}

// ─────────────────────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────────────────────

function logout(sessionId) {
  if (sessionId) deleteSession(sessionId);
}

// ─────────────────────────────────────────────────────────────
// Auth middleware
// ─────────────────────────────────────────────────────────────

function requireAuth(req, res, next) {
  const sessionId = req.cookies?.scholars_session || req.headers['x-scholars-session'];
  if (!sessionId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const session = getSessionWithUser(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  // Immediate revocation enforcement: a disabled (or otherwise non-active)
  // account loses access the moment the next request arrives, regardless of
  // session expiry. The session itself is destroyed so it cannot be reused.
  if (session.user_account_status && session.user_account_status !== 'active') {
    deleteSession(sessionId);
    return res.status(403).json({
      error: 'Account is not active. Contact your institution admin.',
      code: 'account_inactive',
    });
  }
  req.scholarsSession = session;
  req.user = {
    id: session.user_id,
    email: session.email,
    role: session.role,
    institutionId: session.institution_id,
    displayName: session.display_name,
    status: session.user_status,
    accountStatus: session.user_account_status,
    department: session.department,
  };
  next();
}

// ─────────────────────────────────────────────────────────────
// Deprecated magic-link helpers
// ─────────────────────────────────────────────────────────────

/**
 * @deprecated Magic links are deprecated. Use password login instead.
 */
async function requestMagicLink(email) {
  const normalized = email.toLowerCase().trim();
  const domain = parseInstitutionDomain(normalized);
  let user = getUserByEmail(normalized);

  if (!user) {
    const institution = domain ? getInstitutionByDomain(domain) : null;
    createUser({
      email: normalized,
      institutionId: institution ? institution.id : null,
      role: 'student',
    });
    user = getUserByEmail(normalized);
  }

  const token = generateToken();
  magicTokens.set(token, {
    userId: user.id,
    email: normalized,
    expiresAt: Date.now() + MAGIC_TOKEN_TTL_MS,
  });

  const loginUrl = `/api/v1/scholars/auth/verify/?token=${token}`;

  console.log(`[Scholars Auth] Magic link for ${normalized}: ${loginUrl}`);

  return { token, loginUrl, email: normalized };
}

/**
 * @deprecated Magic links are deprecated. Use password login instead.
 */
function verifyMagicToken(token) {
  const record = magicTokens.get(token);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    magicTokens.delete(token);
    return null;
  }

  const user = getUserByEmail(record.email);
  if (!user) return null;

  magicTokens.delete(token);

  const sessionId = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  dbCreateSession({ id: sessionId, userId: user.id, expiresAt });
  updateUserLastSeen(user.id);

  return { sessionId, user };
}

function getSession(sessionId) {
  return getSessionWithUser(sessionId);
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  validateSession,
  login,
  logout,
  requireAuth,
  requestMagicLink,
  verifyMagicToken,
  getSession,
  hashEmail,
  parseInstitutionDomain,
};
