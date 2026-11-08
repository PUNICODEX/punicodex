const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const operational = require('../db/operational');
const { migrate, migratePostgres } = require('../db/migrate-identity');

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_ROTATE_MS = 24 * 60 * 60 * 1000;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = Number(process.env.PUNICODEX_BCRYPT_ROUNDS) || 12;
const MIN_PASSWORD_LENGTH = 12;
const SESSION_COOKIE = 'punicodex_session';
const CSRF_COOKIE = 'punicodex_csrf';
const COMMERCE_CAPABILITIES = new Set(['store.purchase', 'sponsorship.book', 'patron.subscribe']);
const CAPABILITIES = new Set([
  'initiation.read',
  'store.purchase',
  'sponsorship.book',
  'sponsorship.manage',
  'patron.subscribe',
  'patron.manage',
  'analytics.view',
  'scholars.edit',
  'scholars.review',
  'scholars.curate',
  'creatives.upload',
  'institution.manage',
  'institution.invite',
  'authenticity.use',
]);

let schemaPromise = null;
let dummyHash = null;

function trackIdentityEvent(name, { accountId = null, req = null, properties = {} } = {}) {
  require('./product-analytics')
    .recordProductEvent(name, { accountId, req, properties })
    .catch(() => {});
}

function identityError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

async function ensureIdentitySchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      if (process.env.DATABASE_URL) {
        await migratePostgres();
      } else {
        const { getDb } = require('../db/connection');
        const { migrate: migrateTenant } = require('../db/migrate-tenant-portal');
        const { migrate: migrateScholars } = require('../db/migrate-scholars');
        const db = getDb();
        migrate(db);
        migrateTenant(db);
        migrateScholars(db);
      }
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase().slice(0, 254) : '';
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function randomToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function sanitizeAccount(row) {
  if (!row) return null;
  return {
    id: row.account_id || row.id,
    email: row.email,
    displayName: row.display_name || row.email.split('@')[0],
    status: row.status,
    hasPassword: Boolean(row.password_hash),
    emailVerifiedAt: row.email_verified_at || null,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at || null,
  };
}

async function getAccountByEmail(email) {
  await ensureIdentitySchema();
  return operational.get('SELECT * FROM accounts WHERE email = $1', [normalizeEmail(email)]);
}

async function getAccountById(id) {
  await ensureIdentitySchema();
  return operational.get('SELECT * FROM accounts WHERE id = $1', [id]);
}

async function getIdentityLinks(accountId) {
  await ensureIdentitySchema();
  return operational.all('SELECT * FROM identity_links WHERE account_id = $1 ORDER BY system', [
    accountId,
  ]);
}

async function linkIdentity(accountId, system, externalId, helpers = operational) {
  if (!['tenant', 'scholar'].includes(system) || externalId === null || externalId === undefined) {
    throw identityError(400, 'Invalid identity link', 'invalid_identity_link');
  }
  await helpers.run(
    `INSERT INTO identity_links (id, account_id, system, external_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (account_id, system) DO UPDATE SET external_id = EXCLUDED.external_id`,
    [crypto.randomUUID(), accountId, system, String(externalId)]
  );
}

async function provisionIdentity(
  { email, passwordHash = null, displayName = null, status = 'active', verified = false },
  helpers = operational
) {
  const normalized = normalizeEmail(email);
  if (!validEmail(normalized))
    throw identityError(400, 'A valid email is required', 'invalid_email');
  if (!['pending', 'active', 'disabled'].includes(status)) {
    throw identityError(400, 'Invalid account status', 'invalid_status');
  }
  const existing = await helpers.get('SELECT * FROM accounts WHERE email = $1', [normalized]);
  if (existing) return existing;
  const id = crypto.randomUUID();
  try {
    await helpers.run(
      `INSERT INTO accounts (id, email, password_hash, display_name, status, email_verified_at)
       VALUES ($1, $2, $3, $4, $5, ${verified ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
      [id, normalized, passwordHash, displayName, status]
    );
  } catch (err) {
    if (!/unique|duplicate/i.test(err.message)) throw err;
  }
  return helpers.get('SELECT * FROM accounts WHERE email = $1', [normalized]);
}

async function legacyRows(email) {
  await ensureIdentitySchema();
  const normalized = normalizeEmail(email);
  let tenant = null;
  let scholar = null;
  try {
    tenant = await operational.get('SELECT * FROM tenant_accounts WHERE email = $1', [normalized]);
  } catch (err) {
    if (!/no such table|does not exist/i.test(err.message)) throw err;
  }
  try {
    scholar = await operational.get('SELECT * FROM scholars_users WHERE email = $1', [normalized]);
  } catch (err) {
    if (!/no such table|does not exist/i.test(err.message)) throw err;
  }
  return { tenant, scholar };
}

async function provisionFromLegacy(email) {
  const { tenant, scholar } = await legacyRows(email);
  if (!tenant && !scholar) return null;
  const tenantActive = tenant?.status === 'active';
  const scholarActive = scholar?.account_status === 'active' && scholar?.status === 'active';
  const preferred = scholarActive ? scholar : tenantActive ? tenant : scholar || tenant;
  const account = await provisionIdentity({
    email,
    passwordHash: preferred?.password_hash || null,
    displayName: scholar?.display_name || null,
    status: tenantActive || scholarActive ? 'active' : 'disabled',
    verified: true,
  });
  const existingLinks = await getIdentityLinks(account.id);
  for (const [system, row] of [
    ['tenant', tenant],
    ['scholar', scholar],
  ]) {
    const existing = existingLinks.find((link) => link.system === system);
    if (row && existing && existing.external_id !== String(row.id)) {
      throw identityError(
        409,
        `Identity conflict for ${system} legacy profile ${row.id}`,
        'identity_conflict'
      );
    }
  }
  if (tenant) await linkIdentity(account.id, 'tenant', tenant.id);
  if (scholar) await linkIdentity(account.id, 'scholar', scholar.id);
  return getAccountById(account.id);
}

async function linkTenantAccount(email) {
  const { tenant } = await legacyRows(email);
  if (!tenant) return null;
  const account = (await getAccountByEmail(email)) || (await provisionFromLegacy(email));
  await linkIdentity(account.id, 'tenant', tenant.id);
  return getAccountById(account.id);
}

async function linkScholarAccount(email) {
  const { scholar } = await legacyRows(email);
  if (!scholar) return null;
  const account = (await getAccountByEmail(email)) || (await provisionFromLegacy(email));
  await linkIdentity(account.id, 'scholar', scholar.id);
  return getAccountById(account.id);
}

function parseCookies(req) {
  if (req.cookies) return req.cookies;
  const result = {};
  const raw = req.headers?.cookie || '';
  for (const part of String(raw).split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    try {
      result[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {}
  }
  return result;
}

function cookieOptions(httpOnly, maxAge) {
  return {
    httpOnly,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

function serializeCookie(name, value, options) {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path || '/'}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge / 1000)}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  return parts.join('; ');
}

function setCookie(res, name, value, options) {
  if (typeof res.cookie === 'function') return res.cookie(name, value, options);
  const existing = res.getHeader?.('Set-Cookie');
  const cookies = Array.isArray(existing) ? existing : existing ? [existing] : [];
  cookies.push(serializeCookie(name, value, options));
  res.setHeader('Set-Cookie', cookies);
}

function setSessionCookies(res, token, csrfToken, expiresAt) {
  if (!res) return;
  const maxAge = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  setCookie(res, SESSION_COOKIE, token, cookieOptions(true, maxAge));
  setCookie(res, CSRF_COOKIE, csrfToken, cookieOptions(false, maxAge));
}

function clearSessionCookies(res) {
  if (!res) return;
  for (const name of [SESSION_COOKIE, CSRF_COOKIE]) {
    if (typeof res.clearCookie === 'function') {
      res.clearCookie(name, { path: '/' });
    } else {
      setCookie(res, name, '', cookieOptions(name === SESSION_COOKIE, 0));
    }
  }
}

function bearerToken(req) {
  const header = req.headers?.authorization;
  return typeof header === 'string' && header.startsWith('Bearer ')
    ? header.slice('Bearer '.length).trim()
    : null;
}

async function createSession(accountId, { req, res, authLevel = 'password' } = {}) {
  await ensureIdentitySchema();
  const account = await getAccountById(accountId);
  if (account?.status !== 'active') {
    throw identityError(403, 'Account is not active', 'account_inactive');
  }
  const token = randomToken();
  const csrfToken = randomToken();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  const agent = req?.headers?.['user-agent'] || null;
  const ipHash = req ? hashToken(require('./client-ip').getClientIp(req)) : null;
  await operational.run(
    `INSERT INTO account_sessions
       (id, account_id, token_hash, csrf_hash, auth_version, auth_level, expires_at, ip_hash, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      accountId,
      hashToken(token),
      hashToken(csrfToken),
      account.auth_version,
      authLevel,
      expiresAt,
      ipHash,
      agent,
    ]
  );
  setSessionCookies(res, token, csrfToken, expiresAt);
  return {
    id,
    token,
    csrfToken,
    csrf_hash: hashToken(csrfToken),
    expiresAt,
    created_at: new Date().toISOString(),
    auth_level: authLevel,
  };
}

async function revokeSession(token) {
  if (!token) return;
  await ensureIdentitySchema();
  await operational.run(
    'UPDATE account_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
    [hashToken(token)]
  );
}

async function revokeAllSessions(accountId, helpers = operational) {
  await helpers.run(
    'UPDATE account_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE account_id = $1 AND revoked_at IS NULL',
    [accountId]
  );
  await helpers.run(
    "DELETE FROM tenant_sessions WHERE account_id IN (SELECT CAST(external_id AS INTEGER) FROM identity_links WHERE account_id = $1 AND system = 'tenant')",
    [accountId]
  );
  await helpers.run(
    "DELETE FROM scholars_sessions WHERE user_id IN (SELECT CAST(external_id AS INTEGER) FROM identity_links WHERE account_id = $1 AND system = 'scholar')",
    [accountId]
  );
}

async function resolveSession(req, res) {
  await ensureIdentitySchema();
  const cookies = parseCookies(req);
  const cookieToken = cookies[SESSION_COOKIE] || null;
  const token = cookieToken || bearerToken(req);
  if (!token) return null;
  const row = await operational.get(
    `SELECT s.*, a.id AS account_id, a.email, a.display_name, a.status, a.auth_version AS account_auth_version,
            a.created_at AS account_created_at, a.last_login_at, a.email_verified_at
       FROM account_sessions s
       JOIN accounts a ON a.id = s.account_id
      WHERE s.token_hash = $1 AND s.revoked_at IS NULL`,
    [hashToken(token)]
  );
  if (!row) return null;
  if (
    new Date(row.expires_at) <= new Date() ||
    row.status !== 'active' ||
    row.auth_version !== row.account_auth_version
  ) {
    await revokeAllSessions(row.account_id);
    clearSessionCookies(res);
    return null;
  }
  let session = row;
  if (cookieToken && Date.now() - new Date(row.created_at).getTime() >= SESSION_ROTATE_MS) {
    await revokeSession(cookieToken);
    session = await createSession(row.account_id, { req, res, authLevel: row.auth_level });
  }
  const account = sanitizeAccount(row);
  return { account, session, csrfProtected: Boolean(cookieToken) };
}

async function requireAccount(req, res, { write = false } = {}) {
  const resolved = await resolveSession(req, res);
  if (!resolved) {
    res.status(401).json({ error: 'Please sign in to continue.', code: 'unauthorized' });
    return false;
  }
  if (write && resolved.csrfProtected) {
    const supplied = req.headers?.['x-csrf-token'] || req.body?.csrfToken;
    if (!supplied || hashToken(supplied) !== resolved.session.csrf_hash) {
      res.status(403).json({
        error: 'Your session could not be verified. Refresh and try again.',
        code: 'csrf_required',
      });
      return false;
    }
  }
  return resolved;
}

function passwordHash(password) {
  if (
    typeof password !== 'string' ||
    password.length < MIN_PASSWORD_LENGTH ||
    password.length > 128
  ) {
    throw identityError(
      400,
      `Password must be ${MIN_PASSWORD_LENGTH}–128 characters`,
      'weak_password'
    );
  }
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

function verifyPassword(password, hash) {
  if (!dummyHash)
    dummyHash = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_ROUNDS);
  return bcrypt.compareSync(String(password || ''), hash || dummyHash);
}

async function login({ email, password, req, res }) {
  const normalized = normalizeEmail(email);
  let account = normalized ? await getAccountByEmail(normalized) : null;
  if (!account) account = await provisionFromLegacy(normalized);
  let valid = account && verifyPassword(password, account.password_hash);

  // Legacy admin/reset flows can change the source password directly. Accept a
  // valid linked credential once, rotate it into the canonical account, and
  // revoke older sessions before issuing the unified one.
  if (!valid) {
    const { tenant, scholar } = await legacyRows(normalized);
    const candidates = [tenant, scholar].filter(
      (row) =>
        row?.password_hash &&
        row.status === 'active' &&
        (row.account_status === undefined || row.account_status === 'active')
    );
    const matched = candidates.find((row) => verifyPassword(password, row.password_hash));
    if (matched) {
      if (!account) account = await provisionFromLegacy(normalized);
      if (tenant) await linkIdentity(account.id, 'tenant', tenant.id);
      if (scholar) await linkIdentity(account.id, 'scholar', scholar.id);
      await syncPassword(account.id, matched.password_hash);
      account = await getAccountById(account.id);
      valid = true;
    }
  }
  if (!valid) throw identityError(401, 'Invalid email or password', 'invalid_credentials');
  if (account.status !== 'active') {
    throw identityError(403, 'This account is not active. Contact support.', 'account_inactive');
  }
  await operational.run('UPDATE accounts SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [
    account.id,
  ]);
  const session = await createSession(account.id, { req, res });
  await recordAudit({
    accountId: account.id,
    action: 'identity.login',
    ipHash: req ? hashToken(require('./client-ip').getClientIp(req)) : null,
  });
  trackIdentityEvent('identity_login', { accountId: account.id, req });
  return { token: session.token, csrfToken: session.csrfToken, account: sanitizeAccount(account) };
}

async function logout(req, res) {
  const cookies = parseCookies(req);
  const resolved = await resolveSession(req, res);
  await revokeSession(cookies[SESSION_COOKIE] || bearerToken(req));
  if (resolved) trackIdentityEvent('identity_logout', { accountId: resolved.account.id, req });
  clearSessionCookies(res);
  return { success: true };
}

async function syncPassword(accountId, passwordHash) {
  await operational.run(
    'UPDATE accounts SET password_hash = $1, auth_version = auth_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [passwordHash, accountId]
  );
  await revokeAllSessions(accountId);
  await invalidateAccountTokens(accountId);
}

async function invalidateAccountTokens(accountId, helpers = operational) {
  await helpers.run(
    'UPDATE account_tokens SET used_at = CURRENT_TIMESTAMP WHERE account_id = $1 AND used_at IS NULL',
    [accountId]
  );
}

async function issueAccountToken(accountId, purpose) {
  if (!['activate', 'reset'].includes(purpose)) throw identityError(400, 'Invalid token purpose');
  await ensureIdentitySchema();
  const token = randomToken();
  await operational.run(
    'UPDATE account_tokens SET used_at = CURRENT_TIMESTAMP WHERE account_id = $1 AND purpose = $2 AND used_at IS NULL',
    [accountId, purpose]
  );
  await operational.run(
    'INSERT INTO account_tokens (token_hash, account_id, purpose, expires_at) VALUES ($1, $2, $3, $4)',
    [hashToken(token), accountId, purpose, new Date(Date.now() + TOKEN_TTL_MS).toISOString()]
  );
  return token;
}

async function register({ email, password }) {
  const normalized = normalizeEmail(email);
  if (!validEmail(normalized))
    throw identityError(400, 'A valid email is required', 'invalid_email');
  const hash = passwordHash(password);
  let account = await getAccountByEmail(normalized);
  if (!account) {
    const legacy = await legacyRows(normalized);
    account = await provisionIdentity({
      email: normalized,
      passwordHash: hash,
      status: 'pending',
      verified: false,
    });
    if (legacy.tenant) await linkIdentity(account.id, 'tenant', legacy.tenant.id);
    if (legacy.scholar) await linkIdentity(account.id, 'scholar', legacy.scholar.id);
  }
  let token = null;
  if (account.status === 'pending') token = await issueAccountToken(account.id, 'activate');
  if (token) trackIdentityEvent('identity_register', { accountId: account.id });
  return {
    account,
    token,
    message: 'If this email can be registered, an activation link has been sent.',
  };
}

async function forgot({ email }) {
  const normalized = normalizeEmail(email);
  let account = normalized ? await getAccountByEmail(normalized) : null;
  if (!account) account = await provisionFromLegacy(normalized);
  let token = null;
  if (account && account.status !== 'disabled')
    token = await issueAccountToken(account.id, 'reset');
  return {
    account,
    token,
    message: 'If an account exists for this email, a reset link has been sent.',
  };
}

async function classifySetupToken(token) {
  await ensureIdentitySchema();
  const tokenHash = hashToken(token || '');
  const invitation = await operational.get(
    'SELECT id FROM account_invitations WHERE token_hash = $1',
    [tokenHash]
  );
  if (invitation) return 'invitation';
  const central = await operational.get(
    'SELECT token_hash FROM account_tokens WHERE token_hash = $1',
    [tokenHash]
  );
  if (central) return 'account';
  const tenant = await operational.get('SELECT token FROM tenant_tokens WHERE token = $1', [
    tokenHash,
  ]);
  return tenant ? 'tenant' : 'unknown';
}

async function setPassword({ token, password, req, res }) {
  const hash = passwordHash(password);
  const tokenHash = hashToken(token || '');
  const row = await operational.get('SELECT * FROM account_tokens WHERE token_hash = $1', [
    tokenHash,
  ]);
  if (!row || row.used_at || new Date(row.expires_at) <= new Date()) {
    throw identityError(400, 'This setup link is invalid or has expired.', 'invalid_token');
  }
  const consumed = await operational.run(
    'UPDATE account_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = $1 AND used_at IS NULL',
    [tokenHash]
  );
  if (consumed.changes !== 1)
    throw identityError(400, 'This setup link is invalid or has expired.', 'invalid_token');
  const account = await getAccountById(row.account_id);
  if (!account || account.status === 'disabled')
    throw identityError(400, 'This setup link is invalid or has expired.', 'invalid_token');
  await operational.run(
    `UPDATE accounts SET password_hash = $1, status = 'active', email_verified_at = CURRENT_TIMESTAMP,
       auth_version = auth_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [hash, account.id]
  );
  await revokeAllSessions(account.id);
  await invalidateAccountTokens(account.id);
  const session = await createSession(account.id, { req, res });
  await recordAudit({ accountId: account.id, action: `identity.${row.purpose}_complete` });
  trackIdentityEvent(row.purpose === 'activate' ? 'identity_activate' : 'identity_reset', {
    accountId: account.id,
    req,
  });
  return {
    token: session.token,
    csrfToken: session.csrfToken,
    account: sanitizeAccount(await getAccountById(account.id)),
  };
}

async function recordAudit(
  {
    accountId = null,
    actorAccountId = null,
    actorAdminId = null,
    action,
    resourceType = null,
    resourceId = null,
    details = {},
    ipHash = null,
  },
  helpers = operational
) {
  await helpers.run(
    `INSERT INTO account_audit_log
       (id, account_id, actor_account_id, actor_admin_id, action, resource_type, resource_id, details, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      crypto.randomUUID(),
      accountId,
      actorAccountId,
      actorAdminId,
      action,
      resourceType,
      resourceId,
      JSON.stringify(details),
      ipHash,
    ]
  );
}

async function getTenantProfile(accountId) {
  const row = await operational.get(
    `SELECT t.* FROM tenant_accounts t
       JOIN identity_links l ON l.system = 'tenant' AND CAST(l.external_id AS INTEGER) = t.id
      WHERE l.account_id = $1`,
    [accountId]
  );
  return row || null;
}

async function getScholarProfiles(accountId) {
  return operational.all(
    `SELECT u.id, u.email, u.role, u.department, u.display_name, u.status, u.account_status,
            u.institution_id, i.name AS institution_name, i.slug AS institution_slug,
            i.sponsorship_status, i.sponsorship_expires_at
       FROM scholars_users u
       JOIN identity_links l ON l.system = 'scholar' AND CAST(l.external_id AS INTEGER) = u.id
       LEFT JOIN scholars_institutions i ON i.id = u.institution_id
      WHERE l.account_id = $1`,
    [accountId]
  );
}

function scholarIsActive(profile) {
  return profile?.status === 'active' && profile?.account_status === 'active';
}

function institutionIsActive(profile) {
  if (profile?.sponsorship_status !== 'active') return false;
  const value = profile.sponsorship_expires_at;
  if (!value) return true;
  const raw = value instanceof Date ? value.toISOString() : String(value).trim();
  if (!raw) return true;
  const iso = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`;
  const expiresAt = Date.parse(withZone);
  return Number.isNaN(expiresAt) || expiresAt > Date.now();
}

async function policyAllows(profile, capability, fallback) {
  const department = profile.department || '';
  const rows = await operational.all(
    `SELECT effect, department FROM institution_capability_policies
      WHERE institution_id = $1 AND capability = $2 AND department IN ($3, '')`,
    [profile.institution_id, capability, department]
  );
  const exact = rows.find((row) => row.department === department && department !== '');
  return (exact || rows[0])?.effect ? Boolean((exact || rows[0]).effect === 'allow') : fallback;
}

async function getCapabilities(accountOrId) {
  const account = typeof accountOrId === 'string' ? { id: accountOrId } : accountOrId;
  const capabilities = new Set(['initiation.read', 'authenticity.use']);
  const [tenant, scholars] = await Promise.all([
    getTenantProfile(account.id),
    getScholarProfiles(account.id),
  ]);
  const scholar = scholars.find(
    (profile) => scholarIsActive(profile) && institutionIsActive(profile)
  );
  if (!scholar) capabilities.add('store.purchase');

  if (tenant?.status === 'active') {
    if (tenant.is_sponsor) {
      capabilities.add('sponsorship.book');
      capabilities.add('sponsorship.manage');
      capabilities.add('analytics.view');
    }
    if (tenant.is_patron) {
      capabilities.add('patron.subscribe');
      capabilities.add('patron.manage');
    }
  }

  if (scholar) {
    const roleRank = { student: 0, reviewer: 1, dept_admin: 2, inst_admin: 3, curator: 4 };
    if (await policyAllows(scholar, 'scholars.edit', true)) capabilities.add('scholars.edit');
    if (await policyAllows(scholar, 'creatives.upload', true)) capabilities.add('creatives.upload');
    if (!(await policyAllows(scholar, 'authenticity.use', true)))
      capabilities.delete('authenticity.use');
    if (roleRank[scholar.role] >= 1) capabilities.add('scholars.review');
    if (roleRank[scholar.role] >= 2) {
      capabilities.add('institution.manage');
      capabilities.add('institution.invite');
    }
    if (roleRank[scholar.role] >= 4) capabilities.add('scholars.curate');
    for (const capability of COMMERCE_CAPABILITIES) {
      if (await policyAllows(scholar, capability, false)) capabilities.add(capability);
    }
  }
  return [...capabilities].sort();
}

function totalInitiationChapters() {
  const { ASCENT, DESCENT } = require('../../scripts/arche-chapters');
  return 1 + ASCENT.length + 1 + DESCENT.length + 1;
}

async function getInitiation(accountId) {
  const row = await operational.get('SELECT * FROM account_initiation WHERE account_id = $1', [
    accountId,
  ]);
  return {
    currentChapter: Number(row?.current_chapter || 0),
    totalChapters: totalInitiationChapters(),
    completedAt: row?.completed_at || null,
    updatedAt: row?.updated_at || null,
  };
}

async function updateInitiation(accountId, { currentChapter, completed = false }) {
  const chapter = Math.max(0, Math.min(1000, Number(currentChapter) || 0));
  await operational.run(
    `INSERT INTO account_initiation (account_id, current_chapter, completed_at, updated_at)
     VALUES ($1, $2, ${completed ? 'CURRENT_TIMESTAMP' : 'NULL'}, CURRENT_TIMESTAMP)
     ON CONFLICT (account_id) DO UPDATE SET current_chapter = EXCLUDED.current_chapter,
       completed_at = ${completed ? 'CURRENT_TIMESTAMP' : 'account_initiation.completed_at'}, updated_at = CURRENT_TIMESTAMP`,
    [accountId, chapter]
  );
  trackIdentityEvent('initiation_progress', {
    accountId,
    properties: { chapter, totalChapters: totalInitiationChapters(), completed },
  });
  return getInitiation(accountId);
}

async function getOrders(accountOrEmail) {
  const email = normalizeEmail(
    typeof accountOrEmail === 'string' ? accountOrEmail : accountOrEmail.email
  );
  if (!email) return [];
  const rows = await operational.all(
    `SELECT order_ref, product_id, product_name, variant_label, quantity, unit_price_cents,
            gross_cents, status, tracking_url, carrier, created_at
       FROM store_orders WHERE LOWER(customer_email) = $1 ORDER BY created_at DESC LIMIT 100`,
    [email]
  );
  return rows.map((row) => ({
    orderRef: row.order_ref,
    productId: row.product_id,
    productName: row.product_name,
    variantLabel: row.variant_label,
    quantity: Number(row.quantity || 0),
    unitPriceCents: Number(row.unit_price_cents || 0),
    grossCents: Number(row.gross_cents || 0),
    status: row.status,
    trackingUrl: row.tracking_url || null,
    carrier: row.carrier || null,
    createdAt: row.created_at,
  }));
}

async function getMe(account) {
  const [links, capabilities, scholars, initiation] = await Promise.all([
    getIdentityLinks(account.id),
    getCapabilities(account),
    getScholarProfiles(account.id),
    getInitiation(account.id),
  ]);
  return {
    account: sanitizeAccount(account),
    identity: {
      linkedSystems: links.map((link) => link.system),
      scholars: scholars.map((profile) => ({
        role: profile.role,
        department: profile.department,
        institutionId: profile.institution_id,
        institutionName: profile.institution_name,
        sponsorshipStatus: profile.sponsorship_status,
        sponsorshipExpiresAt: profile.sponsorship_expires_at,
      })),
      initiation,
    },
    capabilities,
  };
}

function roleRank(role) {
  return { student: 0, reviewer: 1, dept_admin: 2, inst_admin: 3, curator: 4 }[role] ?? -1;
}

async function institutionActor(accountId) {
  const profiles = await getScholarProfiles(accountId);
  const active = profiles.filter(
    (profile) => scholarIsActive(profile) && institutionIsActive(profile)
  );
  active.sort((a, b) => roleRank(b.role) - roleRank(a.role));
  const actor = active[0];
  if (!actor || roleRank(actor.role) < 2) {
    throw identityError(
      403,
      'Institution administration access is required',
      'institution_forbidden'
    );
  }
  return actor;
}

function assertActorScope(actor, department, role) {
  if (actor.role === 'dept_admin') {
    if (!actor.department || department !== actor.department || role !== 'student') {
      throw identityError(
        403,
        'Department admins may invite students only within their own department',
        'scope_forbidden'
      );
    }
  } else if (department && !['inst_admin', 'curator'].includes(actor.role)) {
    throw identityError(403, 'Institution-wide access is required', 'scope_forbidden');
  }
}

async function createInvitations(accountId, { emails, department = null, role = 'student' }) {
  const actor = await institutionActor(accountId);
  if (!['student', 'reviewer', 'dept_admin', 'inst_admin'].includes(role)) {
    throw identityError(400, 'Invalid academic role', 'invalid_role');
  }
  assertActorScope(actor, department, role);
  if (!Array.isArray(emails) || emails.length === 0 || emails.length > 100) {
    throw identityError(400, 'Provide between 1 and 100 email addresses', 'invalid_batch');
  }
  const normalized = [...new Set(emails.map(normalizeEmail).filter(Boolean))];
  if (normalized.some((email) => !validEmail(email))) {
    throw identityError(400, 'One or more email addresses are invalid', 'invalid_email');
  }
  const items = [];
  for (const email of normalized) {
    const { scholar } = await legacyRows(email);
    if (scholar && scholarIsActive(scholar)) {
      items.push({ email, status: 'existing' });
      continue;
    }
    await operational.run(
      `UPDATE account_invitations SET status = 'revoked'
        WHERE email = $1 AND institution_id = $2 AND status = 'pending'`,
      [email, actor.institution_id]
    );
    const id = crypto.randomUUID();
    const token = randomToken();
    await operational.run(
      `INSERT INTO account_invitations
         (id, email, institution_id, department, role, token_hash, invited_by, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        email,
        actor.institution_id,
        department,
        role,
        hashToken(token),
        accountId,
        new Date(Date.now() + INVITATION_TTL_MS).toISOString(),
      ]
    );
    items.push({
      id,
      email,
      department,
      role,
      status: 'pending',
      setupPath: `/account/login/?token=${encodeURIComponent(token)}`,
    });
  }
  await recordAudit({
    accountId,
    actorAccountId: accountId,
    action: 'institution.invitations_created',
    resourceType: 'institution',
    resourceId: actor.institution_id,
    details: { count: items.length, department, role },
  });
  trackIdentityEvent('institution_invitation_created', {
    accountId,
    properties: { count: items.filter((item) => item.status === 'pending').length, role },
  });
  return items;
}

async function listInvitations(accountId) {
  const actor = await institutionActor(accountId);
  const where = actor.role === 'dept_admin' ? 'AND department = $2' : '';
  const params = [actor.institution_id];
  if (actor.role === 'dept_admin') params.push(actor.department);
  return operational.all(
    `SELECT id, email, institution_id, department, role, status, expires_at, accepted_at, created_at
       FROM account_invitations WHERE institution_id = $1 ${where} ORDER BY created_at DESC LIMIT 250`,
    params
  );
}

async function revokeInvitation(accountId, invitationId) {
  const actor = await institutionActor(accountId);
  const invitation = await operational.get('SELECT * FROM account_invitations WHERE id = $1', [
    invitationId,
  ]);
  if (!invitation || invitation.institution_id !== actor.institution_id) {
    throw identityError(404, 'Invitation not found', 'invitation_not_found');
  }
  assertActorScope(actor, invitation.department, invitation.role);
  await operational.run(
    "UPDATE account_invitations SET status = 'revoked' WHERE id = $1 AND status = 'pending'",
    [invitationId]
  );
  await recordAudit({
    accountId,
    actorAccountId: accountId,
    action: 'institution.invitation_revoked',
    resourceType: 'invitation',
    resourceId: invitationId,
  });
  return { success: true };
}

async function acceptInvitation({ token, password, req, res }) {
  const hash = passwordHash(password);
  const tokenHash = hashToken(token || '');
  const invitation = await operational.get(
    'SELECT * FROM account_invitations WHERE token_hash = $1',
    [tokenHash]
  );
  if (invitation?.status !== 'pending' || new Date(invitation.expires_at) <= new Date()) {
    throw identityError(400, 'This invitation is invalid or has expired.', 'invalid_invitation');
  }
  const account = await operational.transaction(async (tx) => {
    const consumed = await tx.run(
      "UPDATE account_invitations SET status = 'accepted', accepted_at = CURRENT_TIMESTAMP WHERE token_hash = $1 AND status = 'pending'",
      [tokenHash]
    );
    if (consumed.changes !== 1)
      throw identityError(400, 'This invitation is invalid or has expired.', 'invalid_invitation');
    let scholar = await tx.get('SELECT * FROM scholars_users WHERE email = $1', [invitation.email]);
    if (!scholar) {
      await tx.run(
        `INSERT INTO scholars_users (email, institution_id, role, department, password_hash, status, account_status)
         VALUES ($1, $2, $3, $4, $5, 'active', 'active')`,
        [invitation.email, invitation.institution_id, invitation.role, invitation.department, hash]
      );
      scholar = await tx.get('SELECT * FROM scholars_users WHERE email = $1', [invitation.email]);
    }
    if (!scholar)
      throw identityError(500, 'Could not provision the academic profile', 'provision_failed');
    await tx.run(
      `UPDATE scholars_users SET institution_id = $1, role = $2, department = $3, password_hash = $4,
         status = 'active', account_status = 'active' WHERE id = $5`,
      [invitation.institution_id, invitation.role, invitation.department, hash, scholar.id]
    );
    const existing = await tx.get('SELECT * FROM accounts WHERE email = $1', [invitation.email]);
    if (existing?.status === 'disabled')
      throw identityError(403, 'This account is disabled. Contact support.', 'account_inactive');
    const account = await provisionIdentity(
      {
        email: invitation.email,
        passwordHash: hash,
        status: 'active',
        verified: true,
      },
      tx
    );
    await tx.run(
      `UPDATE accounts SET password_hash = $1, status = 'active', email_verified_at = CURRENT_TIMESTAMP,
         auth_version = auth_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [hash, account.id]
    );
    await linkIdentity(account.id, 'scholar', scholar.id, tx);
    await revokeAllSessions(account.id, tx);
    await invalidateAccountTokens(account.id, tx);
    return account;
  });
  const session = await createSession(account.id, { req, res });
  await recordAudit({
    accountId: account.id,
    actorAccountId: account.id,
    action: 'institution.invitation_accepted',
    resourceType: 'institution',
    resourceId: invitation.institution_id,
  });
  trackIdentityEvent('institution_invitation_accepted', {
    accountId: account.id,
    req,
    properties: { role: invitation.role },
  });
  return {
    token: session.token,
    csrfToken: session.csrfToken,
    account: sanitizeAccount(await getAccountById(account.id)),
  };
}

async function setInstitutionPolicy(accountId, { capability, effect, department = '' }) {
  const actor = await institutionActor(accountId);
  const allowed = new Set([
    ...COMMERCE_CAPABILITIES,
    'scholars.edit',
    'creatives.upload',
    'authenticity.use',
  ]);
  if (!allowed.has(capability) || !['allow', 'deny'].includes(effect)) {
    throw identityError(400, 'Invalid capability policy', 'invalid_policy');
  }
  if (actor.role === 'dept_admin' && department !== actor.department) {
    throw identityError(
      403,
      'Department admins may set policy only for their own department',
      'scope_forbidden'
    );
  }
  if (department && !['inst_admin', 'curator', 'dept_admin'].includes(actor.role)) {
    throw identityError(403, 'Institution-wide access is required', 'scope_forbidden');
  }
  await operational.run(
    `INSERT INTO institution_capability_policies (id, institution_id, department, capability, effect, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (institution_id, department, capability) DO UPDATE SET effect = EXCLUDED.effect,
       updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP`,
    [crypto.randomUUID(), actor.institution_id, department, capability, effect, accountId]
  );
  await recordAudit({
    accountId,
    actorAccountId: accountId,
    action: 'institution.policy_updated',
    resourceType: 'institution',
    resourceId: actor.institution_id,
    details: { department, capability, effect },
  });
  trackIdentityEvent('institution_policy_updated', {
    accountId,
    properties: { capability, effect },
  });
  return { institutionId: actor.institution_id, department, capability, effect };
}

async function listInstitutionPolicies(accountId) {
  const actor = await institutionActor(accountId);
  return operational.all(
    'SELECT * FROM institution_capability_policies WHERE institution_id = $1 ORDER BY department, capability',
    [actor.institution_id]
  );
}

async function adminListAccounts({ search = '', limit = 50, offset = 0 } = {}) {
  const take = Math.min(100, Math.max(1, Number(limit) || 50));
  const skip = Math.max(0, Number(offset) || 0);
  const term = `%${String(search).trim().toLowerCase()}%`;
  const rows = await operational.all(
    `SELECT a.id, a.email, a.display_name, a.status, a.created_at, a.last_login_at,
       (SELECT COUNT(*) FROM account_sessions s WHERE s.account_id = a.id AND s.revoked_at IS NULL) AS session_count,
       (SELECT COUNT(*) FROM identity_links l WHERE l.account_id = a.id) AS link_count
       FROM accounts a WHERE LOWER(a.email) LIKE $1 ORDER BY a.created_at DESC LIMIT $2 OFFSET $3`,
    [term, take, skip]
  );
  const count = await operational.get(
    'SELECT COUNT(*) AS c FROM accounts WHERE LOWER(email) LIKE $1',
    [term]
  );
  return { items: rows, total: Number(count?.c || 0), limit: take, offset: skip };
}

async function adminGetAccount(accountId) {
  const account = await getAccountById(accountId);
  if (!account) throw identityError(404, 'Account not found', 'account_not_found');
  const [me, audit] = await Promise.all([
    getMe(account),
    operational.all(
      'SELECT * FROM account_audit_log WHERE account_id = $1 OR actor_account_id = $2 ORDER BY created_at DESC LIMIT 100',
      [accountId, accountId]
    ),
  ]);
  return { ...me, audit };
}

async function adminSetAccountStatus(actorAdminId, accountId, status) {
  if (!['active', 'disabled'].includes(status))
    throw identityError(400, 'Invalid account status', 'invalid_status');
  const account = await getAccountById(accountId);
  if (!account) throw identityError(404, 'Account not found', 'account_not_found');
  await operational.run(
    'UPDATE accounts SET status = $1, auth_version = auth_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [status, accountId]
  );
  const links = await getIdentityLinks(accountId);
  for (const link of links) {
    if (link.system === 'tenant') {
      await operational.run(
        'UPDATE tenant_accounts SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [status, link.external_id]
      );
    } else {
      await operational.run(
        'UPDATE scholars_users SET status = $1, account_status = $1 WHERE id = $2',
        [status, link.external_id]
      );
    }
  }
  await revokeAllSessions(accountId);
  await recordAudit({
    accountId,
    actorAdminId,
    action: `admin.account_${status}`,
    resourceType: 'account',
    resourceId: accountId,
  });
  trackIdentityEvent('account_status_changed', { accountId, properties: { status } });
  return getAccountById(accountId);
}

module.exports = {
  CAPABILITIES,
  COMMERCE_CAPABILITIES,
  SESSION_COOKIE,
  CSRF_COOKIE,
  ensureIdentitySchema,
  normalizeEmail,
  validEmail,
  hashToken,
  sanitizeAccount,
  getAccountByEmail,
  getAccountById,
  getIdentityLinks,
  getTenantProfile,
  getScholarProfiles,
  linkIdentity,
  provisionIdentity,
  provisionFromLegacy,
  linkTenantAccount,
  linkScholarAccount,
  parseCookies,
  createSession,
  revokeSession,
  revokeAllSessions,
  resolveSession,
  requireAccount,
  passwordHash,
  verifyPassword,
  login,
  logout,
  register,
  forgot,
  classifySetupToken,
  setPassword,
  syncPassword,
  issueAccountToken,
  getCapabilities,
  getInitiation,
  updateInitiation,
  getOrders,
  getMe,
  createInvitations,
  listInvitations,
  revokeInvitation,
  acceptInvitation,
  setInstitutionPolicy,
  listInstitutionPolicies,
  adminListAccounts,
  adminGetAccount,
  adminSetAccountStatus,
  recordAudit,
};
