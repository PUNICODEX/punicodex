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
const { runMigration: runMigrationV3 } = require('../db/migrate-site-analytics-v3');
const { runMigration: runMigrationV4 } = require('../db/migrate-site-analytics-v4');
const { runMigration: runMigrationV5 } = require('../db/migrate-site-analytics-v5');
const { runMigration: runMigrationV5Pg } = require('../db/migrate-site-analytics-v5-pg');
const { LEXICON } = require('../../type/js/lexicon.js');

const KEY_PREFIX = 'punicodex:analytics:';
const ROLLUP_TTL_SECONDS = 365 * 24 * 60 * 60; // 365 days — supports 120-day rolling + quarterly comparison
const MAX_PATH_LENGTH = 200;
const MAX_REFERRER_LENGTH = 300;
const MAX_SESSION_ID_LENGTH = 64;

// Valid temple ids from the canonical lexicon. Used to attribute canonical
// /{id}/ paths (the public URL form) without mislabelling top-level pages
// like /about/ or /contact/ as temples.
const TEMPLE_IDS = new Set(LEXICON.map((entry) => entry.id));

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// The site did not exist before launch, so periods earlier than this are
// structurally empty — showing them in quarter selectors, cohort grids, and
// trend windows is noise, not honesty. Env-overridable for future re-launches.
const ANALYTICS_LAUNCH_DATE = /^\d{4}-\d{2}-\d{2}$/.test(
  process.env.PUNICODEX_ANALYTICS_LAUNCH_DATE || ''
)
  ? process.env.PUNICODEX_ANALYTICS_LAUNCH_DATE
  : '2026-01-01';

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function lastNDays(days) {
  const list = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const day = dayString(new Date(now - i * 24 * 60 * 60 * 1000));
    if (day >= ANALYTICS_LAUNCH_DATE) list.push(day);
  }
  // Callers index list[0] as the window start; never return an empty window.
  if (list.length === 0) list.push(dayString(new Date(now)));
  return list;
}

function quarterRange(key) {
  const [yearStr, qStr] = key.split('-Q');
  const year = parseInt(yearStr, 10);
  const quarter = parseInt(qStr, 10);
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 0));
  return {
    key,
    year,
    quarter,
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function lastNQuarters(n) {
  const list = [];
  const now = new Date();
  let y = now.getUTCFullYear();
  let q = Math.ceil((now.getUTCMonth() + 1) / 3);
  for (let i = 0; i < n; i++) {
    const key = `${y}-Q${q}`;
    // Drop quarters that ended before launch — they can never hold data.
    if (quarterRange(key).end >= ANALYTICS_LAUNCH_DATE) list.push(key);
    q -= 1;
    if (q === 0) {
      q = 4;
      y -= 1;
    }
  }
  return list;
}

function clampDays(days) {
  const n = parseInt(days, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(120, Math.max(1, n));
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
  // Internal /sites/{id}/ form (used by middleware rewrites and static files).
  const sitesMatch = path.match(/^\/sites\/([a-z0-9-]{1,64})(\/|$)/);
  if (sitesMatch) return sitesMatch[1];
  // Canonical public /{id}/ form — validate against the lexicon so pages
  // like /about/ are not misreported as the "about" temple.
  const canonicalMatch = path.match(/^\/([a-z0-9-]{1,64})(\/|$)/);
  if (canonicalMatch && TEMPLE_IDS.has(canonicalMatch[1])) return canonicalMatch[1];
  return '';
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

async function ensureMigration() {
  if (migrationRan) return;
  if (isPostgres()) {
    await runMigrationV5Pg();
  } else {
    runMigration();
    runMigrationV2();
    runMigrationV3();
    runMigrationV4();
    runMigrationV5();
  }
  migrationRan = true;
}

async function recordToSqlite(event) {
  await ensureMigration();
  await insert(
    `
      INSERT INTO site_analytics_events
        (path, temple_id, referrer, session_hash, ip_hash, ua_hash, is_bot, bot_category, device, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
      event.country || null,
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
    if (event.country) {
      await run(
        `
          INSERT INTO site_analytics_countries_daily (day, country, human_views)
          VALUES ($1, $2, 1)
          ON CONFLICT(day, country) DO UPDATE
            SET human_views = human_views + 1
        `,
        [event.day, event.country]
      );
    }
  }
}

/**
 * Record one page view. Returns null when the path is rejected, otherwise a
 * summary of what was stored. Never throws on bad input — only on storage
 * errors, which callers are expected to swallow.
 */
async function recordPageView({ path, templeId, referrer, sessionId, ip, userAgent, country }) {
  const cleanPath = sanitizePath(path);
  if (!cleanPath) return null;

  const ua = typeof userAgent === 'string' ? userAgent : '';
  const day = dayString(new Date());
  const { isBot, category } = classifyUserAgent(ua);
  const device = detectDevice(ua);
  const rawTempleId =
    typeof templeId === 'string' && templeId ? templeId : extractTempleId(cleanPath);
  const cleanTempleId = /^[a-z0-9-]{1,64}$/.test(rawTempleId) ? rawTempleId : '';
  const cleanCountry = typeof country === 'string' && /^[A-Z]{2}$/.test(country) ? country : '';
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
        if (cleanCountry) {
          const countryKey = `${KEY_PREFIX}countries:${day}`;
          await client.hincrby(countryKey, cleanCountry, 1);
          await client.expire(countryKey, ROLLUP_TTL_SECONDS);
          const templeCountryKey = `${KEY_PREFIX}countries:${day}:${cleanTempleId}`;
          await client.hincrby(templeCountryKey, cleanCountry, 1);
          await client.expire(templeCountryKey, ROLLUP_TTL_SECONDS);
        }
      }
      // Durable dual-write: Postgres is the source of truth for backfills,
      // so it records every event even when Redis succeeds (previously the
      // early return meant PG only saw Redis-outage windows — the 2026-08
      // Redis rotation left no history to replay). A PG failure must never
      // break event recording, so it is isolated and logged.
      try {
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
          country: cleanCountry,
        });
      } catch (pgErr) {
        console.error(
          '[site-analytics] durable write failed (Redis has the event):',
          pgErr.message
        );
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
    country: cleanCountry,
  });
  return { recorded: true, isBot, category, device, templeId: cleanTempleId };
}

// ─── Engagement recording (v2 beacon: visible time + scroll depth) ───

const MAX_VISIBLE_MS = 30 * 60 * 1000; // beacon caps at 30 min; enforce server-side too

async function recordEngagementToSqlite(event) {
  await ensureMigration();
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
      // Durable dual-write (same doctrine as recordEvent): Postgres keeps
      // every engagement so rollups can always be rebuilt after a Redis
      // rotation; failures are isolated and logged, never thrown.
      try {
        await recordEngagementToSqlite({
          day,
          path: cleanPath,
          templeId,
          sessionHash,
          visibleMs: cleanMs,
          scrollPct: cleanScroll,
          device,
        });
      } catch (pgErr) {
        console.error(
          '[site-analytics] durable engagement write failed (Redis has it):',
          pgErr.message
        );
      }
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
      if (
        templeId !== null &&
        !p.startsWith(`/sites/${templeId}/`) &&
        !p.startsWith(`/${templeId}/`)
      )
        continue;
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
  await ensureMigration();
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
       WHERE day >= $1 ${scoped ? 'AND (path LIKE $2 OR path LIKE $3)' : ''}
       GROUP BY path
       ORDER BY views DESC, path ASC
       LIMIT 20
    `,
    scoped ? [dayList[0], `/sites/${templeId}/%`, `/${templeId}/%`] : [dayList[0]]
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

  await ensureMigration();
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
  await ensureMigration();
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

// ─── Country reporting (v3) ───

/**
 * Site-wide country aggregates: human page views per ISO alpha-2 country.
 * Coarse by design — no regions, no cities, nothing below country level.
 */
async function getCountryStats({ days = 30, limit = 30 } = {}) {
  const window = clampDays(days);
  const max = Math.min(60, Math.max(1, parseInt(limit, 10) || 30));
  const dayList = lastNDays(window);

  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (!client) throw new Error('Redis client unavailable');
      const countryMap = new Map();
      for (const day of dayList) {
        const rows = await client.hgetall(`${KEY_PREFIX}countries:${day}`);
        for (const [country, count] of Object.entries(rows || {})) {
          countryMap.set(country, (countryMap.get(country) || 0) + toCount(count));
        }
      }
      const countries = [...countryMap.entries()]
        .map(([country, views]) => ({ country, views }))
        .sort((a, b) => b.views - a.views || a.country.localeCompare(b.country))
        .slice(0, max);
      return { periodDays: window, countries };
    } catch (err) {
      console.error(
        '[site-analytics] Redis country read failed, falling back to SQLite:',
        err.message
      );
      disableRedis();
    }
  }

  await ensureMigration();
  const rows = await all(
    `
      SELECT country, SUM(human_views) AS views
        FROM site_analytics_countries_daily
       WHERE day >= $1
       GROUP BY country
       ORDER BY views DESC, country ASC
       LIMIT $2
    `,
    [dayList[0], max]
  );
  return {
    periodDays: window,
    countries: rows.map((row) => ({ country: row.country, views: toCount(row.views) })),
  };
}

// ─── Per-temple drill-down (trending detail) ───

/**
 * Deep analytics for one temple: views series, unique sessions, engagement
 * (attention time + scroll depth), countries, referrers, sub-pages, devices,
 * and "also visited" sister temples (navigation habits). Aggregates only;
 * panels that a storage driver cannot compute come back as null so the page
 * can hide them honestly.
 */
async function getTempleAnalytics(templeId, { days = 30 } = {}) {
  const tid = typeof templeId === 'string' && /^[a-z0-9-]{1,64}$/.test(templeId) ? templeId : null;
  if (!tid) return null;
  const window = clampDays(days);
  const dayList = lastNDays(window);
  const firstDay = dayList[0];
  const pathPrefix = `/sites/${tid}/%`;

  const byDayMap = new Map(dayList.map((day) => [day, { day, views: 0, avgVisibleMs: 0 }]));
  let uniqueSessions = 0;
  let views = 0;
  let countries = null;
  let referrers = null;
  let subPages = null;
  let devices = null;
  let alsoVisited = null;

  // ── Views + engagement series (SQLite; Redis fills views only) ──
  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (!client) throw new Error('Redis client unavailable');
      for (const day of dayList) {
        const counts = await client.hgetall(`${KEY_PREFIX}views:${day}:${tid}`);
        const human = toCount(counts.human);
        byDayMap.get(day).views = human;
        views += human;
        uniqueSessions += await client.scard(`${KEY_PREFIX}uniq:${day}:${tid}`);
        const eng = await client.hgetall(`${KEY_PREFIX}eng:${day}:${tid}`);
        const engagements = toCount(eng.engagements);
        if (engagements > 0) {
          byDayMap.get(day).avgVisibleMs = Math.round(toCount(eng.totalMs) / engagements);
        }
        const countryRows = await client.hgetall(`${KEY_PREFIX}countries:${day}:${tid}`);
        if (countryRows && Object.keys(countryRows).length) {
          if (!countries) countries = new Map();
          for (const [country, count] of Object.entries(countryRows)) {
            countries.set(country, (countries.get(country) || 0) + toCount(count));
          }
        }
      }
      countries = countries
        ? [...countries.entries()]
            .map(([country, count]) => ({ country, views: count }))
            .sort((a, b) => b.views - a.views || a.country.localeCompare(b.country))
            .slice(0, 12)
        : null;
    } catch (err) {
      console.error(
        '[site-analytics] Redis temple read failed, falling back to SQLite:',
        err.message
      );
      disableRedis();
    }
  }

  if (!isRedisEnabled()) {
    await ensureMigration();
    const dayRows = await all(
      `
        SELECT day, SUM(human_views) AS views
          FROM site_analytics_daily
         WHERE temple_id = $1 AND day >= $2
         GROUP BY day
      `,
      [tid, firstDay]
    );
    for (const row of dayRows) {
      const entry = byDayMap.get(row.day);
      if (entry) entry.views = toCount(row.views);
      views += toCount(row.views);
    }

    const uniqRow = await get(
      `
        SELECT COUNT(DISTINCT session_hash) AS uniques
          FROM site_analytics_events
         WHERE temple_id = $1 AND is_bot = 0 AND date(created_at) >= $2
      `,
      [tid, firstDay]
    );
    uniqueSessions = toCount(uniqRow?.uniques);

    const engRows = await all(
      `
        SELECT day, SUM(engagements) AS engagements, SUM(total_visible_ms) AS total_ms
          FROM site_analytics_engagement_daily
         WHERE temple_id = $1 AND day >= $2
         GROUP BY day
      `,
      [tid, firstDay]
    );
    for (const row of engRows) {
      const entry = byDayMap.get(row.day);
      const engagements = toCount(row.engagements);
      if (entry && engagements > 0) {
        entry.avgVisibleMs = Math.round(toCount(row.total_ms) / engagements);
      }
    }

    const countryRows = await all(
      `
        SELECT country, COUNT(*) AS views
          FROM site_analytics_events
         WHERE temple_id = $1 AND is_bot = 0 AND country IS NOT NULL AND date(created_at) >= $2
         GROUP BY country
         ORDER BY views DESC, country ASC
         LIMIT 12
      `,
      [tid, firstDay]
    );
    countries = countryRows.length
      ? countryRows.map((row) => ({ country: row.country, views: toCount(row.views) }))
      : null;

    const refRows = await all(
      `
        SELECT referrer, COUNT(*) AS views
          FROM site_analytics_events
         WHERE temple_id = $1 AND is_bot = 0 AND date(created_at) >= $2
         GROUP BY referrer
      `,
      [tid, firstDay]
    );
    const refMap = new Map();
    for (const row of refRows) {
      const domain = extractReferrerDomain(row.referrer) || '(direct)';
      addToMap(refMap, domain, toCount(row.views));
    }
    referrers = refMap.size
      ? [...refMap.entries()]
          .map(([referrer, count]) => ({ referrer, count }))
          .sort((a, b) => b.count - a.count || a.referrer.localeCompare(b.referrer))
          .slice(0, 10)
      : null;

    const pathRows = await all(
      `
        SELECT path, SUM(human_views) AS views
          FROM site_analytics_paths_daily
         WHERE day >= $1 AND path LIKE $2
         GROUP BY path
         ORDER BY views DESC, path ASC
         LIMIT 10
      `,
      [firstDay, pathPrefix]
    );
    subPages = pathRows.length
      ? pathRows.map((row) => ({ path: row.path, views: toCount(row.views) }))
      : null;

    const devRows = await all(
      `
        SELECT device, COUNT(*) AS views
          FROM site_analytics_events
         WHERE temple_id = $1 AND date(created_at) >= $2
         GROUP BY device
      `,
      [tid, firstDay]
    );
    const devMap = emptyDevices();
    for (const row of devRows) {
      if (row.device in devMap) devMap[row.device] += toCount(row.views);
    }
    devices = devMap;

    // Navigation habits: sister temples viewed by the same sessions.
    const alsoRows = await all(
      `
        SELECT e2.temple_id AS other, COUNT(DISTINCT e2.session_hash) AS sessions
          FROM site_analytics_events e1
          JOIN site_analytics_events e2
            ON e1.session_hash = e2.session_hash
           AND e2.is_bot = 0
           AND e2.temple_id <> ''
           AND e2.temple_id <> $1
           AND date(e2.created_at) >= $2
         WHERE e1.temple_id = $3
           AND e1.is_bot = 0
           AND date(e1.created_at) >= $4
         GROUP BY e2.temple_id
         ORDER BY sessions DESC, other ASC
         LIMIT 8
      `,
      [tid, firstDay, tid, firstDay]
    );
    alsoVisited = alsoRows.length
      ? alsoRows.map((row) => ({ templeId: row.other, sessions: toCount(row.sessions) }))
      : null;
  }

  const series = [...byDayMap.values()];
  const engagements = series.reduce((sum, row) => sum + (row.avgVisibleMs > 0 ? 1 : 0), 0);
  const attentionDays = series.filter((row) => row.avgVisibleMs > 0);
  const avgVisibleMs = attentionDays.length
    ? Math.round(
        attentionDays.reduce((sum, row) => sum + row.avgVisibleMs, 0) / attentionDays.length
      )
    : 0;

  return {
    templeId: tid,
    periodDays: window,
    generatedAt: new Date().toISOString(),
    totals: {
      views,
      uniqueSessions,
      avgVisibleMs,
      engagementDays: engagements,
    },
    byDay: series,
    countries,
    referrers,
    subPages,
    devices,
    alsoVisited,
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
    await ensureMigration();
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
  const today = dayString(new Date());
  const todayMap = new Map();
  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (client) {
        const keys = await scanKeys(client, `${KEY_PREFIX}views:${today}:*`);
        for (const key of keys) {
          const tid = key.slice(`${KEY_PREFIX}views:${today}:`.length);
          if (tid === '') continue;
          const row = await client.hgetall(key);
          todayMap.set(tid, toCount(row.human));
        }
      }
    } catch {
      // today deltas are cosmetic; never fail the board over them
    }
  } else {
    await ensureMigration();
    const todayRows = await all(
      `
        SELECT temple_id, SUM(human_views) AS views
          FROM site_analytics_daily
         WHERE day = $1 AND temple_id <> ''
         GROUP BY temple_id
      `,
      [today]
    );
    for (const row of todayRows) todayMap.set(row.temple_id, toCount(row.views));
  }
  for (const temple of temples) {
    temple.viewsToday = todayMap.get(temple.templeId) || 0;
  }
  const countries = (await getCountryStats({ days: window, limit: 15 })).countries;
  const data = {
    periodDays: window,
    generatedAt: new Date().toISOString(),
    temples: temples.slice(0, max),
    pages: pages.slice(0, max),
    countries,
  };
  trendingCache = { at: Date.now(), key: cacheKey, data };
  return data;
}

// ─── Quarterly reporting (v4) ───

function daysInRange(startDay, endDay) {
  const days = [];
  const cur = new Date(`${startDay}T00:00:00Z`);
  const end = new Date(`${endDay}T00:00:00Z`);
  while (cur <= end) {
    days.push(dayString(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

async function getSqliteQuarterlyTotals(yearQuarter, templeId) {
  await ensureMigration();
  const scoped = templeId !== null && /^[a-z0-9-]{1,64}$/.test(templeId);
  const params = scoped ? [yearQuarter, templeId] : [yearQuarter];
  const scopeClause = scoped ? 'AND temple_id = $2' : '';
  const row = await get(
    `
      SELECT SUM(human_views) AS human_views,
             SUM(bot_views) AS bot_views,
             SUM(unique_sessions) AS unique_sessions,
             SUM(engagements) AS engagements,
             SUM(total_visible_ms) AS total_visible_ms
        FROM site_analytics_quarterly
       WHERE year_quarter = $1 ${scopeClause}
    `,
    params
  );
  const humanViews = toCount(row?.human_views);
  const botViews = toCount(row?.bot_views);
  const uniqueSessions = toCount(row?.unique_sessions);
  const engagements = toCount(row?.engagements);
  const totalVisibleMs = toCount(row?.total_visible_ms);
  const avgVisibleMs = engagements > 0 ? Math.round(totalVisibleMs / engagements) : 0;
  const total = humanViews + botViews;
  const botPct = total > 0 ? Math.round((botViews / total) * 1000) / 10 : 0;
  return { humanViews, botViews, uniqueSessions, engagements, avgVisibleMs, botPct };
}

/**
 * Quarterly overview with optional quarter-over-quarter comparison.
 *
 * The quarter key (e.g. "2026-Q3") is expanded to a calendar day range via
 * quarterRange(). SQLite reads from the pre-aggregated site_analytics_quarterly
 * table for headline totals and drills into site_analytics_events for referrer,
 * device, and bot-category breakdowns. Redis aggregates the same daily rollup
 * keys across the quarter's day range.
 */
async function getQuarterlyOverview({ yearQuarter, templeId = null, compareWith = null }) {
  const scopedId =
    typeof templeId === 'string' && /^[a-z0-9-]{1,64}$/.test(templeId) ? templeId : null;

  if (isRedisEnabled()) {
    try {
      const result = await getRedisQuarterlyOverview({
        yearQuarter,
        templeId: scopedId,
        compareWith,
      });
      if (result) return result;
    } catch (err) {
      console.error(
        '[site-analytics] Redis quarterly read failed, falling back to SQLite:',
        err.message
      );
      disableRedis();
    }
  }

  await ensureMigration();
  const { start, end } = quarterRange(yearQuarter);
  const params = scopedId !== null ? [yearQuarter, scopedId] : [yearQuarter];
  const scopeClause = scopedId !== null ? 'AND temple_id = $2' : '';

  // Headline totals from the quarterly rollup table.
  const totals = await getSqliteQuarterlyTotals(yearQuarter, scopedId);

  // Per-temple rankings within the quarter.
  const templeRows = await all(
    `
      SELECT temple_id, human_views, bot_views, unique_sessions
        FROM site_analytics_quarterly
       WHERE year_quarter = $1 ${scopeClause}
       ORDER BY human_views DESC, temple_id ASC
    `,
    params
  );
  const topTemples = templeRows.map((row) => ({
    templeId: row.temple_id,
    human: toCount(row.human_views),
    bot: toCount(row.bot_views),
    uniques: toCount(row.unique_sessions),
  }));

  // Event-level breakdowns are scoped to the calendar quarter.
  const eventParams = scopedId !== null ? [start, end, scopedId] : [start, end];
  const eventScope = scopedId !== null ? 'AND temple_id = $3' : '';

  const refRows = await all(
    `
      SELECT referrer, COUNT(*) AS views
        FROM site_analytics_events
       WHERE is_bot = 0 AND date(created_at) BETWEEN $1 AND $2 ${eventScope}
       GROUP BY referrer
    `,
    eventParams
  );
  const refMap = new Map();
  for (const row of refRows) {
    const domain = extractReferrerDomain(row.referrer) || '(direct)';
    addToMap(refMap, domain, toCount(row.views));
  }
  const topReferrers = [...refMap.entries()]
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count || a.referrer.localeCompare(b.referrer))
    .slice(0, 20);

  const devRows = await all(
    `
      SELECT device, COUNT(*) AS views
        FROM site_analytics_events
       WHERE date(created_at) BETWEEN $1 AND $2 ${eventScope}
       GROUP BY device
    `,
    eventParams
  );
  const devices = emptyDevices();
  for (const row of devRows) {
    if (row.device in devices) devices[row.device] += toCount(row.views);
  }

  const botRows = await all(
    `
      SELECT bot_category, COUNT(*) AS views
        FROM site_analytics_events
       WHERE is_bot = 1 AND bot_category IS NOT NULL
             AND date(created_at) BETWEEN $1 AND $2 ${eventScope}
       GROUP BY bot_category
    `,
    eventParams
  );
  const botCatMap = new Map();
  for (const row of botRows) {
    addToMap(botCatMap, row.bot_category, toCount(row.views));
  }
  const botCategories = [...botCatMap.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  let comparison = null;
  if (compareWith) {
    const compareTotals = await getSqliteQuarterlyTotals(compareWith, scopedId);
    const changePct = {};
    for (const key of Object.keys(totals)) {
      const prev = compareTotals[key];
      const curr = totals[key];
      changePct[key] = prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0;
    }
    comparison = { yearQuarter: compareWith, totals: compareTotals, changePct };
  }

  return {
    yearQuarter,
    periodDays: null,
    totals,
    topTemples,
    topReferrers,
    devices,
    botCategories,
    comparison,
  };
}

async function getRedisQuarterlyOverview({ yearQuarter, templeId, compareWith }) {
  const client = getRedisClient();
  if (!client) return null;
  const { start, end } = quarterRange(yearQuarter);
  const dayList = daysInRange(start, end);
  const templeMap = new Map();
  const refMap = new Map();
  const botCatMap = new Map();
  const devices = emptyDevices();
  let humanViews = 0;
  let botViews = 0;
  let uniqueSessions = 0;
  let engagements = 0;
  let totalVisibleMs = 0;

  const bumpTemple = (tid, field, count) => {
    const t = templeMap.get(tid) || { human: 0, bot: 0, uniques: 0 };
    t[field] += count;
    templeMap.set(tid, t);
  };

  // Aggregate every daily rollup key that falls inside the quarter.
  for (const day of dayList) {
    const templeIds = templeId !== null ? [templeId] : [];
    if (templeId === null) {
      const prefix = `${KEY_PREFIX}views:${day}:`;
      const keys = await scanKeys(client, `${prefix}*`);
      for (const key of keys) templeIds.push(key.slice(prefix.length));
    }
    for (const tid of templeIds) {
      const counts = await client.hgetall(`${KEY_PREFIX}views:${day}:${tid}`);
      const h = toCount(counts.human);
      const b = toCount(counts.bot);
      humanViews += h;
      botViews += b;
      bumpTemple(tid, 'human', h);
      bumpTemple(tid, 'bot', b);
      const u = await client.scard(`${KEY_PREFIX}uniq:${day}:${tid}`);
      uniqueSessions += u;
      bumpTemple(tid, 'uniques', u);

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
      const eng = await client.hgetall(`${KEY_PREFIX}eng:${day}:${tid}`);
      engagements += toCount(eng.engagements);
      totalVisibleMs += toCount(eng.totalMs);
    }
  }

  const avgVisibleMs = engagements > 0 ? Math.round(totalVisibleMs / engagements) : 0;
  const total = humanViews + botViews;
  const botPct = total > 0 ? Math.round((botViews / total) * 1000) / 10 : 0;
  const totals = { humanViews, botViews, uniqueSessions, engagements, avgVisibleMs, botPct };
  const topTemples = [...templeMap.entries()]
    .filter(([tid]) => tid !== '')
    .map(([tid, t]) => ({ templeId: tid, human: t.human, bot: t.bot, uniques: t.uniques }))
    .sort((a, b) => b.human - a.human || a.templeId.localeCompare(b.templeId));
  const topReferrers = [...refMap.entries()]
    .map(([referrer, count]) => ({ referrer, count }))
    .sort((a, b) => b.count - a.count || a.referrer.localeCompare(b.referrer))
    .slice(0, 20);
  const botCategories = [...botCatMap.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  let comparison = null;
  if (compareWith) {
    const compare = await getRedisQuarterlyOverview({
      yearQuarter: compareWith,
      templeId,
      compareWith: null,
    });
    if (compare) {
      const changePct = {};
      for (const key of Object.keys(totals)) {
        const prev = compare.totals[key];
        const curr = totals[key];
        changePct[key] = prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0;
      }
      comparison = { yearQuarter: compareWith, totals: compare.totals, changePct };
    }
  }

  return {
    yearQuarter,
    periodDays: null,
    totals,
    topTemples,
    topReferrers,
    devices,
    botCategories,
    comparison,
  };
}

// ─── Trend + momentum metrics ───

async function getSqliteTrafficTotalsForRange(firstDay, lastDay, templeId) {
  await ensureMigration();
  const scoped = templeId !== null && /^[a-z0-9-]{1,64}$/.test(templeId);
  const params = scoped ? [firstDay, lastDay, templeId] : [firstDay, lastDay];
  const scopeClause = scoped ? 'AND temple_id = $3' : '';

  const dailyRow = await get(
    `
      SELECT SUM(human_views) AS human, SUM(bot_views) AS bot
        FROM site_analytics_daily
       WHERE day >= $1 AND day <= $2 ${scopeClause}
    `,
    params
  );
  const uniqRow = await get(
    `
      SELECT COUNT(DISTINCT session_hash) AS uniques
        FROM site_analytics_events
       WHERE is_bot = 0 AND date(created_at) >= $1 AND date(created_at) <= $2 ${scopeClause}
    `,
    params
  );
  const humanViews = toCount(dailyRow?.human);
  const botViews = toCount(dailyRow?.bot);
  const uniqueSessions = toCount(uniqRow?.uniques);
  const total = humanViews + botViews;
  const botPct = total > 0 ? Math.round((botViews / total) * 1000) / 10 : 0;
  return { humanViews, botViews, uniqueSessions, botPct };
}

async function getSqliteEngagementForRange(firstDay, lastDay, templeId) {
  await ensureMigration();
  const scoped = templeId !== null && /^[a-z0-9-]{1,64}$/.test(templeId);
  const params = scoped ? [firstDay, lastDay, templeId] : [firstDay, lastDay];
  const scopeClause = scoped ? 'AND temple_id = $3' : '';
  const row = await get(
    `
      SELECT SUM(engagements) AS engagements, SUM(total_visible_ms) AS total_ms
        FROM site_analytics_engagement_daily
       WHERE day >= $1 AND day <= $2 ${scopeClause}
    `,
    params
  );
  const engagements = toCount(row?.engagements);
  const totalMs = toCount(row?.total_ms);
  return { avgVisibleMs: engagements > 0 ? Math.round(totalMs / engagements) : 0 };
}

/**
 * Trend metrics compare the current N-day window with the immediately
 * preceding N-day window. The current window is served by the existing
 * getOverview / getTempleTraffic paths; the previous window is computed
 * directly against SQLite because the public helpers are anchored to "today".
 */
async function getTrendMetrics({ days = 30, templeId = null } = {}) {
  const window = clampDays(days);
  const currentDayList = lastNDays(window);
  const previousDayList = lastNDays(window * 2).slice(0, window);
  const currentFirst = currentDayList[0];
  const currentLast = currentDayList[currentDayList.length - 1];
  const previousFirst = previousDayList[0];
  const previousLast = previousDayList[previousDayList.length - 1];
  const scopedId =
    typeof templeId === 'string' && /^[a-z0-9-]{1,64}$/.test(templeId) ? templeId : null;

  const currentOverview =
    scopedId !== null
      ? await getTempleTraffic(scopedId, { days: window })
      : await getOverview({ days: window });
  const previousOverview = await getSqliteTrafficTotalsForRange(
    previousFirst,
    previousLast,
    scopedId
  );

  const currentEngagement = await getSqliteEngagementForRange(currentFirst, currentLast, scopedId);
  const previousEngagement = await getSqliteEngagementForRange(
    previousFirst,
    previousLast,
    scopedId
  );

  const current = {
    humanViews: currentOverview.totals.humanViews,
    uniqueSessions: currentOverview.totals.uniqueSessions,
    botPct: currentOverview.totals.botPct,
    avgVisibleMs: currentEngagement.avgVisibleMs,
  };
  const previous = {
    humanViews: previousOverview.humanViews,
    uniqueSessions: previousOverview.uniqueSessions,
    botPct: previousOverview.botPct,
    avgVisibleMs: previousEngagement.avgVisibleMs,
  };

  const changePct = {};
  for (const key of Object.keys(current)) {
    const prev = previous[key];
    const curr = current[key];
    changePct[key] = prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : curr > 0 ? 100 : 0;
  }

  // Top movers: biggest absolute human-view deltas, then sorted by % change.
  const currentTempleRows = await all(
    `
      SELECT temple_id, SUM(human_views) AS human
        FROM site_analytics_daily
       WHERE day >= $1 AND day <= $2 AND temple_id <> ''
       GROUP BY temple_id
    `,
    [currentFirst, currentLast]
  );
  const previousTempleRows = await all(
    `
      SELECT temple_id, SUM(human_views) AS human
        FROM site_analytics_daily
       WHERE day >= $1 AND day <= $2 AND temple_id <> ''
       GROUP BY temple_id
    `,
    [previousFirst, previousLast]
  );
  const currentMap = new Map(currentTempleRows.map((r) => [r.temple_id, toCount(r.human)]));
  const previousMap = new Map(previousTempleRows.map((r) => [r.temple_id, toCount(r.human)]));
  const allTemples = new Set([...currentMap.keys(), ...previousMap.keys()]);
  const movers = [];
  for (const tid of allTemples) {
    const curr = currentMap.get(tid) || 0;
    const prev = previousMap.get(tid) || 0;
    const change = prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : curr > 0 ? 100 : 0;
    movers.push({ templeId: tid, currentHuman: curr, previousHuman: prev, changePct: change });
  }
  const topMovers = movers
    .sort(
      (a, b) =>
        Math.abs(b.currentHuman - b.previousHuman) - Math.abs(a.currentHuman - a.previousHuman)
    )
    .slice(0, 10)
    .sort((a, b) => b.changePct - a.changePct);

  return { days: window, current, previous, changePct, topMovers };
}

// ─── Cross-temple navigation flows ───

/**
 * Cross-temple navigation is derived from raw event sequences in SQLite.
 * Redis rollups do not preserve per-session ordering, so this function always
 * reads from SQLite (the durable dual-write guarantees completeness even when
 * Redis is the active driver).
 */
async function getCrossTempleFlows({ days = 30, limit = 25, templeId = null } = {}) {
  await ensureMigration();
  const window = clampDays(days);
  const max = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
  const dayList = lastNDays(window);
  const firstDay = dayList[0];
  const lastDay = dayList[dayList.length - 1];
  const scopedId =
    typeof templeId === 'string' && /^[a-z0-9-]{1,64}$/.test(templeId) ? templeId : null;

  // Origin→destination pairs, ordered by event time, counted once per session.
  const flowParams =
    scopedId !== null
      ? [firstDay, lastDay, firstDay, lastDay, scopedId, max]
      : [firstDay, lastDay, firstDay, lastDay, max];
  const flowScope = scopedId !== null ? 'AND e1.temple_id = $5' : '';
  const flowRows = await all(
    `
      SELECT e1.temple_id AS from_temple,
             e2.temple_id AS to_temple,
             COUNT(DISTINCT e1.session_hash) AS sessions
        FROM site_analytics_events e1
        JOIN site_analytics_events e2
          ON e1.session_hash = e2.session_hash
         AND e2.created_at > e1.created_at
         AND e2.is_bot = 0
         AND e2.temple_id <> ''
       WHERE e1.is_bot = 0
         AND e1.temple_id <> ''
         AND date(e1.created_at) BETWEEN $1 AND $2
         AND date(e2.created_at) BETWEEN $3 AND $4
         ${flowScope}
       GROUP BY e1.temple_id, e2.temple_id
      HAVING e1.temple_id <> e2.temple_id
       ORDER BY sessions DESC, e1.temple_id ASC, e2.temple_id ASC
       LIMIT $${scopedId !== null ? 6 : 5}
    `,
    flowParams
  );
  const flows = flowRows.map((row) => ({
    from: row.from_temple,
    to: row.to_temple,
    sessions: toCount(row.sessions),
  }));

  // First temple seen in each human session.
  const entryRows = await all(
    `
      SELECT temple_id, COUNT(*) AS sessions
        FROM (
          SELECT session_hash, temple_id,
                 ROW_NUMBER() OVER (PARTITION BY session_hash ORDER BY created_at ASC) AS rn
            FROM site_analytics_events
           WHERE is_bot = 0 AND temple_id <> '' AND date(created_at) BETWEEN $1 AND $2
        )
       WHERE rn = 1
       GROUP BY temple_id
       ORDER BY sessions DESC, temple_id ASC
       LIMIT $3
    `,
    [firstDay, lastDay, max]
  );
  const entryTemples = entryRows.map((row) => ({
    templeId: row.temple_id,
    sessions: toCount(row.sessions),
  }));

  // Last temple seen in each human session.
  const exitRows = await all(
    `
      SELECT temple_id, COUNT(*) AS sessions
        FROM (
          SELECT session_hash, temple_id,
                 ROW_NUMBER() OVER (PARTITION BY session_hash ORDER BY created_at DESC) AS rn
            FROM site_analytics_events
           WHERE is_bot = 0 AND temple_id <> '' AND date(created_at) BETWEEN $1 AND $2
        )
       WHERE rn = 1
       GROUP BY temple_id
       ORDER BY sessions DESC, temple_id ASC
       LIMIT $3
    `,
    [firstDay, lastDay, max]
  );
  const exitTemples = exitRows.map((row) => ({
    templeId: row.temple_id,
    sessions: toCount(row.sessions),
  }));

  // Unordered temple pairs that appear in the same human session.
  const clusterRows = await all(
    `
      SELECT a.temple_id AS a,
             b.temple_id AS b,
             COUNT(DISTINCT a.session_hash) AS sessions
        FROM site_analytics_events a
        JOIN site_analytics_events b
          ON a.session_hash = b.session_hash
         AND a.temple_id < b.temple_id
         AND b.is_bot = 0
       WHERE a.is_bot = 0
         AND a.temple_id <> ''
         AND date(a.created_at) BETWEEN $1 AND $2
         AND date(b.created_at) BETWEEN $3 AND $4
       GROUP BY a.temple_id, b.temple_id
       ORDER BY sessions DESC, a.temple_id ASC, b.temple_id ASC
       LIMIT $5
    `,
    [firstDay, lastDay, firstDay, lastDay, max]
  );
  const coViewClusters = clusterRows.map((row) => ({
    a: row.a,
    b: row.b,
    sessions: toCount(row.sessions),
  }));

  return { days: window, flows, entryTemples, exitTemples, coViewClusters };
}

// ─── CSV export ───

function csvEscape(value) {
  const str = String(value == null ? '' : value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values) {
  return `${values.map(csvEscape).join(',')}\n`;
}

/**
 * Export analytics data as a CSV string. Modes:
 *   overview / daily — daily view rows (+ totals for overview)
 *   temples          — top temples
 *   referrers        — top referrers
 *   flows            — cross-temple flows
 *   quarterly        — last 8 quarters
 */
async function exportAnalyticsCsv({ mode = 'overview', days = 30, templeId = null } = {}) {
  const window = clampDays(days);
  const scopedId =
    typeof templeId === 'string' && /^[a-z0-9-]{1,64}$/.test(templeId) ? templeId : null;

  switch (mode) {
    case 'overview':
    case 'daily': {
      const overview =
        scopedId !== null
          ? await getTempleTraffic(scopedId, { days: window })
          : await getOverview({ days: window });
      const rows = [toCsvRow(['day', 'human', 'bot'])];
      for (const row of overview.byDay) {
        rows.push(toCsvRow([row.day, row.human, row.bot]));
      }
      if (mode === 'overview') {
        rows.push(toCsvRow(['TOTAL', overview.totals.humanViews, overview.totals.botViews]));
      }
      return rows.join('');
    }
    case 'temples': {
      const overview =
        scopedId !== null
          ? await getTempleTraffic(scopedId, { days: window })
          : await getOverview({ days: window });
      const rows = [toCsvRow(['templeId', 'humanViews', 'botViews', 'uniqueSessions'])];
      for (const t of overview.topTemples) {
        rows.push(toCsvRow([t.templeId, t.human, t.bot, t.uniques]));
      }
      return rows.join('');
    }
    case 'referrers': {
      const overview =
        scopedId !== null
          ? await getTempleTraffic(scopedId, { days: window })
          : await getOverview({ days: window });
      const rows = [toCsvRow(['referrer', 'count'])];
      for (const r of overview.topReferrers) {
        rows.push(toCsvRow([r.referrer, r.count]));
      }
      return rows.join('');
    }
    case 'flows': {
      const flows = await getCrossTempleFlows({ days: window, templeId: scopedId });
      const rows = [toCsvRow(['from', 'to', 'sessions'])];
      for (const f of flows.flows) {
        rows.push(toCsvRow([f.from, f.to, f.sessions]));
      }
      return rows.join('');
    }
    case 'quarterly': {
      await ensureMigration();
      const quarters = lastNQuarters(8);
      const rows = [
        toCsvRow([
          'yearQuarter',
          'humanViews',
          'botViews',
          'uniqueSessions',
          'engagements',
          'avgVisibleMs',
          'botPct',
        ]),
      ];
      for (const q of quarters) {
        const overview = await getQuarterlyOverview({
          yearQuarter: q,
          templeId: scopedId,
        });
        const t = overview.totals;
        rows.push(
          toCsvRow([
            q,
            t.humanViews,
            t.botViews,
            t.uniqueSessions,
            t.engagements,
            t.avgVisibleMs,
            t.botPct,
          ])
        );
      }
      return rows.join('');
    }
    default:
      throw new Error(`Unsupported CSV export mode: ${mode}`);
  }
}

module.exports = {
  recordPageView,
  recordEngagement,
  getOverview,
  getTempleTraffic,
  getEngagementStats,
  getSessionDepth,
  getTrending,
  getCountryStats,
  getTempleAnalytics,
  getQuarterlyOverview,
  getTrendMetrics,
  getCrossTempleFlows,
  exportAnalyticsCsv,
  extractTempleId,
  detectDevice,
  sanitizePath,
};
