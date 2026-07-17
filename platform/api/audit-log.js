/**
 * PUNICODEX — Append-only, hash-chained audit log for enterprise tenants.
 */

const crypto = require('node:crypto');

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function computeEntryHash(entry) {
  const payload = {
    tenant_id: entry.tenant_id,
    actor_type: entry.actor_type,
    actor_id: entry.actor_id,
    action: entry.action,
    resource_type: entry.resource_type,
    resource_id: entry.resource_id,
    metadata: entry.metadata,
    previous_hash: entry.previous_hash,
    created_at: entry.created_at,
  };
  return sha256(JSON.stringify(payload));
}

async function getPreviousHash(db, tenantId) {
  const row = await db.get(
    `SELECT entry_hash FROM audit_logs
     WHERE tenant_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [tenantId]
  );
  return row?.entry_hash || null;
}

async function appendAuditLog(db, entry) {
  const createdAt = entry.created_at || new Date().toISOString();
  const previousHash =
    entry.previous_hash !== undefined
      ? entry.previous_hash
      : await getPreviousHash(db, entry.tenant_id);
  const metadata = entry.metadata || null;

  const hashInput = {
    tenant_id: entry.tenant_id,
    actor_type: entry.actor_type,
    actor_id: entry.actor_id,
    action: entry.action,
    resource_type: entry.resource_type || null,
    resource_id: entry.resource_id || null,
    metadata,
    previous_hash: previousHash,
    created_at: createdAt,
  };
  const entryHash = computeEntryHash(hashInput);

  const id = await db.insert(
    `INSERT INTO audit_logs
       (tenant_id, actor_type, actor_id, action, resource_type, resource_id,
        metadata, previous_hash, entry_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      entry.tenant_id,
      entry.actor_type,
      entry.actor_id,
      entry.action,
      entry.resource_type || null,
      entry.resource_id || null,
      metadata ? JSON.stringify(metadata) : null,
      previousHash,
      entryHash,
      createdAt,
    ]
  );

  return { id, entryHash, previousHash };
}

async function verifyAuditChain(db, tenantId) {
  const rows = await db.all(
    `SELECT * FROM audit_logs
     WHERE tenant_id = $1
     ORDER BY created_at ASC, id ASC`,
    [tenantId]
  );

  let previousHash = null;
  for (const row of rows) {
    const metadata = row.metadata ? JSON.parse(row.metadata) : null;
    const expectedHash = computeEntryHash({
      tenant_id: row.tenant_id,
      actor_type: row.actor_type,
      actor_id: row.actor_id,
      action: row.action,
      resource_type: row.resource_type,
      resource_id: row.resource_id,
      metadata,
      previous_hash: previousHash,
      created_at: row.created_at,
    });

    if (expectedHash !== row.entry_hash) {
      return { valid: false, first_invalid_id: row.id };
    }
    previousHash = row.entry_hash;
  }

  return { valid: true };
}

async function queryAuditLogs(db, filters = {}) {
  const conditions = ['tenant_id = $1'];
  const params = [filters.tenant_id];

  if (filters.action) {
    conditions.push(`action = $${params.length + 1}`);
    params.push(filters.action);
  }
  if (filters.resource_type) {
    conditions.push(`resource_type = $${params.length + 1}`);
    params.push(filters.resource_type);
  }
  if (filters.from) {
    conditions.push(`created_at >= $${params.length + 1}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`created_at <= $${params.length + 1}`);
    params.push(filters.to);
  }

  const whereSql = conditions.join(' AND ');
  const limit = Math.min(Math.max(1, filters.limit || 50), 1000);
  const offset = Math.max(0, filters.offset || 0);

  const countRow = await db.get(
    `SELECT COUNT(*) as total FROM audit_logs WHERE ${whereSql}`,
    params
  );
  const rows = await db.all(
    `SELECT id, tenant_id, actor_type, actor_id, action, resource_type,
            resource_id, metadata, previous_hash, entry_hash, created_at
     FROM audit_logs
     WHERE ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    logs: rows.map((r) => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata) : null,
    })),
    total: countRow?.total || 0,
    limit,
    offset,
  };
}

function toCsv(rows) {
  if (rows.length === 0) return '';
  const headers = [
    'id',
    'tenant_id',
    'actor_type',
    'actor_id',
    'action',
    'resource_type',
    'resource_id',
    'metadata',
    'previous_hash',
    'entry_hash',
    'created_at',
  ];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
  }
  return lines.join('\n');
}

async function exportAuditLogs(db, tenantId, format = 'json') {
  const { logs } = await queryAuditLogs(db, {
    tenant_id: tenantId,
    limit: 10000,
  });

  if (format === 'csv') {
    return toCsv(logs);
  }

  if (format === 'cef') {
    return logs
      .map((log) => {
        const meta = JSON.stringify(log.metadata || {});
        return `CEF:0|PUNICODEX|AuditLog|1.0|${log.action}|${
          log.resource_type || 'unknown'
        }|0|tenant=${log.tenant_id} actor=${log.actor_id} meta=${meta}`;
      })
      .join('\n');
  }

  return JSON.stringify(logs, null, 2);
}

module.exports = {
  appendAuditLog,
  verifyAuditChain,
  queryAuditLogs,
  exportAuditLogs,
  computeEntryHash,
};
