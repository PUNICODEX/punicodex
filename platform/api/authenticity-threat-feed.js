/**
 * PUNYCODEX — Authenticity Threat Feed Service
 *
 * Persistent backend for discovered spoof names/domains and user reports.
 * All functions are synchronous and operate on the shared SQLite connection.
 */

const { getDb } = require('../db/connection.js');
const { migrateAuthenticityThreatFeed } = require('../db/migrate-authenticity-threat-feed.js');

function migrateThreatFeed() {
  migrateAuthenticityThreatFeed(getDb());
}

function recordDiscoveredSpoof({
  input,
  inputType = 'name',
  punycode,
  verdict,
  severity,
  canonicalEntryId,
  discoverySource,
  confidence = 0,
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO discovered_spoofs (
      input, input_type, punycode, verdict, severity,
      canonical_entry_id, discovery_source, confidence,
      first_seen, last_seen, report_count
    )
    VALUES (
      @input, @inputType, @punycode, @verdict, @severity,
      @canonicalEntryId, @discoverySource, @confidence,
      CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 0
    )
    ON CONFLICT(input, input_type) DO UPDATE SET
      last_seen = CURRENT_TIMESTAMP,
      report_count = report_count + 1,
      verdict = excluded.verdict,
      severity = excluded.severity,
      canonical_entry_id = excluded.canonical_entry_id,
      discovery_source = excluded.discovery_source,
      confidence = excluded.confidence
    RETURNING *
  `);
  return stmt.get({
    input,
    inputType,
    punycode,
    verdict,
    severity,
    canonicalEntryId,
    discoverySource,
    confidence,
  });
}

function recordSpoofReport({ discoveredSpoofId, reporterToken, notes }) {
  const db = getDb();
  const insertReport = db.prepare(`
    INSERT INTO spoof_reports (discovered_spoof_id, reporter_token, notes)
    VALUES (@discoveredSpoofId, @reporterToken, @notes)
  `);
  const incrementCount = db.prepare(`
    UPDATE discovered_spoofs
    SET report_count = report_count + 1
    WHERE id = @discoveredSpoofId
  `);

  const insertAndBump = db.transaction(() => {
    insertReport.run({ discoveredSpoofId, reporterToken, notes });
    incrementCount.run({ discoveredSpoofId });
  });

  insertAndBump();
  return db
    .prepare('SELECT * FROM discovered_spoofs WHERE id = @discoveredSpoofId')
    .get({ discoveredSpoofId });
}

function recordAuthenticityLog({
  input,
  inputType,
  verdict,
  severity,
  canonicalEntryId,
  clientHash,
}) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO authenticity_log (input, input_type, verdict, severity, canonical_entry_id, client_hash)
    VALUES (@input, @inputType, @verdict, @severity, @canonicalEntryId, @clientHash)
    RETURNING *
  `);
  return stmt.get({ input, inputType, verdict, severity, canonicalEntryId, clientHash });
}

function listUnreviewedSpoofs({ limit = 50, offset = 0, verdict, severity, source } = {}) {
  const db = getDb();
  const conditions = ['reviewer_decision IS NULL'];
  const params = { limit, offset };

  if (verdict) {
    conditions.push('verdict = @verdict');
    params.verdict = verdict;
  }
  if (severity) {
    conditions.push('severity = @severity');
    params.severity = severity;
  }
  if (source) {
    conditions.push('discovery_source = @source');
    params.source = source;
  }

  const whereClause = conditions.join(' AND ');
  const stmt = db.prepare(`
    SELECT * FROM discovered_spoofs
    WHERE ${whereClause}
    ORDER BY confidence DESC, report_count DESC, last_seen DESC
    LIMIT @limit OFFSET @offset
  `);
  return stmt.all(params);
}

function reviewSpoof(id, decision, _reviewerToken) {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE discovered_spoofs
    SET reviewer_decision = @decision,
        reviewed_at = CURRENT_TIMESTAMP
    WHERE id = @id
    RETURNING *
  `);
  return stmt.get({ id, decision });
}

function getSpoofByInput(input, inputType = 'name') {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM discovered_spoofs
    WHERE input = @input AND input_type = @inputType
    LIMIT 1
  `);
  return stmt.get({ input, inputType }) || null;
}

module.exports = {
  migrateThreatFeed,
  recordDiscoveredSpoof,
  recordSpoofReport,
  recordAuthenticityLog,
  listUnreviewedSpoofs,
  reviewSpoof,
  getSpoofByInput,
};
