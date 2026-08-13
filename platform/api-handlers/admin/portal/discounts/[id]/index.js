/**
 * PATCH  /api/admin/portal/discounts/:id — { active } toggle, term edits
 *         ({ maxUses, expiresAt, note }), or { resetUses: true } to rewind the
 *         redemption counter (leasing role).
 * DELETE /api/admin/portal/discounts/:id — delete a code that has no
 *         redemptions yet (used_count = 0 enforced in the service).
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  portalAuth,
} = require('../../../../../../api/admin/portal/_portal.js');
const discountService = require('../../../../../api/discount-service.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['PATCH', 'DELETE'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid discount code id' });

    if (req.method === 'PATCH') {
      const body = req.body || {};
      if (body.resetUses === true) {
        return res.json(await discountService.resetCodeUses(id, auth));
      }
      const hasEdits = ['maxUses', 'expiresAt', 'note'].some((k) => k in body);
      if (hasEdits) {
        return res.json(await discountService.updateCode(id, body, auth));
      }
      const { active } = body;
      if (typeof active !== 'boolean') {
        return res.status(400).json({
          error: 'active (boolean), term edits, or resetUses (true) is required',
        });
      }
      return res.json(await discountService.setCodeActive(id, active, auth));
    }

    return res.json(await discountService.deleteCode(id, auth));
  } catch (err) {
    sendError(res, err);
  }
};
