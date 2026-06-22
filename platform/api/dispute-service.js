/**
 * PÚNYCODEX — Brand Dispute Service
 *
 * Tracks, reviews, and appeals disputes raised against Brand Shield decisions.
 * Disputes are stored in SQLite and support the full review lifecycle.
 */

const { getDb } = require('../db/connection');
const { migrateDisputes } = require('../db/migrate-disputes');

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stringify(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function ensureMigrated(db) {
  const table = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='brand_disputes'")
    .get();
  if (!table) {
    migrateDisputes({ db });
  }
}

function rowToDispute(row) {
  if (!row) return null;
  return {
    id: row.id,
    identityId: row.identity_id,
    contestedInput: row.contested_input,
    contestedDomain: row.contested_domain || null,
    evidence: parseJson(row.evidence),
    decision: row.decision || 'pending',
    reviewerNotes: row.reviewer_notes || null,
    createdAt: row.created_at,
    decidedAt: row.decided_at || null,
    appealCount: row.appeal_count || 0,
  };
}

function createDispute({ identityId, contestedInput, contestedDomain, evidence, reviewerNotes }) {
  if (!identityId || !contestedInput) {
    throw new Error('identityId and contestedInput are required');
  }

  const db = getDb();
  ensureMigrated(db);

  const evidenceJson = stringify(evidence);
  const insert = db.prepare(
    `INSERT INTO brand_disputes
      (identity_id, contested_input, contested_domain, evidence, decision, reviewer_notes)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  const result = insert.run(
    identityId,
    contestedInput,
    contestedDomain || null,
    evidenceJson,
    'pending',
    reviewerNotes || null
  );

  return getDispute(result.lastInsertRowid);
}

function getDispute(id) {
  const db = getDb();
  ensureMigrated(db);

  const row = db.prepare('SELECT * FROM brand_disputes WHERE id = ?').get(id);
  return rowToDispute(row);
}

function reviewDispute(id, decision, reviewerNotes) {
  if (!['confirmed', 'false-positive', 'pending'].includes(decision)) {
    throw new Error("decision must be 'confirmed', 'false-positive', or 'pending'");
  }

  const db = getDb();
  ensureMigrated(db);

  const decidedAt = decision === 'pending' ? null : new Date().toISOString();
  const stmt = db.prepare(
    `UPDATE brand_disputes
     SET decision = ?, reviewer_notes = ?, decided_at = ?
     WHERE id = ?`
  );

  const result = stmt.run(decision, reviewerNotes || null, decidedAt, id);
  if (result.changes === 0) {
    throw new Error(`Dispute ${id} not found`);
  }

  return getDispute(id);
}

function appealDispute(id, notes) {
  const db = getDb();
  ensureMigrated(db);

  const existing = getDispute(id);
  if (!existing) {
    throw new Error(`Dispute ${id} not found`);
  }

  const appendedNotes = notes
    ? `${existing.reviewerNotes || ''}\n[Appeal #${existing.appealCount + 1}] ${notes}`.trim()
    : existing.reviewerNotes;

  const stmt = db.prepare(
    `UPDATE brand_disputes
     SET decision = 'pending', decided_at = NULL, appeal_count = appeal_count + 1, reviewer_notes = ?
     WHERE id = ?`
  );

  stmt.run(appendedNotes, id);
  return getDispute(id);
}

function listDisputes({ identityId, decision, limit = 50, offset = 0 } = {}) {
  const db = getDb();
  ensureMigrated(db);

  const conditions = [];
  const params = [];

  if (identityId) {
    conditions.push('identity_id = ?');
    params.push(identityId);
  }
  if (decision) {
    conditions.push('decision = ?');
    params.push(decision);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `SELECT * FROM brand_disputes ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, limit, offset);

  const countRow = db
    .prepare(`SELECT COUNT(*) as c FROM brand_disputes ${whereClause}`)
    .get(...params);

  return {
    total: countRow?.c || 0,
    limit,
    offset,
    items: rows.map(rowToDispute),
  };
}

module.exports = {
  createDispute,
  reviewDispute,
  appealDispute,
  listDisputes,
  getDispute,
};
