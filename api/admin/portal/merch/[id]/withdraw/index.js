/**
 * POST /api/admin/portal/merch/:id/withdraw
 *
 * Force-withdraw a live creator product (admin takedown). Leasing role.
 * Sets status='withdrawn' through the creator-merch module helper (so the
 * public store catalog updates identically) and writes the admin audit
 * trail.
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  portalAuth,
  getPortalService,
} = require('../../../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid product id' });

    const product = await getPortalService().withdrawCreatorProductById(id, auth);
    return res.json({ withdrawn: true, product });
  } catch (err) {
    sendError(res, err);
  }
};
