/**
 * GET /api/admin/portal/merch
 *
 * Creator merch oversight: the creator_products catalog (title, creator,
 * university, price, status) plus creator_order_ledger totals (gross,
 * creator share, platform share; refunded orders reported separately).
 */

const {
  setPortalCors,
  sendError,
  portalAuth,
  getPortalService,
} = require('../../../../../api/admin/portal/_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'read');
    if (!auth) return;
    return res.json(getPortalService().getCreatorMerchOverview());
  } catch (err) {
    sendError(res, err);
  }
};
