const { checkPublicRateLimit, checkRateLimit } = require('./api-rate-limiter');
const { getClientIp } = require('./client-ip');

/**
 * Express middleware that rate-limits a public endpoint by IP.
 * Returns 429 with Retry-After header when the limit is exceeded.
 */
function createPublicRateLimit(endpointName) {
  return async function rateLimitMiddleware(req, res, next) {
    const ip = getClientIp(req);
    const key = `${endpointName}:${ip}`;
    const result = await checkPublicRateLimit(key);

    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: 'Too many requests. Please slow down.',
        retryAfter,
      });
    }

    next();
  };
}

/**
 * Rate-limit helper for Vercel serverless handlers (no Express middleware).
 * `options.tier` selects the limit bucket (see DEFAULT_TIER_LIMITS in
 * api-rate-limiter.js); the default 'public' bucket allows 10 req/min per IP
 * per endpoint. Use 'public-strict' for endpoints that trigger outbound work.
 */
async function checkPublicRateLimitByReq(req, res, endpointName, { tier = 'public' } = {}) {
  const ip = getClientIp(req);
  const key = `${endpointName}:${ip}`;
  const result = await checkRateLimit(key, tier);

  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter,
    });
    return false;
  }
  return true;
}

module.exports = { createPublicRateLimit, checkPublicRateLimitByReq };
