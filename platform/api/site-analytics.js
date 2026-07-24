/**
 * PuniCodex — first-party site analytics engine.
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
const { runMigration: runMigrationV2 } = require('../db/migrate-site-analytics-v2');

const KEY_PREFIX = 'punicodex:analytics:';
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
  runMigrationV2();
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
  if (!event.isBot) {
    await run(
      `
        INSERT INTO site_analytics_paths_daily (day, path, human_views)
        VALUES ($1, $2, 1)
        ON CONFLICT(day, path) DO UPDATE
          SET human_views = human_views + 1
      `,
      [event.day, event.path]
    );
  }
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
      if (!isBot) {
        const client = getRedisClient();
        const pathKey = `${KEY_PREFIX}pathviews:${day}`;
        await client.hincrby(pathKey, cleanPath, 1);
        await client.expire(pathKey, ROLLUP_TTL_SECONDS);
      }
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

// ─── Engagement recording (v2 beacon: visible time + scroll depth) ───

const MAX_VISIBLE_MS = 30 * 60 * 1000; // beacon caps at 30 min; enforce server-side too

async function recordEngagementToSqlite(event) {
  ensureMigration();
  await insert(
    `
      INSERT INTO site_analytics_engagement
        (path, temple_id, session_hash, visible_ms, scroll_pct, device, is_bot)
      VALUES ($1, $2, $3, $4, $5, $6, 0)
      RETURNING id
    `,
    [event.path, event.templeId, event.sessionHash, event.visibleMs, event.scrollPct, event.device]
  );
  await run(
    `
      INSERT INTO site_analytics_engagement_daily
        (day, temple_id, engagements, total_visible_ms, total_scroll_pct)
      VALUES ($1, $2, 1, $3, $4)
      ON CONFLICT(day, temple_id) DO UPDATE
        SET engagements = engagements + 1,
            total_visible_ms = total_visible_ms + excluded.total_visible_ms,
            total_scroll_pct = total_scroll_pct + excluded.total_scroll_pct
    `,
    [event.day, event.templeId, event.visibleMs, event.scrollPct]
  );
}

/**
 * Record one engagement ping (visible milliseconds + max scroll depth for a
 * page visit). Bot pings are dropped entirely — engagement is a human-only
 * signal. Never throws on bad input.
 */
async function recordEngagement({ path, sessionId, visibleMs, scrollPct, userAgent }) {
  const cleanPath = sanitizePath(path);
  if (!cleanPath) return null;
  const ms = Number(visibleMs);
  const sc = Number(scrollPct);
  if (!Number.isFinite(ms) || ms < 500 || ms > MAX_VISIBLE_MS) return null;
  const cleanScroll = Number.isFinite(sc) ? Math.min(100, Math.max(0, Math.round(sc))) : 0;

  const ua = typeof userAgent === 'string' ? userAgent : '';
  const { isBot } = classifyUserAgent(ua);
  if (isBot) return null;

  const day = dayString(new Date());
  const device = detectDevice(ua);
  const templeId = extractTempleId(cleanPath);
  const sessionHash = sha256(`${sanitizeSessionId(sessionId)}:${day}`).substring(0, 24);
  const cleanMs = Math.round(ms);

  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (!client) throw new Error('Redis client unavailable');
      const key = `${KEY_PREFIX}eng:${day}:${templeId}`;
      await client
        .pipeline()
        .hincrby(key, 'engagements', 1)
        .hincrby(key, 'totalMs', cleanMs)
        .hincrby(key, 'totalScroll', cleanScroll)
        .expire(key, ROLLUP_TTL_SECONDS)
        .exec();
      return { recorded: true, templeId };
    } catch (err) {
      console.error(
        '[site-analytics] Redis engagement write failed, falling back to SQLite:',
        err.message
      );
      disableRedis();
    }
  }

  await recordEngagementToSqlite({
    day,
    path: cleanPath,
    templeId,
    sessionHash,
    visibleMs: cleanMs,
    scrollPct: cleanScroll,
    device,
  });
  return { recorded: true, templeId };
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
  topPaths,
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
    // null when the active storage driver cannot provide path-level rollups
    topPaths: Array.isArray(topPaths) ? topPaths : null,
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
  const pathMap = new Map();
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
    // Path-level rollups are site-wide hashes keyed by full path; when the
    // overview is temple-scoped, keep only that temple's path prefix.
    const pathCounts = await client.hgetall(`${KEY_PREFIX}pathviews:${day}`);
    for (const [p, count] of Object.entries(pathCounts || {})) {
      if (templeId !== null && !p.startsWith(`/sites/${templeId}/`)) continue;
      addToMap(pathMap, p, toCount(count));
    }
  }

  const topPaths = [...pathMap.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views || a.path.localeCompare(b.path))
    .slice(0, 20);

  return finalizeOverview({
    days,
    byDayMap,
    templeMap,
    refMap,
    devices,
    botCatMap,
    uniqueSessions,
    topPaths,
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

  // Path-level rollups are keyed by full path (no temple column); a temple
  // scope maps to the temple's path prefix.
  const pathRows = await all(
    `
      SELECT path, SUM(human_views) AS views
        FROM site_analytics_paths_daily
       WHERE day >= $1 ${scoped ? 'AND path LIKE $2' : ''}
       GROUP BY path
       ORDER BY views DESC, path ASC
       LIMIT 20
    `,
    scoped ? [dayList[0], `/sites/${templeId}/%`] : [dayList[0]]
  );
  const topPaths = pathRows.map((row) => ({ path: row.path, views: toCount(row.views) }));

  return finalizeOverview({
    days,
    byDayMap,
    templeMap,
    refMap,
    devices,
    botCatMap,
    uniqueSessions,
    topPaths,
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

// ─── Engagement + depth reporting (v2) ───

/**
 * Engagement aggregates for a period: average visible milliseconds, average
 * scroll depth, and per-temple engagement leaders. Human-only by construction
 * (bot pings are dropped at record time).
 */
async function getEngagementStats({ days = 30 } = {}) {
  const window = clampDays(days);
  const dayList = lastNDays(window);

  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (!client) throw new Error('Redis client unavailable');
      let engagements = 0;
      let totalMs = 0;
      let totalScroll = 0;
      const templeMap = new Map();
      for (const day of dayList) {
        const keys = await scanKeys(client, `${KEY_PREFIX}eng:${day}:*`);
        for (const key of keys) {
          const tid = key.slice(`${KEY_PREFIX}eng:${day}:`.length);
          const row = await client.hgetall(key);
          const e = toCount(row.engagements);
          const ms = toCount(row.totalMs);
          const sc = toCount(row.totalScroll);
          engagements += e;
          totalMs += ms;
          totalScroll += sc;
          if (tid !== '') {
            const t = templeMap.get(tid) || { engagements: 0, totalMs: 0 };
            t.engagements += e;
            t.totalMs += ms;
            templeMap.set(tid, t);
          }
        }
      }
      return finalizeEngagement({ days: window, engagements, totalMs, totalScroll, templeMap });
    } catch (err) {
      console.error(
        '[site-analytics] Redis engagement read failed, falling back to SQLite:',
        err.message
      );
      disableRedis();
    }
  }

  ensureMigration();
  const totals = await get(
    `
      SELECT SUM(engagements) AS engagements, SUM(total_visible_ms) AS total_ms,
             SUM(total_scroll_pct) AS total_scroll
        FROM site_analytics_engagement_daily
       WHERE day >= $1
    `,
    [dayList[0]]
  );
  const templeRows = await all(
    `
      SELECT temple_id, SUM(engagements) AS engagements, SUM(total_visible_ms) AS total_ms
        FROM site_analytics_engagement_daily
       WHERE day >= $1 AND temple_id <> ''
       GROUP BY temple_id
    `,
    [dayList[0]]
  );
  const templeMap = new Map();
  for (const row of templeRows) {
    templeMap.set(row.temple_id, {
      engagements: toCount(row.engagements),
      totalMs: toCount(row.total_ms),
    });
  }
  return finalizeEngagement({
    days: window,
    engagements: toCount(totals?.engagements),
    totalMs: toCount(totals?.total_ms),
    totalScroll: toCount(totals?.total_scroll),
    templeMap,
  });
}

function finalizeEngagement({ days, engagements, totalMs, totalScroll, templeMap }) {
  const topEngaged = [...templeMap.entries()]
    .map(([templeId, t]) => ({
      templeId,
      engagements: t.engagements,
      avgVisibleMs: t.engagements > 0 ? Math.round(t.totalMs / t.engagements) : 0,
    }))
    .sort((a, b) => b.avgVisibleMs - a.avgVisibleMs || a.templeId.localeCompare(b.templeId))
    .slice(0, 50);
  return {
    periodDays: days,
    engagements,
    avgVisibleMs: engagements > 0 ? Math.round(totalMs / engagements) : 0,
    avgScrollPct: engagements > 0 ? Math.round(totalScroll / engagements) : 0,
    topEngaged,
  };
}

/**
 * Session depth for a period (SQLite only — the Redis rollups store unique
 * session sets, not per-session page counts): average pages per session and
 * the share of single-page sessions. Returns null when unavailable so the
 * dashboard can hide the panel honestly instead of showing fabricated numbers.
 */
async function getSessionDepth({ days = 30 } = {}) {
  if (isRedisEnabled()) return null;
  ensureMigration();
  const window = clampDays(days);
  const dayList = lastNDays(window);
  const row = await get(
    `
      SELECT COUNT(*) AS views, COUNT(DISTINCT session_hash) AS sessions
        FROM site_analytics_events
       WHERE is_bot = 0 AND date(created_at) >= $1
    `,
    [dayList[0]]
  );
  const views = toCount(row?.views);
  const sessions = toCount(row?.sessions);
  const bounceRow = await get(
    `
      SELECT COUNT(*) AS singles
        FROM (
          SELECT session_hash
            FROM site_analytics_events
           WHERE is_bot = 0 AND date(created_at) >= $1 AND session_hash <> ''
           GROUP BY session_hash
          HAVING COUNT(*) = 1
        )
    `,
    [dayList[0]]
  );
  const singles = toCount(bounceRow?.singles);
  return {
    periodDays: window,
    pagesPerSession: sessions > 0 ? Math.round((views / sessions) * 100) / 100 : 0,
    singlePageSessions: singles,
    sessions,
    bouncePct: sessions > 0 ? Math.round((singles / sessions) * 1000) / 10 : 0,
  };
}

// ─── Trending (public aggregates) ───

const TRENDING_CACHE_MS = 10 * 60 * 1000;
const TRENDING_MIN_VIEWS = 3;
let trendingCache = { at: 0, key: '', data: null };

/**
 * Public, privacy-safe popularity aggregates: human page views per temple
 * and per path over a short window. No sessions, no referrers, nothing
 * per-visitor — counts only, with a small minimum-view threshold.
 */
async function getTrending({ days = 7, limit = 20 } = {}) {
  const window = Math.min(30, Math.max(1, parseInt(days, 10) || 7));
  const max = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const cacheKey = `${window}:${max}`;
  if (
    trendingCache.data &&
    trendingCache.key === cacheKey &&
    Date.now() - trendingCache.at < TRENDING_CACHE_MS
  ) {
    return trendingCache.data;
  }
  const dayList = lastNDays(window);
  let temples = [];
  let pages = [];

  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (!client) throw new Error('Redis client unavailable');
      const templeMap = new Map();
      for (const day of dayList) {
        const keys = await scanKeys(client, `${KEY_PREFIX}views:${day}:*`);
        for (const key of keys) {
          const tid = key.slice(`${KEY_PREFIX}views:${day}:`.length);
          if (tid === '') continue;
          const row = await client.hgetall(key);
          templeMap.set(tid, (templeMap.get(tid) || 0) + toCount(row.human));
        }
        const pathRows = await client.hgetall(`${KEY_PREFIX}pathviews:${day}`);
        for (const [p, count] of Object.entries(pathRows || {})) {
          pages.push([p, toCount(count)]);
        }
      }
      temples = [...templeMap.entries()].map(([templeId, views]) => ({ templeId, views }));
      const pageMap = new Map();
      for (const [p, count] of pages) pageMap.set(p, (pageMap.get(p) || 0) + count);
      pages = [...pageMap.entries()].map(([path, views]) => ({ path, views }));
    } catch (err) {
      console.error(
        '[site-analytics] Redis trending read failed, falling back to SQLite:',
        err.message
      );
      disableRedis();
    }
  }

  if (!isRedisEnabled() || (temples.length === 0 && pages.length === 0)) {
    ensureMigration();
    const templeRows = await all(
      `
        SELECT temple_id, SUM(human_views) AS views
          FROM site_analytics_daily
         WHERE day >= $1 AND temple_id <> ''
         GROUP BY temple_id
        HAVING SUM(human_views) >= $2
    `,
      [dayList[0], TRENDING_MIN_VIEWS]
    );
    temples = templeRows.map((row) => ({ templeId: row.temple_id, views: toCount(row.views) }));
    const pageRows = await all(
      `
        SELECT path, SUM(human_views) AS views
          FROM site_analytics_paths_daily
         WHERE day >= $1
         GROUP BY path
        HAVING SUM(human_views) >= $2
    `,
      [dayList[0], TRENDING_MIN_VIEWS]
    );
    pages = pageRows.map((row) => ({ path: row.path, views: toCount(row.views) }));
  }

  temples.sort((a, b) => b.views - a.views || a.templeId.localeCompare(b.templeId));
  pages.sort((a, b) => b.views - a.views || a.path.localeCompare(b.path));
  const data = {
    periodDays: window,
    generatedAt: new Date().toISOString(),
    temples: temples.slice(0, max),
    pages: pages.slice(0, max),
  };
  trendingCache = { at: Date.now(), key: cacheKey, data };
  return data;
}

module.exports = {
  recordPageView,
  recordEngagement,
  getOverview,
  getTempleTraffic,
  getEngagementStats,
  getSessionDepth,
  getTrending,
  extractTempleId,
  detectDevice,
  sanitizePath,
};
