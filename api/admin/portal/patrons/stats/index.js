/**
 * GET /api/admin/portal/patrons/stats
 *
 * Aggregate patron metrics (counts by status, estimated MRR, active temples).
 */

const { setPortalCors, sendError, portalAuth, portalService } = require('../../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'read');
    if (!auth) return;
    return res.json(await portalService.getPatronStats());
  } catch (err) {
    sendError(res, err);
  }
};
