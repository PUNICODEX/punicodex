/**
 * PÚNYCODEX API v1 — Vercel/Express handler wrapper
 *
 * Centralizes CORS, request ID, authentication, rate limiting, and error handling.
 */

const { setCors, error, handleApiError } = require('./api-response.js');
const { authenticate } = require('./api-auth.js');
const { checkRateLimit } = require('./api-rate-limiter.js');

function createApiHandler(handler, options = {}) {
  const { requireAuth = false, scopes = [] } = options;

  return async function apiHandler(req, res) {
    // CORS preflight
    setCors(req, res);
    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    // Request ID
    res.locals = res.locals || {};
    res.locals.requestId = req.headers['x-request-id'] || `req_${Date.now().toString(36)}`;

    try {
      // Authentication
      const auth = authenticate(req);
      if (auth.invalid) {
        error(res, 'UNAUTHORIZED', 'Invalid API key.', { status: 401 });
        return;
      }
      res.locals.apiAuth = auth;

      // Rate limiting
      const rateLimit = await checkRateLimit(auth.rateLimitKey, auth.tier);
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
    }
  };
}

module.exports = { createApiHandler };
