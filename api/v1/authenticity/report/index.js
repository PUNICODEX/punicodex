/**
 * POST /api/v1/authenticity/report
 *
 * Accepts a user-submitted report for a suspicious name, domain, or URL,
 * upserts a discovered-spoof record, and returns confirmation plus the spoof id.
 */

const { createApiHandler } = require('../../../../platform/api/api-handler.js');
const { success, error } = require('../../../../platform/api/api-response.js');
const {
  classifyTerm,
  classifyDomain,
  classifyUrl,
} = require('../../../../platform/api/authenticity-service.js');
const { getDb } = require('../../../../platform/db/connection.js');
const {
  migrateAuthenticityThreatFeed,
} = require('../../../../platform/db/migrate-authenticity-threat-feed.js');

function classifyByType(input, type) {
  if (type === 'term') return classifyTerm(input);
  if (type === 'domain') return classifyDomain(input);
  if (type === 'url') return classifyUrl(input);
  if (/^https?:\/\//i.test(input) || input.includes('/')) return classifyUrl(input);
  if (input.includes('.') || input.startsWith('xn--')) return classifyDomain(input);
  return classifyTerm(input);
}

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
    return;
  }

  const { input, type = 'auto', comment } = req.body || {};
  if (!input || typeof input !== 'string') {
    error(res, 'VALIDATION_ERROR', 'Field "input" is required.', { status: 400 });
    return;
  }

  const db = getDb();
  migrateAuthenticityThreatFeed(db);

  const normalizedType = String(type).toLowerCase();
  const result = classifyByType(input, normalizedType);
  const inputType =
    normalizedType === 'url' ? 'url' : normalizedType === 'domain' ? 'domain' : 'name';
  const canonicalId = result.canonicalMatch?.id || null;

  const existing = db
    .prepare('SELECT id FROM discovered_spoofs WHERE input = ? AND input_type = ?')
    .get(input, inputType);

  let spoofId;
  if (existing) {
    db.prepare(
      `UPDATE discovered_spoofs
       SET last_seen = CURRENT_TIMESTAMP, report_count = report_count + 1,
           verdict = ?, severity = ?, confidence = ?, canonical_entry_id = ?
       WHERE id = ?`
    ).run(
      result.verdict,
      result.severity,
      typeof result.confidence === 'number' ? result.confidence : 0,
      canonicalId,
      existing.id
    );
    spoofId = existing.id;
  } else {
    const insert = db.prepare(
      `INSERT INTO discovered_spoofs
       (input, input_type, punycode, verdict, severity, canonical_entry_id, discovery_source, confidence, report_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const info = insert.run(
      input,
      inputType,
      result.input?.normalized || input,
      result.verdict,
      result.severity,
      canonicalId,
      'user-report',
      typeof result.confidence === 'number' ? result.confidence : 0,
      1
    );
    spoofId = info.lastInsertRowid;
  }

  db.prepare('INSERT INTO spoof_reports (discovered_spoof_id, notes) VALUES (?, ?)').run(
    spoofId,
    comment || null
  );

  success(res, { reported: true, spoof: { id: spoofId } });
});
