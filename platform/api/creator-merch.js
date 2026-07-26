/**
 * PuniCodex — Creator merch pipeline
 *
 * Opt-in merchandise listing for verified Creative Marketplace uploads:
 * consent recording, automatic listing on approval, withdrawal, per-order
 * revenue-split accounting, and creator earnings summaries.
 *
 * Revenue split: 50/50 of net margin, where
 *   net margin = sale price − POD base cost − payment processing fees.
 * Worked example: a $28.00 shirt with a $13.00 base cost and ~$1.12 in fees
 * leaves a $13.88 net margin → $6.94 to the creator, $6.94 to the platform
 * (≈25% of retail to the creator). See docs/creator-merch.md.
 */

const { getDb } = require('../db/connection');

// Creator share of the net margin. Mirrored by the merch_rev_share column
// default on creative_assets; order math uses this constant.
const CREATOR_REV_SHARE = 0.5;

// Catalog defaults derived from the Printful figures in docs/pod-integration.md
// (top of each base-cost range, so split estimates stay conservative).
const MERCH_PRODUCTS = {
  poster: { productType: 'poster', priceCents: 2900, baseCostCents: 1100 }, // Art Print 30×40
  tee: { productType: 'tee', priceCents: 3800, baseCostCents: 1800 }, // Temple Tee
  sticker: { productType: 'sticker', priceCents: 900, baseCostCents: 400 }, // Sticker Set
};
const DEFAULT_PRODUCT_TYPE = 'poster';

/**
 * Split one order between creator and platform.
 * Net margin = gross − base − fees; the creator gets floor(net × share) and
 * the platform keeps the remainder, so a leftover odd cent goes to the
 * platform. A non-positive margin pays nobody.
 */
function computeOrderSplit({ grossCents, baseCents, feesCents }) {
  const netMarginCents = grossCents - baseCents - feesCents;
  if (netMarginCents <= 0) {
    return { netMarginCents, creatorShareCents: 0, platformShareCents: 0 };
  }
  const creatorShareCents = Math.floor(netMarginCents * CREATOR_REV_SHARE);
  return {
    netMarginCents,
    creatorShareCents,
    platformShareCents: netMarginCents - creatorShareCents,
  };
}

// ─────────────────────────────────────────────────────────────
// Consent
// ─────────────────────────────────────────────────────────────

function recordMerchConsent(assetId) {
  const db = getDb();
  return db
    .prepare(
      `UPDATE creative_assets
       SET merch_consent = 1, merch_consent_at = datetime('now'), merch_rev_share = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(CREATOR_REV_SHARE, assetId);
}

function revokeMerchConsent(assetId) {
  const db = getDb();
  return db
    .prepare(
      `UPDATE creative_assets SET merch_consent = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    )
    .run(assetId);
}

// ─────────────────────────────────────────────────────────────
// Listing
// ─────────────────────────────────────────────────────────────

function getConsentedAssetForListing(assetId) {
  const db = getDb();
  return db
    .prepare(
      `SELECT a.id, a.title, a.preview_path, a.merch_consent, a.creator_id,
              u.display_name AS creator_name,
              COALESCE(i.name, '') AS creator_university
       FROM creative_assets a
       JOIN scholars_users u ON a.creator_id = u.id
       LEFT JOIN scholars_institutions i ON a.institution_id = i.id
       WHERE a.id = ?`
    )
    .get(assetId);
}

/**
 * Create (or re-list) the live store product for a consented asset.
 * Idempotent: exactly one product per creative asset. Returns the product id,
 * or null when the asset has not consented.
 */
function listCreatorProductForAsset(assetId, { productType = DEFAULT_PRODUCT_TYPE } = {}) {
  const asset = getConsentedAssetForListing(assetId);
  if (!asset?.merch_consent) return null;
  const defaults = MERCH_PRODUCTS[productType] || MERCH_PRODUCTS[DEFAULT_PRODUCT_TYPE];
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM creator_products WHERE creative_asset_id = ?')
    .get(assetId);
  if (existing) {
    db.prepare(
      `UPDATE creator_products
       SET title = ?, image_path = ?, product_type = ?, price_cents = ?, base_cost_cents = ?,
           status = 'live', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      asset.title,
      asset.preview_path || null,
      defaults.productType,
      defaults.priceCents,
      defaults.baseCostCents,
      existing.id
    );
    return existing.id;
  }
  const result = db
    .prepare(
      `INSERT INTO creator_products
         (creative_asset_id, creator_id, creator_name, creator_university, title, image_path,
          product_type, price_cents, base_cost_cents, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'live')`
    )
    .run(
      asset.id,
      asset.creator_id,
      asset.creator_name || '',
      asset.creator_university,
      asset.title,
      asset.preview_path || null,
      defaults.productType,
      defaults.priceCents,
      defaults.baseCostCents
    );
  return result.lastInsertRowid;
}

function withdrawCreatorProduct(assetId) {
  const db = getDb();
  return db
    .prepare(
      `UPDATE creator_products SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP
       WHERE creative_asset_id = ? AND status = 'live'`
    )
    .run(assetId);
}

function getCreatorProductByAssetId(assetId) {
  const db = getDb();
  return db.prepare('SELECT * FROM creator_products WHERE creative_asset_id = ?').get(assetId);
}

function listLiveCreatorProducts() {
  const db = getDb();
  // The join surfaces the artwork's inspiration entry so the storefront can
  // place a creator edition inside the temple collection it depicts.
  return db
    .prepare(
      `SELECT cp.*, ca.inspiration_entry_id
       FROM creator_products cp
       LEFT JOIN creative_assets ca ON ca.id = cp.creative_asset_id
       WHERE cp.status = 'live'
       ORDER BY cp.created_at DESC`
    )
    .all();
}

// ─────────────────────────────────────────────────────────────
// Order accounting
// ─────────────────────────────────────────────────────────────

/**
 * Record a paid merch order and its revenue split in the ledger.
 * Idempotent on orderRef so duplicate webhook deliveries cannot double-count
 * an order. Base cost defaults to the product's recorded POD base cost.
 */
function recordCreatorOrder({ orderRef, productId, grossCents, baseCents, feesCents }) {
  if (!orderRef || typeof orderRef !== 'string') {
    throw new Error('orderRef is required');
  }
  const db = getDb();
  const product = db.prepare('SELECT * FROM creator_products WHERE id = ?').get(productId);
  if (!product) {
    throw new Error(`Unknown creator product: ${productId}`);
  }
  const existing = db
    .prepare('SELECT * FROM creator_order_ledger WHERE order_ref = ?')
    .get(orderRef);
  if (existing) {
    return {
      ledgerId: existing.id,
      alreadyRecorded: true,
      netMarginCents: existing.gross_cents - existing.base_cents - existing.fees_cents,
      creatorShareCents: existing.creator_share_cents,
      platformShareCents: existing.platform_share_cents,
    };
  }
  const gross = Math.max(0, Math.round(Number(grossCents) || 0));
  const base = Math.max(0, Math.round(Number(baseCents ?? product.base_cost_cents) || 0));
  const fees = Math.max(0, Math.round(Number(feesCents) || 0));
  const split = computeOrderSplit({ grossCents: gross, baseCents: base, feesCents: fees });
  const result = db
    .prepare(
      `INSERT INTO creator_order_ledger
         (order_ref, product_id, gross_cents, base_cents, fees_cents,
          creator_share_cents, platform_share_cents, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'recorded')`
    )
    .run(
      orderRef,
      product.id,
      gross,
      base,
      fees,
      split.creatorShareCents,
      split.platformShareCents
    );
  return { ledgerId: result.lastInsertRowid, alreadyRecorded: false, ...split };
}

/**
 * Stub for the future POD order webhook. Live merch checkout is not wired
 * yet — per docs/pod-integration.md the Printful sync worker and an
 * /api/webhook/printful handler are Phase 2 operational steps. Once they
 * exist, that handler should call this at order time with the paid order's
 * figures; it validates the payload and writes the ledger entry.
 */
function handleMerchOrderPaid(order = {}) {
  return recordCreatorOrder({
    orderRef: order.orderRef || order.id,
    productId: Number(order.productId),
    grossCents: order.grossCents,
    baseCents: order.baseCents,
    feesCents: order.feesCents,
  });
}

// ─────────────────────────────────────────────────────────────
// Earnings
// ─────────────────────────────────────────────────────────────

/**
 * Read-only earnings summary for one creator: lifetime total plus a
 * per-product breakdown. Refunded orders are excluded. This is accounting
 * only — money movement rides on Stripe Connect (docs/creator-merch.md).
 */
function getCreatorEarningsSummary(creatorId) {
  const db = getDb();
  const products = db
    .prepare(
      `SELECT p.id AS product_id, p.title, p.product_type, p.status, p.price_cents,
              COUNT(l.id) AS orders,
              COALESCE(SUM(l.gross_cents), 0) AS gross_cents,
              COALESCE(SUM(l.creator_share_cents), 0) AS creator_share_cents
       FROM creator_products p
       LEFT JOIN creator_order_ledger l ON l.product_id = p.id AND l.status != 'refunded'
       WHERE p.creator_id = ?
       GROUP BY p.id
       ORDER BY p.created_at DESC`
    )
    .all(creatorId);
  const totalEarnedCents = products.reduce((sum, p) => sum + p.creator_share_cents, 0);
  return { totalEarnedCents, currency: 'usd', products };
}

module.exports = {
  CREATOR_REV_SHARE,
  MERCH_PRODUCTS,
  DEFAULT_PRODUCT_TYPE,
  computeOrderSplit,
  recordMerchConsent,
  revokeMerchConsent,
  listCreatorProductForAsset,
  withdrawCreatorProduct,
  getCreatorProductByAssetId,
  listLiveCreatorProducts,
  recordCreatorOrder,
  handleMerchOrderPaid,
  getCreatorEarningsSummary,
};
