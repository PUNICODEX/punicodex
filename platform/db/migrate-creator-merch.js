/**
 * Migration: Creator merch pipeline
 *
 * Extends the Student Creative Marketplace (migrate-scholars-creatives.js)
 * with an opt-in merch consent flag on creative_assets, plus the
 * creator_products catalog and creator_order_ledger accounting tables.
 * Idempotent; runs inside db-init and on serverless cold starts.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const CREATOR_MERCH_SCHEMA = `
  -- Consented creative works listed as print-on-demand merch in the Store.
  -- Creator identity is denormalized at listing time so the store endpoint
  -- can serve the catalog without joining the scholars tables.
  CREATE TABLE IF NOT EXISTS creator_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creative_asset_id INTEGER NOT NULL,
    creator_id INTEGER NOT NULL,
    creator_name TEXT NOT NULL DEFAULT '',
    creator_university TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    image_path TEXT,
    product_type TEXT NOT NULL DEFAULT 'poster' CHECK (product_type IN ('poster', 'tee', 'sticker')),
    price_cents INTEGER NOT NULL DEFAULT 0,
    base_cost_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'withdrawn')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creative_asset_id) REFERENCES creative_assets(id),
    FOREIGN KEY (creator_id) REFERENCES scholars_users(id)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_products_asset ON creator_products(creative_asset_id);
  CREATE INDEX IF NOT EXISTS idx_creator_products_creator ON creator_products(creator_id);
  CREATE INDEX IF NOT EXISTS idx_creator_products_status ON creator_products(status);

  -- Per-order revenue split accounting for creator merch sales.
  -- order_ref is unique so duplicate webhook deliveries cannot double-count.
  CREATE TABLE IF NOT EXISTS creator_order_ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_ref TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    gross_cents INTEGER NOT NULL DEFAULT 0,
    base_cents INTEGER NOT NULL DEFAULT 0,
    fees_cents INTEGER NOT NULL DEFAULT 0,
    creator_share_cents INTEGER NOT NULL DEFAULT 0,
    platform_share_cents INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded', 'paid_out', 'refunded')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES creator_products(id)
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_order_ledger_ref ON creator_order_ledger(order_ref);
  CREATE INDEX IF NOT EXISTS idx_creator_order_ledger_product ON creator_order_ledger(product_id);
  CREATE INDEX IF NOT EXISTS idx_creator_order_ledger_created ON creator_order_ledger(created_at);
`;

function addColumnIfMissing(db, table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (columns.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

function migrate(db) {
  // The consent columns extend the creatives submissions table. That table
  // may not exist yet on a minimal cold start (e.g. the store endpoint), so
  // the column adds are skipped there and applied wherever the creatives
  // migration runs first.
  const hasAssets = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'creative_assets'")
    .get();
  if (hasAssets) {
    addColumnIfMissing(db, 'creative_assets', 'merch_consent', 'INTEGER NOT NULL DEFAULT 0');
    addColumnIfMissing(db, 'creative_assets', 'merch_consent_at', 'TEXT');
    addColumnIfMissing(db, 'creative_assets', 'merch_rev_share', 'REAL NOT NULL DEFAULT 0.5');
  }
  db.exec(CREATOR_MERCH_SCHEMA);
}

function runStandalone() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  db.close();
  console.log('Creator merch migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, CREATOR_MERCH_SCHEMA };
