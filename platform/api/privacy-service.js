/**
 * PUNYCODEX — Privacy & Data-Subject Rights Service (Phase 16)
 *
 * GDPR / CCPA data-subject request handling, export, deletion, and audit.
 */

const crypto = require('node:crypto');
const { getDb } = require('../db/connection.js');
const { appendAuditLog } = require('./audit-log.js');
const { all, run, get, insert } = require('../db/operational.js');

const DSAR_DEADLINE_DAYS = 30;
const SYSTEM_TENANT_ID = 'system';
const auditDb = { all, run, get, insert };

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function generateRequestId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function addDays(isoDate, days) {
  const d = new Date(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
}

function hashClientId(clientId) {
  return sha256(clientId);
}

function resolveClientHash(clientId, clientHash) {
  if (clientHash) return clientHash;
  if (clientId) return hashClientId(clientId);
  throw new Error('clientId or clientHash is required');
}

async function logPrivacyAction(action, resourceId, metadata = {}) {
  await appendAuditLog(auditDb, {
    tenant_id: SYSTEM_TENANT_ID,
    actor_type: 'system',
    actor_id: 'privacy-service',
    action,
    resource_type: 'client_hash',
    resource_id: resourceId,
    metadata,
  });
}

async function createDsarRequest({ clientId, clientHash, type, tenantId = null }) {
  if (!['export', 'delete'].includes(type)) {
    throw new Error('type must be export or delete');
  }

  const resolvedHash = resolveClientHash(clientId, clientHash);
  const requestId = generateRequestId('dsar');
  const deadlineAt = addDays(new Date().toISOString(), DSAR_DEADLINE_DAYS);
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO dsar_requests
       (request_id, client_hash, tenant_id, request_type, status, deadline_at, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?, ?)`
    )
    .run(requestId, resolvedHash, tenantId, type, deadlineAt, now);

  await logPrivacyAction('dsar_created', resolvedHash, { requestId, type, tenantId });

  return getDb().prepare('SELECT * FROM dsar_requests WHERE request_id = ?').get(requestId);
}

function getDsarRequest(requestId) {
  return getDb().prepare('SELECT * FROM dsar_requests WHERE request_id = ?').get(requestId);
}

function exportDataForUser(clientHash) {
  const db = getDb();
  const result = {
    clientHash,
    exportedAt: new Date().toISOString(),
    dsarRequests: [],
    abuseReports: [],
    lawfulAccessRequests: [],
    rawInputs: [],
  };

  try {
    result.dsarRequests = db
      .prepare('SELECT * FROM dsar_requests WHERE client_hash = ? ORDER BY created_at DESC')
      .all(clientHash);
  } catch (_e) {
    result.dsarRequests = [];
  }

  try {
    result.abuseReports = db
      .prepare(
        'SELECT * FROM abuse_reports WHERE reporter_contact_hash = ? ORDER BY created_at DESC'
      )
      .all(clientHash);
  } catch (_e) {
    result.abuseReports = [];
  }

  try {
    result.lawfulAccessRequests = db
      .prepare('SELECT * FROM lawful_access_requests WHERE target_client_hash = ?')
      .all(clientHash);
  } catch (_e) {
    result.lawfulAccessRequests = [];
  }

  try {
    result.rawInputs = db
      .prepare('SELECT * FROM raw_inputs WHERE input_hash = ? ORDER BY created_at DESC')
      .all(clientHash);
  } catch (_e) {
    result.rawInputs = [];
  }

  return result;
}

async function deleteUserData(clientHash, dsarRequestId = null) {
  const db = getDb();
  let rawInputsDeleted = 0;
  let abuseReportsAnonymized = 0;
  let dsarRequestsAnonymized = 0;

  try {
    const rawInfo = db.prepare('DELETE FROM raw_inputs WHERE input_hash = ?').run(clientHash);
    rawInputsDeleted = rawInfo.changes;
  } catch (_e) {
    rawInputsDeleted = 0;
  }

  try {
    const abuseInfo = db
      .prepare(
        `UPDATE abuse_reports
         SET reporter_contact_hash = 'DELETED',
             reporter_api_key_hash = NULL,
             updated_at = ?
         WHERE reporter_contact_hash = ?`
      )
      .run(new Date().toISOString(), clientHash);
    abuseReportsAnonymized = abuseInfo.changes;
  } catch (_e) {
    abuseReportsAnonymized = 0;
  }

  try {
    const dsarInfo = db
      .prepare(
        `UPDATE dsar_requests
         SET client_hash = 'DELETED',
             result = COALESCE(result, '') || ' [anonymized]',
             updated_at = ?
         WHERE client_hash = ?`
      )
      .run(new Date().toISOString(), clientHash);
    dsarRequestsAnonymized = dsarInfo.changes;
  } catch (_e) {
    dsarRequestsAnonymized = 0;
  }

  await logPrivacyAction('user_data_deleted', clientHash, {
    dsarRequestId,
    rawInputsDeleted,
    abuseReportsAnonymized,
    dsarRequestsAnonymized,
  });

  return {
    clientHash,
    deletedAt: new Date().toISOString(),
    rawInputsDeleted,
    abuseReportsAnonymized,
    dsarRequestsAnonymized,
  };
}

async function scheduleDueDeletions(now = new Date().toISOString()) {
  const db = getDb();
  const due = db
    .prepare(
      `SELECT * FROM dsar_requests
       WHERE request_type = 'delete'
         AND status IN ('pending', 'in_progress')
         AND deadline_at <= ?
       ORDER BY deadline_at ASC`
    )
    .all(now);

  const processed = [];
  for (const request of due) {
    db.prepare("UPDATE dsar_requests SET status = 'in_progress', updated_at = ? WHERE id = ?").run(
      new Date().toISOString(),
      request.id
    );

    const deletionResult = await deleteUserData(request.client_hash, request.request_id);

    db.prepare(
      `UPDATE dsar_requests
         SET status = 'completed',
             completed_at = ?,
             result = ?,
             updated_at = ?
         WHERE id = ?`
    ).run(
      new Date().toISOString(),
      JSON.stringify(deletionResult),
      new Date().toISOString(),
      request.id
    );

    processed.push({ requestId: request.request_id, result: deletionResult });
  }

  return processed;
}

function createLawfulAccessRequest({
  requesterAuthority,
  requestType,
  legalBasis,
  targetClientHash,
  scope,
  dueDate,
}) {
  if (!requesterAuthority || !requestType || !legalBasis || !scope) {
    throw new Error('requesterAuthority, requestType, legalBasis, and scope are required');
  }

  const requestId = generateRequestId('lawful');
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO lawful_access_requests
       (request_id, requester_authority, request_type, legal_basis,
        target_client_hash, scope, due_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      requestId,
      requesterAuthority,
      requestType,
      legalBasis,
      targetClientHash,
      scope,
      dueDate,
      now
    );

  return getDb()
    .prepare('SELECT * FROM lawful_access_requests WHERE request_id = ?')
    .get(requestId);
}

function getLawfulAccessRequest(requestId) {
  return getDb()
    .prepare('SELECT * FROM lawful_access_requests WHERE request_id = ?')
    .get(requestId);
}

module.exports = {
  DSAR_DEADLINE_DAYS,
  hashClientId,
  createDsarRequest,
  getDsarRequest,
  exportDataForUser,
  deleteUserData,
  scheduleDueDeletions,
  createLawfulAccessRequest,
  getLawfulAccessRequest,
};
