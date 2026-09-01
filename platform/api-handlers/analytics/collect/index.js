const crypto = require('node:crypto');
const { recordPageView, recordEngagement } = require('../../../api/site-analytics');
const { getRedisClient, isRedisEnabled } = require('../../../api/redis-client');
const { normalizeEvent, getPageType, extractTempleId } = require('../../../api/analytics-events');
const { classifyUserAgent } = require('../../../api/bot-detection');
const { setCors } = require('../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../api/public-rate-limiter');
const { getClientIp } = require('../../../api/client-ip');
const { run } = require('../../../db/operational');
const { runMigration: runMigrationV5 } = require('../../../db/migrate-site-analytics-v5');

const MAX_BODY_LENGTH = 32768;
const KEY_PREFIX = 'punicodex:analytics:';
const ROLLUP_TTL_SECONDS = 365 * 24 * 60 * 60;

function sha256(value) {
  return crypto
    .createHash('sha256')
    .update(value == null ? '' : String(value))
    .digest('hex');
}

function extractReferrerDomain(referrer) {
  if (!referrer || typeof referrer !== 'string') return '';
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

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function hourString(date) {
  return date.toISOString().slice(0, 13);
}

function stringifyProperties(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

// Event-specific fields that are not columns in site_analytics_events_v2
// are folded into the properties JSON so no telemetry payload data is lost.
function buildProperties(event) {
  const props = {};
  const eventFields = [
    'visible_ms',
    'scroll_pct',
    'amount',
    'currency',
    'product_id',
    'quantity',
    'query',
    'result_id',
    'position',
    'result_count',
    'tab_name',
    'url',
    'slot_id',
    'tier_id',
    'source',
  ];
  for (const key of eventFields) {
    if (event[key] !== undefined && event[key] !== null) {
      props[key] = event[key];
    }
  }
  if (event.properties && typeof event.properties === 'object') {
    for (const key of Object.keys(event.properties)) {
      props[key] = event.properties[key];
    }
  }
  return stringifyProperties(Object.keys(props).length > 0 ? props : null);
}

// Accept v2 event arrays, single v2 events, legacy beacon objects, and the
// legacy events envelope.
function parseBeaconBody(req) {
  let body = req.body;
  if (Buffer.isBuffer(body)) {
    body = body.toString('utf8');
  }
  if (typeof body === 'string') {
    if (body.length > MAX_BODY_LENGTH) {
      body = body.slice(0, MAX_BODY_LENGTH);
    }
    try {
      body = JSON.parse(body);
    } catch {
      return [];
    }
  }
  if (!body || typeof body !== 'object') return [];
  if (Array.isArray(body)) return body;
  if (Array.isArray(body.events)) return body.events;
  return [body];
}

function legacyToV2(item) {
  if (!item || typeof item !== 'object' || item.event_name) return item;
  if (item.t === 'eng') {
    return {
      event_name: 'engagement',
      path: item.p,
      session_hash: item.s,
      visible_ms: item.ms,
      scroll_pct: item.sc,
    };
  }
  if (typeof item.p === 'string') {
    return {
      event_name: 'page_view',
      path: item.p,
      session_hash: item.s,
      referrer: item.r,
    };
  }
  return null;
}

async function writeEventV2(event, ctx) {
  const ua = ctx.userAgent;
  const { isBot, category } = classifyUserAgent(ua);
  const device = event.device || ctx.device;
  const now = new Date();
  const day = dayString(now);
  const hour = hourString(now);
  const referrerDomain = isBot ? '' : extractReferrerDomain(event.referrer) || '(direct)';
  const sessionHash = event.session_hash || sha256(`anonymous:${day}`).substring(0, 24);
  const ipHash = sha256(ctx.ip).substring(0, 16);
  const uaHash = sha256(ua).substring(0, 16);
  const qualityScore = isBot ? 0.0 : 1.0;
  const country = typeof event.country === 'string' ? event.country : null;
  const pageType = event.page_type || getPageType(event.path);
  const templeId =
    event.temple_id !== undefined ? event.temple_id : extractTempleId(event.path || '');

  // Keep legacy daily rollups working for the two events the old pipeline knew.
  if (event.event_name === 'page_view') {
    try {
      await recordPageView({
        path: event.path,
        referrer: event.referrer,
        sessionId: sessionHash,
        ip: ctx.ip,
        userAgent: ua,
        country,
      });
    } catch (err) {
      console.error('[analytics-collect] legacy page_view failed:', err.message);
    }
  } else if (event.event_name === 'engagement') {
    try {
      await recordEngagement({
        path: event.path,
        sessionId: sessionHash,
        visibleMs: event.visible_ms,
        scrollPct: event.scroll_pct,
        userAgent: ua,
      });
    } catch (err) {
      console.error('[analytics-collect] legacy engagement failed:', err.message);
    }
  }

  const properties = buildProperties(event);

  await run(
    `
      INSERT INTO site_analytics_events_v2
        (event_name, event_version, path, page_type, temple_id, session_hash,
         ip_hash, ua_hash, ua_class, device, referrer, referrer_domain,
         utm_source, utm_medium, utm_campaign, country, properties, is_bot,
         quality_score, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
              $16, $17, $18, $19, $20)
    `,
    [
      event.event_name,
      event.event_version || 1,
      event.path,
      pageType,
      templeId,
      sessionHash,
      ipHash,
      uaHash,
      category,
      device,
      event.referrer || null,
      referrerDomain,
      event.utm_source || null,
      event.utm_medium || null,
      event.utm_campaign || null,
      country,
      properties,
      isBot ? 1 : 0,
      qualityScore,
      event.created_at || now.toISOString(),
    ]
  );

  await run(
    `
      INSERT INTO site_analytics_sessions
        (session_hash, first_seen_at, last_seen_at, entry_path, entry_temple_id,
         device, country, referrer_domain, utm_source, utm_medium, utm_campaign,
         event_count, is_bot, quality_score)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 1, $12, $13)
      ON CONFLICT(session_hash) DO UPDATE SET
        last_seen_at = excluded.last_seen_at,
        event_count = event_count + 1,
        is_bot = CASE WHEN is_bot > excluded.is_bot THEN is_bot ELSE excluded.is_bot END,
        quality_score = (quality_score * event_count + excluded.quality_score) / (event_count + 1)
    `,
    [
      sessionHash,
      event.created_at || now.toISOString(),
      event.created_at || now.toISOString(),
      event.path,
      templeId,
      device,
      country,
      referrerDomain,
      event.utm_source || null,
      event.utm_medium || null,
      event.utm_campaign || null,
      isBot ? 1 : 0,
      qualityScore,
    ]
  );

  await run(
    `
      INSERT INTO site_analytics_hourly
        (hour, event_name, page_type, temple_id, referrer_domain, device, country,
         count, unique_sessions)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 1, 1)
      ON CONFLICT(hour, event_name, page_type, temple_id, referrer_domain, device, country)
      DO UPDATE SET
        count = count + 1,
        unique_sessions = unique_sessions + 1
    `,
    [hour, event.event_name, pageType, templeId, referrerDomain, device, country]
  );

  if (isRedisEnabled()) {
    try {
      const client = getRedisClient();
      if (client) {
        const key = `${KEY_PREFIX}events_v2:${day}:${event.event_name}`;
        await client.hincrby(key, templeId || '', 1);
        await client.expire(key, ROLLUP_TTL_SECONDS);
        const sessionKey = `${KEY_PREFIX}events_v2_sessions:${day}:${event.event_name}`;
        await client.sadd(sessionKey, sessionHash);
        await client.expire(sessionKey, ROLLUP_TTL_SECONDS);
      }
    } catch (err) {
      console.error('[analytics-collect] Redis rollup failed:', err.message);
    }
  }
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await checkPublicRateLimitByReq(req, res, 'analytics-collect'))) {
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  try {
    runMigrationV5();

    const items = parseBeaconBody(req);
    const userAgent = req.headers['user-agent'] || '';
    const device = detectDevice(userAgent);
    const ip = getClientIp(req);
    const ctx = { userAgent, device, ip };

    for (const item of items) {
      const v2 = legacyToV2(item);
      if (!v2) continue;
      if (!v2.session_hash) {
        v2.session_hash = sha256(`anonymous:${dayString(new Date())}`).substring(0, 24);
      }
      const normalized = normalizeEvent(v2);
      if (normalized.error) continue;
      await writeEventV2(normalized, ctx);
    }
  } catch (err) {
    console.error('[analytics-collect] failed:', err.message);
  }
  return res.status(204).end();
};
