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
// Order state lives in the OPERATIONAL store (Postgres when DATABASE_URL is
// set — durable across Vercel redeploys and visible to every lambda
// instance; SQLite locally / bare Vercel). Timestamps stay TEXT for exact
// parity with the historical SQLite rows.
const { get, all, run, insert } = require('../db/operational');
// Creator-merch rows (creator_products, the 50/50 ledger) still live in the
// shared SQLite DB — creator-merch.js reads AND writes them there, so the
// lookup below must read the same store.
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
 * Resolve the Printful print file for a chosen artwork. Returns
 * { url, type } or null (null → the order prints with the sync variant's
 * default file, i.e. the behaviour before artwork choice existed).
 * 'creative:<id>' keys (P4 licensed temple creatives) are resolved from the
 * committed creative-artworks index, not the product's brand arts.
 */
function artworkFileFor(productId, artworkKey) {
  if (!artworkKey || typeof artworkKey !== 'string') return null;
  const kind = String(productId).split('-').pop();
  const fileType = kind === 'cap' ? 'embroidery_front' : 'default';

  if (artworkKey.startsWith('creative:')) {
    const creativeId = artworkKey.slice('creative:'.length);
    const entry = creativeIndexEntry(productId, creativeId);
    if (!entry?.printUrl) return null;
    return { url: entry.printUrl, type: fileType };
  }

  const entry = PRODUCT_CATALOG.products.find((p) => p.id === productId);
  if (!entry) return null;
  const art = (entry.artworks || []).find((a) => a.key === artworkKey);
  if (!art) return null;
  const png = String(art.src || '').replace(/\.webp$/, '.png');
  if (!png.startsWith('/')) return null;
  const MASTERS_BASE = process.env.PRINTFUL_MASTERS_BASE || 'https://punycodex-masters.vercel.app';
  const url = png.startsWith('/sites/')
    ? `${MASTERS_BASE}/${path.posix.basename(png)}`
    : `https://punicodex.com${png}`;
  return { url, type: fileType };
}

// P4 licensed-creatives index (store/creative-artworks.json, committed by
// scripts/sync-store-creatives.js). { temple: { productId-unaware list } } —
// entries carry the temple so a creative only fulfils on its own temple's
// products.
let CREATIVE_INDEX = null;
function creativeIndex() {
  if (CREATIVE_INDEX === null) {
    try {
      CREATIVE_INDEX = require(path.join(__dirname, '..', '..', 'store', 'creative-artworks.json'));
    } catch {
      CREATIVE_INDEX = {};
    }
  }
  return CREATIVE_INDEX;
}
function creativeIndexEntry(productId, creativeId) {
  const temple = String(productId).split('-')[0];
  const list = creativeIndex()[temple] || [];
  return list.find((c) => String(c.id) === String(creativeId)) || null;
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
    artworkKeys: (entry.artworks || []).map((a) => a.key),
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

function validateArtwork(product, artworkKey) {
  if (artworkKey === undefined || artworkKey === null || artworkKey === '') return null;
  if (typeof artworkKey !== 'string') {
    const err = new Error('artworkKey must be a string');
    err.status = 400;
    throw err;
  }
  // Products without artworks data (older catalog entries, test fixtures)
  // accept any key; catalog products constrain to their real artworks.
  if (product.artworkKeys?.length && !product.artworkKeys.includes(artworkKey)) {
    const err = new Error(`artworkKey must be one of: ${product.artworkKeys.join(', ')}`);
    err.status = 400;
    throw err;
  }
  return artworkKey;
}

async function createStoreOrder({ productId, variantLabel, quantity, email, artworkKey }) {
  const product = resolveProduct(productId);
  const validated = validateOrder({ product, variantLabel, quantity });
  const validatedArtwork = validateArtwork(product, artworkKey);
  const unitPriceCents = unitPriceFor(product, validated.variantLabel);
  const grossCents = unitPriceCents * validated.quantity;
  const ref = generateOrderRef();
  const id = await insert(
    `INSERT INTO store_orders
       (order_ref, product_id, product_name, variant_label, quantity,
        unit_price_cents, gross_cents, base_cents, customer_email,
        creator_product_id, artwork_key, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending_payment')
     RETURNING id`,
    [
      ref,
      product.id,
      product.name,
      validated.variantLabel,
      validated.quantity,
      unitPriceCents,
      grossCents,
      product.baseCents,
      email || null,
      product.creatorProductId,
      validatedArtwork,
    ]
  );
  const order = await getStoreOrderById(id);
  return { order, product: { ...product, unitPriceCents } };
}

async function getStoreOrderByRef(orderRef) {
  return get('SELECT * FROM store_orders WHERE order_ref = $1', [orderRef]);
}

async function getStoreOrderBySessionId(stripeSessionId) {
  return get('SELECT * FROM store_orders WHERE stripe_session_id = $1', [stripeSessionId]);
}

async function attachStripeSession(orderId, stripeSessionId) {
  await run(
    'UPDATE store_orders SET stripe_session_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [stripeSessionId, orderId]
  );
}

/**
 * Flip a pending order to paid (idempotent) and, for creator merch, settle
 * the 50/50 royalty ledger. Called from the Stripe webhook.
 */
async function markStoreOrderPaid({ orderRef, stripeSessionId, stripePaymentIntent, session }) {
  const order = await getStoreOrderByRef(orderRef);
  if (!order) {
    const err = new Error(`Unknown store order ${orderRef}`);
    err.status = 404;
    throw err;
  }

  const shipping = session?.shipping_details || session?.collected_information?.shipping_details;
  const customerEmail = session?.customer_details?.email || order.customer_email;

  if (order.status === 'pending_payment') {
    await run(
      `UPDATE store_orders SET
         status = 'paid',
         stripe_session_id = COALESCE($1, stripe_session_id),
         stripe_payment_intent = $2,
         customer_email = COALESCE($3, customer_email),
         shipping_name = $4,
         shipping_address = $5,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        stripeSessionId || null,
        stripePaymentIntent || null,
        customerEmail || null,
        shipping?.name || null,
        shipping?.address ? JSON.stringify(shipping.address) : null,
        order.id,
      ]
    );
  }

  const updated = await getStoreOrderById(order.id);

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

async function setStoreOrderStatus(orderId, status, extra = {}) {
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
  await run(
    `UPDATE store_orders SET
       status = $1,
       printful_order_id = COALESCE($2, printful_order_id),
       printful_status = COALESCE($3, printful_status),
       tracking_url = COALESCE($4, tracking_url),
       carrier = COALESCE($5, carrier),
       error = $6,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $7`,
    [
      status,
      extra.printfulOrderId || null,
      extra.printfulStatus || null,
      extra.trackingUrl || null,
      extra.carrier || null,
      extra.error || null,
      orderId,
    ]
  );
  return getStoreOrderById(orderId);
}

async function getStoreOrderByPrintfulId(printfulOrderId) {
  return get('SELECT * FROM store_orders WHERE printful_order_id = $1', [printfulOrderId]);
}

async function getStoreOrderById(id) {
  return get('SELECT * FROM store_orders WHERE id = $1', [id]);
}

/**
 * Orders stuck at `paid` — the Stripe webhook marked them paid but
 * fulfillment never ran (lost webhook delivery past Stripe's retry window,
 * or an instance crash between the two writes). The daily sweep re-enters
 * them into fulfillment. Timestamps are TEXT ('YYYY-MM-DD HH:MM:SS' UTC) on
 * both backends, so a plain string-compare against the cutoff works
 * everywhere. Exported (pure query) for tests.
 */
async function listStalePaidOrders(olderThanHours = 24, limit = 25) {
  const cutoff = new Date(Date.now() - olderThanHours * 3600 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  return all(
    `SELECT * FROM store_orders
     WHERE status = 'paid' AND created_at < $1
     ORDER BY id ASC LIMIT $2`,
    [cutoff, limit]
  );
}

/**
 * Paged roster for the admin portal Store Orders tab, plus fleet stats.
 * Stats count money only on orders that actually reached payment (pending
 * checkouts are pipeline, not revenue).
 */
async function listStoreOrders({ limit = 50, offset = 0, status = null } = {}) {
  const where = status ? 'WHERE status = $1' : '';
  const args = status ? [status] : [];
  const totalRow = await get(`SELECT COUNT(*) AS n FROM store_orders ${where}`, args);
  const items = await all(
    `SELECT * FROM store_orders ${where} ORDER BY id DESC LIMIT $1 OFFSET $2`,
    [...args, limit, offset]
  );
  const rows = await all(
    'SELECT status, COUNT(*) AS n, COALESCE(SUM(gross_cents), 0) AS gross FROM store_orders GROUP BY status'
  );
  const byStatus = {};
  for (const r of rows) byStatus[r.status] = { count: Number(r.n), grossCents: Number(r.gross) };
  const cutoff30d = new Date(Date.now() - 30 * 86400 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  const revenue = await get(
    `SELECT COALESCE(SUM(gross_cents), 0) AS gross, COUNT(*) AS n FROM store_orders
     WHERE status NOT IN ('pending_payment', 'cancelled', 'refunded')`
  );
  const revenue30d = await get(
    `SELECT COALESCE(SUM(gross_cents), 0) AS gross, COUNT(*) AS n FROM store_orders
     WHERE status NOT IN ('pending_payment', 'cancelled', 'refunded')
       AND created_at >= $1`,
    [cutoff30d]
  );
  return {
    items,
    total: Number(totalRow?.n || 0),
    limit,
    offset,
    stats: {
      totalOrders: Number(revenue?.n || 0),
      revenueCents: Number(revenue?.gross || 0),
      orders30d: Number(revenue30d?.n || 0),
      revenue30dCents: Number(revenue30d?.gross || 0),
      byStatus,
    },
  };
}

module.exports = {
  createStoreOrder,
  resolveProduct,
  validateOrder,
  unitPriceFor,
  getStoreOrderByRef,
  getStoreOrderById,
  listStoreOrders,
  listStalePaidOrders,
  getStoreOrderBySessionId,
  getStoreOrderByPrintfulId,
  attachStripeSession,
  artworkFileFor,
  markStoreOrderPaid,
  setStoreOrderStatus,
  estimateFeesCents,
  generateOrderRef,
};
