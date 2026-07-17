/**
 * PuniCodex API v1 — Vercel/Express handler wrapper
 *
 * Centralizes CORS, request ID, authentication, rate limiting, and error handling.
 */

const crypto = require('node:crypto');
const { setCors, error, handleApiError } = require('./api-response.js');
const { authenticate, getClientIp } = require('./api-auth.js');
const { checkRateLimit } = require('./api-rate-limiter.js');
const { setLicenseHeaders } = require('./license-headers.js');
const { run } = require('../db/operational.js');

function hashIp(ip) {
  if (!ip || ip === 'unknown') return null;
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
}

function logRequest({ keyId, requestId, method, path, statusCode, durationMs, ip }) {
  const ipHash = hashIp(ip);
  run(
    `INSERT INTO api_request_log (key_id, request_id, method, path, status_code, duration_ms, ip_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [keyId || null, requestId, method, path, statusCode, durationMs, ipHash]
  ).catch((err) => {
    console.error('[api-request-log] Failed to log request:', err.message);
  });
}

function createApiHandler(handler, options = {}) {
  const { requireAuth = false, scopes = [] } = options;
  const apiVersion = options.version || 'v1';

  return async function apiHandler(req, res) {
    res.locals = res.locals || {};
    res.locals.apiVersion = apiVersion;
    const startTime = Date.now();

    // CORS preflight
    setCors(req, res);
    setLicenseHeaders(res);
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Request ID
    res.locals = res.locals || {};
    res.locals.requestId = req.headers['x-request-id'] || `req_${Date.now().toString(36)}`;

    let auth = null;

    try {
      // Authentication
      auth = await authenticate(req);
      res.locals.apiAuth = auth;

      // Rate limiting (applied before invalid-key rejection to prevent enumeration abuse)
      const rateLimitKey = auth.rateLimitKey || `ip:${getClientIp(req)}`;
      const rateLimitTier = auth.tier || 'free';
      const rateLimit = await checkRateLimit(rateLimitKey, rateLimitTier);
      res.setHeader('X-RateLimit-Limit', String(rateLimit.limit));
      res.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.floor(rateLimit.resetAt / 1000)));
      if (!rateLimit.allowed) {
        error(
          res,
          'RATE_LIMIT_EXCEEDED',
          'Too many requests. Please slow down or upgrade your plan.',
          {
            status: 429,
            details: { retryAfter: Math.ceil((rateLimit.resetAt - Date.now()) / 1000) },
          }
        );
        return;
      }

      if (auth.invalid) {
        error(res, 'UNAUTHORIZED', 'Invalid API key.', { status: 401 });
        return;
      }

      // Authorization for write/admin endpoints
      if (requireAuth && !auth.keyId) {
        error(res, 'UNAUTHORIZED', 'A valid API key is required for this endpoint.', {
          status: 401,
        });
        return;
      }
      if (scopes.length > 0) {
        const hasScope = scopes.some(
          (scope) => auth.scopes.includes(scope) || auth.scopes.includes('admin')
        );
        if (!hasScope) {
          error(res, 'FORBIDDEN', 'Your API key does not have permission for this action.', {
            status: 403,
          });
          return;
        }
      }

      // Cache headers for read endpoints
      if (req.method === 'GET') {
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
      } else {
        res.setHeader('Cache-Control', 'no-store');
      }

      // Run handler
      await handler(req, res, auth);
    } catch (err) {
      handleApiError(res, err);
    } finally {
      const durationMs = Date.now() - startTime;
      const statusCode = res.statusCode || 0;
      const requestId = res.locals?.requestId;
      const path = req.url?.split('?')[0] || '';
      logRequest({
        keyId: auth?.keyId,
        requestId,
        method: req.method,
        path,
        statusCode,
        durationMs,
        ip: getClientIp(req),
      });
    }
  };
}

module.exports = { createApiHandler };
