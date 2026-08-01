/**
 * /api/admin/portal/store-orders/:id
 *
 * Leasing permission. Single merch order detail (shipping, Printful ids,
 * tracking, error) for the Store Orders tab expander.
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  portalAuth,
} = require('../../../../../../api/admin/portal/_portal.js');
const { getStoreOrderById } = require('../../../../../api/store-orders.js');

// Idempotent migration on serverless cold start (Vercel SQLite is ephemeral).
const { getDb } = require('../../../../../db/connection.js');
try {
  require('../../../../../db/migrate-store-orders.js').migrate(getDb());
} catch (err) {
  console.error('[admin/store-orders/:id] migration failed:', err.message);
}

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id === null) return res.status(400).json({ error: 'Invalid order id' });
    const order = getStoreOrderById(id);
    if (!order) return res.status(404).json({ error: 'Unknown store order' });
    return res.json({ order });
  } catch (err) {
    sendError(res, err);
  }
};
