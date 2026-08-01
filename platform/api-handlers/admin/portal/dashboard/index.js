/**
 * GET /api/admin/portal/dashboard
 *
 * Aggregated operational snapshot: pending applications, scholars queues,
 * patrons/MRR, 30-day revenue, 24h traffic, indexed sites.
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
    return res.json(await getPortalService().getDashboard());
  } catch (err) {
    sendError(res, err);
  }
};
