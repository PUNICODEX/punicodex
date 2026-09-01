/**
 * Analytics data-quality engine.
 *
 * Scores incoming events on a 0.0-1.0 scale and flags signals that suggest
 * automated, duplicate, or implausible traffic. The ingest pipeline keeps
 * low-quality rows (we filter at query time) but marks them as bot traffic
 * when the score falls below the 0.3 threshold.
 */

const { classifyUserAgent } = require('./bot-detection');
const { all } = require('../db/operational');

const HEADLESS_PATTERNS = [
  /headlesschrome/i,
  /headless/i,
  /phantomjs/i,
  /playwright/i,
  /puppeteer/i,
  /selenium/i,
  /webdriver/i,
  /cypress/i,
];

const SESSION_VELOCITY_WINDOW_MS = 60 * 1000;
const SESSION_VELOCITY_MAX_EVENTS = 60;
const IP_VELOCITY_WINDOW_MS = 60 * 60 * 1000;
const IP_VELOCITY_MAX_SESSIONS = 100;
const MAX_VISIBLE_MS = 30 * 60 * 1000;

function detectHeadlessUa(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return false;
  return HEADLESS_PATTERNS.some((pattern) => pattern.test(userAgent));
}

function timestampFromEvent(event) {
  if (!event) return Date.now();
  const raw = event.created_at || event.timestamp;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }
  return Date.now();
}

/**
 * Check whether a session has produced more than `maxEvents` events in the
 * last `windowMs` milliseconds.
 */
function checkSessionVelocity(
  sessionHash,
  events,
  windowMs = SESSION_VELOCITY_WINDOW_MS,
  maxEvents = SESSION_VELOCITY_MAX_EVENTS
) {
  if (!sessionHash || !Array.isArray(events)) return false;
  const now = Date.now();
  const cutoff = now - windowMs;
  let count = 0;
  for (const event of events) {
    if (timestampFromEvent(event) >= cutoff) {
      count += 1;
      if (count > maxEvents) return true;
    }
  }
  return false;
}

/**
 * Check whether an IP hash has originated more than `maxSessions` distinct
 * sessions in the last `windowMs` milliseconds.
 *
 * Reads from the v2 event stream so the rule works across beacons and
 * server-side writes without extra state.
 */
async function checkIpVelocity(
  ipHash,
  windowMs = IP_VELOCITY_WINDOW_MS,
  maxSessions = IP_VELOCITY_MAX_SESSIONS
) {
  if (!ipHash || typeof ipHash !== 'string') return false;
  const cutoffSeconds = Math.floor((Date.now() - windowMs) / 1000);
  try {
    const rows = await all(
      `
        SELECT COUNT(DISTINCT session_hash) AS n
          FROM site_analytics_events_v2
         WHERE ip_hash = $1
           AND CAST(strftime('%s', created_at) AS INTEGER) >= $2
      `,
      [ipHash, cutoffSeconds]
    );
    return (rows[0]?.n || 0) > maxSessions;
  } catch (_err) {
    // Fail open: if the table is missing or the DB is unreachable we still
    // want the event to be ingested and scored by the rules we can apply.
    return false;
  }
}

/**
 * Flag engagement pings that fall outside plausible human ranges.
 */
function isImplausibleEngagement(visibleMs, scrollPct) {
  const ms = Number(visibleMs);
  const sc = Number(scrollPct);
  if (!Number.isFinite(ms) || ms < 500 || ms > MAX_VISIBLE_MS) return true;
  if (!Number.isFinite(sc) || sc < 0 || sc > 100) return true;
  return false;
}

function formatFlags(flags) {
  return flags.join(',');
}

function computeScore(flags) {
  let score = 1.0;
  if (flags.includes('bot-ua')) return 0.0;
  if (flags.includes('headless')) score -= 0.8;
  if (flags.includes('session-velocity')) score -= 0.25;
  if (flags.includes('ip-velocity')) score -= 0.2;
  if (flags.includes('implausible-engagement')) score -= 0.15;
  return Math.max(0.0, Math.min(1.0, Number(score.toFixed(3))));
}

/**
 * Score an incoming event and return any quality flags.
 *
 * @param {Object} event - normalized v2 event
 * @param {Object} context - { userAgent, ipHash, recentSessionEvents }
 * @returns {Promise<{ qualityScore: number, flags: string[] }>}
 */
async function scoreEventQuality(event, context = {}) {
  const flags = [];
  const ua =
    typeof context.userAgent === 'string'
      ? context.userAgent
      : typeof event.user_agent === 'string'
        ? event.user_agent
        : '';

  const classification = classifyUserAgent(ua);
  if (classification.isBot) {
    flags.push('bot-ua');
  }
  if (detectHeadlessUa(ua)) {
    flags.push('headless');
  }

  const sessionHash = event.session_hash || context.sessionHash;
  if (
    checkSessionVelocity(
      sessionHash,
      context.recentSessionEvents || [],
      SESSION_VELOCITY_WINDOW_MS,
      SESSION_VELOCITY_MAX_EVENTS
    )
  ) {
    flags.push('session-velocity');
  }

  if (await checkIpVelocity(context.ipHash, IP_VELOCITY_WINDOW_MS, IP_VELOCITY_MAX_SESSIONS)) {
    flags.push('ip-velocity');
  }

  if (
    event.event_name === 'engagement' &&
    isImplausibleEngagement(event.visible_ms, event.scroll_pct)
  ) {
    flags.push('implausible-engagement');
  }

  const qualityScore = computeScore(flags);
  return { qualityScore, flags, qualityFlags: formatFlags(flags) };
}

module.exports = {
  scoreEventQuality,
  checkSessionVelocity,
  checkIpVelocity,
  isImplausibleEngagement,
};
