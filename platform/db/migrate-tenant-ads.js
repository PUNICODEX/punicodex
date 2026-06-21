/**
 * Tenant search-ads migration.
 *
 * Creates the tenant_search_ads table and supporting analytics table for
 * impression/click tracking. Idempotent.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS tenant_search_ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL,
    company_name TEXT NOT NULL,
    website_url TEXT NOT NULL,
    display_url TEXT,
    headline TEXT NOT NULL,
    description TEXT,
    keywords TEXT, -- JSON array of additional target keywords
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'ended')),
    bid_score REAL DEFAULT 1.0,
    weight INTEGER DEFAULT 1,
    active_from DATETIME DEFAULT CURRENT_TIMESTAMP,
    active_until DATETIME,
    analytics_token TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES entries(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tenant_ads_entry ON tenant_search_ads(entry_id);
  CREATE INDEX IF NOT EXISTS idx_tenant_ads_status ON tenant_search_ads(status);
  CREATE INDEX IF NOT EXISTS idx_tenant_ads_active ON tenant_search_ads(active_from, active_until);

  CREATE TABLE IF NOT EXISTS tenant_ad_analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_ad_id INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('impression', 'click')),
    ip_hash TEXT NOT NULL,
    user_agent TEXT,
    referrer TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_ad_id) REFERENCES tenant_search_ads(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tenant_ad_analytics_ad ON tenant_ad_analytics(tenant_ad_id);
  CREATE INDEX IF NOT EXISTS idx_tenant_ad_analytics_type ON tenant_ad_analytics(event_type);
  CREATE INDEX IF NOT EXISTS idx_tenant_ad_analytics_created ON tenant_ad_analytics(created_at);
`);

// Normalize any legacy ISO-8601 active_from values to SQLite datetime format
// so date comparisons work correctly.
db.exec(`
  UPDATE tenant_search_ads
  SET active_from = REPLACE(REPLACE(active_from, 'T', ' '), 'Z', '')
  WHERE active_from LIKE '%T%';
`);

// Seed a sample tenant ad so the feature is visible immediately in production.
const adCount = db.prepare('SELECT COUNT(*) as c FROM tenant_search_ads').get().c;
if (adCount === 0) {
  const zeus = db.prepare("SELECT id FROM entries WHERE id = 'zeus'").get();
  if (zeus) {
    const insert = db.prepare(`
      INSERT INTO tenant_search_ads
        (entry_id, company_name, website_url, display_url, headline, description,
         status, bid_score, weight, active_from, active_until, analytics_token)
      VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, datetime('now'), NULL, ?)
    `);
    insert.run(
      'zeus',
      'Olympian Hosting',
      'https://olympian.example.com',
      'olympian.example.com',
      'Rule the Skies with Olympian Hosting',
      'Premium ASCII domains for thunderous brands.',
      2.5,
      1,
      'sample-tenant-ad-token-for-zeus'
    );
    console.log('Seeded sample tenant ad for Zeus');
  }
}

console.log('Tenant search-ads migration complete');
console.log('Tenant ads:', db.prepare('SELECT COUNT(*) as c FROM tenant_search_ads').get().c);
