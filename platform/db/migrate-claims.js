const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

// Claims table for the "claim a Unicode domain" flow.
db.exec(`
  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL,
    email TEXT NOT NULL,
    unicode_variant TEXT,
    amount_paid INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    stripe_session_id TEXT,
    stripe_payment_intent TEXT,
    github_repo TEXT,
    deploy_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_claims_email ON claims(email)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status)`);

console.log('Claims migration applied');
db.close();
