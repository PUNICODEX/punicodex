/**
 * PÚNYCODEX — Scholarly Edition Authentication
 *
 * Phase 1: email magic links.
 * Phase 2: OAuth2/SAML university SSO (placeholder hooks).
 */

const crypto = require('node:crypto');
const {
  getUserByEmail,
  createUser,
  createSession,
  getSessionWithUser,
  deleteSession,
  updateUserLastSeen,
  getInstitutionByDomain,
} = require('../db/scholars');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAGIC_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

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

/**
 * Request a magic login link.
 * In development, the token is logged to stdout.
 * In production, this should dispatch an email.
 */
async function requestMagicLink(email) {
  const normalized = email.toLowerCase().trim();
  const domain = parseInstitutionDomain(normalized);
  let user = getUserByEmail(normalized);

  if (!user) {
    // Auto-assign institution by email domain if known.
    const institution = domain ? getInstitutionByDomain(domain) : null;
    const result = createUser({
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

  const loginUrl = `/api/v1/scholars/auth/verify?token=${token}`;

  // TODO: replace with transactional email provider.
  console.log(`[Scholars Auth] Magic link for ${normalized}: ${loginUrl}`);

  return { token, loginUrl, email: normalized };
}

/**
 * Verify a magic token and create a session.
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
  createSession({ id: sessionId, userId: user.id, expiresAt });
  updateUserLastSeen(user.id);

  return { sessionId, user };
}

function getSession(sessionId) {
  return getSessionWithUser(sessionId);
}

function logout(sessionId) {
  deleteSession(sessionId);
}

function requireAuth(req, res, next) {
  const sessionId = req.cookies?.scholars_session || req.headers['x-scholars-session'];
  if (!sessionId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const session = getSession(sessionId);
  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }
  req.scholarsSession = session;
  req.user = {
    id: session.user_id,
    email: session.email,
    role: session.role,
    institutionId: session.institution_id,
    displayName: session.display_name,
    status: session.user_status,
  };
  next();
}

module.exports = {
  requestMagicLink,
  verifyMagicToken,
  getSession,
  logout,
  requireAuth,
  hashEmail,
  parseInstitutionDomain,
};
