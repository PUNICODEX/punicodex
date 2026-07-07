/**
 * PÚNYCODEX — Scholarly Edition Security Middleware
 *
 * Security headers, rate limiting, input validation, and audit logging
 * helpers for the Scholars API. No external dependencies.
 */

const { createPublicRateLimit } = require('../api/public-rate-limiter');
const { getClientIp } = require('../api/client-ip');
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
function securityHeaders(req, res, next) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    res.setHeader(key, value);
  }
  next();
}

/**
 * Simple in-memory fixed-window rate limiter for authenticated Scholars endpoints.
 * Sweeps stale windows periodically to prevent unbounded growth.
 */
class ScholarsRateLimiter {
  constructor(options = {}) {
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

const publicLimiter = new ScholarsRateLimiter({ windowMs: 60 * 1000, maxRequests: 120 });
const authLimiter = new ScholarsRateLimiter({ windowMs: 60 * 1000, maxRequests: 60 });
const strictLimiter = new ScholarsRateLimiter({ windowMs: 60 * 1000, maxRequests: 10 });

/**
 * Factory for Scholars-specific in-memory rate limit middleware.
 *
 * @param {string} endpointName - Unique endpoint identifier used in the rate-limit key.
 * @param {Object} [options]
 * @param {'public'|'auth'|'strict'} [options.tier='auth'] - Which limit bucket to use.
 */
function createScholarsRateLimit(endpointName, { tier = 'auth' } = {}) {
  const limiter =
    tier === 'public' ? publicLimiter : tier === 'strict' ? strictLimiter : authLimiter;
  return function scholarsRateLimitMiddleware(req, res, next) {
    const ip = getClientIp(req);
    const key = `${endpointName}:${ip}`;
    const result = limiter.check(key);

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
  validateInputLength,
  auditLog,
};
