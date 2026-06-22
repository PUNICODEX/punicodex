/**
 * PUNYCODEX — Abuse Reporting Service (Phase 16)
 *
 * Third-party abuse-report ingestion, triage, and escalation workflow.
 */

const crypto = require('node:crypto');
const { getDb } = require('../db/connection.js');
const { appendAuditLog } = require('./audit-log.js');
const { all, run, get, insert } = require('../db/operational.js');

const SYSTEM_TENANT_ID = 'system';
const auditDb = { all, run, get, insert };
const VALID_CATEGORIES = new Set([
  'phishing',
  'homograph',
  'trademark',
  'copyright',
  'malware',
  'spam',
  'other',
]);
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REPORTS = 10;

const rateLimitBuckets = new Map();

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function generateReportId() {
  return `abuse_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function hashReporter(contact) {
  return contact ? sha256(contact) : null;
}

function getBucketKey(reporterContact, reporterIp) {
  return hashReporter(reporterContact) || reporterIp || 'anonymous';
}

function checkRateLimit(bucketKey) {
  const now = Date.now();
  const windowStart = Math.floor(now / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_WINDOW_MS;
  const bucket = rateLimitBuckets.get(bucketKey);

  if (!bucket || bucket.windowStart !== windowStart) {
    rateLimitBuckets.set(bucketKey, { windowStart, count: 1 });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REPORTS - 1 };
  }

  if (bucket.count >= RATE_LIMIT_MAX_REPORTS) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REPORTS - bucket.count };
}

function computePriority(category, classificationSnapshot) {
  const severity = classificationSnapshot?.severity;
  if (severity === 'critical' || category === 'malware') return 'critical';
  if (['phishing', 'homograph'].includes(category) || severity === 'high') return 'high';
  if (category === 'trademark') return 'normal';
  return 'low';
}

async function logAbuseAction(action, resourceId, metadata = {}) {
  await appendAuditLog(auditDb, {
    tenant_id: SYSTEM_TENANT_ID,
    actor_type: 'system',
    actor_id: 'abuse-service',
    action,
    resource_type: 'abuse_report',
    resource_id: resourceId,
    metadata,
  });
}

async function createAbuseReport({
  reporterContact = null,
  reporterIp = null,
  reporterApiKeyHash = null,
  domain,
  category,
  description = '',
  evidence = null,
  classificationSnapshot = null,
}) {
  if (!domain || typeof domain !== 'string') {
    throw new Error('domain is required');
  }
  if (!VALID_CATEGORIES.has(category)) {
    throw new Error(`category must be one of: ${[...VALID_CATEGORIES].join(', ')}`);
  }

  const bucketKey = getBucketKey(reporterContact, reporterIp);
  const rateLimit = checkRateLimit(bucketKey);
  if (!rateLimit.allowed) {
    const err = new Error('Abuse report rate limit exceeded');
    err.code = 'RATE_LIMIT_EXCEEDED';
    throw err;
  }

  const reportId = generateReportId();
  const reporterContactHash = hashReporter(reporterContact);
  const priority = computePriority(category, classificationSnapshot);
  const shouldEscalate =
    priority === 'critical' ||
    priority === 'high' ||
    ['phishing', 'homograph', 'malware'].includes(category);
  const status = shouldEscalate ? 'escalated' : 'received';
  const escalatedAt = shouldEscalate ? new Date().toISOString() : null;
  const now = new Date().toISOString();

  getDb()
    .prepare(
      `INSERT INTO abuse_reports
       (report_id, reporter_contact_hash, reporter_api_key_hash, domain, category,
        description, evidence, status, priority, classification_snapshot, escalated_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      reportId,
      reporterContactHash,
      reporterApiKeyHash,
      domain,
      category,
      description,
      evidence ? JSON.stringify(evidence) : null,
      status,
      priority,
      classificationSnapshot ? JSON.stringify(classificationSnapshot) : null,
      escalatedAt,
      now,
      now
    );

  await logAbuseAction('abuse_report_created', reportId, {
    domain,
    category,
    priority,
    status,
    reporterHashed: !!reporterContactHash,
  });

  return getDb().prepare('SELECT * FROM abuse_reports WHERE report_id = ?').get(reportId);
}

function getAbuseReport(reportId) {
  return getDb().prepare('SELECT * FROM abuse_reports WHERE report_id = ?').get(reportId) || null;
}

function listAbuseReports({
  status = null,
  priority = null,
  domain = null,
  limit = 50,
  offset = 0,
} = {}) {
  const conditions = [];
  const params = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (priority) {
    conditions.push('priority = ?');
    params.push(priority);
  }
  if (domain) {
    conditions.push('domain = ?');
    params.push(domain);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const safeLimit = Math.min(Math.max(1, limit), 1000);
  const safeOffset = Math.max(0, offset);

  return getDb()
    .prepare(`SELECT * FROM abuse_reports ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, safeLimit, safeOffset);
}

async function resolveAbuseReport(reportId, { status, resolutionNote = '' }) {
  const allowedStatuses = new Set(['resolved', 'dismissed', 'triaged', 'escalated']);
  if (!allowedStatuses.has(status)) {
    throw new Error(`status must be one of: ${[...allowedStatuses].join(', ')}`);
  }

  const existing = getAbuseReport(reportId);
  if (!existing) {
    throw new Error(`Abuse report not found: ${reportId}`);
  }

  const now = new Date().toISOString();
  getDb()
    .prepare(
      `UPDATE abuse_reports
       SET status = ?,
           resolution_note = ?,
           resolved_at = ?,
           updated_at = ?
       WHERE id = ?`
    )
    .run(
      status,
      resolutionNote,
      status === 'resolved' || status === 'dismissed' ? now : null,
      now,
      existing.id
    );

  await logAbuseAction('abuse_report_resolved', reportId, { status, resolutionNote });

  return getAbuseReport(reportId);
}

module.exports = {
  VALID_CATEGORIES,
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_REPORTS,
  createAbuseReport,
  getAbuseReport,
  listAbuseReports,
  resolveAbuseReport,
};
