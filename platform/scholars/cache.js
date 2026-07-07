/**
 * PÚNYCODEX — Scholarly Edition Cache Layer
 *
 * Uses Redis when REDIS_URL is configured; otherwise falls back to
 * an in-memory LRU cache. This keeps the Scholars API fast without
 * adding a hard dependency on Redis in local development.
 */

const Redis = require('ioredis');

const DEFAULT_TTL_SECONDS = 60;

class MemoryCache {
  constructor(maxSize = 1000) {
    this.store = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Move to end for LRU eviction.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      this.store.delete(firstKey);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  del(key) {
    this.store.delete(key);
  }

  async flush() {
    this.store.clear();
  }
}

let redisClient = null;
let memoryCache = null;
let mode = 'memory';

function getRedisClient() {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redisClient.on('error', () => {
      // Silently fall back to memory cache on Redis errors.
      mode = 'memory';
    });
    mode = 'redis';
    return redisClient;
  } catch {
    mode = 'memory';
    return null;
  }
}

function getMemoryCache() {
  if (!memoryCache) memoryCache = new MemoryCache();
  return memoryCache;
}

async function get(key) {
  const redis = getRedisClient();
  if (redis && mode === 'redis') {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      mode = 'memory';
    }
  }
  return getMemoryCache().get(key);
}

async function set(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const redis = getRedisClient();
  if (redis && mode === 'redis') {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
      return;
    } catch {
      mode = 'memory';
    }
  }
  getMemoryCache().set(key, value, ttlSeconds);
}

async function del(key) {
  const redis = getRedisClient();
  if (redis && mode === 'redis') {
    try {
      await redis.del(key);
      return;
    } catch {
      mode = 'memory';
    }
  }
  getMemoryCache().del(key);
}

function cacheKey(namespace, id) {
  return `scholars:${namespace}:${id}`;
}

module.exports = {
  get,
  set,
  del,
  cacheKey,
  getCacheMode: () => mode,
};
