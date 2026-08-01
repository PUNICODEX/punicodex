/**
 * GET /api/admin/portal/careers
 *
 * Careers application queue (submissions from /careers/) with
 * ?status=pending|contacted|closed and ?limit=&offset= pagination.
 * Leasing-gated: applicant PII sits in the same queue family as bookings.
 */

const {
  setPortalCors,
  sendError,
  parseLimitOffset,
  portalAuth,
  getPortalService,
} = require('../../../../../api/admin/portal/_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const { status } = req.query || {};
    const { limit, offset } = parseLimitOffset(req);
    return res.json(await getPortalService().listCareerApplications({ status, limit, offset }));
  } catch (err) {
    sendError(res, err);
  }
};
