/**
 * PuniCodex — Cohort analytics computation and materialization.
 *
 * Builds acquisition-cohort matrices from site_analytics_sessions.first_seen_at
 * and measures day-N retention via later page_view events from the same session.
 * Daily rollups are persisted to site_analytics_cohorts.
 */

const { all, transaction } = require('../db/operational');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RETENTION_DAYS = 30;

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function lastNDays(days) {
  const list = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    list.push(dayString(new Date(now - i * MS_PER_DAY)));
  }
  return list;
}

function daysBetween(startDay, endDay) {
  const start = Date.parse(`${startDay}T00:00:00Z`);
  const end = Date.parse(`${endDay}T00:00:00Z`);
  return Math.round((end - start) / MS_PER_DAY);
}

function weekStart(day) {
  const d = new Date(`${day}T00:00:00Z`);
  const wday = d.getUTCDay();
  const diff = wday === 0 ? -6 : 1 - wday;
  d.setUTCDate(d.getUTCDate() + diff);
  return dayString(d);
}

function bucketFor(day, granularity) {
  return granularity === 'week' ? weekStart(day) : day;
}

function averagePct(values) {
  if (!values || values.length === 0) return null;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

function computeSummary(cohorts, maxDayIndex, todayDay) {
  if (cohorts.length === 0) {
    return {
      avgSize: 0,
      avgD1: null,
      avgD7: null,
      avgD30: null,
      totalSessions: 0,
    };
  }

  const totalSessions = cohorts.reduce((acc, c) => acc + c.size, 0);
  const avgSize = Math.round((totalSessions / cohorts.length) * 10) / 10;

  const pick = (dayIndex) => {
    if (dayIndex > maxDayIndex) return null;
    const pcts = [];
    for (const c of cohorts) {
      if (daysBetween(c.date, todayDay) >= dayIndex && c.retention[dayIndex]) {
        pcts.push(c.retention[dayIndex].pct);
      }
    }
    return averagePct(pcts);
  };

  return {
    avgSize,
    avgD1: pick(1),
    avgD7: pick(7),
    avgD30: pick(30),
    totalSessions,
  };
}

async function fetchSessionBuckets({ startDay, endDay, templeId, granularity }) {
  const params = [startDay, endDay];
  let templeClause = '';
  if (templeId !== null) {
    params.push(templeId);
    templeClause = `AND entry_temple_id = $${params.length}`;
  }

  const rows = await all(
    `
      SELECT session_hash, date(first_seen_at) AS cohort_day, entry_temple_id
        FROM site_analytics_sessions
       WHERE date(first_seen_at) >= $1
         AND date(first_seen_at) <= $2
         AND session_hash <> ''
         AND is_bot = 0
         AND quality_score >= 0.3
         ${templeClause}
       ORDER BY first_seen_at
    `,
    params
  );

  const sessionBucket = new Map();
  const bucketSize = new Map();

  for (const row of rows) {
    const bucket = bucketFor(row.cohort_day, granularity);
    sessionBucket.set(row.session_hash, bucket);
    bucketSize.set(bucket, (bucketSize.get(bucket) || 0) + 1);
  }

  return { sessionBucket, bucketSize };
}

async function fetchPageViewDays({ startDay, endDay, templeId }) {
  const params = [startDay, endDay];
  let templeClause = '';
  if (templeId !== null) {
    params.push(templeId);
    templeClause = `AND temple_id = $${params.length}`;
  }

  return all(
    `
      SELECT session_hash, date(created_at) AS event_day
        FROM site_analytics_events_v2
       WHERE event_name = 'page_view'
         AND is_bot = 0
         AND quality_score >= 0.3
         AND date(created_at) >= $1
         AND date(created_at) <= $2
         AND session_hash <> ''
         ${templeClause}
       ORDER BY session_hash, created_at
    `,
    params
  );
}

function buildCohorts({ sessionBucket, bucketSize, eventRows, maxDayIndex }) {
  const bucketRetention = new Map();
  for (const bucket of bucketSize.keys()) {
    bucketRetention.set(bucket, new Array(maxDayIndex + 1).fill(0));
  }

  for (const row of eventRows) {
    const bucket = sessionBucket.get(row.session_hash);
    if (!bucket) continue;
    const n = daysBetween(bucket, row.event_day);
    if (n >= 0 && n <= maxDayIndex) {
      const counts = bucketRetention.get(bucket);
      if (counts) counts[n] += 1;
    }
  }

  return [...bucketSize.keys()].sort().map((bucket) => {
    const size = bucketSize.get(bucket);
    const counts = bucketRetention.get(bucket);
    const retention = counts.map((count, day) => ({
      day,
      count,
      pct: size > 0 ? Math.round((count / size) * 1000) / 10 : 0,
    }));
    return { date: bucket, size, retention };
  });
}

/**
 * Compute an acquisition-cohort retention matrix over a rolling window.
 *
 * @param {Object} opts
 * @param {number} [opts.days=30]
 * @param {string|null} [opts.templeId=null]
 * @param {string} [opts.granularity='day']  'day' or 'week'
 * @returns {Promise<Object>}
 */
async function computeCohorts({ days = 30, templeId = null, granularity = 'day' }) {
  const normalizedDays = Math.max(1, days);
  const dayList = lastNDays(normalizedDays);
  const startDay = dayList[0];
  const endDay = dayList[dayList.length - 1];
  const maxDayIndex = Math.min(normalizedDays, MAX_RETENTION_DAYS);

  const { sessionBucket, bucketSize } = await fetchSessionBuckets({
    startDay,
    endDay,
    templeId,
    granularity,
  });

  if (bucketSize.size === 0) {
    return {
      days: normalizedDays,
      templeId,
      granularity,
      cohorts: [],
      summary: {
        avgSize: 0,
        avgD1: null,
        avgD7: null,
        avgD30: null,
        totalSessions: 0,
      },
    };
  }

  const eventRows = await fetchPageViewDays({ startDay, endDay, templeId });
  const cohorts = buildCohorts({ sessionBucket, bucketSize, eventRows, maxDayIndex });
  const summary = computeSummary(cohorts, maxDayIndex, endDay);

  return {
    days: normalizedDays,
    templeId,
    granularity,
    cohorts,
    summary,
  };
}

function dateRangeFor(days) {
  const dayList = lastNDays(Math.max(1, days));
  return { startDay: dayList[0], endDay: dayList[dayList.length - 1] };
}

/**
 * Compute and persist daily cohort rollups for a rolling window.
 *
 * Stores one row per cohort date, retention day index, and temple.
 *
 * @param {Object} opts
 * @param {number} [opts.days=30]
 * @returns {Promise<void>}
 */
async function materializeCohorts({ days = 30 }) {
  const { startDay, endDay } = dateRangeFor(days);
  const globalMatrix = await computeCohorts({ days, templeId: null, granularity: 'day' });

  const templeRows = await all(
    `
      SELECT DISTINCT entry_temple_id
        FROM site_analytics_sessions
       WHERE date(first_seen_at) >= $1
         AND date(first_seen_at) <= $2
         AND entry_temple_id IS NOT NULL
         AND session_hash <> ''
         AND is_bot = 0
         AND quality_score >= 0.3
    `,
    [startDay, endDay]
  );

  const templeMatrices = [];
  for (const row of templeRows) {
    templeMatrices.push(
      await computeCohorts({ days, templeId: row.entry_temple_id, granularity: 'day' })
    );
  }

  const upsertSql = `
    INSERT INTO site_analytics_cohorts
      (cohort_date, day_index, temple_id, size, count)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(cohort_date, day_index, temple_id)
    DO UPDATE SET
      size = excluded.size,
      count = excluded.count,
      updated_at = CURRENT_TIMESTAMP
  `;

  await transaction(async (t) => {
    // Idempotent re-materialization: clear the window first so legacy
    // NULL-keyed rows (which never fire ON CONFLICT) cannot accumulate.
    await t.run(
      'DELETE FROM site_analytics_cohorts WHERE cohort_date >= $1 AND cohort_date <= $2',
      [startDay, endDay]
    );
    for (const matrix of [globalMatrix, ...templeMatrices]) {
      // Store the global rollup under an empty string so the unique constraint
      // treats repeated materializations as conflicts (SQLite NULLs are distinct).
      const storedTempleId = matrix.templeId === null ? '' : matrix.templeId;
      for (const cohort of matrix.cohorts) {
        for (const r of cohort.retention) {
          await t.run(upsertSql, [cohort.date, r.day, storedTempleId, cohort.size, r.count]);
        }
      }
    }
  });
}

/**
 * Read a cohort matrix, preferring materialized rollups and falling back to
 * live computation when the rollup is incomplete.
 *
 * @param {Object} opts
 * @param {number} [opts.days=30]
 * @param {string|null} [opts.templeId=null]
 * @param {string} [opts.granularity='day']  'day' or 'week'
 * @returns {Promise<Object>}
 */
async function getCohort({ days = 30, templeId = null, granularity = 'day' }) {
  const normalizedDays = Math.max(1, days);
  const dayList = lastNDays(normalizedDays);
  const maxDayIndex = Math.min(normalizedDays, MAX_RETENTION_DAYS);

  const params = [dayList[0], dayList[dayList.length - 1]];
  let scopeClause = '';
  if (templeId !== null) {
    params.push(templeId);
    scopeClause = 'AND temple_id = $3';
  } else {
    scopeClause = "AND (temple_id = '' OR temple_id IS NULL)";
  }

  const rows = await all(
    `
      SELECT cohort_date, day_index, size, count
        FROM site_analytics_cohorts
       WHERE cohort_date >= $1
         AND cohort_date <= $2
         ${scopeClause}
       ORDER BY cohort_date, day_index
    `,
    params
  );

  const byDay = new Map();
  for (const row of rows) {
    const set = byDay.get(row.cohort_date) || new Set();
    set.add(row.day_index);
    byDay.set(row.cohort_date, set);
  }

  const complete = dayList.every((day) => {
    const set = byDay.get(day);
    if (!set) return false;
    for (let i = 0; i <= maxDayIndex; i++) {
      if (!set.has(i)) return false;
    }
    return true;
  });

  if (!complete) {
    return computeCohorts({ days: normalizedDays, templeId, granularity });
  }

  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.cohort_date)) {
      groups.set(row.cohort_date, { size: row.size, counts: new Array(maxDayIndex + 1).fill(0) });
    }
    groups.get(row.cohort_date).counts[row.day_index] = row.count;
  }

  const todayDay = dayString(new Date());
  const cohorts = [...groups.keys()].sort().map((date) => {
    const g = groups.get(date);
    const retention = g.counts.map((count, day) => ({
      day,
      count,
      pct: g.size > 0 ? Math.round((count / g.size) * 1000) / 10 : 0,
    }));
    return { date, size: g.size, retention };
  });

  const summary = computeSummary(cohorts, maxDayIndex, todayDay);

  return {
    days: normalizedDays,
    templeId,
    granularity,
    cohorts,
    summary,
  };
}

module.exports = {
  computeCohorts,
  materializeCohorts,
  getCohort,
};
