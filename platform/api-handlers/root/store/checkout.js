/**
 * /api/store/checkout — create a Stripe checkout session for a merch order.
 *
 * POST { productId, variantLabel?, quantity?, email? }
 *   → { sessionUrl, sessionId, orderRef }
 *
 * Rate-limited with the stricter public bucket (Stripe outbound work), same
 * pattern as the patrons checkout. The store_orders migration is idempotent
 * and runs on every cold start because the Vercel SQLite database lives in
 * ephemeral /tmp.
 */

const { handleError, setCors } = require('../_utils');
const { getDb } = require('../../platform/db/connection');
const { migrate: migrateStoreOrders } = require('../../platform/db/migrate-store-orders');
const { migrate: migrateCreatorMerch } = require('../../platform/db/migrate-creator-merch');
const { createStoreOrder, attachStripeSession } = require('../../platform/api/store-orders');
const { createStoreCheckoutSession } = require('../../platform/api/stripe');
const { checkRateLimit } = require('../../platform/api/api-rate-limiter');
const { getClientIp } = require('../../platform/api/client-ip');

try {
  migrateStoreOrders(getDb());
  migrateCreatorMerch(getDb());
} catch {
  // Migration is retried on the next cold start; the request may still work
  // if the tables already exist.
}

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
    const { productId, variantLabel, quantity, email } = req.body || {};

    const { order, product } = createStoreOrder({ productId, variantLabel, quantity, email });
    const session = await createStoreCheckoutSession({ order, product });
    attachStripeSession(order.id, session.sessionId);

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
