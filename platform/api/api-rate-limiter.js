/**
 * PÚNYCODEX API v1 — Rate limiter
 *
 * Redis-backed fixed-window counter with an in-memory fallback. When
 * `REDIS_URL` is configured, limits are global across Vercel serverless
 * invocations. Otherwise, the limiter falls back to per-process memory
 * counters, which is sufficient for local development.
 */

const {
  getRedisClient,
  disableRedis,
  resetRedisClient,
  isRedisEnabled,
} = require('./redis-client.js');

// Default tier limits: requests per window
const DEFAULT_TIER_LIMITS = {
  free: { limit: 100, windowMs: 24 * 60 * 60 * 1000 }, // 100/day
  hobby: { limit: 1000, windowMs: 24 * 60 * 60 * 1000 }, // 1,000/day
  pro: { limit: 10000, windowMs: 24 * 60 * 60 * 1000 }, // 10,000/day
  enterprise: { limit: 100000, windowMs: 24 * 60 * 60 * 1000 }, // 100,000/day
  public: { limit: 10, windowMs: 60 * 1000 }, // 10/min for unauthenticated public endpoints
};

class InMemoryRateLimiter {
  constructor(options = {}) {
    this.tier = options.tier || 'free';
    this.windows = new Map();
    this.windowMs = options.windowMs || 60 * 1000;
    this.maxRequests = options.maxRequests || 100;
    this.sweepIntervalMs = options.sweepIntervalMs || 60 * 1000;

    if (options.autoSweep !== false) {
      this.sweepTimer = setInterval(() => this.sweep(), this.sweepIntervalMs);
      // Allow Node to exit cleanly in tests
      if (this.sweepTimer.unref) this.sweepTimer.unref();
    }
  }

  /**
   * Returns { allowed: boolean, remaining: number, resetAt: number (ms), limit: number }
   */
  check(key) {
    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    // Use '#' as the window delimiter because rate-limit keys (IPs, tokens)
    // frequently contain colons, especially IPv6 addresses.
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

// Atomic INCR + EXPIRE for fixed-window counters
const INCR_EXPIRE_SCRIPT = `
  local c = redis.call('incr', KEYS[1])
  if c == 1 then
    redis.call('expire', KEYS[1], ARGV[1])
  end
  return c
`;

class RedisRateLimiter {
  constructor(options = {}) {
    this.tier = options.tier || 'free';
    this.windowMs = options.windowMs || 60 * 1000;
    this.maxRequests = options.maxRequests || 100;
    this.fallback = new InMemoryRateLimiter({
      tier: this.tier,
      windowMs: this.windowMs,
      maxRequests: this.maxRequests,
    });
  }

  async check(key) {
    const client = getRedisClient();
    if (!client) {
      return this.fallback.check(key);
    }

    const now = Date.now();
    const windowStart = Math.floor(now / this.windowMs) * this.windowMs;
    const redisKey = `punycodex:rl:v1:${this.tier}:${key}:${windowStart}`;
    const ttlSeconds = Math.ceil(this.windowMs / 1000);

    try {
      const count = await client.eval(INCR_EXPIRE_SCRIPT, 1, redisKey, ttlSeconds);
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
      console.error(`[rate-limiter] Redis command failed for tier ${this.tier}:`, err.message);
      disableRedis();
      return this.fallback.check(key);
    }
  }

  stop() {
    this.fallback.stop();
  }
}

// Per-tier limiter instances
const limiters = new Map();

function getLimiterForTier(tier) {
  const config = DEFAULT_TIER_LIMITS[tier] || DEFAULT_TIER_LIMITS.free;
  if (!limiters.has(tier)) {
    const useRedis = isRedisEnabled();
    if (useRedis) {
      limiters.set(
        tier,
        new RedisRateLimiter({
          tier,
          windowMs: config.windowMs,
          maxRequests: config.limit,
        })
      );
    } else {
      limiters.set(
        tier,
        new InMemoryRateLimiter({
          tier,
          windowMs: config.windowMs,
          maxRequests: config.limit,
        })
      );
    }
  }
  return limiters.get(tier);
}

async function checkRateLimit(key, tier = 'free') {
  const limiter = getLimiterForTier(tier);
  return limiter.check(key);
}

async function checkPublicRateLimit(key) {
  return checkRateLimit(key, 'public');
}

function resetLimiters() {
  for (const limiter of limiters.values()) {
    limiter.stop();
  }
  limiters.clear();
  resetRedisClient();
}

module.exports = {
  InMemoryRateLimiter,
  RedisRateLimiter,
  checkRateLimit,
  checkPublicRateLimit,
  resetLimiters,
  DEFAULT_TIER_LIMITS,
};
