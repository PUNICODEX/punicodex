/**
 * PUNICODEX — Transparency Report Service (Phase 16)
 *
 * Generates a machine-readable quarterly transparency report from regulatory tables.
 */

const { getDb } = require('../db/connection.js');

function aggregateRows(statement, params = []) {
  try {
    return statement.all(...params);
  } catch (_e) {
    return [];
  }
}

function generateTransparencyReport() {
  const db = getDb();
  const now = new Date().toISOString();

  return {
    generatedAt: now,
    period: 'quarterly',
    summary: {
      dsarRequests: aggregateRows(
        db.prepare(
          `SELECT request_type, status, COUNT(*) AS count
           FROM dsar_requests
           GROUP BY request_type, status`
        )
      ),
      udrpCases: aggregateRows(
        db.prepare(
          `SELECT status, COUNT(*) AS count
           FROM udrp_cases
           GROUP BY status`
        )
      ),
      abuseReports: aggregateRows(
        db.prepare(
          `SELECT category, status, COUNT(*) AS count
           FROM abuse_reports
           GROUP BY category, status`
        )
      ),
      lawfulAccessRequests: aggregateRows(
        db.prepare(
          `SELECT request_type, status, COUNT(*) AS count
           FROM lawful_access_requests
           GROUP BY request_type, status`
        )
      ),
    },
    notes: [
      'Counts reflect records held in PUNICODEX regulatory tables.',
      'DSAR deletion deadlines are tracked per request and auditable via the hash-chained audit log.',
      'UDRP outcomes are recorded manually or via importer; transparency figures are derived automatically.',
    ],
  };
}

module.exports = { generateTransparencyReport };
