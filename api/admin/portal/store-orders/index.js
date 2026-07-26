/**
 * /api/admin/portal/store-orders
 *
 * Leasing permission (superadmin/ops/leasing). Reliquary merch orders.
 *
 * GET — paged order roster for the Leasing > Store Orders tab.
 *       Query: ?status=&limit=&offset=
 *       → { items, total, limit, offset, stats }.
 */

const { setPortalCors, sendError, parseLimitOffset, portalAuth } = require('../_portal.js');
const { listStoreOrders } = require('../../../../platform/api/store-orders.js');

const VALID_STATUSES = new Set([
  'pending_payment',
  'paid',
  'fulfillment_queued',
  'sent_to_fulfillment',
  'fulfillment_failed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]);

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const { limit, offset } = parseLimitOffset(req);
    const raw = String(req.query?.status || '').trim();
    const status = VALID_STATUSES.has(raw) ? raw : null;
    return res.json(listStoreOrders({ limit, offset, status }));
  } catch (err) {
    sendError(res, err);
  }
};
