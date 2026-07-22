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
 * Then the customer gets an order-confirmation email (fire-and-forget).
 */

const { setStoreOrderStatus, resolveProduct } = require('./store-orders');

async function fulfillStoreOrder(order) {
  const { notifyStoreOrderConfirmation } = require('./email');

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
    await notifyStoreOrderConfirmation({
      email: fulfilled.customer_email,
      orderRef: fulfilled.order_ref,
      productName: fulfilled.product_name,
      variantLabel: fulfilled.variant_label,
      quantity: fulfilled.quantity,
      status: fulfilled.status,
    }).catch(() => {});
  }

  return fulfilled;
}

module.exports = { fulfillStoreOrder };
