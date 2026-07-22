#!/usr/bin/env node
/**
 * PuniCodex — store orders migration.
 *
 * The merch order table behind /api/store/checkout: one row per Stripe
 * checkout session, tracking the order from pending_payment → paid →
 * (POD) sent_to_fulfillment → shipped/delivered, or (creator merch)
 * fulfillment_queued for operator fulfillment. Idempotent — safe to run
 * on every cold start.
 */
const path = require('node:path');

const STORE_ORDERS_SCHEMA = `
CREATE TABLE IF NOT EXISTS store_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_ref TEXT UNIQUE NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  variant_label TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  gross_cents INTEGER NOT NULL,
  base_cents INTEGER,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  customer_email TEXT,
  shipping_name TEXT,
  shipping_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN (
    'pending_payment',
    'paid',
    'fulfillment_queued',
    'sent_to_fulfillment',
    'fulfillment_failed',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
  )),
  creator_product_id INTEGER,
  printful_order_id INTEGER,
  printful_status TEXT,
  tracking_url TEXT,
  carrier TEXT,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_store_orders_session ON store_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_creator ON store_orders(creator_product_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_printful ON store_orders(printful_order_id);
`;

function migrate(db) {
  db.exec(STORE_ORDERS_SCHEMA);
}

function runStandalone() {
  const { getDb } = require(path.join(__dirname, 'connection'));
  migrate(getDb());
  console.log('✓ store_orders migration applied');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, STORE_ORDERS_SCHEMA };
