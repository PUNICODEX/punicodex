/**
 * /api/admin/portal/discounts
 *
 * Leasing permission (superadmin/ops/leasing). Discount codes for temple
 * sponsorships (bookings) — never patrons.
 *
 * GET  — paged code roster for the Leasing > Discounts tab.
 *        Query: ?includeInactive=1&limit=&offset=
 *        → { items, total, limit, offset, stats }.
 * POST — create a code (body validated in the discount service; kind-driven
 *        field rules, price-relative checks against the temple's bundle
 *        price). Audit rows record the portal user.
 */

const { setPortalCors, sendError, parseLimitOffset, portalAuth } = require('../_portal.js');
const discountService = require('../../../../platform/api/discount-service.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    if (req.method === 'GET') {
      const { limit, offset } = parseLimitOffset(req);
      const includeInactive = ['1', 'true'].includes(String(req.query?.includeInactive || ''));
      return res.json(await discountService.listCodes({ limit, offset, includeInactive }));
    }

    const created = await discountService.createCode(req.body || {}, auth);
    return res.status(201).json(created);
  } catch (err) {
    sendError(res, err);
  }
};
