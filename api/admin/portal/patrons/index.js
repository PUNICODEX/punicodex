/**
 * GET /api/admin/portal/patrons
 *
 * Patron list with optional ?temple=&status=&limit=&offset= filters.
 */

const {
  setPortalCors,
  sendError,
  parseLimitOffset,
  portalAuth,
  getPortalService,
} = require('../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'read');
    if (!auth) return;

    const { temple, status } = req.query || {};
    const { limit, offset } = parseLimitOffset(req);
    return res.json(await getPortalService().listPatronsAdmin({ temple, status, limit, offset }));
  } catch (err) {
    sendError(res, err);
  }
};
