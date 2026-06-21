/**
 * Event-driven crawler migration.
 *
 * Creates a crawl_events table for incoming domain-change/webhook events and
 * a small state table for event consumers. Idempotent.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS crawl_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL CHECK (source IN ('webhook', 'ct_log', 'dns_change', 'manual', 'scheduled')),
    domain TEXT NOT NULL,
    punycode TEXT,
    event_type TEXT NOT NULL CHECK (event_type IN ('discover', 'update', 'recrawl', 'spam_report')),
    payload TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    priority INTEGER DEFAULT 5,
    attempts INTEGER DEFAULT 0,
    error TEXT,
    processed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_crawl_events_status ON crawl_events(status);
  CREATE INDEX IF NOT EXISTS idx_crawl_events_domain ON crawl_events(domain);
  CREATE INDEX IF NOT EXISTS idx_crawl_events_created ON crawl_events(created_at);
`);

console.log('Event crawler migration complete');
console.log('Crawl events:', db.prepare('SELECT COUNT(*) as c FROM crawl_events').get().c);
