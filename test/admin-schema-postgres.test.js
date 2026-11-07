/**
 * Admin schema Postgres self-heal contract
 *
 * The 2026-10-31 admin-portal outage: Neon was provisioned manually from an
 * older SQLite schema, later SQLite-only migrations added admin_users columns,
 * and every portal login 500ed on "column does not exist" (/me/ kept 401ing
 * for anonymous requests because it never touches the table). These tests pin
 * the self-heal DDL so the drift cannot recur silently:
 *
 *  1. No DATABASE_URL → ensureAdminSchemaPostgres is a silent no-op (local
 *     dev stays on SQLite; nothing may throw).
 *  2. The DDL + drift list cover EVERY column the portal auth code touches
 *     (grep-enforced against platform/api/admin-portal-auth.js).
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const ROOT = path.join(__dirname, '..');

test('ensureAdminSchemaPostgres is a no-op without DATABASE_URL', async () => {
  delete process.env.DATABASE_URL;
  delete require.cache[require.resolve('../platform/db/operational')];
  delete require.cache[require.resolve('../platform/db/ensure-admin-schema-postgres')];
  const { ensureAdminSchemaPostgres } = require('../platform/db/ensure-admin-schema-postgres');
  await ensureAdminSchemaPostgres(); // must not throw or touch a database
  await ensureAdminSchemaPostgres(); // cached promise path
});

test('self-heal DDL covers every admin_users column the portal touches', () => {
  const { ADMIN_USERS_DDL, COLUMN_DRIFT } = require('../platform/db/ensure-admin-schema-postgres');
  const authSrc = fs.readFileSync(
    path.join(ROOT, 'platform', 'api', 'admin-portal-auth.js'),
    'utf8'
  );

  // Columns the login/user flows read or write (SQL literals in the module).
  const touched = new Set();
  for (const m of authSrc.matchAll(
    /(?:INSERT INTO|UPDATE)\s+admin_users\s*(?:\(([^)]+)\)|SET ([a-z_]+))/g
  )) {
    if (m[1]) for (const col of m[1].split(',')) touched.add(col.trim().split(' ')[0]);
    if (m[2]) touched.add(m[2]);
  }
  for (const col of ['email', 'password_hash', 'role', 'status', 'temp_password']) touched.add(col);

  const ddl = `${ADMIN_USERS_DDL}\n${COLUMN_DRIFT.map((d) => d.column).join(' ')}`;
  const uncovered = [...touched].filter(
    (c) =>
      !ddl.includes(`${c} `) &&
      !ddl.includes(`${c}\n`) &&
      !ddl.includes(`(${c}`) &&
      !ddl.endsWith(c)
  );
  assert.deepStrictEqual(
    uncovered,
    [],
    `admin_users columns used by the portal but missing from the Postgres self-heal: ${uncovered.join(', ')}`
  );
  assert.ok(COLUMN_DRIFT.length >= 8, 'drift list must cover the known column additions');
});

console.log('Admin schema self-heal: all tests passed');
