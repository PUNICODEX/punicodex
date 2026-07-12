const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);

// Patron subscriptions: small monthly supporters displayed on flagship temples.
db.exec(`
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

  CREATE INDEX IF NOT EXISTS idx_patrons_temple ON patrons(temple_id);
  CREATE INDEX IF NOT EXISTS idx_patrons_status ON patrons(status);
  CREATE INDEX IF NOT EXISTS idx_patrons_email ON patrons(email);
  CREATE INDEX IF NOT EXISTS idx_patrons_subscription ON patrons(stripe_subscription_id);
`);

console.log('Patrons table ready.');
