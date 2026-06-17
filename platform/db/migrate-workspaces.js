/**
 * Migration: Spatial Workspace schema.
 * Adds synced workspaces, reading list, and session timeline tables.
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS synced_workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT UNIQUE NOT NULL,
    owner_session TEXT,
    name TEXT NOT NULL,
    payload TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_synced_workspaces_owner ON synced_workspaces(owner_session);
  CREATE INDEX IF NOT EXISTS idx_synced_workspaces_public_id ON synced_workspaces(public_id);

  CREATE TABLE IF NOT EXISTS reading_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT NOT NULL,
    entry_id TEXT,
    url TEXT NOT NULL,
    title TEXT,
    note TEXT,
    status TEXT DEFAULT 'unread',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    visited_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_reading_list_session ON reading_list(session_token);
  CREATE INDEX IF NOT EXISTS idx_reading_list_entry ON reading_list(entry_id);

  CREATE TABLE IF NOT EXISTS session_timeline (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_session_timeline_session ON session_timeline(session_token);
  CREATE INDEX IF NOT EXISTS idx_session_timeline_created ON session_timeline(created_at);
`);

console.log('Workspace schema migrated.');
db.close();
