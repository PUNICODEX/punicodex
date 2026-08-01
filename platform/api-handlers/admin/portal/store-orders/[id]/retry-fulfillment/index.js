/**
 * /api/admin/portal/store-orders/:id/retry-fulfillment
 *
 * Leasing permission. Re-runs fulfillment for an order stuck at
 * `fulfillment_failed` — 409 for any other status so a retry can never
 * double-create a Printful order. The Printful client self-heals the
 * created-but-not-recorded crash window via the external_id lookup.
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  portalAuth,
} = require('../../../../../../../api/admin/portal/_portal.js');

// Idempotent migration on serverless cold start (Vercel SQLite is ephemeral).
const { getDb } = require('../../../../../../db/connection.js');
try {
  require('../../../../../../db/migrate-store-orders.js').migrate(getDb());
} catch (err) {
  console.error('[admin/store-orders/:id/retry] migration failed:', err.message);
}

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id === null) return res.status(400).json({ error: 'Invalid order id' });

    const { retryStoreOrderFulfillment } = require('../../../../../../api/store-fulfillment.js');
    const order = await retryStoreOrderFulfillment(id);
    return res.json({ order });
  } catch (err) {
    sendError(res, err);
  }
};
