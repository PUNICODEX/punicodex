/**
 * PuniCodex — Privacy-Preserving Telemetry Pipeline (Phase 14)
 *
 * Records classification events without retaining raw inputs, raw IPs, or
 * other personally identifiable information. Supports differential-privacy
 * aggregate exports and retention-bound cleanup.
 */

const crypto = require('node:crypto');

const SENSITIVE_KEYS = new Set([
  'input',
  'rawInput',
  'raw_input',
  'ip',
  'rawIp',
  'raw_ip',
  'clientIp',
  'client_ip',
  'userAgent',
  'user_agent',
  'email',
  'phone',
]);

function sha256(data) {
  return crypto.createHash('sha256').update(String(data)).digest('hex');
}

function hashClientId(clientId) {
  return sha256(clientId);
}

function sanitizeEvent(event) {
  const safe = { ...event };
  for (const key of Object.keys(safe)) {
    if (SENSITIVE_KEYS.has(key)) {
      delete safe[key];
    }
  }

  if (safe.client_id && !safe.client_id.startsWith('sha256:')) {
    safe.client_id = `sha256:${hashClientId(safe.client_id)}`;
  }
  if (safe.clientId && !safe.clientId.startsWith('sha256:')) {
    safe.clientId = `sha256:${hashClientId(safe.clientId)}`;
  }

  // Hash any nested metadata fields that may slip through.
  if (safe.metadata && typeof safe.metadata === 'object') {
    for (const key of Object.keys(safe.metadata)) {
      if (SENSITIVE_KEYS.has(key)) {
        delete safe.metadata[key];
      }
    }
  }

  return safe;
}

function hasRawInput(event) {
  return Object.keys(event).some((key) => SENSITIVE_KEYS.has(key));
}

async function recordTelemetryEvent(db, event) {
  const safe = sanitizeEvent(event);
  const metadata = safe.metadata ? JSON.stringify(safe.metadata) : null;
  const featuresHash =
    safe.features_hash || (safe.features ? sha256(JSON.stringify(safe.features)) : null);

  const id = await db.insert(
    `INSERT INTO telemetry_events
       (tenant_id, client_hash, event_type, model_version, verdict, severity,
        features_hash, metadata, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [
      safe.tenant_id || safe.tenantId || null,
      safe.client_hash || safe.client_id || safe.clientId || null,
      safe.event_type || safe.eventType || 'check',
      safe.model_version || safe.modelVersion || null,
      safe.verdict || null,
      safe.severity || null,
      featuresHash,
      metadata,
      safe.created_at || new Date().toISOString(),
    ]
  );

  return { id, sanitized: safe };
}

function laplaceNoise(scale) {
  const u = Math.random() - 0.5;
  return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

async function getAggregateMetrics(db, options = {}) {
  const tenantId = options.tenant_id || options.tenantId || null;
  const from = options.from || '1970-01-01';
  const to = options.to || new Date().toISOString();

  const rows = await db.all(
    `SELECT event_type, verdict, severity, COUNT(*) as count
     FROM telemetry_events
     WHERE ($1 IS NULL OR tenant_id = $1)
       AND created_at >= $2
       AND created_at <= $3
     GROUP BY event_type, verdict, severity`,
    [tenantId, tenantId, from, to]
  );

  if (options.differentialPrivacy || options.epsilon) {
    const epsilon = Number(options.epsilon) || 0.1;
    const scale = 1 / epsilon;
    return rows.map((row) => ({
      ...row,
      count: Math.max(0, Math.round(row.count + laplaceNoise(scale))),
    }));
  }

  return rows;
}

async function purgeExpiredTelemetry(db, days) {
  const retentionDays = Number(days);
  if (!Number.isFinite(retentionDays) || retentionDays < 1) {
    throw new Error('retentionDays must be a positive integer');
  }

  const result = await db.run(
    `DELETE FROM telemetry_events
     WHERE created_at < datetime('now', '-${retentionDays} days')`,
    []
  );
  return { deleted: result.changes };
}

module.exports = {
  hashClientId,
  sanitizeEvent,
  hasRawInput,
  recordTelemetryEvent,
  getAggregateMetrics,
  purgeExpiredTelemetry,
  laplaceNoise,
};
