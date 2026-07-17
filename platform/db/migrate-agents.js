/**
 * Migration: Autonomous Agents schema.
 * Adds agent activity log and research report queue.
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punicodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS agent_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    result TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_agent_activity_agent ON agent_activity_log(agent);
  CREATE INDEX IF NOT EXISTS idx_agent_activity_created ON agent_activity_log(created_at);

  CREATE TABLE IF NOT EXISTS research_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT NOT NULL,
    topic TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    findings TEXT,
    sources TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  );

  CREATE INDEX IF NOT EXISTS idx_research_reports_session ON research_reports(session_token);
  CREATE INDEX IF NOT EXISTS idx_research_reports_status ON research_reports(status);
`);

console.log('Agents schema migrated.');
db.close();
