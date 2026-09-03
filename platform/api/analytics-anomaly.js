/**
 * Analytics anomaly detection for the PuniCodex site analytics pipeline.
 *
 * Flags days where a temple's human page views or average engagement time
 * deviate from the recent baseline by more than a configurable z-score
 * threshold.
 */

const { all } = require('../db/operational');
const { ensureAnalyticsV5Pg } = require('../db/ensure-analytics-v5');

const DAY_MS = 24 * 60 * 60 * 1000;

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function lastNDays(days) {
  const list = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    list.push(dayString(new Date(now - i * DAY_MS)));
  }
  return list;
}

function mean(values) {
  const sum = values.reduce((a, b) => a + b, 0);
  return values.length > 0 ? sum / values.length : 0;
}

function stdDev(values, avg) {
  if (values.length < 2) return 0;
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function severityForZ(z, threshold) {
  const abs = Math.abs(z);
  if (abs > threshold + 2) return 'critical';
  if (abs > threshold) return 'high';
  return 'medium';
}

function fillSeries(dayList, rows, valueKey = 'value') {
  const byTemple = new Map();
  for (const row of rows) {
    if (!row.temple_id) continue;
    let map = byTemple.get(row.temple_id);
    if (!map) {
      map = new Map();
      byTemple.set(row.temple_id, map);
    }
    map.set(row.day, Number(row[valueKey]) || 0);
  }

  const series = new Map();
  for (const [templeId, dayMap] of byTemple) {
    const values = dayList.map((day) => dayMap.get(day) || 0);
    series.set(templeId, values);
  }
  return series;
}

function findAnomalies(dayList, series, metric, zThreshold) {
  const anomalies = [];
  for (const [templeId, values] of series) {
    const avg = mean(values);
    const sigma = stdDev(values, avg);
    if (sigma === 0) continue;
    for (let i = 0; i < dayList.length; i++) {
      const value = values[i];
      const zScore = (value - avg) / sigma;
      if (Math.abs(zScore) > zThreshold) {
        anomalies.push({
          date: dayList[i],
          templeId,
          metric,
          value,
          expected: Math.round(avg * 100) / 100,
          zScore: Math.round(zScore * 1000) / 1000,
          severity: severityForZ(zScore, zThreshold),
        });
      }
    }
  }
  return anomalies;
}

/**
 * Detect traffic and engagement anomalies for the given lookback window.
 *
 * @param {Object} opts
 * @param {number} [opts.days=30]
 * @param {string|null} [opts.templeId=null]
 * @param {number} [opts.zThreshold=3]
 * @returns {Promise<Array<{date, templeId, metric, value, expected, zScore, severity}>>}
 */
async function detectAnomalies({ days = 30, templeId = null, zThreshold = 3 } = {}) {
  await ensureAnalyticsV5Pg();
  const windowDays = Math.min(120, Math.max(1, Number(days) || 30));
  const threshold = Number.isFinite(zThreshold) && zThreshold > 0 ? zThreshold : 3;
  const dayList = lastNDays(windowDays);
  const start = `${dayList[0]}T00:00:00.000Z`;
  const end = `${dayList[dayList.length - 1]}T23:59:59.999Z`;

  const templeClause = templeId ? 'AND temple_id = $3' : '';
  const pageParams = templeId ? [start, end, templeId] : [start, end];
  const pageRows = await all(
    `
      SELECT substr(created_at, 1, 10) AS day,
             temple_id,
             COUNT(*) AS views
        FROM site_analytics_events_v2
       WHERE event_name = 'page_view'
         AND is_bot = 0
         AND created_at >= $1
         AND created_at <= $2
         ${templeClause}
       GROUP BY day, temple_id
    `,
    pageParams
  );

  const pageSeries = fillSeries(dayList, pageRows, 'views');
  const anomalies = findAnomalies(dayList, pageSeries, 'page_views', threshold);

  const engagementParams = templeId ? [start, end, templeId] : [start, end];
  const engagementRows = await all(
    `
      SELECT substr(created_at, 1, 10) AS day,
             temple_id,
             AVG(CAST(json_extract(properties, '$.visible_ms') AS REAL)) AS avg_ms
        FROM site_analytics_events_v2
       WHERE event_name = 'engagement'
         AND is_bot = 0
         AND properties IS NOT NULL
         AND created_at >= $1
         AND created_at <= $2
         ${templeClause}
       GROUP BY day, temple_id
    `,
    engagementParams
  );

  const engagementSeries = fillSeries(dayList, engagementRows, 'avg_ms');
  anomalies.push(...findAnomalies(dayList, engagementSeries, 'engagement', threshold));

  anomalies.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.templeId !== b.templeId) return a.templeId.localeCompare(b.templeId);
    return a.metric.localeCompare(b.metric);
  });

  return anomalies;
}

module.exports = { detectAnomalies };
