const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);

// Add claims table
db.exec(`
  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL,
    email TEXT NOT NULL,
    unicode_variant TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'building', 'active', 'failed')),
    stripe_session_id TEXT,
    stripe_payment_intent TEXT,
    amount_paid INTEGER,
    github_repo TEXT,
    deploy_url TEXT,
    template_type TEXT DEFAULT 'scholarly',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES entries(id)
  );

  CREATE INDEX IF NOT EXISTS idx_claims_entry ON claims(entry_id);
  CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
  CREATE INDEX IF NOT EXISTS idx_claims_email ON claims(email);
`);

console.log('Phase 2 migration complete: claims table added');
console.log('Claims:', db.prepare('SELECT COUNT(*) as c FROM claims').get().c);

db.close();
