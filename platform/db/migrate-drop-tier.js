/**
 * Migration — drop the retired lexicon tier system columns.
 *
 * The Dual/Tier-1/Tier-2 classification was removed (see archive/tier-system/
 * for the full history and rationale). Fresh databases never create these
 * columns; this migration cleans existing databases in place.
 *
 * SQLite supports DROP COLUMN since 3.35 (better-sqlite3 bundles >= 8.x).
 * Each drop is guarded — the migration is idempotent.
 */
const path = require('node:path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.PUNICODEX_DB || path.join(__dirname, 'punicodex.db');

const db = new Database(DB_PATH);

const DROPS = [
  { table: 'entries', column: 'tier' },
  { table: 'entries', column: 'tier_label' },
  { table: 'indexed_sites', column: 'tier' },
  { table: 'indexed_sites', column: 'tier_label' },
  { table: 'entity_mentions', column: 'tier' },
  { table: 'scholars_temples', column: 'tier' },
];

for (const { table, column } of DROPS) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.length) continue; // table not present (partial init)
  if (!cols.some((c) => c.name === column)) continue;
  db.exec(`ALTER TABLE ${table} DROP COLUMN ${column}`);
  console.log(`  dropped ${table}.${column}`);
}

db.close();
console.log('Tier columns dropped (or already absent).');
