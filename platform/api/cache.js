/**
 * PÚNYCODEX — Result cache for the Authenticity Shield.
 *
 * Provides Redis-backed result caching with an in-memory fallback. Cache keys
 * are SHA-256 hashes of the normalized input, model version, and tenant policy
 * hash so that policy or model changes automatically produce fresh keys.
 *
 * TTLs are chosen based on verdict stability:
 *   - canonical / verified-variant / safe          → 24 hours
 *   - uncertain / styled / unknown                 → 1 hour
 *   - suspicious / deceptive / known-threat        → 5 minutes
 *
 * In test environments caching is disabled by default to avoid cross-test
 * staleness. Set PUNYCODEX_CACHE=1 to enable it explicitly in tests.
 */

const crypto = require('node:crypto');
const { getRedisClient } = require('./redis-client.js');
const { safeJsonParse } = require('./safe-json.js');

const MEMORY_SWEEP_INTERVAL_MS = 60_000;
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour
const STABLE_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const VOLATILE_TTL_SECONDS = 5 * 60; // 5 minutes

const memoryCache = new Map();
let sweepTimer = null;
let cacheStats = { hits: 0, misses: 0, sets: 0 };

function isCacheEnabled() {
  if (process.env.PUNYCODEX_CACHE_DISABLED === '1') return false;
  if (process.env.PUNYCODEX_CACHE === '1') return true;
  // Default off in test environments to prevent cross-test interference.
  if (process.env.NODE_ENV === 'test') return false;
  return true;
}

function normalizeInput(input) {
  // Consistent normalization so equivalent inputs share cache keys.
  return String(input || '')
    .trim()
    .normalize('NFC')
    .toLowerCase();
}

function getResultCacheKey({
  input,
  type = 'auto',
  modelVersion = 'unknown',
  policyHash = 'default',
}) {
  const payload = `${normalizeInput(input)}|${type}|${modelVersion}|${policyHash}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function getCacheTtl(result) {
  const verdict = result?.verdict;
  switch (verdict) {
    case 'canonical':
    case 'verified-variant':
    case 'safe':
      return STABLE_TTL_SECONDS;
    case 'suspicious':
    case 'deceptive':
    case 'known-threat':
    case 'homograph-spoof':
    case 'mixed-script-spoof':
    case 'lookalike-domain':
    case 'unsafe':
      return VOLATILE_TTL_SECONDS;
    default:
      return DEFAULT_TTL_SECONDS;
  }
}

function startMemorySweep() {
  if (sweepTimer) return;
  sweepTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        memoryCache.delete(key);
      }
    }
  }, MEMORY_SWEEP_INTERVAL_MS);
  if (sweepTimer.unref) sweepTimer.unref();
}

function getMemoryEntry(key) {
  const entry = memoryCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setMemoryEntry(key, value, ttlSeconds) {
  startMemorySweep();
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

async function getCachedResult(key) {
  if (!isCacheEnabled()) return undefined;

  const memory = getMemoryEntry(key);
  if (memory !== undefined) {
    cacheStats.hits += 1;
    return memory;
  }

  const client = getRedisClient();
  if (client) {
    try {
      const cached = await client.get(key);
      if (cached) {
        const value = safeJsonParse(cached);
        if (value != null) {
          // Backfill memory cache for hot keys.
          setMemoryEntry(key, value, getCacheTtl(value));
          cacheStats.hits += 1;
          return value;
        }
      }
    } catch (err) {
      console.error('[cache] Redis GET failed:', err.message);
    }
  }

  cacheStats.misses += 1;
  return undefined;
}

async function setCachedResult(key, result, ttlSeconds) {
  if (!isCacheEnabled() || result == null) return;
  const ttl = ttlSeconds ?? getCacheTtl(result);

  setMemoryEntry(key, result, ttl);

  const client = getRedisClient();
  if (client) {
    try {
      await client.setex(`punycodex:cache:result:${key}`, ttl, JSON.stringify(result));
      cacheStats.sets += 1;
    } catch (err) {
      console.error('[cache] Redis SETEX failed:', err.message);
    }
  }
}

async function withResultCache({ input, type, modelVersion, policyHash }, compute) {
  if (!isCacheEnabled()) {
    return compute();
  }
  const key = getResultCacheKey({ input, type, modelVersion, policyHash });
  const cached = await getCachedResult(key);
  if (cached !== undefined) {
    return { ...cached, _cache: 'hit' };
  }
  const result = await compute();
  await setCachedResult(key, result, getCacheTtl(result));
  return { ...result, _cache: 'miss' };
}

async function invalidateCache(pattern = null) {
  // Always clear the local memory cache.
  memoryCache.clear();
  cacheStats = { hits: 0, misses: 0, sets: 0 };

  const client = getRedisClient();
  if (!client) return { cleared: true, redis: false, pattern };

  try {
    if (!pattern) {
      // Flush only our application namespace.
      const keys = await client.keys('punycodex:cache:result:*');
      if (keys.length > 0) {
        await client.del(...keys);
      }
      return { cleared: true, redis: true, keysDeleted: keys.length, pattern };
    }
    // Scan-based deletion for patterns.
    const stream = client.scanStream({ match: pattern, count: 100 });
    const toDelete = [];
    await new Promise((resolve, reject) => {
      stream.on('data', (keys) => toDelete.push(...keys));
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    if (toDelete.length > 0) {
      await client.del(...toDelete);
    }
    return { cleared: true, redis: true, keysDeleted: toDelete.length, pattern };
  } catch (err) {
    console.error('[cache] Redis invalidation failed:', err.message);
    return { cleared: true, redis: false, error: err.message, pattern };
  }
}

function getCacheStats() {
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    sets: cacheStats.sets,
    memorySize: memoryCache.size,
    enabled: isCacheEnabled(),
  };
}

module.exports = {
  isCacheEnabled,
  getResultCacheKey,
  getCacheTtl,
  getCachedResult,
  setCachedResult,
  withResultCache,
  invalidateCache,
  getCacheStats,
};
