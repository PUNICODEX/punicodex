/**
 * PuniCodex API v1 — API key management (admin only)
 */

const crypto = require('node:crypto');
const { get, all, run, insert } = require('../db/operational');
const { hashKey } = require('./api-auth.js');
const { logAction } = require('./admin-actions.js');

/**
 * Normalize the audit actor into logAction fields. The Vercel handlers pass
 * requireAdmin's req.adminActor ({ adminUserId } for portal superadmins,
 * { adminToken } for legacy tokens); the local platform server passes the
 * raw x-admin-token string (hashed at rest by logAction).
 */
function auditActorFields(actor) {
  if (actor && typeof actor === 'object') {
    if (actor.adminUserId != null) return { adminUserId: actor.adminUserId };
    if (actor.user?.id != null) return { adminUserId: actor.user.id };
    if (actor.adminToken) return { adminToken: actor.adminToken };
  }
  if (typeof actor === 'string' && actor) return { adminToken: actor };
  return {};
}

const VALID_SCOPES = new Set(['names:read', 'names:write', 'admin']);
const VALID_TIERS = new Set(['free', 'hobby', 'pro', 'enterprise']);

const DEFAULT_TIER_LIMITS = {
  free: 100,
  hobby: 1000,
  pro: 10000,
  enterprise: 100000,
};

function validateScopes(scopes) {
  if (!Array.isArray(scopes)) return { valid: false, error: 'scopes must be an array' };
  for (const scope of scopes) {
    if (!VALID_SCOPES.has(scope)) {
      return { valid: false, error: `Invalid scope: ${scope}` };
    }
  }
  return { valid: true };
}

function validateTier(tier) {
  if (!VALID_TIERS.has(tier)) {
    return {
      valid: false,
      error: `Invalid tier: ${tier}. Must be one of: ${[...VALID_TIERS].join(', ')}`,
    };
  }
  return { valid: true };
}

function generateKey() {
  return `pk_punicodex_${crypto.randomBytes(24).toString('hex')}`;
}

function serializeScopes(scopes) {
  if (!scopes) return '[]';
  return JSON.stringify(scopes);
}

function parseScopes(scopes) {
  if (!scopes) return [];
  try {
    return JSON.parse(scopes);
  } catch {
    return [];
  }
}

function toKeyRow(row) {
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    scopes: parseScopes(row.scopes),
    rateLimit: row.rate_limit,
    requestCount: row.request_count,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
    isRevoked: !!row.revoked_at,
  };
}

async function listKeys() {
  const rows = await all(
    `
      SELECT id, name, tier, scopes, rate_limit, request_count, created_at, last_used_at, revoked_at
      FROM api_keys
      ORDER BY created_at DESC
    `,
    []
  );
  return rows.map(toKeyRow);
}

async function getKeyById(id) {
  const row = await get(
    `
      SELECT id, name, tier, scopes, rate_limit, request_count, created_at, last_used_at, revoked_at
      FROM api_keys WHERE id = $1
    `,
    [id]
  );
  return row ? toKeyRow(row) : null;
}

async function createKey(
  { name, tier = 'free', scopes = ['names:read'], rateLimit = null },
  actor = null
) {
  const tierValidation = validateTier(tier);
  if (!tierValidation.valid) throw new Error(tierValidation.error);

  const scopeValidation = validateScopes(scopes);
  if (!scopeValidation.valid) throw new Error(scopeValidation.error);

  const finalRateLimit = rateLimit || DEFAULT_TIER_LIMITS[tier] || DEFAULT_TIER_LIMITS.free;
  const plaintext = generateKey();
  const keyHash = hashKey(plaintext);

  const id = await insert(
    `
      INSERT INTO api_keys (key_hash, name, tier, scopes, rate_limit)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [keyHash, name || null, tier, serializeScopes(scopes), finalRateLimit]
  );

  // Audit the mutation — key id + action + non-secret metadata, NEVER the
  // plaintext secret (it is shown to the caller exactly once, below).
  await logAction({
    ...auditActorFields(actor),
    action: 'admin.api-keys.create',
    target: `api_key:${id}`,
    meta: { name: name || null, tier, scopes, rateLimit: finalRateLimit },
  });

  return {
    id,
    plaintext,
    name: name || null,
    tier,
    scopes,
    rateLimit: finalRateLimit,
  };
}

async function updateKey(id, { name, tier, scopes, rateLimit }, actor = null) {
  const key = await getKeyById(id);
  if (!key) return null;

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push(`name = $${params.length + 1}`);
    params.push(name || null);
  }
  if (tier !== undefined) {
    const tierValidation = validateTier(tier);
    if (!tierValidation.valid) throw new Error(tierValidation.error);
    updates.push(`tier = $${params.length + 1}`);
    params.push(tier);
  }
  if (scopes !== undefined) {
    const scopeValidation = validateScopes(scopes);
    if (!scopeValidation.valid) throw new Error(scopeValidation.error);
    updates.push(`scopes = $${params.length + 1}`);
    params.push(serializeScopes(scopes));
  }
  if (rateLimit !== undefined) {
    // Coerce to a positive integer; garbage is a client error (400), never
    // something we silently persist into the rate-limit column.
    const parsed = Number(rateLimit);
    if (!Number.isInteger(parsed) || parsed < 1) {
      const err = new Error('rateLimit must be a positive integer');
      err.status = 400;
      throw err;
    }
    updates.push(`rate_limit = $${params.length + 1}`);
    params.push(parsed);
  }

  if (updates.length === 0) return key;

  params.push(id);
  await run(`UPDATE api_keys SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

  const meta = {};
  if (name !== undefined) meta.name = name || null;
  if (tier !== undefined) meta.tier = tier;
  if (scopes !== undefined) meta.scopes = scopes;
  if (rateLimit !== undefined) meta.rateLimit = Number(rateLimit);
  await logAction({
    ...auditActorFields(actor),
    action: 'admin.api-keys.update',
    target: `api_key:${id}`,
    meta,
  });

  return getKeyById(id);
}

async function revokeKey(id, actor = null) {
  const existing = await getKeyById(id);
  if (!existing) return null;
  await run('UPDATE api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
  await logAction({
    ...auditActorFields(actor),
    action: 'admin.api-keys.revoke',
    target: `api_key:${id}`,
    meta: { name: existing.name, tier: existing.tier },
  });
  return getKeyById(id);
}

async function unrevokeKey(id, actor = null) {
  const existing = await getKeyById(id);
  if (!existing) return null;
  await run('UPDATE api_keys SET revoked_at = NULL WHERE id = $1', [id]);
  await logAction({
    ...auditActorFields(actor),
    action: 'admin.api-keys.unrevoke',
    target: `api_key:${id}`,
    meta: { name: existing.name, tier: existing.tier },
  });
  return getKeyById(id);
}

async function getKeyUsage(id, options = {}) {
  const { days = 7, limit = 100 } = options;

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const daily = await all(
    `
      SELECT date(created_at) as day, COUNT(*) as requests
      FROM api_request_log
      WHERE key_id = $1 AND created_at >= $2
      GROUP BY date(created_at)
      ORDER BY day DESC
    `,
    [id, sinceIso]
  );

  const recent = await all(
    `
      SELECT request_id, method, path, status_code, duration_ms, created_at
      FROM api_request_log
      WHERE key_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `,
    [id, limit]
  );

  return {
    id,
    days,
    daily,
    recent,
    totalRecent: recent.length,
  };
}

async function getKeyStats() {
  const totalRow = await get('SELECT COUNT(*) as c FROM api_keys');
  const activeRow = await get('SELECT COUNT(*) as c FROM api_keys WHERE revoked_at IS NULL');
  const revokedRow = await get('SELECT COUNT(*) as c FROM api_keys WHERE revoked_at IS NOT NULL');

  const today = new Date().toISOString().slice(0, 10);
  const requestsTodayRow = await get(
    'SELECT COUNT(*) as c FROM api_request_log WHERE date(created_at) = $1',
    [today]
  );

  return {
    total: totalRow?.c || 0,
    active: activeRow?.c || 0,
    revoked: revokedRow?.c || 0,
    requestsToday: requestsTodayRow?.c || 0,
  };
}

module.exports = {
  listKeys,
  getKeyById,
  createKey,
  updateKey,
  revokeKey,
  unrevokeKey,
  getKeyUsage,
  getKeyStats,
  VALID_SCOPES,
  VALID_TIERS,
  DEFAULT_TIER_LIMITS,
};
