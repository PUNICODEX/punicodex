#!/usr/bin/env node
const Database = require('better-sqlite3');
const { getDbPath } = require('./db');
const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;

const OPERATIONAL_TABLES = [
  'ad_slots',
  'bundle_members',
  'bookings',
  'slot_creatives',
  'analytics_events',
  'admin_sessions',
  'admin_actions',
  'admin_users',
  'patrons',
  'verified_sessions',
  'email_verifications',
  'api_keys',
  'api_request_log',
  'claims',
  'scholars_institutions',
  'scholars_users',
  'scholars_sessions',
  'scholars_temples',
  'scholars_sections',
  'scholars_edits',
  'scholars_reviews',
  'scholars_history',
  'scholars_snapshots',
  'scholars_media',
  'scholars_notifications',
  'scholars_audit_log',
];

const sqliteTypeToPostgres = {
  INTEGER: () => 'INTEGER',
  TEXT: () => 'TEXT',
  DATETIME: () => 'TIMESTAMPTZ',
  REAL: () => 'REAL',
  BLOB: () => 'BYTEA',
  NUMERIC: () => 'NUMERIC',
};

function sqliteToPostgresType(col, isAutoIncrement, hasCompositePk) {
  const type = col.type.toUpperCase();
  if (type === 'INTEGER' && col.pk && !hasCompositePk) {
    return isAutoIncrement ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY';
  }
  const mapper = sqliteTypeToPostgres[type] || sqliteTypeToPostgres.TEXT;
  return mapper(col);
}

function getAutoIncrementColumns(sqliteDb, tableName) {
  const master = sqliteDb
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?")
    .get(tableName);
  if (!master?.sql) return new Set();
  const auto = new Set();
  const regex = /"?([a-zA-Z0-9_]+)"?\s+INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi;
  let match;
  while ((match = regex.exec(master.sql)) !== null) {
    auto.add(match[1]);
  }
  return auto;
}

function buildTableSql(sqliteDb, tableName) {
  const columns = sqliteDb.prepare(`PRAGMA table_info(${tableName})`).all();
  if (columns.length === 0) {
    return null;
  }

  const autoIncrementCols = getAutoIncrementColumns(sqliteDb, tableName);
  const pkColumns = columns.filter((c) => c.pk).sort((a, b) => a.pk - b.pk);
  const hasCompositePk = pkColumns.length > 1;

  const columnDefs = columns.map((col) => {
    const isAutoIncrement = autoIncrementCols.has(col.name);
    let def = `${col.name} ${sqliteToPostgresType(col, isAutoIncrement, hasCompositePk)}`;
    if (col.notnull && (!col.pk || hasCompositePk)) {
      def += ' NOT NULL';
    }
    if (col.dflt_value !== null && col.dflt_value !== undefined) {
      const defaultValue = String(col.dflt_value);
      if (defaultValue.toUpperCase() === 'CURRENT_TIMESTAMP') {
        def += ' DEFAULT CURRENT_TIMESTAMP';
      } else {
        def += ` DEFAULT ${defaultValue}`;
      }
    }
    return def;
  });

  if (hasCompositePk) {
    const pkNames = pkColumns.map((c) => c.name).join(', ');
    columnDefs.push(`PRIMARY KEY (${pkNames})`);
  }

  return `CREATE TABLE ${tableName} (\n  ${columnDefs.join(',\n  ')}\n)`;
}

async function main() {
  if (!DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const shouldReset = process.argv.includes('--reset');
  const sqliteDb = new Database(getDbPath());
  const sql = neon(DATABASE_URL);

  if (shouldReset) {
    console.log('Resetting operational tables in Neon...');
    for (let i = OPERATIONAL_TABLES.length - 1; i >= 0; i--) {
      try {
        await sql.query(`DROP TABLE IF EXISTS ${OPERATIONAL_TABLES[i]} CASCADE`);
        console.log(`  Dropped ${OPERATIONAL_TABLES[i]}`);
      } catch (err) {
        console.warn(`  Could not drop ${OPERATIONAL_TABLES[i]}: ${err.message}`);
      }
    }
  }

  console.log('Creating operational tables in Neon...');

  for (const tableName of OPERATIONAL_TABLES) {
    const exists = await sql.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = $1`,
      [tableName]
    );
    if (exists.length > 0) {
      console.log(`  Table ${tableName} already exists, skipping creation`);
      continue;
    }

    const createSql = buildTableSql(sqliteDb, tableName);
    if (!createSql) {
      console.warn(`  Table ${tableName} not found in SQLite, skipping`);
      continue;
    }

    await sql.query(createSql);
    console.log(`  Created ${tableName}`);

    // Recreate non-unique indexes (unique constraints are created via UNIQUE in table def if any)
    const indexes = sqliteDb.prepare(`PRAGMA index_list(${tableName})`).all();
    for (const idx of indexes) {
      if (idx.origin === 'pk') continue;
      const indexInfo = sqliteDb.prepare(`PRAGMA index_info(${idx.name})`).all();
      if (indexInfo.length === 0) continue;
      const colNames = indexInfo.map((i) => i.name).join(', ');
      const unique = idx.unique ? 'UNIQUE ' : '';
      const pgIndexName = `${tableName}_${idx.name}`;
      await sql.query(`CREATE ${unique}INDEX ${pgIndexName} ON ${tableName} (${colNames})`);
      console.log(`    Created ${unique.toLowerCase()}index ${pgIndexName}`);
    }
  }

  // Seed ad_slots and bundle_members from SQLite
  console.log('Seeding ad_slots and bundle_members...');
  const slots = sqliteDb.prepare('SELECT * FROM ad_slots').all();
  for (const slot of slots) {
    const keys = Object.keys(slot);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((k) => slot[k]);
    await sql.query(
      `INSERT INTO ad_slots (${cols}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
      values
    );
  }
  console.log(`  Seeded ${slots.length} ad_slots`);

  const members = sqliteDb.prepare('SELECT * FROM bundle_members').all();
  for (const member of members) {
    const keys = Object.keys(member);
    const cols = keys.join(', ');
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const values = keys.map((k) => member[k]);
    await sql.query(
      `INSERT INTO bundle_members (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      values
    );
  }
  console.log(`  Seeded ${members.length} bundle_members`);

  sqliteDb.close();
  console.log('Operational Postgres initialization complete');
}

module.exports = { buildTableSql, OPERATIONAL_TABLES };

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
