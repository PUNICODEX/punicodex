const { runCron } = require('../_utils');
const { listStalePaidOrders } = require('../../../platform/api/store-orders');
const { fulfillStoreOrder } = require('../../../platform/api/store-fulfillment');
const { migrate } = require('../../../platform/db/migrate-store-orders');

// Idempotent migrations on cold start (SQLite + durable Postgres).
const { getDb } = require('../../../platform/db/connection');
try {
  migrate(getDb());
} catch (err) {
  console.error('[cron/store-order-sweep] migration failed:', err.message);
}
require('../../../platform/db/migrate-store-orders-pg')
  .runMigration()
  .catch((err) => console.error('[cron/store-order-sweep] pg migration failed:', err.message));

/**
 * /api/cron/store-order-sweep — daily reconciliation for the merch pipeline.
 *
 * Safety net under Stripe's 3-day webhook retry window: orders that reached
 * `paid` but never entered fulfillment (webhook delivery lost past the retry
 * window, or an instance crash between the paid write and the fulfillment
 * call) would otherwise sit forever with a charged customer and nothing
 * shipping. Re-entering them through fulfillStoreOrder is safe: its
 * idempotency guard admits only paid/fulfillment_failed orders, and the
 * Printful external_id lookup dedupes a create that already happened.
 */
module.exports = runCron('cron/store-order-sweep', { ttlMinutes: 30, nextRun: '24 hours' })(
  async () => {
    const stale = await listStalePaidOrders(24, 25);
    let reentered = 0;
    let failed = 0;
    for (const order of stale) {
      try {
        const result = await fulfillStoreOrder(order);
        if (result.status === 'sent_to_fulfillment' || result.status === 'fulfillment_queued') {
          reentered++;
        } else if (result.status === 'fulfillment_failed') {
          // alertStoreFulfillmentFailed already fired inside fulfillStoreOrder
          failed++;
        }
      } catch (err) {
        failed++;
        console.error(`[store-order-sweep] ${order.order_ref}: ${err.message}`);
      }
    }
    return { scanned: stale.length, reentered, failed };
  }
);
