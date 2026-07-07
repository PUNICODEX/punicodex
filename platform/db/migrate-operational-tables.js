const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

// admin_sessions was created without an expires_at column; add it for token expiry.
const adminCols = db.prepare('PRAGMA table_info(admin_sessions)').all().map((c) => c.name);
if (!adminCols.includes('expires_at')) {
  db.exec(`ALTER TABLE admin_sessions ADD COLUMN expires_at DATETIME`);
  console.log('Added admin_sessions.expires_at');
} else {
  console.log('admin_sessions.expires_at already exists');
}

// verified_sessions is used by platform/api/verified-sessions.js for email verification.
const hasVerifiedSessions = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='verified_sessions'")
  .get();
if (!hasVerifiedSessions) {
  db.exec(`
    CREATE TABLE verified_sessions (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  db.exec(`CREATE INDEX idx_verified_sessions_email ON verified_sessions(email)`);
  db.exec(`CREATE INDEX idx_verified_sessions_expires ON verified_sessions(expires_at)`);
  console.log('Created verified_sessions table');
} else {
  console.log('verified_sessions table already exists');
}

db.close();
console.log('Operational tables migration complete');
