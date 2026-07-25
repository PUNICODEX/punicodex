/**
 * PuniCodex — store order service.
 *
 * DB layer for merch orders behind /api/store/checkout. Tracks each order
 * from `pending_payment` (checkout session created) → `paid` (Stripe
 * webhook) → fulfillment (`sent_to_fulfillment` for POD products,
 * `fulfillment_queued` for creator merch) → `shipped`/`delivered`.
 *
 * Creator merch (product ids `creator-{n}`) is settled through the existing
 * 50/50 ledger in creator-merch (`recordCreatorOrder`), idempotent on the
 * order_ref, so webhook replays never double-count royalties.
 */

const crypto = require('node:crypto');
const path = require('node:path');
const { getDb } = require('../db/connection');
const { recordCreatorOrder } = require('./creator-merch');

const PRODUCT_CATALOG = require(path.join(__dirname, '..', '..', 'store', 'products.json'));

// Stripe card processing estimate used for royalty accounting
// (2.9% + 30¢, matching the worked example in docs/creator-merch.md).
function estimateFeesCents(grossCents) {
  return Math.round(grossCents * 0.029) + 30;
}

function generateOrderRef() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `SO-${stamp}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/**
 * Resolve a purchasable product: static catalog entry, or a live creator
 * merch product (`creator-{id}`). Throws with `.status` for HTTP mapping.
 */
function resolveProduct(productId) {
  if (typeof productId !== 'string' || !productId) {
    const err = new Error('productId is required');
    err.status = 400;
    throw err;
  }
  if (productId.startsWith('creator-')) {
    const creatorProductId = Number(productId.slice('creator-'.length));
    if (!Number.isInteger(creatorProductId)) {
      const err = new Error('Unknown product');
      err.status = 404;
      throw err;
    }
    const row = getDb()
      .prepare("SELECT * FROM creator_products WHERE id = ? AND status = 'live'")
      .get(creatorProductId);
    if (!row) {
      const err = new Error('Unknown product');
      err.status = 404;
      throw err;
    }
    return {
      kind: 'creator',
      id: productId,
      creatorProductId: row.id,
      name: row.title,
      unitPriceCents: row.price_cents,
      baseCents: row.base_cost_cents,
      variantLabels: ['One size'],
      requiresVariant: false,
    };
  }

  const entry = PRODUCT_CATALOG.products.find((p) => p.id === productId);
  if (!entry) {
    const err = new Error('Unknown product');
    err.status = 404;
    throw err;
  }
  if (!entry.printfulProductId) {
    const err = new Error('This product is not purchasable yet');
    err.status = 409;
    throw err;
  }
  const variantLabels = entry.printfulVariants ? Object.keys(entry.printfulVariants) : [];
  return {
    kind: 'catalog',
    id: entry.id,
    creatorProductId: null,
    name: entry.name,
    unitPriceCents: Math.round(entry.price * 100),
    baseCents: null,
    variantLabels,
    variantMap: entry.printfulVariants || {},
    variantPricing: entry.variantPricing || null,
    requiresVariant: variantLabels.length > 1,
  };
}

/**
 * Unit price for an order line: the catalog's per-variant price map when it
 * covers the validated label, else the product's flat price. The price always
 * comes from the catalog — never from the client.
 */
function unitPriceFor(product, variantLabel) {
  const priced = product.variantPricing ? product.variantPricing[variantLabel] : undefined;
  return Number.isInteger(priced) ? priced : product.unitPriceCents;
}

function validateOrder({ product, variantLabel, quantity }) {
  const qty = quantity === undefined || quantity === null ? 1 : Number(quantity);
  if (!Number.isInteger(qty) || qty < 1 || qty > 5) {
    const err = new Error('quantity must be an integer between 1 and 5');
    err.status = 400;
    throw err;
  }
  let label = variantLabel || 'One size';
  if (product.requiresVariant) {
    if (!product.variantLabels.includes(label)) {
      const err = new Error(`variant must be one of: ${product.variantLabels.join(', ')}`);
      err.status = 400;
      throw err;
    }
  } else if (product.variantLabels.length === 1) {
    label = product.variantLabels[0];
  }
  return { quantity: qty, variantLabel: label };
}

function createStoreOrder({ productId, variantLabel, quantity, email }) {
  const product = resolveProduct(productId);
  const validated = validateOrder({ product, variantLabel, quantity });
  const unitPriceCents = unitPriceFor(product, validated.variantLabel);
  const grossCents = unitPriceCents * validated.quantity;
  const ref = generateOrderRef();
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO store_orders
        (order_ref, product_id, product_name, variant_label, quantity,
         unit_price_cents, gross_cents, base_cents, customer_email,
         creator_product_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment')`
    )
    .run(
      ref,
      product.id,
      product.name,
      validated.variantLabel,
      validated.quantity,
      unitPriceCents,
      grossCents,
      product.baseCents,
      email || null,
      product.creatorProductId
    );
  const order = db.prepare('SELECT * FROM store_orders WHERE id = ?').get(result.lastInsertRowid);
  return { order, product: { ...product, unitPriceCents } };
}

function getStoreOrderByRef(orderRef) {
  return getDb().prepare('SELECT * FROM store_orders WHERE order_ref = ?').get(orderRef);
}

function getStoreOrderBySessionId(stripeSessionId) {
  return getDb()
    .prepare('SELECT * FROM store_orders WHERE stripe_session_id = ?')
    .get(stripeSessionId);
}

function attachStripeSession(orderId, stripeSessionId) {
  getDb()
    .prepare(
      'UPDATE store_orders SET stripe_session_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    )
    .run(stripeSessionId, orderId);
}

/**
 * Flip a pending order to paid (idempotent) and, for creator merch, settle
 * the 50/50 royalty ledger. Called from the Stripe webhook.
 */
function markStoreOrderPaid({ orderRef, stripeSessionId, stripePaymentIntent, session }) {
  const db = getDb();
  const order = db.prepare('SELECT * FROM store_orders WHERE order_ref = ?').get(orderRef);
  if (!order) {
    const err = new Error(`Unknown store order ${orderRef}`);
    err.status = 404;
    throw err;
  }

  const shipping = session?.shipping_details || session?.collected_information?.shipping_details;
  const customerEmail = session?.customer_details?.email || order.customer_email;

  if (order.status === 'pending_payment') {
    db.prepare(
      `UPDATE store_orders SET
         status = 'paid',
         stripe_session_id = COALESCE(?, stripe_session_id),
         stripe_payment_intent = ?,
         customer_email = COALESCE(?, customer_email),
         shipping_name = ?,
         shipping_address = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      stripeSessionId || null,
      stripePaymentIntent || null,
      customerEmail || null,
      shipping?.name || null,
      shipping?.address ? JSON.stringify(shipping.address) : null,
      order.id
    );
  }

  const updated = db.prepare('SELECT * FROM store_orders WHERE id = ?').get(order.id);

  if (updated.creator_product_id) {
    recordCreatorOrder({
      orderRef: updated.order_ref,
      productId: updated.creator_product_id,
      grossCents: updated.gross_cents,
      baseCents: (updated.base_cents || 0) * updated.quantity,
      feesCents: estimateFeesCents(updated.gross_cents),
    });
  }

  return updated;
}

function setStoreOrderStatus(orderId, status, extra = {}) {
  const allowed = [
    'paid',
    'fulfillment_queued',
    'sent_to_fulfillment',
    'fulfillment_failed',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
  ];
  if (!allowed.includes(status)) throw new Error(`invalid status ${status}`);
  const db = getDb();
  db.prepare(
    `UPDATE store_orders SET
       status = ?,
       printful_order_id = COALESCE(?, printful_order_id),
       printful_status = COALESCE(?, printful_status),
       tracking_url = COALESCE(?, tracking_url),
       carrier = COALESCE(?, carrier),
       error = ?,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(
    status,
    extra.printfulOrderId || null,
    extra.printfulStatus || null,
    extra.trackingUrl || null,
    extra.carrier || null,
    extra.error || null,
    orderId
  );
  return db.prepare('SELECT * FROM store_orders WHERE id = ?').get(orderId);
}

function getStoreOrderByPrintfulId(printfulOrderId) {
  return getDb()
    .prepare('SELECT * FROM store_orders WHERE printful_order_id = ?')
    .get(printfulOrderId);
}

module.exports = {
  createStoreOrder,
  resolveProduct,
  validateOrder,
  unitPriceFor,
  getStoreOrderByRef,
  getStoreOrderBySessionId,
  getStoreOrderByPrintfulId,
  attachStripeSession,
  markStoreOrderPaid,
  setStoreOrderStatus,
  estimateFeesCents,
  generateOrderRef,
};
