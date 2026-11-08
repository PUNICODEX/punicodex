/**
 * Postgres self-heal for the admin-portal identity schema.
 *
 * The Neon/Postgres operational store is provisioned by
 * scripts/init-operational-postgres.js — a MANUAL one-time step that
 * translates the then-current SQLite schema. SQLite-only migrations that
 * later add columns (login_attempts, locked_until, last_login_at, …) never
 * reach Neon, and every portal login then 500s on
 * "column does not exist" (the 2026-10-31 admin-portal outage: /me/ kept
 * 401ing for anonymous requests because it never touches the table, while
 * login always does).
 *
 * This module re-applies the FULL current admin identity schema to Postgres
 * idempotently (CREATE TABLE IF NOT EXISTS + ALTER TABLE ADD COLUMN IF NOT
 * EXISTS + CREATE INDEX IF NOT EXISTS), so a serverless cold start converges
 * the schema before the first login. It is a no-op when DATABASE_URL is
 * unset (local dev stays on SQLite).
 */

'use strict';

const { run } = require('./operational');

const ADMIN_USERS_DDL = `
  CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'viewer',
    status TEXT NOT NULL DEFAULT 'active',
    temp_password INTEGER NOT NULL DEFAULT 0,
    login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
  )
`;

const ADMIN_ACTIONS_DDL = `
  CREATE TABLE IF NOT EXISTS admin_actions (
    id SERIAL PRIMARY KEY,
    admin_token TEXT,
    admin_user_id INTEGER,
    action TEXT NOT NULL,
    booking_id INTEGER,
    entry_id TEXT,
    target TEXT,
    meta TEXT,
    payload TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )
`;

const ADMIN_SESSIONS_DDL = `
  CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    admin_user_id INTEGER,
    expires_at TIMESTAMPTZ,
    csrf_hash TEXT
  )
`;

// Drift repairs for tables provisioned from an older SQLite schema.
const COLUMN_DRIFT = [
  { table: 'admin_users', column: 'display_name', definition: 'TEXT' },
  { table: 'admin_users', column: 'temp_password', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'admin_users', column: 'login_attempts', definition: 'INTEGER NOT NULL DEFAULT 0' },
  { table: 'admin_users', column: 'locked_until', definition: 'TIMESTAMPTZ' },
  {
    table: 'admin_users',
    column: 'updated_at',
    definition: 'TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP',
  },
  { table: 'admin_users', column: 'last_login_at', definition: 'TIMESTAMPTZ' },
  { table: 'admin_sessions', column: 'admin_user_id', definition: 'INTEGER' },
  { table: 'admin_sessions', column: 'expires_at', definition: 'TIMESTAMPTZ' },
  { table: 'admin_sessions', column: 'csrf_hash', definition: 'TEXT' },
  { table: 'admin_actions', column: 'admin_user_id', definition: 'INTEGER' },
  { table: 'admin_actions', column: 'target', definition: 'TEXT' },
  { table: 'admin_actions', column: 'meta', definition: 'TEXT' },
];

const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email)',
  'CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role)',
  'CREATE INDEX IF NOT EXISTS idx_admin_users_status ON admin_users(status)',
  'CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(admin_user_id)',
  'CREATE INDEX IF NOT EXISTS idx_admin_actions_user ON admin_actions(admin_user_id)',
  'CREATE INDEX IF NOT EXISTS idx_admin_actions_booking ON admin_actions(booking_id)',
  'CREATE INDEX IF NOT EXISTS idx_admin_actions_action ON admin_actions(action)',
];

let ensurePromise = null;

async function ensureAdminSchemaPostgres() {
  if (!process.env.DATABASE_URL) return; // local dev: SQLite owns the schema
  if (!ensurePromise) {
    ensurePromise = (async () => {
      for (const ddl of [ADMIN_USERS_DDL, ADMIN_ACTIONS_DDL, ADMIN_SESSIONS_DDL]) {
        await run(ddl);
      }
      for (const { table, column, definition } of COLUMN_DRIFT) {
        await run(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
      }
      for (const idx of INDEXES) {
        await run(idx);
      }
    })().catch((err) => {
      ensurePromise = null; // retry on next call after a failure
      throw err;
    });
  }
  return ensurePromise;
}

module.exports = { ensureAdminSchemaPostgres, ADMIN_USERS_DDL, COLUMN_DRIFT };
