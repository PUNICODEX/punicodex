/**
 * PÚNYCODEX — first-party site analytics engine.
 *
 * Privacy-first page-view analytics:
 *   - IPs are stored only as sha256(ip).substring(0, 16) — never raw
 *   - session hashes rotate daily (sha256(`${sessionId}:${day}`)), so no
 *     cross-day tracking is possible
 *   - user agents are stored only as a short hash plus a coarse device class
 *     and bot classification — never raw
 *
 * Storage mirrors the rate limiter's strategy: Redis rollups when REDIS_URL
 * is configured (one Lua script per view), with a permanent fallback to
 * SQLite on any Redis error.
 */

const crypto = require('node:crypto');
const { getRedisClient, disableRedis, isRedisEnabled } = require('./redis-client');
const { classifyUserAgent } = require('./bot-detection');
const { all, get, insert, run, isPostgres } = require('../db/operational');
const { runMigration } = require('../db/migrate-site-analytics');

const KEY_PREFIX = 'punycodex:analytics:';
const ROLLUP_TTL_SECONDS = 40 * 24 * 60 * 60; // 40 days
const MAX_PATH_LENGTH = 200;
const MAX_REFERRER_LENGTH = 300;
const MAX_SESSION_ID_LENGTH = 64;

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function lastNDays(days) {
  const list = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    list.push(dayString(new Date(now - i * 24 * 60 * 60 * 1000)));
  }
  return list;
}

function clampDays(days) {
  const n = parseInt(days, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(90, Math.max(1, n));
}

function toCount(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

// ─── Sanitization ───

function sanitizePath(value) {
  if (typeof value !== 'string') return null;
  const stripped = value.split('?')[0].split('#')[0].trim();
  if (!stripped.startsWith('/')) return null;
  return stripped.slice(0, MAX_PATH_LENGTH);
}

function sanitizeReferrer(value) {
  if (typeof value !== 'string') return '';
  return value.slice(0, MAX_REFERRER_LENGTH);
}

function sanitizeSessionId(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[^a-zA-Z0-9]/g, '').slice(0, MAX_SESSION_ID_LENGTH);
}

function extractTempleId(path) {
  const match = path.match(/^\/sites\/([a-z0-9-]{1,64})(\/|$)/);
  return match ? match[1] : '';
}

function extractReferrerDomain(referrer) {
  if (!referrer) return '';
  try {
    return new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function detectDevice(ua) {
  if (/Mobile|Android.*Mobile|iPhone/.test(ua)) return 'mobile';
  if (/iPad|Tablet|Android(?!.*Mobile)/.test(ua)) return 'tablet';
  return 'desktop';
}

// ─── Recording ───

// Atomic rollup update: per-temple views hash, per-temple + site-wide unique
// session sets, device split, bot categories, and human referrers — each key
// with a 40-day TTL.
const RECORD_SCRIPT = `
  local ttl = tonumber(ARGV[3])
  redis.call('hincrby', KEYS[1], ARGV[1], 1)
  redis.call('expire', KEYS[1], ttl)
  redis.call('sadd', KEYS[2], ARGV[2])
  redis.call('expire', KEYS[2], ttl)
  redis.call('sadd', KEYS[3], ARGV[2])
  redis.call('expire', KEYS[3], ttl)
  redis.call('hincrby', KEYS[4], ARGV[4], 1)
  redis.call('expire', KEYS[4], ttl)
  if ARGV[5] ~= '' then
    redis.call('hincrby', KEYS[5], ARGV[5], 1)
    redis.call('expire', KEYS[5], ttl)
  end
  if ARGV[6] ~= '' then
    redis.call('hincrby', KEYS[6], ARGV[6], 1)
    redis.call('expire', KEYS[6], ttl)
  end
  return 1
`;

async function recordToRedis({
  day,
  templeId,
  isBot,
  category,
  device,
  sessionHash,
  referrerDomain,
}) {
  const client = getRedisClient();
  if (!client) throw new Error('Redis client unavailable');
  await client.eval(
    RECORD_SCRIPT,
    6,
    `${KEY_PREFIX}views:${day}:${templeId}`,
    `${KEY_PREFIX}uniq:${day}:${templeId}`,
    `${KEY_PREFIX}uniq:${day}`,
    `${KEY_PREFIX}devices:${day}:${templeId}`,
    `${KEY_PREFIX}bots:${day}:${templeId}`,
    `${KEY_PREFIX}refs:${day}:${templeId}`,
    isBot ? 'bot' : 'human',
    sessionHash,
    ROLLUP_TTL_SECONDS,
    device,
    isBot ? category : '',
    referrerDomain
  );
}

let migrationRan = false;

function ensureMigration() {
  if (migrationRan || isPostgres()) return;
  runMigration();
  migrationRan = true;
}

async function recordToSqlite(event) {
  ensureMigration();
  await insert(
    `
      INSERT INTO site_analytics_events
        (path, temple_id, referrer, session_hash, ip_hash, ua_hash, is_bot, bot_category, device)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `,
    [
      event.path,
      event.templeId,
      event.referrer || null,
      event.sessionHash,
      event.ipHash,
      event.uaHash,
      event.isBot ? 1 : 0,
      event.isBot ? event.category : null,
      event.device,
    ]
  );
  await run(
    `
      INSERT INTO site_analytics_daily (day, temple_id, human_views, bot_views)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT(day, temple_id) DO UPDATE
        SET human_views = human_views + excluded.human_views,
            bot_views = bot_views + excluded.bot_views
    `,
    [event.day, event.templeId, event.isBot ? 0 : 1, event.isBot ? 1 : 0]
  );
}

/**
 * Record one page view. Returns null when the path is rejected, otherwise a
 * summary of what was stored. Never throws on bad input — only on storage
 * errors, which callers are expected to swallow.
 */
async function recordPageView({ path, templeId, referrer, sessionId, ip, userAgent }) {
  const cleanPath = sanitizePath(path);
  if (!cleanPath) return null;

  const ua = typeof userAgent === 'string' ? userAgent : '';
  const day = dayString(new Date());
  const { isBot, category } = classifyUserAgent(ua);
  const device = detectDevice(ua);
  const rawTempleId =
    typeof templeId === 'string' && templeId ? templeId : extractTempleId(cleanPath);
  const cleanTempleId = /^[a-z0-9-]{1,64}$/.test(rawTempleId) ? rawTempleId : '';
  const sessionHash = sha256(`${sanitizeSessionId(sessionId)}:${day}`).substring(0, 24);
  const ipHash = sha256(ip || 'unknown').substring(0, 16);
  const uaHash = sha256(ua).substring(0, 16);
  const cleanReferrer = sanitizeReferrer(referrer);
  // Referrer rollups track human traffic only; '(direct)' marks no referrer.
  const referrerDomain = isBot ? '' : extractReferrerDomain(cleanReferrer) || '(direct)';

  if (isRedisEnabled()) {
    try {
      await recordToRedis({
        day,
        templeId: cleanTempleId,
        isBot,
        category,
        device,
        sessionHash,
        referrerDomain,
      });
      return { recorded: true, isBot, category, device, templeId: cleanTempleId };
    } catch (err) {
      console.error('[site-analytics] Redis write failed, falling back to SQLite:', err.message);
      disableRedis();
    }
  }

  await recordToSqlite({
    day,
    path: cleanPath,
    templeId: cleanTempleId,
    referrer: cleanReferrer,
    sessionHash,
    ipHash,
    uaHash,
    isBot,
    category,
    device,
  });
  return { recorded: true, isBot, category, device, templeId: cleanTempleId };
}

// ─── Reporting ───

function emptyDevices() {
  return { mobile: 0, tablet: 0, desktop: 0 };
}

function finalizeOverview({
  days,
  byDayMap,
  templeMap,
  refMap,
  devices,
  botCatMap,
  uniqueSessions,
}) {
  const byDay = [...byDayMap.values()];
  let humanViews = 0;
  let botViews = 0;
  for (const row of byDay) {
    humanViews += row.human;
    botViews += row.bot;
  }
  const total = humanViews + botViews;
  const topTemples = [...templeMap.entries()]
    .filter(([templeId]) => templeId !== '')
    .map(([templeId, t]) => ({ templeId, human: t.human, bot: t.bot, uniques: t.uniques }))
    .sort((a, b) => b.human - a.human || a.templeId.localeCompare(b.templeId))
    .slice(0, 50);
  const topReferrers = [...refMap.entries()]
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count || a.referrer.localeCompare(b.referrer))
    .slice(0, 20);
  const botCategories = [...botCatMap.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  return {
    periodDays: days,
    totals: {
      humanViews,
      botViews,
      uniqueSessions,
      botPct: total > 0 ? Math.round((botViews / total) * 1000) / 10 : 0,
    },
    byDay,
    topTemples,
    topReferrers,
    devices,
    botCategories,
  };
}

async function scanKeys(client, pattern) {
  const keys = [];
  let cursor = '0';
  do {
    const [next, batch] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = next;
    keys.push(...batch);
  } while (cursor !== '0');
  return keys;
}

async function getRedisOverview({ days, templeId }) {
  const client = getRedisClient();
  if (!client) return null;
  const dayList = lastNDays(days);
  const byDayMap = new Map(dayList.map((day) => [day, { day, human: 0, bot: 0 }]));
  const templeMap = new Map();
  const refMap = new Map();
  const botCatMap = new Map();
  const devices = emptyDevices();
  let uniqueSessions = 0;

  const bumpTemple = (tid, field, count) => {
    const t = templeMap.get(tid) || { human: 0, bot: 0, uniques: 0 };
    t[field] += count;
    templeMap.set(tid, t);
  };

  for (const day of dayList) {
    const templeIds = [];
    if (templeId !== null) {
      templeIds.push(templeId);
    } else {
      const prefix = `${KEY_PREFIX}views:${day}:`;
      const keys = await scanKeys(client, `${prefix}*`);
      for (const key of keys) templeIds.push(key.slice(prefix.length));
    }
    for (const tid of templeIds) {
      const counts = await client.hgetall(`${KEY_PREFIX}views:${day}:${tid}`);
      const human = toCount(counts.human);
      const bot = toCount(counts.bot);
      const dayRow = byDayMap.get(day);
      dayRow.human += human;
      dayRow.bot += bot;
      bumpTemple(tid, 'human', human);
      bumpTemple(tid, 'bot', bot);
      bumpTemple(tid, 'uniques', await client.scard(`${KEY_PREFIX}uniq:${day}:${tid}`));
      const devCounts = await client.hgetall(`${KEY_PREFIX}devices:${day}:${tid}`);
      for (const name of Object.keys(devices)) {
        devices[name] += toCount(devCounts[name]);
      }
      const botCounts = await client.hgetall(`${KEY_PREFIX}bots:${day}:${tid}`);
      for (const [category, count] of Object.entries(botCounts)) {
        addToMap(botCatMap, category, toCount(count));
      }
      const refCounts = await client.hgetall(`${KEY_PREFIX}refs:${day}:${tid}`);
      for (const [domain, count] of Object.entries(refCounts)) {
        addToMap(refMap, domain, toCount(count));
      }
    }
    uniqueSessions += await client.scard(
      templeId !== null ? `${KEY_PREFIX}uniq:${day}:${templeId}` : `${KEY_PREFIX}uniq:${day}`
    );
  }

  return finalizeOverview({
    days,
    byDayMap,
    templeMap,
    refMap,
    devices,
    botCatMap,
    uniqueSessions,
  });
}

async function getSqliteOverview({ days, templeId }) {
  ensureMigration();
  const scoped = templeId !== null;
  const dayList = lastNDays(days);
  const params = scoped ? [dayList[0], templeId] : [dayList[0]];
  const scopeClause = scoped ? 'AND temple_id = $2' : '';
  const byDayMap = new Map(dayList.map((day) => [day, { day, human: 0, bot: 0 }]));

  const dayRows = await all(
    `
      SELECT day, SUM(human_views) AS human, SUM(bot_views) AS bot
        FROM site_analytics_daily
       WHERE day >= $1 ${scopeClause}
       GROUP BY day
    `,
    params
  );
  for (const row of dayRows) {
    const entry = byDayMap.get(row.day);
    if (entry) {
      entry.human = toCount(row.human);
      entry.bot = toCount(row.bot);
    }
  }

  const templeRows = await all(
    `
      SELECT temple_id, SUM(human_views) AS human, SUM(bot_views) AS bot
        FROM site_analytics_daily
       WHERE day >= $1 AND temple_id <> '' ${scopeClause}
       GROUP BY temple_id
    `,
    params
  );
  const uniqueRows = await all(
    `
      SELECT temple_id, COUNT(DISTINCT session_hash) AS uniques
        FROM site_analytics_events
       WHERE date(created_at) >= $1 AND temple_id <> '' ${scopeClause}
       GROUP BY temple_id
    `,
    params
  );
  const templeMap = new Map();
  for (const row of templeRows) {
    templeMap.set(row.temple_id, { human: toCount(row.human), bot: toCount(row.bot), uniques: 0 });
  }
  for (const row of uniqueRows) {
    const t = templeMap.get(row.temple_id) || { human: 0, bot: 0, uniques: 0 };
    t.uniques = toCount(row.uniques);
    templeMap.set(row.temple_id, t);
  }

  const uniqRow = await get(
    `
      SELECT COUNT(DISTINCT session_hash) AS uniques
        FROM site_analytics_events
       WHERE date(created_at) >= $1 ${scopeClause}
    `,
    params
  );
  const uniqueSessions = toCount(uniqRow?.uniques);

  const refRows = await all(
    `
      SELECT referrer, COUNT(*) AS views
        FROM site_analytics_events
       WHERE is_bot = 0 AND date(created_at) >= $1 ${scopeClause}
       GROUP BY referrer
    `,
    params
  );
  const refMap = new Map();
  for (const row of refRows) {
    const domain = extractReferrerDomain(row.referrer) || '(direct)';
    addToMap(refMap, domain, toCount(row.views));
  }

  const devRows = await all(
    `
      SELECT device, COUNT(*) AS views
        FROM site_analytics_events
       WHERE date(created_at) >= $1 ${scopeClause}
       GROUP BY device
    `,
    params
  );
  const devices = emptyDevices();
  for (const row of devRows) {
    if (row.device in devices) devices[row.device] += toCount(row.views);
  }

  const botRows = await all(
    `
      SELECT bot_category, COUNT(*) AS views
        FROM site_analytics_events
       WHERE is_bot = 1 AND bot_category IS NOT NULL AND date(created_at) >= $1 ${scopeClause}
       GROUP BY bot_category
    `,
    params
  );
  const botCatMap = new Map();
  for (const row of botRows) {
    addToMap(botCatMap, row.bot_category, toCount(row.views));
  }

  return finalizeOverview({
    days,
    byDayMap,
    templeMap,
    refMap,
    devices,
    botCatMap,
    uniqueSessions,
  });
}

function addToMap(map, key, count) {
  map.set(key, (map.get(key) || 0) + count);
}

async function getOverview({ days = 30 } = {}) {
  const window = clampDays(days);
  if (isRedisEnabled()) {
    try {
      const result = await getRedisOverview({ days: window, templeId: null });
      if (result) return result;
    } catch (err) {
      console.error('[site-analytics] Redis read failed, falling back to SQLite:', err.message);
      disableRedis();
    }
  }
  return getSqliteOverview({ days: window, templeId: null });
}

async function getTempleTraffic(templeId, { days = 30 } = {}) {
  const window = clampDays(days);
  const tid =
    typeof templeId === 'string' && /^[a-z0-9-]{1,64}$/.test(templeId) ? templeId : '__invalid__';
  if (isRedisEnabled()) {
    try {
      const result = await getRedisOverview({ days: window, templeId: tid });
      if (result) return result;
    } catch (err) {
      console.error('[site-analytics] Redis read failed, falling back to SQLite:', err.message);
      disableRedis();
    }
  }
  return getSqliteOverview({ days: window, templeId: tid });
}

module.exports = {
  recordPageView,
  getOverview,
  getTempleTraffic,
  extractTempleId,
  detectDevice,
  sanitizePath,
};
