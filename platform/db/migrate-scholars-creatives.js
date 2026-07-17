/**
 * Migration: Student Creative Marketplace tables
 *
 * Adds tables for the PuniCodex Student Creative Marketplace.
 * Depends on the core Scholarly Edition schema from migrate-scholars.js.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const CREATIVE_SCHEMA = `
  -- Student creative assets (myth-inspired artwork, design studies, etc.)
  CREATE TABLE IF NOT EXISTS creative_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    institution_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL,
    inspiration_entry_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'delisted')),
    license_type TEXT NOT NULL DEFAULT 'single_use' CHECK (license_type IN ('single_use', 'exclusive', 'subscription_pool')),
    price_cents INTEGER NOT NULL DEFAULT 0,
    preview_path TEXT,
    original_path TEXT,
    thumbnail_path TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES scholars_users(id),
    FOREIGN KEY (institution_id) REFERENCES scholars_institutions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_creative_assets_status ON creative_assets(status);
  CREATE INDEX IF NOT EXISTS idx_creative_assets_creator ON creative_assets(creator_id);
  CREATE INDEX IF NOT EXISTS idx_creative_assets_institution ON creative_assets(institution_id);
  CREATE INDEX IF NOT EXISTS idx_creative_assets_inspiration ON creative_assets(inspiration_entry_id);
  CREATE INDEX IF NOT EXISTS idx_creative_assets_department ON creative_assets(department);
  CREATE INDEX IF NOT EXISTS idx_creative_assets_created ON creative_assets(created_at);

  -- Many-to-many tags for asset discovery
  CREATE TABLE IF NOT EXISTS creative_asset_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    tag TEXT NOT NULL,
    FOREIGN KEY (asset_id) REFERENCES creative_assets(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_creative_asset_tags_asset ON creative_asset_tags(asset_id);
  CREATE INDEX IF NOT EXISTS idx_creative_asset_tags_tag ON creative_asset_tags(tag);

  -- Purchases / licenses of creative assets
  CREATE TABLE IF NOT EXISTS creative_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER,
    licensee_booking_id INTEGER,
    licensee_email TEXT,
    license_type TEXT NOT NULL DEFAULT 'single_use' CHECK (license_type IN ('single_use', 'all_access_pass')),
    price_cents INTEGER NOT NULL DEFAULT 0,
    platform_fee_cents INTEGER NOT NULL DEFAULT 0,
    creator_payout_cents INTEGER NOT NULL DEFAULT 0,
    university_credit_cents INTEGER NOT NULL DEFAULT 0,
    stripe_session_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'refunded', 'disputed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES creative_assets(id),
    FOREIGN KEY (licensee_booking_id) REFERENCES bookings(id)
  );

  CREATE INDEX IF NOT EXISTS idx_creative_purchases_asset ON creative_purchases(asset_id);
  CREATE INDEX IF NOT EXISTS idx_creative_purchases_email ON creative_purchases(licensee_email);
  CREATE INDEX IF NOT EXISTS idx_creative_purchases_status ON creative_purchases(status);
  CREATE INDEX IF NOT EXISTS idx_creative_purchases_stripe ON creative_purchases(stripe_session_id);

  -- Moderation review log for creative assets
  CREATE TABLE IF NOT EXISTS creative_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_revision')),
    comment TEXT,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES creative_assets(id),
    FOREIGN KEY (reviewer_id) REFERENCES scholars_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_creative_reviews_asset ON creative_reviews(asset_id);
  CREATE INDEX IF NOT EXISTS idx_creative_reviews_reviewer ON creative_reviews(reviewer_id);

  -- Creator payout ledger (Phase 1 accrues as university credit)
  CREATE TABLE IF NOT EXISTS creative_payouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER,
    creator_id INTEGER NOT NULL,
    purchase_id INTEGER,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'held')),
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    paid_at DATETIME,
    FOREIGN KEY (asset_id) REFERENCES creative_assets(id),
    FOREIGN KEY (creator_id) REFERENCES scholars_users(id),
    FOREIGN KEY (purchase_id) REFERENCES creative_purchases(id)
  );

  CREATE INDEX IF NOT EXISTS idx_creative_payouts_creator ON creative_payouts(creator_id);
  CREATE INDEX IF NOT EXISTS idx_creative_payouts_status ON creative_payouts(status);

  -- Analytics events for creative assets (views, purchases)
  CREATE TABLE IF NOT EXISTS creative_analytics_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER,
    event_type TEXT NOT NULL CHECK (event_type IN ('view', 'purchase')),
    licensee_email TEXT,
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES creative_assets(id)
  );

  CREATE INDEX IF NOT EXISTS idx_creative_analytics_asset ON creative_analytics_events(asset_id);
  CREATE INDEX IF NOT EXISTS idx_creative_analytics_type ON creative_analytics_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_creative_analytics_created ON creative_analytics_events(created_at);
`;

function migrate(db) {
  db.exec(CREATIVE_SCHEMA);
  makeCreativePurchaseAssetNullable(db);
}

function makeCreativePurchaseAssetNullable(db) {
  const info = db.prepare('PRAGMA table_info(creative_purchases)').all();
  const assetCol = info.find((c) => c.name === 'asset_id');
  if (!assetCol || assetCol.notnull === 0) return;

  db.exec(`
    PRAGMA foreign_keys = OFF;
    BEGIN TRANSACTION;
    CREATE TABLE creative_purchases_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER,
      licensee_booking_id INTEGER,
      licensee_email TEXT,
      license_type TEXT NOT NULL DEFAULT 'single_use' CHECK (license_type IN ('single_use', 'all_access_pass')),
      price_cents INTEGER NOT NULL DEFAULT 0,
      platform_fee_cents INTEGER NOT NULL DEFAULT 0,
      creator_payout_cents INTEGER NOT NULL DEFAULT 0,
      university_credit_cents INTEGER NOT NULL DEFAULT 0,
      stripe_session_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'paid', 'refunded', 'disputed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES creative_assets(id),
      FOREIGN KEY (licensee_booking_id) REFERENCES bookings(id)
    );
    INSERT INTO creative_purchases_new
      SELECT id, asset_id, licensee_booking_id, licensee_email, license_type, price_cents,
             platform_fee_cents, creator_payout_cents, university_credit_cents, stripe_session_id,
             status, created_at, updated_at
      FROM creative_purchases;
    DROP TABLE creative_purchases;
    ALTER TABLE creative_purchases_new RENAME TO creative_purchases;
    CREATE INDEX IF NOT EXISTS idx_creative_purchases_asset ON creative_purchases(asset_id);
    CREATE INDEX IF NOT EXISTS idx_creative_purchases_email ON creative_purchases(licensee_email);
    CREATE INDEX IF NOT EXISTS idx_creative_purchases_status ON creative_purchases(status);
    CREATE INDEX IF NOT EXISTS idx_creative_purchases_stripe ON creative_purchases(stripe_session_id);
    COMMIT;
    PRAGMA foreign_keys = ON;
  `);
}

function runStandalone() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  db.close();
  console.log('Student Creative Marketplace migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, CREATIVE_SCHEMA };
