/**
 * Migration: API keys and request logging for /api/v1
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punicodex.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT UNIQUE NOT NULL,
    name TEXT,
    tier TEXT NOT NULL DEFAULT 'free',
    scopes TEXT NOT NULL DEFAULT '["names:read"]',
    rate_limit INTEGER,
    request_count INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    revoked_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

  CREATE TABLE IF NOT EXISTS api_request_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_id INTEGER,
    request_id TEXT,
    method TEXT,
    path TEXT,
    status_code INTEGER,
    duration_ms INTEGER,
    ip_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (key_id) REFERENCES api_keys(id)
  );

  CREATE INDEX IF NOT EXISTS idx_api_request_log_key ON api_request_log(key_id);
  CREATE INDEX IF NOT EXISTS idx_api_request_log_created ON api_request_log(created_at);
`);

// No demo key is seeded. In local development, create one via the admin dashboard
// or set a temporary key through the API key admin endpoint.

db.close();
console.log('API keys migration complete.');
