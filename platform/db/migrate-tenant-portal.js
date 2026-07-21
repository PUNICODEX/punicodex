/**
 * Migration: Tenant Portal (sponsor/patron self-service)
 *
 * Identity and change-request schema for the tenant portal at /account/:
 *   - tenant_accounts         — one row per contact email; a single account
 *                               can be linked to both ad bookings (sponsor)
 *                               and patron subscriptions (patron) because the
 *                               same email may hold both. Linkage is by email
 *                               match against bookings.email / patrons.email —
 *                               no columns are added to those tables.
 *   - tenant_sessions         — bearer sessions (sha256-hashed tokens, 30-day
 *                               expiry) with deleteSessionsForUser-style
 *                               revocation in platform/api/tenant-portal.js.
 *   - tenant_tokens           — one-time set-password / reset tokens (hash
 *                               only, expiry, used_at).
 *   - tenant_change_requests  — sponsor creative swaps and patron social-link
 *                               changes pending admin approval. Nothing
 *                               applies until a superadmin/ops approves in
 *                               the unified admin portal.
 *
 * Idempotent: safe to run on every serverless cold start. Follows the
 * migrate-patrons.js pattern (exported migrate(db) + standalone runner).
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const TENANT_PORTAL_SCHEMA = `
  -- Self-service accounts for sponsors (ad slot bookings) and patrons.
  -- Emails are normalized to lowercase by the service layer, so the UNIQUE
  -- constraint is effectively case-insensitive.
  CREATE TABLE IF NOT EXISTS tenant_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    is_sponsor INTEGER NOT NULL DEFAULT 0,
    is_patron INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_tenant_accounts_status ON tenant_accounts(status);

  -- Bearer sessions. token stores sha256(token) only.
  CREATE TABLE IF NOT EXISTS tenant_sessions (
    token TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES tenant_accounts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tenant_sessions_account ON tenant_sessions(account_id);

  -- One-time set-password / password-reset tokens. token stores sha256 only.
  CREATE TABLE IF NOT EXISTS tenant_tokens (
    token TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('set_password', 'reset')),
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES tenant_accounts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tenant_tokens_account ON tenant_tokens(account_id);

  -- Approval queue for tenant-initiated changes. payload is JSON:
  --   image        → { creativePath, originalName } (staged under /uploads/)
  --   social_links → { socialPlatform, socialUrl }
  CREATE TABLE IF NOT EXISTS tenant_change_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    target_kind TEXT NOT NULL CHECK (target_kind IN ('booking', 'patron')),
    target_id INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('image', 'social_links')),
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_note TEXT,
    reviewed_by INTEGER,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES tenant_accounts(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tenant_change_requests_account ON tenant_change_requests(account_id);
  CREATE INDEX IF NOT EXISTS idx_tenant_change_requests_status ON tenant_change_requests(status);
`;

function migrate(db) {
  db.exec(TENANT_PORTAL_SCHEMA);
}

function runStandalone() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  db.close();
  console.log('Tenant portal migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, TENANT_PORTAL_SCHEMA };
