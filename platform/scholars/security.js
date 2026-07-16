/**
 * PÚNYCODEX — Scholarly Edition Security Middleware
 *
 * Security headers, rate limiting, input validation, password-strength
 * validation, and audit logging helpers for the Scholars API.
 */

const { createPublicRateLimit } = require('../api/public-rate-limiter');
const { getClientIp } = require('../api/client-ip');
const { getRedisClient, disableRedis } = require('../api/redis-client');
const { audit } = require('../db/scholars');

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "font-src 'self'; " +
    "connect-src 'self'; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';",
};

/**
 * Set baseline security headers on every Scholars API response.
 */
function securityHeaders(_req, res, next) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
  next();
}

/**
 * Fixed-window rate limiter for Scholars endpoints.
 *
 * When `REDIS_URL` is configured, `checkAsync` uses an atomic Redis
 * INCR+EXPIRE counter so limits are global across Vercel serverless
 * invocations; otherwise (or when Redis fails) it falls back to the
 * per-process in-memory windows from `check`. Stale in-memory windows are
 * swept periodically to prevent unbounded growth.
 */
// Atomic INCR + EXPIRE for fixed-window counters.
const SCHOLARS_INCR_EXPIRE_SCRIPT = `
  local c = redis.call('incr', KEYS[1])
  if c == 1 then
    redis.call('expire', KEYS[1], ARGV[1])
  end
  return c
`;

class ScholarsRateLimiter {
  constructor(options = {}) {
    this.name = options.name || 'auth';
    this.windowMs = options.windowMs || 60 * 1000;
    this.maxRequests = options.maxRequests || 60;
    this.windows = new Map();
    this.sweepIntervalMs = options.sweepIntervalMs || 60 * 1000;
    if (options.autoSweep !== false) {
      this.sweepTimer = setInterval(() => this.sweep(), this.sweepIntervalMs);
      if (this.sweepTimer.unref) this.sweepTimer.unref();
    }
  }

  check(key) {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    // '#' delimiter avoids collisions with IPv6 addresses that contain colons.
    const windowKey = `${key}#${windowStart}`;

    let count = this.windows.get(windowKey) || 0;
    const allowed = count < this.maxRequests;
    if (allowed) {
      count += 1;
      this.windows.set(windowKey, count);
    }

    return {
      allowed,
      remaining: Math.max(0, this.maxRequests - count),
      resetAt: windowStart + this.windowMs,
      limit: this.maxRequests,
    };
  }

  async checkAsync(key) {
    const client = getRedisClient();
    if (!client) {
      return this.check(key);
    }

    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const redisKey = `punycodex:rl:scholars:${this.name}:${key}:${windowStart}`;
    const ttlSeconds = Math.ceil(this.windowMs / 1000);

    try {
      const count = await client.eval(SCHOLARS_INCR_EXPIRE_SCRIPT, 1, redisKey, ttlSeconds);
      const allowed = count <= this.maxRequests;
      return {
        allowed,
        remaining: Math.max(0, this.maxRequests - count),
        resetAt: windowStart + this.windowMs,
        limit: this.maxRequests,
      };
    } catch (err) {
      // Redis command failed — disable Redis and fall back to memory so
      // requests continue to be rate-limited instead of failing.
      console.error(`[scholars rate-limiter] Redis command failed for ${this.name}:`, err.message);
      disableRedis();
      return this.check(key);
    }
  }

  sweep() {
    const cutoff = Date.now() - this.windowMs * 2;
    for (const [key, _count] of this.windows) {
      const delim = key.lastIndexOf('#');
      if (delim === -1) continue;
      const windowStart = Number(key.slice(delim + 1));
      if (windowStart < cutoff) {
        this.windows.delete(key);
      }
    }
  }

  stop() {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
  }
}

const publicLimiter = new ScholarsRateLimiter({
  name: 'public',
  windowMs: 60 * 1000,
  maxRequests: 120,
});
const authLimiter = new ScholarsRateLimiter({ name: 'auth', windowMs: 60 * 1000, maxRequests: 60 });
const strictLimiter = new ScholarsRateLimiter({
  name: 'strict',
  windowMs: 60 * 1000,
  maxRequests: 10,
});
const loginLimiter = new ScholarsRateLimiter({
  name: 'login',
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});

/**
 * Factory for Scholars-specific in-memory rate limit middleware.
 *
 * @param {string} endpointName - Unique endpoint identifier used in the rate-limit key.
 * @param {Object} [options]
 * @param {'public'|'auth'|'strict'} [options.tier='auth'] - Which limit bucket to use.
 */
function createScholarsRateLimit(endpointName, { tier = 'auth' } = {}) {
  if (process.env.PUNYCODEX_SCHOLARS_DISABLE_RATE_LIMIT === '1') {
    return function noOpRateLimit(_req, _res, next) {
      next();
    };
  }
  const limiter =
    tier === 'public' ? publicLimiter : tier === 'strict' ? strictLimiter : authLimiter;
  return async function scholarsRateLimitMiddleware(req, res, next) {
    try {
      const ip = getClientIp(req);
      const key = `${endpointName}:${ip}`;
      const result = await limiter.checkAsync(key);

      res.setHeader('X-RateLimit-Limit', String(result.limit));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          success: false,
          error: 'Too many requests. Please slow down.',
          retryAfter,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Validate that configured body fields do not exceed maximum lengths.
 *
 * @param {Array<{key: string, max: number}>} fields
 */
function validateInputLength(fields) {
  return function validateInputLengthMiddleware(req, res, next) {
    if (!req.body || typeof req.body !== 'object') return next();

    for (const { key, max } of fields) {
      const value = req.body[key];
      if (value === undefined || value === null) continue;

      let length;
      if (typeof value === 'string') {
        length = value.length;
      } else if (Array.isArray(value)) {
        length = value.length;
        if (length > max) {
          return res.status(413).json({
            success: false,
            error: `Field '${key}' exceeds maximum count of ${max} items.`,
          });
        }
        continue;
      } else {
        length = JSON.stringify(value).length;
      }

      if (length > max) {
        return res.status(413).json({
          success: false,
          error: `Field '${key}' exceeds maximum length of ${max} characters.`,
        });
      }
    }

    next();
  };
}

/**
 * Stricter rate limiter for the password login endpoint.
 * Tracks attempts by IP + email to slow down credential stuffing.
 */
function createLoginRateLimit() {
  if (process.env.PUNYCODEX_SCHOLARS_DISABLE_RATE_LIMIT === '1') {
    return function noOpLoginRateLimit(_req, _res, next) {
      next();
    };
  }
  return function loginRateLimitMiddleware(req, res, next) {
    const ip = getClientIp(req);
    const email = (req.body?.email || 'unknown').toLowerCase().trim();
    const key = `${ip}:${email}`;
    const result = loginLimiter.check(key);

    res.setHeader('X-RateLimit-Limit', String(result.limit));
    res.setHeader('X-RateLimit-Remaining', String(result.remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: 'Too many login attempts. Please slow down.',
        retryAfter,
      });
    }

    next();
  };
}

/**
 * Password-strength requirements:
 * - Minimum 10 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one symbol (any non-alphanumeric character)
 */
const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_REQUIREMENTS = [
  { name: 'uppercase', regex: /[A-Z]/, message: 'one uppercase letter' },
  { name: 'lowercase', regex: /[a-z]/, message: 'one lowercase letter' },
  { name: 'digit', regex: /\d/, message: 'one number' },
  { name: 'symbol', regex: /[^A-Za-z0-9]/, message: 'one symbol' },
];

function validatePassword(password) {
  if (typeof password !== 'string') {
    return { valid: false, errors: ['Password must be a string'] };
  }

  const errors = [];
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }

  for (const requirement of PASSWORD_REQUIREMENTS) {
    if (!requirement.regex.test(password)) {
      errors.push(`Password must contain at least ${requirement.message}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Audit-log middleware for POST/PUT/DELETE endpoints.
 *
 * Logs after the response finishes so it never blocks the request. If the
 * route already manually called audit(), this middleware is a no-op thanks
 * to req.auditLogged.
 *
 * @param {string} action - Audit action name (e.g. 'auth_magic_link_sent').
 * @param {Object} [options]
 * @param {function} [options.getResourceType] - (req) => resource type string.
 * @param {function} [options.getResourceId] - (req) => resource id string/number.
 * @param {function} [options.getDetails] - (req, res) => details object.
 */
function auditLog(action, { getResourceType, getResourceId, getDetails } = {}) {
  return function auditLogMiddleware(req, res, next) {
    res.on('finish', () => {
      if (req.auditLogged) return;
      req.auditLogged = true;

      try {
        const actorId = req.user?.id || null;
        const resourceType = getResourceType ? getResourceType(req) : 'endpoint';
        const resourceId = getResourceId ? getResourceId(req) : req.path;
        const details = getDetails
          ? getDetails(req, res)
          : { method: req.method, path: req.path, statusCode: res.statusCode };

        audit({
          actorId,
          action,
          resourceType,
          resourceId: String(resourceId),
          details,
          ipHash: null,
        });
      } catch (_e) {
        // Audit logging is best-effort; never fail the request because of it.
      }
    });
    next();
  };
}

module.exports = {
  securityHeaders,
  createPublicRateLimit,
  createScholarsRateLimit,
  createLoginRateLimit,
  validateInputLength,
  validatePassword,
  PASSWORD_MIN_LENGTH,
  auditLog,
};
