/**
 * /api/store/checkout — create a Stripe checkout session for a merch order.
 *
 * POST { productId, variantLabel?, quantity?, email?, artworkKey? }
 *   → { sessionUrl, sessionId, orderRef }
 *
 * artworkKey is the configurator's chosen art (mascot/logomark/…); it is
 * validated against the catalog entry and recorded on the order + Stripe
 * metadata as fulfillment intent (per-art printfiles land in P3).
 *
 * Rate-limited with the stricter public bucket (Stripe outbound work), same
 * pattern as the patrons checkout. The store_orders migration is idempotent
 * and runs on every cold start because the Vercel SQLite database lives in
 * ephemeral /tmp.
 */

const { handleError, setCors } = require('../../../../api/_utils');
const { getDb } = require('../../../db/connection');
const { migrate: migrateStoreOrders } = require('../../../db/migrate-store-orders');
const { migrate: migrateCreatorMerch } = require('../../../db/migrate-creator-merch');
const { createStoreOrder, attachStripeSession } = require('../../../api/store-orders');
const { createStoreCheckoutSession } = require('../../../api/stripe');
const { checkRateLimit } = require('../../../api/api-rate-limiter');
const { getClientIp } = require('../../../api/client-ip');

try {
  migrateStoreOrders(getDb());
  migrateCreatorMerch(getDb());
} catch {
  // Migration is retried on the next cold start; the request may still work
  // if the tables already exist.
}
// Durable Postgres schema (no-op without DATABASE_URL) — created on cold
// start because init-operational-postgres.js is a destructive bootstrap that
// nothing runs in production.
require('../../../db/migrate-store-orders-pg')
  .runMigration()
  .catch((err) => console.error('[store/checkout] pg migration failed:', err.message));

async function checkCheckoutRateLimit(req, res) {
  const key = `store-checkout:${getClientIp(req)}`;
  const result = await checkRateLimit(key, 'public-strict');

  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'Too many requests. Please slow down.', retryAfter });
    return false;
  }
  return true;
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!(await checkCheckoutRateLimit(req, res))) return;
    const { productId, variantLabel, quantity, email, artworkKey } = req.body || {};

    const { order, product } = await createStoreOrder({
      productId,
      variantLabel,
      quantity,
      email,
      artworkKey,
    });
    const session = await createStoreCheckoutSession({ order, product });
    await attachStripeSession(order.id, session.sessionId);

    return res.json({
      sessionUrl: session.sessionUrl,
      sessionId: session.sessionId,
      orderRef: order.order_ref,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    return handleError(res, err);
  }
};
