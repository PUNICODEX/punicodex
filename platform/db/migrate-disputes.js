/**
 * PÚNYCODEX — Brand Dispute Migration
 *
 * Creates the brand_disputes table used by the Brand & Trademark Shield
 * dispute-resolution workflow.
 */

const { getDb } = require('./connection');

function migrateDisputes(options = {}) {
  const db = options.db || getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS brand_disputes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identity_id TEXT NOT NULL,
      contested_input TEXT NOT NULL,
      contested_domain TEXT,
      evidence TEXT,
      decision TEXT CHECK(decision IN ('confirmed','false-positive','pending')),
      reviewer_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      decided_at DATETIME,
      appeal_count INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_disputes_identity ON brand_disputes(identity_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_input ON brand_disputes(contested_input);
  `);

  return { ok: true };
}

if (require.main === module) {
  migrateDisputes();
  console.log('Brand dispute migration applied.');
}

module.exports = { migrateDisputes };
