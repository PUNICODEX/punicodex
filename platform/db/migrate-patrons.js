/**
 * Migration: Patron subscriptions
 *
 * Small monthly supporters displayed on flagship temples. Follows the
 * migrate-scholars.js pattern (exported migrate(db) + standalone runner) so
 * Vercel serverless functions can run it idempotently on cold start.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNYCODEX_TEST_DB_PATH || path.join(__dirname, 'punycodex.db');

const PATRONS_SCHEMA = `
  CREATE TABLE IF NOT EXISTS patrons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temple_id TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    title TEXT,
    message TEXT,
    amount_cents INTEGER NOT NULL,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    status TEXT DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'active', 'cancelled', 'expired')),
    started_at DATETIME,
    ends_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

// Social link columns for verified patron profiles (added after the initial
// table shipped, so existing databases need an idempotent ALTER).
const IDEMPOTENT_ALTERATIONS = [
  { table: 'patrons', column: 'social_platform', definition: 'TEXT' },
  { table: 'patrons', column: 'social_url', definition: 'TEXT' },
];

function addColumnIfMissing(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  const hasColumn = columns.some((col) => col.name === column);
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function migrate(db) {
  db.exec(PATRONS_SCHEMA);
  for (const { table, column, definition } of IDEMPOTENT_ALTERATIONS) {
    addColumnIfMissing(db, table, column, definition);
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_patrons_temple ON patrons(temple_id);
    CREATE INDEX IF NOT EXISTS idx_patrons_status ON patrons(status);
    CREATE INDEX IF NOT EXISTS idx_patrons_email ON patrons(email);
    CREATE INDEX IF NOT EXISTS idx_patrons_subscription ON patrons(stripe_subscription_id);
  `);
}

function runStandalone() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  db.close();
  console.log('Patrons table ready.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, PATRONS_SCHEMA, IDEMPOTENT_ALTERATIONS };
