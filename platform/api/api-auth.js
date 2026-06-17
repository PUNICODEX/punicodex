/**
 * PÚNYCODEX API v1 — API key authentication and authorization
 *
 * Read endpoints accept an optional key. No key = free-tier, IP-based rate limit.
 * Write endpoints require a valid key with the appropriate scope.
 */

const crypto = require('node:crypto');
const { get, run } = require('../db/operational');

const DEMO_KEY = 'pk_punycodex_demo';

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function extractBearer(req) {
  const auth = req.headers?.authorization || '';
  if (!auth.toLowerCase().startsWith('bearer ')) return null;
  return auth.slice(7).trim();
}

function getClientIp(req) {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown';
}

async function lookupKey(key) {
  if (!key) return null;
  try {
    const hashed = hashKey(key);
    const row = await get('SELECT * FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL', [
      hashed,
    ]);
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      tier: row.tier,
      scopes: JSON.parse(row.scopes || '[]'),
      rateLimit: row.rate_limit,
    };
  } catch (err) {
    console.error('API key lookup failed:', err);
    return null;
  }
}

async function recordKeyUsage(keyId) {
  try {
    await run(
      'UPDATE api_keys SET last_used_at = CURRENT_TIMESTAMP, request_count = request_count + 1 WHERE id = $1',
      [keyId]
    );
  } catch (err) {
    console.error('Failed to record key usage:', err);
  }
}

async function authenticate(req) {
  const key = extractBearer(req);
  if (!key) {
    return {
      keyId: null,
      tier: 'free',
      scopes: [],
      rateLimitKey: `ip:${getClientIp(req)}`,
    };
  }

  const keyRecord = await lookupKey(key);
  if (!keyRecord) {
    return { invalid: true };
  }

  await recordKeyUsage(keyRecord.id);
  return {
    keyId: keyRecord.id,
    name: keyRecord.name,
    tier: keyRecord.tier,
    scopes: keyRecord.scopes,
    rateLimitKey: `key:${keyRecord.id}`,
  };
}

function requireScope(...requiredScopes) {
  return function scopeMiddleware(_req, res, next) {
    const auth = res.locals?.apiAuth;
    if (!auth || auth.invalid) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'A valid API key is required for this endpoint.' },
      });
      return;
    }
    const hasScope = requiredScopes.some(
      (scope) => auth.scopes.includes(scope) || auth.scopes.includes('admin')
    );
    if (!hasScope) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Your API key does not have permission for this action.',
        },
      });
      return;
    }
    next();
  };
}

module.exports = {
  authenticate,
  requireScope,
  extractBearer,
  hashKey,
  getClientIp,
  DEMO_KEY,
};
