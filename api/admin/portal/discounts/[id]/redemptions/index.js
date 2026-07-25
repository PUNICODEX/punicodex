/**
 * GET /api/admin/portal/discounts/:id/redemptions
 *
 * Leasing permission. Redemption history for one discount code (booking id,
 * sponsor email, original → final cents, timestamp). Query: ?limit=&offset=
 * → { items, total, limit, offset }.
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  parseLimitOffset,
  portalAuth,
} = require('../../../_portal.js');
const discountService = require('../../../../../../platform/api/discount-service.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid discount code id' });

    const { limit, offset } = parseLimitOffset(req);
    return res.json(await discountService.redemptions({ codeId: id, limit, offset }));
  } catch (err) {
    sendError(res, err);
  }
};
