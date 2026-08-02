/**
 * /api/webhook/printful — Printful order-event webhook.
 *
 * Receives fulfillment events for merch orders created via the Orders API.
 * Printful v1 webhooks carry no signature, so the endpoint is gated by an
 * unguessable token in the registered URL: POST /api/webhook/printful?token=…
 * (registered by scripts/register-printful-webhook.js; token lives in the
 * PRINTFUL_WEBHOOK_TOKEN env var).
 *
 * Handled events:
 *   package_shipped → store_orders status shipped (+ tracking, shipped email)
 *   order_failed    → fulfillment_failed (+ error)
 *   order_cancelled → cancelled
 */

const crypto = require('node:crypto');
const { handleError, setCors } = require('../_utils');
const { getDb } = require('../../platform/db/connection');
const { migrate: migrateStoreOrders } = require('../../platform/db/migrate-store-orders');
const {
  getStoreOrderByPrintfulId,
  getStoreOrderByRef,
  setStoreOrderStatus,
} = require('../../platform/api/store-orders');

try {
  migrateStoreOrders(getDb());
} catch {
  // retried on next cold start
}

// Constant-time token compare (length-guarded: timingSafeEqual throws on
// unequal buffers).
function tokenMatches(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.query?.token;
    const expected = process.env.PRINTFUL_WEBHOOK_TOKEN;
    if (!expected || !tokenMatches(token, expected)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { type, data } = req.body || {};
    const printfulOrderId = data?.order?.id;
    const externalRef = data?.order?.external_id;
    const order = printfulOrderId
      ? getStoreOrderByPrintfulId(printfulOrderId)
      : externalRef
        ? getStoreOrderByRef(externalRef)
        : null;

    if (!order) {
      // Unknown order — acknowledge so Printful does not retry forever.
      return res.json({ received: true, matched: false });
    }

    if (type === 'package_shipped') {
      // Transition guard: only sent_to_fulfillment → shipped. A forged or
      // replayed event must never ship an order that never went to the
      // print house (or resurrect one already delivered/cancelled).
      if (order.status !== 'sent_to_fulfillment') {
        return res.json({ received: true, ignored: type, status: order.status });
      }
      const shipment = data?.shipment || {};
      const updated = setStoreOrderStatus(order.id, 'shipped', {
        trackingUrl: shipment.tracking_url || null,
        carrier: shipment.carrier || null,
        printfulStatus: 'shipped',
      });
      if (updated.customer_email) {
        const { notifyStoreOrderShipped } = require('../../platform/api/email');
        await notifyStoreOrderShipped({
          email: updated.customer_email,
          orderRef: updated.order_ref,
          productName: updated.product_name,
          trackingUrl: updated.tracking_url,
          carrier: updated.carrier,
        }).catch(() => {});
      }
      return res.json({ received: true, status: 'shipped' });
    }

    if (type === 'order_failed') {
      setStoreOrderStatus(order.id, 'fulfillment_failed', {
        error: data?.reason || 'Printful reported order failure',
      });
      return res.json({ received: true, status: 'fulfillment_failed' });
    }

    if (type === 'order_cancelled' || type === 'order_canceled') {
      // Transition guard: never cancel an order that already shipped or was
      // delivered — a cancellation must not resurrect/refund a fulfilled
      // order behind the operator's back.
      if (order.status === 'shipped' || order.status === 'delivered') {
        return res.json({ received: true, ignored: type, status: order.status });
      }
      setStoreOrderStatus(order.id, 'cancelled');
      return res.json({ received: true, status: 'cancelled' });
    }

    return res.json({ received: true, ignored: type || 'unknown' });
  } catch (err) {
    return handleError(res, err);
  }
};
