/**
 * PuniCodex — Business funnel computation and materialization.
 *
 * Computes ordered, session-level funnel conversions from
 * site_analytics_events_v2 and persists daily per-temple rollups to
 * site_analytics_funnels.
 */

const { all, transaction } = require('../db/operational');
const { listFunnels, getFunnelConfig } = require('../analytics/funnels');

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

function matchStepIndices(row, cfg) {
  const indices = [];
  for (let i = 0; i < cfg.steps.length; i++) {
    const step = cfg.steps[i];
    if (row.event_name === step.event && (!step.page_type || row.page_type === step.page_type)) {
      indices.push(i);
    }
  }
  return indices;
}

function sessionCompletion(stepTimes) {
  let last = -Infinity;
  const completedTimes = [];
  for (const times of stepTimes) {
    const sorted = times.slice().sort((a, b) => a - b);
    let found = false;
    for (const t of sorted) {
      if (t >= last) {
        last = t;
        completedTimes.push(t);
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  return completedTimes;
}

function buildSessionMap(rows, cfg, templeId) {
  const sessions = new Map();
  for (const row of rows) {
    const indices = matchStepIndices(row, cfg);
    if (indices.length === 0) continue;

    let sess = sessions.get(row.session_hash);
    if (!sess) {
      if (!indices.includes(0)) continue;
      if (templeId !== null && row.temple_id !== templeId) continue;
      sess = {
        templeId: row.temple_id || null,
        stepTimes: Array.from({ length: cfg.steps.length }, () => []),
      };
      sessions.set(row.session_hash, sess);
    }

    const ts = new Date(row.created_at).getTime();
    for (const idx of indices) {
      sess.stepTimes[idx].push(ts);
    }
  }
  return sessions;
}

function median(values) {
  if (!values || values.length === 0) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return Math.round(sorted[mid]);
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function zeros(n) {
  return Array.from({ length: n }, () => 0);
}

function aggregateFunnel(rows, cfg, templeId) {
  const sessions = buildSessionMap(rows, cfg, templeId);
  const counts = zeros(cfg.steps.length);
  const diffs = Array.from({ length: cfg.steps.length }, () => []);

  for (const sess of sessions.values()) {
    const completedTimes = sessionCompletion(sess.stepTimes);
    for (let i = 0; i < completedTimes.length; i++) {
      counts[i] += 1;
      diffs[i].push((completedTimes[i] - completedTimes[0]) / 1000);
    }
  }

  return {
    totalSessions: sessions.size,
    counts,
    medians: diffs.map((d) => median(d)),
  };
}

function aggregateByTemple(rows, cfg) {
  const sessions = buildSessionMap(rows, cfg, null);
  const groups = new Map();

  for (const sess of sessions.values()) {
    const key = sess.templeId || null;
    if (!groups.has(key)) {
      groups.set(key, {
        totalSessions: 0,
        counts: zeros(cfg.steps.length),
        diffs: Array.from({ length: cfg.steps.length }, () => []),
      });
    }
    const g = groups.get(key);
    const completedTimes = sessionCompletion(sess.stepTimes);
    g.totalSessions += 1;
    for (let i = 0; i < completedTimes.length; i++) {
      g.counts[i] += 1;
      g.diffs[i].push((completedTimes[i] - completedTimes[0]) / 1000);
    }
  }

  // Convert diffs to medians before returning.
  for (const g of groups.values()) {
    g.medians = g.diffs.map((d) => median(d));
    delete g.diffs;
  }

  return groups;
}

async function fetchEventRows(db, cfg, { startDay, endDay, day }) {
  const events = [...new Set(cfg.steps.map((s) => s.event))];
  const params = [...events];
  let p = events.length;
  let dateClause = '';

  if (day) {
    params.push(day);
    dateClause = `AND date(created_at) = $${++p}`;
  } else if (startDay && endDay) {
    params.push(startDay, endDay);
    dateClause = `AND date(created_at) >= $${++p} AND date(created_at) <= $${++p}`;
  }

  const placeholders = events.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `
    SELECT session_hash, event_name, page_type, temple_id, created_at
      FROM site_analytics_events_v2
     WHERE event_name IN (${placeholders})
       AND is_bot = 0
       AND quality_score >= 0.3
       ${dateClause}
     ORDER BY session_hash, created_at
  `;

  return db.all(sql, params);
}

function finalizeStepMetrics(cfg, totalSessions, counts, medians) {
  return cfg.steps.map((step, i) => {
    const previousCount = i === 0 ? totalSessions : counts[i - 1];
    const conversionPct =
      previousCount > 0 ? Math.round((counts[i] / previousCount) * 1000) / 10 : 0;
    const dropOffPct =
      previousCount > 0 ? Math.round(((previousCount - counts[i]) / previousCount) * 1000) / 10 : 0;
    return {
      index: i,
      name: step.name,
      event: step.event,
      count: counts[i],
      previousCount,
      conversionPct,
      dropOffPct,
      medianSecondsFromFirst: medians[i],
    };
  });
}

/**
 * Compute a funnel over a rolling window.
 *
 * @param {Object} opts
 * @param {string} opts.funnelId
 * @param {number} [opts.days=30]
 * @param {string|null} [opts.templeId=null]
 * @returns {Promise<Object>}
 */
async function computeFunnel({ funnelId, days = 30, templeId = null }) {
  const cfg = getFunnelConfig(funnelId);
  if (!cfg) throw new Error(`Unknown funnel: ${funnelId}`);

  const dayList = lastNDays(days);
  const rows = await fetchEventRows({ all }, cfg, {
    startDay: dayList[0],
    endDay: dayList[dayList.length - 1],
    templeId,
  });
  const { totalSessions, counts, medians } = aggregateFunnel(rows, cfg, templeId);

  return {
    funnelId,
    name: cfg.name,
    days,
    templeId,
    steps: finalizeStepMetrics(cfg, totalSessions, counts, medians),
    totalSessions,
  };
}

/**
 * Compute and persist daily funnel rollups for a rolling window.
 *
 * @param {Object} opts
 * @param {number} [opts.days=30]
 * @returns {Promise<void>}
 */
async function materializeFunnels({ days = 30 }) {
  const dayList = lastNDays(days);
  const funnels = listFunnels();

  const upsertSql = `
    INSERT INTO site_analytics_funnels
      (funnel_id, step_index, step_name, day, temple_id, count)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT(funnel_id, step_index, day, temple_id)
    DO UPDATE SET
      count = excluded.count,
      step_name = excluded.step_name
  `;

  await transaction(async (t) => {
    for (const funnel of funnels) {
      const cfg = getFunnelConfig(funnel.id);
      // Re-materialization must be idempotent: temple_id can be the ''
      // site-wide sentinel, and NULL-keyed legacy rows never fire ON CONFLICT,
      // so delete the window before rewriting it.
      await t.run(
        'DELETE FROM site_analytics_funnels WHERE funnel_id = $1 AND day >= $2 AND day <= $3',
        [funnel.id, dayList[0], dayList[dayList.length - 1]]
      );
      for (const day of dayList) {
        const rows = await fetchEventRows(t, cfg, { day });
        const groups = aggregateByTemple(rows, cfg);
        const templeIds = groups.size > 0 ? [...groups.keys()] : [null];

        for (const templeId of templeIds) {
          const g = groups.get(templeId) || {
            totalSessions: 0,
            counts: zeros(cfg.steps.length),
            medians: cfg.steps.map(() => null),
          };
          for (let i = 0; i < cfg.steps.length; i++) {
            await t.run(upsertSql, [
              funnel.id,
              i,
              cfg.steps[i].name,
              day,
              templeId || '',
              g.counts[i],
            ]);
          }
        }
      }
    }
  });
}

/**
 * Read a funnel, preferring the materialized rollup and falling back to a
 * live computation when the rollup is incomplete.
 *
 * @param {Object} opts
 * @param {string} opts.funnelId
 * @param {number} [opts.days=30]
 * @param {string|null} [opts.templeId=null]
 * @returns {Promise<Object>}
 */
async function getFunnel({ funnelId, days = 30, templeId = null }) {
  const cfg = getFunnelConfig(funnelId);
  if (!cfg) throw new Error(`Unknown funnel: ${funnelId}`);

  const dayList = lastNDays(days);
  const params = [funnelId, dayList[0], dayList[dayList.length - 1]];
  let scopeClause = '';
  if (templeId !== null) {
    params.push(templeId);
    scopeClause = 'AND temple_id = $4';
  }

  const rows = await all(
    `
      SELECT step_index, step_name, count, day, temple_id
        FROM site_analytics_funnels
       WHERE funnel_id = $1
         AND day >= $2
         AND day <= $3
         ${scopeClause}
       ORDER BY day, step_index
    `,
    params
  );

  const byDay = new Map();
  for (const row of rows) {
    const set = byDay.get(row.day) || new Set();
    set.add(row.step_index);
    byDay.set(row.day, set);
  }

  const complete = dayList.every((day) => {
    const set = byDay.get(day);
    if (!set) return false;
    for (let i = 0; i < cfg.steps.length; i++) {
      if (!set.has(i)) return false;
    }
    return true;
  });

  if (!complete) {
    return computeFunnel({ funnelId, days, templeId });
  }

  const counts = zeros(cfg.steps.length);
  for (const row of rows) {
    counts[row.step_index] += row.count;
  }
  const totalSessions = counts[0];

  return {
    funnelId,
    name: cfg.name,
    days,
    templeId,
    steps: finalizeStepMetrics(
      cfg,
      totalSessions,
      counts,
      cfg.steps.map(() => null)
    ),
    totalSessions,
  };
}

module.exports = {
  computeFunnel,
  materializeFunnels,
  getFunnel,
};
