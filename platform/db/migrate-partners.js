/**
 * Migration: Partner program schema.
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    tier TEXT DEFAULT 'free',
    api_key TEXT UNIQUE NOT NULL,
    scopes TEXT,
    rate_limit INTEGER,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_partners_key ON partners(api_key);

  CREATE TABLE IF NOT EXISTS partner_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL,
    record_id TEXT UNIQUE NOT NULL,
    payload TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_partner_records_partner ON partner_records(partner_id);
`);

console.log('Partner schema migrated.');
db.close();
