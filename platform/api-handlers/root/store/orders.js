/**
 * /api/store/orders — public order-status lookup for the store success page.
 *
 * GET /api/store/orders?ref=SO-...&session_id=cs_...
 * The Stripe session id acts as the bearer proof that the caller owns the
 * order (it is only ever shown to the buyer in the checkout redirect).
 */

const { handleError, setCors } = require('../../../../api/_utils');
const { getDb } = require('../../../db/connection');
const { migrate: migrateStoreOrders } = require('../../../db/migrate-store-orders');
const { getStoreOrderByRef } = require('../../../api/store-orders');
const { checkPublicRateLimitByReq } = require('../../../api/public-rate-limiter');

try {
  migrateStoreOrders(getDb());
} catch {
  // retried on next cold start
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!(await checkPublicRateLimitByReq(req, res, 'store-orders'))) return;
    const { ref, session_id: sessionId } = req.query || {};
    if (!ref || typeof ref !== 'string') {
      return res.status(400).json({ error: 'ref is required' });
    }
    const order = getStoreOrderByRef(ref);
    if (!order || (sessionId && order.stripe_session_id !== sessionId)) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json({
      orderRef: order.order_ref,
      status: order.status,
      productName: order.product_name,
      variantLabel: order.variant_label,
      quantity: order.quantity,
      trackingUrl: order.tracking_url,
      carrier: order.carrier,
      createdAt: order.created_at,
    });
  } catch (err) {
    return handleError(res, err);
  }
};
