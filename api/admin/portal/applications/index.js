/**
 * GET /api/admin/portal/applications
 *
 * Unified applications list: business sponsor applications (bookings) and
 * university sponsorship applications (Scholarly Edition), merged and sorted
 * by created date. Query: ?kind=business|university&status=pending|...&limit&offset
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

    const { kind, status } = req.query || {};
    if (kind && !['business', 'university'].includes(kind)) {
      return res.status(400).json({ error: "kind must be 'business' or 'university'" });
    }
    const { limit, offset } = parseLimitOffset(req);

    return res.json(await getPortalService().listApplications({ kind, status, limit, offset }));
  } catch (err) {
    sendError(res, err);
  }
};
