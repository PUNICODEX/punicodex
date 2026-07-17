/**
 * Migration: Unicode Domain Marketplace schema.
 * Adds lease inquiries, premium listings, registrar prices, and reviews.
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punicodex.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS lease_inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT,
    entry_id TEXT NOT NULL,
    email TEXT,
    message TEXT,
    status TEXT DEFAULT 'inquiry',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_lease_inquiries_entry ON lease_inquiries(entry_id);
  CREATE INDEX IF NOT EXISTS idx_lease_inquiries_session ON lease_inquiries(session_token);

  CREATE TABLE IF NOT EXISTS premium_listings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT UNIQUE NOT NULL,
    tier TEXT DEFAULT 'featured',
    headline TEXT,
    description TEXT,
    asking_price INTEGER,
    currency TEXT DEFAULT 'USD',
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_premium_listings_active ON premium_listings(active);

  CREATE TABLE IF NOT EXISTS registrar_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tld TEXT NOT NULL,
    registrar TEXT NOT NULL,
    price INTEGER,
    currency TEXT DEFAULT 'USD',
    url_template TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tld, registrar)
  );

  CREATE INDEX IF NOT EXISTS idx_registrar_prices_tld ON registrar_prices(tld);

  CREATE TABLE IF NOT EXISTS site_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_token TEXT,
    entry_id TEXT NOT NULL,
    rating INTEGER NOT NULL,
    review TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_site_reviews_entry ON site_reviews(entry_id);
`);

console.log('Marketplace schema migrated.');
db.close();
