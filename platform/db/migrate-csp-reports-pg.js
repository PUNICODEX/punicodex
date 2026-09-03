/**
 * Migration: csp_reports — Postgres schema.
 *
 * Mirrors the SQLite schema in migrate-csp-reports.js. The old convention
 * assumed init-operational-postgres.js would create this table out of band,
 * but nothing runs that script in production, so every CSP report POST 500'd
 * with "relation csp_reports does not exist".
 *
 * Idempotent: safe to run on every serverless cold start.
 */

const { run, isPostgres } = require('./operational');

async function runMigration() {
  if (!isPostgres()) return;

  await run(`
    CREATE TABLE IF NOT EXISTS csp_reports (
      id BIGSERIAL PRIMARY KEY,
      document_path TEXT,
      directive TEXT,
      blocked_host TEXT,
      source_file_host TEXT,
      line_number INTEGER,
      count INTEGER DEFAULT 1,
      first_seen TEXT,
      last_seen TEXT,
      UNIQUE(document_path, directive, blocked_host, source_file_host, line_number)
    )
  `);
  await run('CREATE INDEX IF NOT EXISTS idx_csp_reports_last_seen ON csp_reports(last_seen)');
}

module.exports = { runMigration };
