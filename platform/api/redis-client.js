/**
 * Shared Redis client for PUNICODEX.
 *
 * Provides a singleton Redis connection with lazy connect, error recovery,
 * and an in-memory fallback when REDIS_URL is not configured or Redis is
 * unreachable. Used by the rate limiter, search cache, sessions, and pub/sub.
 */

const Redis = require('ioredis');
const { safeJsonParse } = require('./safe-json');

let redisClient = null;
let redisFailed = false;

function hasRedisConfig() {
  return Boolean(process.env.REDIS_URL);
}

function createRedisClient() {
  let client;
  try {
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
    });
  } catch (err) {
    // A malformed REDIS_URL throws at construction time, before the error
    // event can fire. Bad config must never take the site down: disable
    // Redis and let callers fall back to the in-memory path instead.
    console.error('[redis-client] invalid REDIS_URL, using in-memory fallback:', err.message);
    disableRedis();
    return null;
  }

  client.on('error', (err) => {
    console.error('[redis-client] Redis connection error:', err.message);
    disableRedis();
  });

  return client;
}

function getRedisClient() {
  if (redisFailed || !hasRedisConfig()) {
    return null;
  }
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}

function disableRedis() {
  redisFailed = true;
  if (redisClient) {
    try {
      redisClient.disconnect();
    } catch {
      // ignore
    }
    redisClient = null;
  }
}

function resetRedisClient() {
  if (redisClient) {
    try {
      redisClient.disconnect();
    } catch {
      // ignore
    }
    redisClient = null;
  }
  redisFailed = false;
}

function isRedisEnabled() {
  return !redisFailed && hasRedisConfig();
}

/**
 * Cache helper: get JSON value with fallback computation.
 * Falls back to the compute function (and stores result) when Redis is
 * unavailable or the key is missing.
 */
async function getOrSetJson(key, ttlSeconds, compute) {
  const client = getRedisClient();
  if (client) {
    try {
      const cached = await client.get(key);
      if (cached) {
        return safeJsonParse(cached);
      }
    } catch (err) {
      console.error('[redis-client] GET failed:', err.message);
    }
  }

  const value = await compute();

  if (client && value != null) {
    try {
      await client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (err) {
      console.error('[redis-client] SETEX failed:', err.message);
    }
  }

  return value;
}

module.exports = {
  hasRedisConfig,
  getRedisClient,
  disableRedis,
  resetRedisClient,
  isRedisEnabled,
  getOrSetJson,
};
