/**
 * GET /api/admin/analytics/retention
 * POST /api/admin/analytics/retention
 *
 * Reads and updates analytics retention configuration, then prunes stale data
 * from the event stream, sessions, and rollup tables using chunked DELETEs.
 */

const { setPortalCors, sendError, portalAuth } = require('../../../../api/admin/portal/_portal.js');
const { get, run } = require('../../../db/operational.js');

const DEFAULTS = {
  events_days: 120,
  sessions_days: 365,
  rollups_days: 90,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CHUNK_SIZE = 1000;

function dayString(date) {
  return date.toISOString().slice(0, 10);
}

function cutoffDay(days) {
  return dayString(new Date(Date.now() - days * MS_PER_DAY));
}

function clampDays(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(3650, Math.max(1, n));
}

async function getConfig() {
  const row = await get('SELECT * FROM analytics_retention_config ORDER BY id LIMIT 1');
  if (!row) return { ...DEFAULTS };
  return {
    events_days: row.events_days ?? DEFAULTS.events_days,
    sessions_days: row.sessions_days ?? DEFAULTS.sessions_days,
    rollups_days: row.rollups_days ?? DEFAULTS.rollups_days,
  };
}

async function setConfig(config) {
  await run(
    `
      INSERT INTO analytics_retention_config (id, events_days, sessions_days, rollups_days)
      VALUES (1, $1, $2, $3)
      ON CONFLICT(id)
      DO UPDATE SET
        events_days = excluded.events_days,
        sessions_days = excluded.sessions_days,
        rollups_days = excluded.rollups_days,
        updated_at = CURRENT_TIMESTAMP
    `,
    [config.events_days, config.sessions_days, config.rollups_days]
  );
}

async function pruneChunked(deleteSql, params) {
  let total = 0;
  for (;;) {
    const result = await run(deleteSql, [...params, CHUNK_SIZE]);
    total += result.changes;
    if (result.changes === 0) break;
  }
  return total;
}

async function pruneEvents(days) {
  const before = cutoffDay(days);
  return pruneChunked(
    `
      DELETE FROM site_analytics_events_v2
      WHERE id IN (
        SELECT id FROM site_analytics_events_v2
        WHERE date(created_at) < $1
        ORDER BY id
        LIMIT $2
      )
    `,
    [before]
  );
}

async function pruneSessions(days) {
  const before = cutoffDay(days);
  return pruneChunked(
    `
      DELETE FROM site_analytics_sessions
      WHERE session_hash IN (
        SELECT session_hash FROM site_analytics_sessions
        WHERE date(first_seen_at) < $1
        ORDER BY session_hash
        LIMIT $2
      )
    `,
    [before]
  );
}

async function pruneFunnels(days) {
  const before = cutoffDay(days);
  return pruneChunked(
    `
      DELETE FROM site_analytics_funnels
      WHERE (funnel_id, step_index, day, temple_id) IN (
        SELECT funnel_id, step_index, day, temple_id FROM site_analytics_funnels
        WHERE day < $1
        LIMIT $2
      )
    `,
    [before]
  );
}

async function pruneCohorts(days) {
  const before = cutoffDay(days);
  return pruneChunked(
    `
      DELETE FROM site_analytics_cohorts
      WHERE (cohort_date, day_index, temple_id) IN (
        SELECT cohort_date, day_index, temple_id FROM site_analytics_cohorts
        WHERE cohort_date < $1
        LIMIT $2
      )
    `,
    [before]
  );
}

async function pruneLtvRollups(days) {
  const before = cutoffDay(days);
  return pruneChunked(
    `
      DELETE FROM site_analytics_ltv_rollups
      WHERE id IN (
        SELECT id FROM site_analytics_ltv_rollups
        WHERE day < $1
        ORDER BY id
        LIMIT $2
      )
    `,
    [before]
  );
}

async function pruneAll(config) {
  const [events, sessions, funnels, cohorts, ltvRollups] = await Promise.all([
    pruneEvents(config.events_days),
    pruneSessions(config.sessions_days),
    pruneFunnels(config.rollups_days),
    pruneCohorts(config.rollups_days),
    pruneLtvRollups(config.rollups_days),
  ]);

  return {
    events,
    sessions,
    funnels,
    cohorts,
    ltvRollups,
  };
}

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await portalAuth.requirePortal(req, res, 'ops');
    if (!auth) return;

    if (req.method === 'GET') {
      const config = await getConfig();
      return res.json({ config, generatedAt: new Date().toISOString() });
    }

    const current = await getConfig();
    const eventsDays = clampDays(req.body?.events_days ?? current.events_days);
    const sessionsDays = clampDays(req.body?.sessions_days ?? current.sessions_days);
    const rollupsDays = clampDays(req.body?.rollups_days ?? current.rollups_days);

    const config = {
      events_days: eventsDays,
      sessions_days: sessionsDays,
      rollups_days: rollupsDays,
    };
    await setConfig(config);
    const removed = await pruneAll(config);

    return res.json({
      config,
      removed,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    sendError(res, err);
  }
};
