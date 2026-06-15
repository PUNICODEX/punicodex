/**
 * PÚNYCODEX API v1 — API key management (admin only)
 */

const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');
const { hashKey } = require('./api-auth.js');

const VALID_SCOPES = new Set(['names:read', 'names:write', 'admin']);
const VALID_TIERS = new Set(['free', 'hobby', 'pro', 'enterprise']);

const DEFAULT_TIER_LIMITS = {
  free: 100,
  hobby: 1000,
  pro: 10000,
  enterprise: 100000,
};

function getDb() {
  const db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  return db;
}

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
  return `pk_punycodex_${crypto.randomBytes(24).toString('hex')}`;
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

function listKeys() {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT id, name, tier, scopes, rate_limit, request_count, created_at, last_used_at, revoked_at
      FROM api_keys
      ORDER BY created_at DESC
    `
    )
    .all();
  db.close();
  return rows.map(toKeyRow);
}

function getKeyById(id) {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT id, name, tier, scopes, rate_limit, request_count, created_at, last_used_at, revoked_at
      FROM api_keys WHERE id = ?
    `
    )
    .get(id);
  db.close();
  return row ? toKeyRow(row) : null;
}

function createKey({ name, tier = 'free', scopes = ['names:read'], rateLimit = null }) {
  const tierValidation = validateTier(tier);
  if (!tierValidation.valid) throw new Error(tierValidation.error);

  const scopeValidation = validateScopes(scopes);
  if (!scopeValidation.valid) throw new Error(scopeValidation.error);

  const finalRateLimit = rateLimit || DEFAULT_TIER_LIMITS[tier] || DEFAULT_TIER_LIMITS.free;
  const plaintext = generateKey();
  const keyHash = hashKey(plaintext);

  const db = getDb();
  const result = db
    .prepare(
      `
      INSERT INTO api_keys (key_hash, name, tier, scopes, rate_limit)
      VALUES (?, ?, ?, ?, ?)
    `
    )
    .run(keyHash, name || null, tier, serializeScopes(scopes), finalRateLimit);
  db.close();

  return {
    id: result.lastInsertRowid,
    plaintext,
    name: name || null,
    tier,
    scopes,
    rateLimit: finalRateLimit,
  };
}

function updateKey(id, { name, tier, scopes, rateLimit }) {
  const key = getKeyById(id);
  if (!key) return null;

  const updates = [];
  const params = [];

  if (name !== undefined) {
    updates.push('name = ?');
    params.push(name || null);
  }
  if (tier !== undefined) {
    const tierValidation = validateTier(tier);
    if (!tierValidation.valid) throw new Error(tierValidation.error);
    updates.push('tier = ?');
    params.push(tier);
  }
  if (scopes !== undefined) {
    const scopeValidation = validateScopes(scopes);
    if (!scopeValidation.valid) throw new Error(scopeValidation.error);
    updates.push('scopes = ?');
    params.push(serializeScopes(scopes));
  }
  if (rateLimit !== undefined) {
    updates.push('rate_limit = ?');
    params.push(rateLimit);
  }

  if (updates.length === 0) return key;

  params.push(id);
  const db = getDb();
  db.prepare(`UPDATE api_keys SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  db.close();

  return getKeyById(id);
}

function revokeKey(id) {
  const db = getDb();
  db.prepare('UPDATE api_keys SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?').run(id);
  db.close();
  return getKeyById(id);
}

function unrevokeKey(id) {
  const db = getDb();
  db.prepare('UPDATE api_keys SET revoked_at = NULL WHERE id = ?').run(id);
  db.close();
  return getKeyById(id);
}

function getKeyUsage(id, options = {}) {
  const { days = 7, limit = 100 } = options;
  const db = getDb();

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  const daily = db
    .prepare(
      `
      SELECT date(created_at) as day, COUNT(*) as requests
      FROM api_request_log
      WHERE key_id = ? AND created_at >= ?
      GROUP BY date(created_at)
      ORDER BY day DESC
    `
    )
    .all(id, sinceIso);

  const recent = db
    .prepare(
      `
      SELECT request_id, method, path, status_code, duration_ms, created_at
      FROM api_request_log
      WHERE key_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `
    )
    .all(id, limit);

  db.close();

  return {
    id,
    days,
    daily,
    recent,
    totalRecent: recent.length,
  };
}

function getKeyStats() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as c FROM api_keys').get().c;
  const active = db.prepare('SELECT COUNT(*) as c FROM api_keys WHERE revoked_at IS NULL').get().c;
  const revoked = db
    .prepare('SELECT COUNT(*) as c FROM api_keys WHERE revoked_at IS NOT NULL')
    .get().c;

  const today = new Date().toISOString().slice(0, 10);
  const requestsToday = db
    .prepare('SELECT COUNT(*) as c FROM api_request_log WHERE date(created_at) = ?')
    .get(today).c;

  db.close();
  return { total, active, revoked, requestsToday };
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
