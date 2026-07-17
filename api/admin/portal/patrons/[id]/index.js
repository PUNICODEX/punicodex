/**
 * PATCH /api/admin/portal/patrons/:id
 *
 * Leasing role. Body: { status: 'cancelled' | 'expired' }.
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  portalAuth,
  portalService,
} = require('../../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid patron id' });

    const { status } = req.body || {};
    const patron = await portalService.updatePatronStatus(id, status, auth);
    return res.json({ patron });
  } catch (err) {
    sendError(res, err);
  }
};
