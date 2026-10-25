/**
 * PuniCodex — store order fulfillment orchestration.
 *
 * Runs after a store order is paid (Stripe webhook, inline so fulfillment
 * state is recorded before we 200 the webhook; failures land on the order
 * row as fulfillment_failed with the reason, never as a lost 500):
 *
 *   - creator merch  → `fulfillment_queued` (operator fulfills; the 50/50
 *                      royalty ledger was already settled in markStoreOrderPaid)
 *   - catalog POD    → Printful order create + confirm →
 *                      `sent_to_fulfillment` (or `fulfillment_failed` + error)
 *
 * Then the customer gets an order email (fire-and-forget): a confirmation on
 * the first fulfillment entry, or honest "we hit a snag" copy on failure. An
 * admin retry after failure does NOT resend the confirmation.
 */

const { setStoreOrderStatus, resolveProduct, getStoreOrderById } = require('./store-orders');

async function fulfillStoreOrder(order) {
  const { notifyStoreOrderConfirmation } = require('./email');

  // Idempotency guard: Stripe re-delivers checkout.session.completed, and
  // the webhook pipeline calls us on EVERY delivery. Only a freshly-paid
  // order may enter fulfillment — without this guard a duplicate delivery
  // regresses shipped → sent_to_fulfillment, re-sends the confirmation
  // email, and re-queues creator merch for the operator (double-ship risk).
  // Legitimate re-entry after a failure goes through
  // retryStoreOrderFulfillment, which gates on fulfillment_failed — that is
  // the only other state allowed in here.
  if (order.status !== 'paid' && order.status !== 'fulfillment_failed') {
    return order;
  }
  const enteredFromStatus = order.status;

  let fulfilled = order;
  try {
    if (order.creator_product_id) {
      fulfilled = setStoreOrderStatus(order.id, 'fulfillment_queued');
    } else {
      const product = resolveProduct(order.product_id);
      const syncVariantId = product.variantMap?.[order.variant_label];
      if (!syncVariantId) {
        throw new Error(
          `no Printful sync variant for "${order.variant_label}" on ${order.product_id}`
        );
      }
      const { createAndConfirmOrder } = require('./printful-orders');
      const result = await createAndConfirmOrder(order, syncVariantId);
      fulfilled = setStoreOrderStatus(order.id, 'sent_to_fulfillment', {
        printfulOrderId: result.id,
        printfulStatus: result.status,
      });
    }
  } catch (err) {
    fulfilled = setStoreOrderStatus(order.id, 'fulfillment_failed', { error: err.message });
  }

  if (fulfilled.customer_email) {
    // Confirmation goes out only on the FIRST fulfillment entry (status
    // 'paid'). An admin retry re-enters from 'fulfillment_failed', where the
    // customer already received their confirmation — resending would
    // double-email. No confirmation_sent_at column is needed: the entry
    // status fully determines whether a confirmation already went out.
    // Failures always email (honest copy) — including a failed retry, which
    // is a new failure the customer should hear about.
    if (enteredFromStatus === 'paid' || fulfilled.status === 'fulfillment_failed') {
      await notifyStoreOrderConfirmation({
        email: fulfilled.customer_email,
        orderRef: fulfilled.order_ref,
        productName: fulfilled.product_name,
        variantLabel: fulfilled.variant_label,
        quantity: fulfilled.quantity,
        status: fulfilled.status,
      }).catch(() => {});
    }
  }

  return fulfilled;
}

/**
 * Admin-driven retry for an order stuck at `fulfillment_failed`. Any other
 * status is rejected so a retry can never double-create a Printful order for
 * one that already went through. The Printful client itself self-heals the
 * "created but not recorded" case via the external_id lookup, so a retry
 * after a mid-flight crash recovers the original order instead of
 * duplicating it.
 */
async function retryStoreOrderFulfillment(orderId) {
  const order = getStoreOrderById(orderId);
  if (!order) {
    const err = new Error('Unknown store order');
    err.status = 404;
    throw err;
  }
  if (order.status !== 'fulfillment_failed') {
    const err = new Error(
      `Only fulfillment_failed orders can be retried (current status: ${order.status})`
    );
    err.status = 409;
    throw err;
  }
  return fulfillStoreOrder(order);
}

module.exports = { fulfillStoreOrder, retryStoreOrderFulfillment };
