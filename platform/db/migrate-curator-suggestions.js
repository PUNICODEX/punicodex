const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS curator_suggestions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL,
    type TEXT NOT NULL,
    field TEXT,
    current_value TEXT,
    suggested_value TEXT,
    confidence REAL DEFAULT 0,
    issue TEXT,
    status TEXT DEFAULT 'open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TEXT,
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_curator_status ON curator_suggestions(status);
  CREATE INDEX IF NOT EXISTS idx_curator_entry ON curator_suggestions(entry_id);
`);

console.log('curator_suggestions table ready.');
db.close();
