/**
 * Migration: store_orders — Postgres schema.
 *
 * Mirrors the SQLite schema in migrate-store-orders.js. store_orders is an
 * OPERATIONAL table (init-operational-postgres.js lists it), but that script
 * is a destructive bootstrap (it DROPs every operational table) and nothing
 * runs it in production — so the merch orders table must create itself
 * idempotently here, the same way migrate-csp-reports-pg.js does.
 *
 * Timestamps stay TEXT (DEFAULT CURRENT_TIMESTAMP) for exact parity with the
 * SQLite rows and the string comparisons the sweep/portal queries use.
 */

const { run, isPostgres } = require('./operational');

async function runMigration() {
  if (!isPostgres()) return;

  await run(`
    CREATE TABLE IF NOT EXISTS store_orders (
      id BIGSERIAL PRIMARY KEY,
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
      status TEXT NOT NULL DEFAULT 'pending_payment',
      creator_product_id INTEGER,
      printful_order_id INTEGER,
      printful_status TEXT,
      tracking_url TEXT,
      carrier TEXT,
      error TEXT,
      artwork_key TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await run('CREATE UNIQUE INDEX IF NOT EXISTS idx_store_orders_ref ON store_orders(order_ref)');
  await run(
    'CREATE INDEX IF NOT EXISTS idx_store_orders_session ON store_orders(stripe_session_id)'
  );
  await run('CREATE INDEX IF NOT EXISTS idx_store_orders_status ON store_orders(status)');
  await run(
    'CREATE INDEX IF NOT EXISTS idx_store_orders_creator ON store_orders(creator_product_id)'
  );
  await run(
    'CREATE INDEX IF NOT EXISTS idx_store_orders_printful ON store_orders(printful_order_id)'
  );
}

module.exports = { runMigration };
