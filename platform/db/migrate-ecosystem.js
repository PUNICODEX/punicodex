/**
 * Ecosystem migration — public partner directory and usage accounting.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punicodex.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS ecosystem_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    endpoint TEXT,
    requests INTEGER DEFAULT 1,
    day TEXT DEFAULT (date('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(partner_id, endpoint, day)
  );

  CREATE INDEX IF NOT EXISTS idx_ecosystem_usage_partner ON ecosystem_usage(partner_id);
  CREATE INDEX IF NOT EXISTS idx_ecosystem_usage_day ON ecosystem_usage(day);

  ALTER TABLE partners ADD COLUMN website_url TEXT;
  ALTER TABLE partners ADD COLUMN is_public INTEGER DEFAULT 0;
`);

console.log('Ecosystem migration complete');
