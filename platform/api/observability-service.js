/**
 * PuniCodex — Observability Service (Phase 8)
 *
 * Read-only operational metrics drawn from the api_request_log, search_queries,
 * and indexed_sites tables. Designed to power the admin dashboard and health
 * probes without adding external dependencies.
 */

const operational = require('../db/operational.js');
const { getDb: getSharedDb } = require('../db/connection.js');

// Timestamps are written by the column default CURRENT_TIMESTAMP, which
// stores 'YYYY-MM-DD HH:MM:SS' on SQLite and TIMESTAMPTZ on Postgres. The
// cutoff is passed as a bound parameter (never interpolated SQLite
// datetime(), which does not exist on Postgres) and formatted per driver:
// - Postgres: ISO string, coerced to TIMESTAMPTZ.
// - SQLite: space-separated 'YYYY-MM-DD HH:MM:SS' — an ISO 'T' separator
//   would mis-sort lexicographically against CURRENT_TIMESTAMP values.
function cutoffTimestamp(hours) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  if (operational.isPostgres()) return cutoff.toISOString();
  return cutoff.toISOString().slice(0, 19).replace('T', ' ');
}

async function getMetrics(options = {}) {
  const hours = options.hours ?? 24;
  const cutoff = cutoffTimestamp(hours);

  // Percentiles on Postgres are computed in SQL (percentile_cont transfers a
  // single row instead of every duration in the window — a cross-region
  // full-table scan); SQLite keeps a bounded scan with the JS fallback.
  const percentilePromise = operational.isPostgres()
    ? operational.get(
        `SELECT
           percentile_cont(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50,
           percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95,
           percentile_cont(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99
         FROM api_request_log
         WHERE created_at >= $1 AND duration_ms IS NOT NULL`,
        [cutoff]
      )
    : operational.all(
        `SELECT duration_ms FROM api_request_log
         WHERE created_at >= $1 AND duration_ms IS NOT NULL
         ORDER BY duration_ms
         LIMIT 50000`,
        [cutoff]
      );

  const [totalRow, errorRow, serverErrorRow, percentileResult, topPaths, statusCodes] =
    await Promise.all([
      operational.get(
        'SELECT COUNT(*) as total, AVG(duration_ms) as avg_duration FROM api_request_log WHERE created_at >= $1',
        [cutoff]
      ),
      operational.get(
        'SELECT COUNT(*) as errors FROM api_request_log WHERE status_code >= 400 AND created_at >= $1',
        [cutoff]
      ),
      // 5xx are service failures — the only errors that say the API is
      // broken. 4xx on a public API are mostly scanner probes and mistyped
      // paths; they must not drive the health signal.
      operational.get(
        'SELECT COUNT(*) as errors FROM api_request_log WHERE status_code >= 500 AND created_at >= $1',
        [cutoff]
      ),
      percentilePromise,
      operational.all(
        `SELECT path, COUNT(*) as requests, AVG(duration_ms) as avg_duration
       FROM api_request_log
       WHERE created_at >= $1
       GROUP BY path
       ORDER BY requests DESC
       LIMIT 10`,
        [cutoff]
      ),
      operational.all(
        `SELECT status_code, COUNT(*) as count
       FROM api_request_log
       WHERE created_at >= $1
       GROUP BY status_code
       ORDER BY count DESC`,
        [cutoff]
      ),
    ]);

  let latencyPercentiles;
  if (operational.isPostgres()) {
    latencyPercentiles = {
      p50: roundPercentile(percentileResult?.p50),
      p95: roundPercentile(percentileResult?.p95),
      p99: roundPercentile(percentileResult?.p99),
    };
  } else {
    const durations = percentileResult.map((r) => r.duration_ms);
    latencyPercentiles = {
      p50: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
      p99: percentile(durations, 0.99),
    };
  }

  const total = totalRow?.total || 0;
  const errors = errorRow?.errors || 0;
  const serverErrors = serverErrorRow?.errors || 0;

  return {
    windowHours: hours,
    totalRequests: total,
    errorCount: errors,
    errorRate: total > 0 ? Number((errors / total).toFixed(4)) : 0,
    serverErrorCount: serverErrors,
    serverErrorRate: total > 0 ? Number((serverErrors / total).toFixed(4)) : 0,
    averageDurationMs: totalRow?.avg_duration
      ? Number(Number(totalRow.avg_duration).toFixed(2))
      : 0,
    latencyPercentiles,
    topPaths: topPaths.map((r) => ({
      path: r.path,
      requests: r.requests,
      avgDurationMs: Number(Number(r.avg_duration).toFixed(2)),
    })),
    statusCodes: statusCodes.map((r) => ({
      status: r.status_code,
      count: r.count,
    })),
  };
}

async function getTopSearches(options = {}) {
  const limit = Math.min(Math.max(1, options.limit || 10), 100);
  const hours = options.hours ?? 24;
  const cutoff = cutoffTimestamp(hours);
  const rows = await operational.all(
    `SELECT query, COUNT(*) as count, AVG(result_count) as avg_results
     FROM search_queries
     WHERE timestamp >= $1
     GROUP BY query
     ORDER BY count DESC
     LIMIT ${limit}`,
    [cutoff]
  );
  return {
    windowHours: hours,
    items: rows.map((r) => ({
      query: r.query,
      count: r.count,
      avgResults: r.avg_results ? Number(Number(r.avg_results).toFixed(1)) : 0,
    })),
  };
}

async function getSlowEndpoints(options = {}) {
  const limit = Math.min(Math.max(1, options.limit || 10), 100);
  const hours = options.hours ?? 24;
  const cutoff = cutoffTimestamp(hours);
  const rows = await operational.all(
    `SELECT path, AVG(duration_ms) as avg_duration, MAX(duration_ms) as max_duration, COUNT(*) as requests
     FROM api_request_log
     WHERE created_at >= $1
     GROUP BY path
     HAVING avg_duration > 0
     ORDER BY avg_duration DESC
     LIMIT ${limit}`,
    [cutoff]
  );
  return {
    windowHours: hours,
    items: rows.map((r) => ({
      path: r.path,
      avgDurationMs: Number(Number(r.avg_duration).toFixed(2)),
      maxDurationMs: r.max_duration,
      requests: r.requests,
    })),
  };
}

async function getHealthSummary() {
  let dbHealthy = false;
  const dbType = 'sqlite';
  try {
    getSharedDb().prepare('SELECT 1').get();
    dbHealthy = true;
  } catch (_e) {
    dbHealthy = false;
  }

  const cutoff = cutoffTimestamp(1);
  const [lastHour, lastError, indexSize] = await Promise.all([
    operational.get(
      `SELECT COUNT(*) as requests, COUNT(DISTINCT ip_hash) as unique_ips
       FROM api_request_log
       WHERE created_at >= $1`,
      [cutoff]
    ),
    operational.get(
      `SELECT path, status_code, created_at
       FROM api_request_log
       WHERE status_code >= 500
       ORDER BY created_at DESC
       LIMIT 1`
    ),
    operational
      .get(`SELECT COUNT(*) as sites FROM indexed_sites WHERE status = 'active'`)
      .catch((err) => {
        // indexed_sites belongs to the crawler DB and is intentionally not part
        // of the operational Postgres provisioning set (see
        // platform/db/init-operational-postgres.js). On a Postgres-only deploy
        // the relation is unknown (SQLSTATE 42P01) — report "no index here"
        // instead of failing the whole health summary.
        if (err && err.code === '42P01') return null;
        throw err;
      }),
  ]);

  return {
    status: dbHealthy ? 'healthy' : 'degraded',
    database: { type: dbType, healthy: dbHealthy },
    lastHour: {
      requests: lastHour?.requests || 0,
      uniqueIps: lastHour?.unique_ips || 0,
    },
    lastServerError: lastError || null,
    activeSites: indexSize?.sites || 0,
  };
}

async function getRecentRequests(options = {}) {
  const limit = Math.min(Math.max(1, options.limit || 50), 200);
  const hours = options.hours ?? 24;
  const cutoff = cutoffTimestamp(hours);
  const rows = await operational.all(
    `SELECT request_id, method, path, status_code, duration_ms, ip_hash, created_at
     FROM api_request_log
     WHERE created_at >= $1
     ORDER BY created_at DESC
     LIMIT ${limit}`,
    [cutoff]
  );
  return {
    windowHours: hours,
    items: rows,
  };
}

function percentile(sortedValues, p) {
  if (!sortedValues || sortedValues.length === 0) return 0;
  const index = Math.ceil(sortedValues.length * p) - 1;
  return sortedValues[Math.max(0, index)];
}

function roundPercentile(value) {
  // percentile_cont interpolates (fractional doubles) and returns null when
  // the window is empty. Normalize to the numeric shape the JS fallback
  // produces so both drivers return the same contract.
  if (value == null) return 0;
  return Number(Number(value).toFixed(2));
}

module.exports = {
  getMetrics,
  getTopSearches,
  getSlowEndpoints,
  getHealthSummary,
  getRecentRequests,
};
