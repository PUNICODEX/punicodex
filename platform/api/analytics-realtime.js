/**
 * PuniCodex — Real-time analytics pulse.
 *
 * Returns a live, by-the-minute view of the last N minutes of event activity
 * from site_analytics_events_v2, plus a comparison with the immediately
 * preceding window so the dashboard can surface velocity and anomalies.
 */

const { all, get } = require('../db/operational');

const DEFAULT_MINUTES = 60;
const MAX_MINUTES = 120;
const BUCKET_MINUTES = 5;

function clampMinutes(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return DEFAULT_MINUTES;
  return Math.min(MAX_MINUTES, Math.max(1, n));
}

function floorToBucket(date, bucketMinutes) {
  const d = new Date(date);
  d.setUTCSeconds(0, 0);
  d.setUTCMinutes(Math.floor(d.getUTCMinutes() / bucketMinutes) * bucketMinutes);
  return d.toISOString();
}

function windowBounds(minutes, anchor = new Date()) {
  const end = new Date(anchor);
  const start = new Date(end.getTime() - minutes * 60 * 1000);
  const previousEnd = new Date(start);
  const previousStart = new Date(previousEnd.getTime() - minutes * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    previousStart: previousStart.toISOString(),
    previousEnd: previousEnd.toISOString(),
  };
}

async function fetchWindowRows({ start, end, templeId }) {
  const params = [start, end];
  let templeClause = '';
  if (templeId !== null) {
    params.push(templeId);
    templeClause = `AND temple_id = $${params.length}`;
  }

  return all(
    `
      SELECT event_name, page_type, temple_id, device, referrer_domain,
             session_hash, quality_score, created_at
        FROM site_analytics_events_v2
       WHERE created_at >= $1
         AND created_at < $2
         AND is_bot = 0
         AND quality_score >= 0.3
         ${templeClause}
       ORDER BY created_at
    `,
    params
  );
}

async function fetchSummary({ start, end, templeId }) {
  const params = [start, end];
  let templeClause = '';
  if (templeId !== null) {
    params.push(templeId);
    templeClause = `AND temple_id = $${params.length}`;
  }

  return get(
    `
      SELECT
        COUNT(*) AS events,
        COUNT(DISTINCT session_hash) AS unique_sessions,
        SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
        AVG(quality_score) AS avg_quality
        FROM site_analytics_events_v2
       WHERE created_at >= $1
         AND created_at < $2
         AND is_bot = 0
         AND quality_score >= 0.3
         ${templeClause}
    `,
    params
  );
}

function aggregateTop(values, limit = 10) {
  const counts = new Map();
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

function aggregateTopByUniques(rows, keyFn, limit = 10) {
  const sessions = new Map();
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (key === null || key === undefined || key === '') continue;
    if (!sessions.has(key)) sessions.set(key, new Set());
    sessions.get(key).add(row.session_hash || '');
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...sessions.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, limit)
    .map(([name, sessionSet]) => ({
      name,
      uniqueSessions: sessionSet.size,
      events: counts.get(name) || 0,
    }));
}

function buildTimeline(rows, { start, end }, bucketMinutes) {
  const buckets = new Map();
  const startMs = new Date(floorToBucket(new Date(start), bucketMinutes)).getTime();
  const endMs = new Date(end).getTime();

  // Pre-seed buckets so the timeline has no gaps.
  for (let t = startMs; t < endMs; t += bucketMinutes * 60 * 1000) {
    buckets.set(new Date(t).toISOString(), {
      events: 0,
      pageViews: 0,
      uniqueSessions: new Set(),
    });
  }

  for (const row of rows) {
    const bucket = floorToBucket(row.created_at, bucketMinutes);
    const b = buckets.get(bucket);
    if (!b) continue;
    b.events += 1;
    if (row.event_name === 'page_view') b.pageViews += 1;
    b.uniqueSessions.add(row.session_hash || '');
  }

  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bucket, b]) => ({
      bucket,
      events: b.events,
      pageViews: b.pageViews,
      uniqueSessions: b.uniqueSessions.size,
    }));
}

function computeVelocity(current, previous) {
  const pct = (curr, prev) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  };
  return {
    uniqueSessionsPct: pct(current.uniqueSessions, previous.uniqueSessions),
    pageViewsPct: pct(current.pageViews, previous.pageViews),
    eventsPct: pct(current.events, previous.events),
  };
}

/**
 * Get a real-time pulse for the last N minutes.
 *
 * @param {Object} opts
 * @param {number} [opts.minutes=60]
 * @param {string|null} [opts.templeId=null]
 * @returns {Promise<Object>}
 */
async function getRealtimePulse({ minutes = DEFAULT_MINUTES, templeId = null } = {}) {
  const normalizedMinutes = clampMinutes(minutes);
  const bounds = windowBounds(normalizedMinutes);

  const [currentSummary, previousSummary, rows] = await Promise.all([
    fetchSummary({ start: bounds.start, end: bounds.end, templeId }),
    fetchSummary({ start: bounds.previousStart, end: bounds.previousEnd, templeId }),
    fetchWindowRows({ start: bounds.start, end: bounds.end, templeId }),
  ]);

  const current = {
    uniqueSessions: Number(currentSummary?.unique_sessions || 0),
    pageViews: Number(currentSummary?.page_views || 0),
    events: Number(currentSummary?.events || 0),
    avgQualityScore: currentSummary?.avg_quality
      ? Math.round(Number(currentSummary.avg_quality) * 1000) / 1000
      : null,
  };

  const previous = {
    uniqueSessions: Number(previousSummary?.unique_sessions || 0),
    pageViews: Number(previousSummary?.page_views || 0),
    events: Number(previousSummary?.events || 0),
  };

  const last5 = rows.filter((r) => new Date(r.created_at) >= new Date(Date.now() - 5 * 60 * 1000));

  return {
    minutes: normalizedMinutes,
    templeId,
    generatedAt: new Date().toISOString(),
    current,
    previous,
    velocity: computeVelocity(current, previous),
    last5Minutes: {
      uniqueSessions: new Set(last5.map((r) => r.session_hash || '')).size,
      pageViews: last5.filter((r) => r.event_name === 'page_view').length,
      events: last5.length,
    },
    topTemples: aggregateTopByUniques(rows, (r) => r.temple_id, 10),
    topPages: aggregateTop(
      rows.map((r) =>
        r.page_type ? `/${r.page_type}${r.temple_id ? `/${r.temple_id}` : ''}` : ''
      ),
      10
    ),
    devices: aggregateTop(
      rows.map((r) => r.device || 'unknown'),
      6
    ),
    referrers: aggregateTop(
      rows.map((r) => r.referrer_domain || '(direct)'),
      10
    ),
    timeline: buildTimeline(rows, bounds, BUCKET_MINUTES),
  };
}

module.exports = {
  getRealtimePulse,
  clampMinutes,
};
