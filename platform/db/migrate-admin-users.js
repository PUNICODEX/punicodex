/**
 * Migration: Admin Portal identity tables
 *
 * Creates the per-user admin identity schema for the unified admin portal:
 *   - admin_users    — named admin accounts with RBAC roles
 *   - admin_actions  — audit trail for admin mutations (previously missing,
 *                      which made platform/api/admin-actions.js fail silently)
 *   - admin_sessions.admin_user_id — links portal sessions to admin users
 *
 * Idempotent: safe to run on every serverless cold start. Follows the
 * migrate-scholars.js pattern (exported migrate(db) + standalone runner).
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const ADMIN_USERS_SCHEMA = `
  -- Named admin accounts for the unified admin portal
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('superadmin', 'ops', 'leasing', 'scholars', 'viewer')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    temp_password INTEGER NOT NULL DEFAULT 0,
    login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
  CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
  CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status);

  -- Admin audit trail. The superset of columns keeps the legacy writer
  -- (admin_token/booking_id/entry_id/payload) and the portal writer
  -- (admin_user_id/target/meta) working against one table.
  CREATE TABLE IF NOT EXISTS admin_actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_token TEXT,
    admin_user_id INTEGER,
    action TEXT NOT NULL,
    booking_id INTEGER,
    entry_id TEXT,
    target TEXT,
    meta TEXT,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_admin_actions_user ON admin_actions(admin_user_id);
  CREATE INDEX IF NOT EXISTS idx_admin_actions_booking ON admin_actions(booking_id);
  CREATE INDEX IF NOT EXISTS idx_admin_actions_action ON admin_actions(action);
`;

// Nullable column additions on pre-existing tables.
const IDEMPOTENT_ALTERATIONS = [
  { table: 'admin_sessions', column: 'admin_user_id', definition: 'INTEGER' },
  { table: 'admin_sessions', column: 'expires_at', definition: 'DATETIME' },
];

function listColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all();
}

function addColumnIfMissing(db, table, column, definition) {
  const columns = listColumns(db, table);
  const hasColumn = columns.some((col) => col.name === column);
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

// admin_sessions is canonically created by migrate-booking.js, but this
// migration can run before it (db-init order, serverless cold starts), so
// create the base table when it is missing. Same schema as migrate-booking.
function ensureAdminSessions(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token TEXT PRIMARY KEY,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function migrate(db) {
  db.exec(ADMIN_USERS_SCHEMA);
  ensureAdminSessions(db);
  for (const { table, column, definition } of IDEMPOTENT_ALTERATIONS) {
    addColumnIfMissing(db, table, column, definition);
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id);
  `);
}

function runStandalone() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  db.close();
  console.log('Admin users migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, ADMIN_USERS_SCHEMA, IDEMPOTENT_ALTERATIONS };
