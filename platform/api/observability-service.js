/**
 * PuniCodex — Observability Service (Phase 8)
 *
 * Read-only operational metrics drawn from the api_request_log, search_queries,
 * and indexed_sites tables. Designed to power the admin dashboard and health
 * probes without adding external dependencies.
 */

const operational = require('../db/operational.js');
const { getDb: getSharedDb } = require('../db/connection.js');

function getSqliteDateInterval(hours) {
  return `datetime('now', '-${hours} hours')`;
}

function intervalSql(hours) {
  // operational.js converts $1 to ? for SQLite; use a literal placeholder for the interval.
  return `created_at >= ${getSqliteDateInterval(hours)}`;
}

async function getMetrics(options = {}) {
  const hours = options.hours ?? 24;

  const totalRow = await operational.get(
    `SELECT COUNT(*) as total, AVG(duration_ms) as avg_duration FROM api_request_log WHERE ${intervalSql(hours)}`
  );
  const errorRow = await operational.get(
    `SELECT COUNT(*) as errors FROM api_request_log WHERE status_code >= 400 AND ${intervalSql(hours)}`
  );
  const percentileRows = await operational.all(
    `SELECT duration_ms FROM api_request_log WHERE ${intervalSql(hours)} AND duration_ms IS NOT NULL ORDER BY duration_ms`
  );
  const topPaths = await operational.all(
    `SELECT path, COUNT(*) as requests, AVG(duration_ms) as avg_duration
     FROM api_request_log
     WHERE ${intervalSql(hours)}
     GROUP BY path
     ORDER BY requests DESC
     LIMIT 10`
  );
  const statusCodes = await operational.all(
    `SELECT status_code, COUNT(*) as count
     FROM api_request_log
     WHERE ${intervalSql(hours)}
     GROUP BY status_code
     ORDER BY count DESC`
  );

  const durations = percentileRows.map((r) => r.duration_ms);
  const total = totalRow?.total || 0;
  const errors = errorRow?.errors || 0;

  return {
    windowHours: hours,
    totalRequests: total,
    errorCount: errors,
    errorRate: total > 0 ? Number((errors / total).toFixed(4)) : 0,
    averageDurationMs: totalRow?.avg_duration
      ? Number(Number(totalRow.avg_duration).toFixed(2))
      : 0,
    latencyPercentiles: {
      p50: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
      p99: percentile(durations, 0.99),
    },
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
  const rows = await operational.all(
    `SELECT query, COUNT(*) as count, AVG(result_count) as avg_results
     FROM search_queries
     WHERE timestamp >= ${getSqliteDateInterval(hours)}
     GROUP BY query
     ORDER BY count DESC
     LIMIT ${limit}`
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
  const rows = await operational.all(
    `SELECT path, AVG(duration_ms) as avg_duration, MAX(duration_ms) as max_duration, COUNT(*) as requests
     FROM api_request_log
     WHERE ${intervalSql(hours)}
     GROUP BY path
     HAVING avg_duration > 0
     ORDER BY avg_duration DESC
     LIMIT ${limit}`
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

  const lastHour = await operational.get(
    `SELECT COUNT(*) as requests, COUNT(DISTINCT ip_hash) as unique_ips
     FROM api_request_log
     WHERE created_at >= ${getSqliteDateInterval(1)}`
  );
  const lastError = await operational.get(
    `SELECT path, status_code, created_at
     FROM api_request_log
     WHERE status_code >= 500
     ORDER BY created_at DESC
     LIMIT 1`
  );
  const indexSize = await operational.get(
    `SELECT COUNT(*) as sites FROM indexed_sites WHERE status = 'active'`
  );

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
  const rows = await operational.all(
    `SELECT request_id, method, path, status_code, duration_ms, ip_hash, created_at
     FROM api_request_log
     WHERE ${intervalSql(hours)}
     ORDER BY created_at DESC
     LIMIT ${limit}`
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

module.exports = {
  getMetrics,
  getTopSearches,
  getSlowEndpoints,
  getHealthSummary,
  getRecentRequests,
};
