/**
 * POST /api/admin/portal/applications/:kind/:id/approve
 *
 * kind=business → leasing role; delegates to the admin booking approve flow.
 * kind=university → scholars role; delegates to the Scholars sponsorship
 * service layer (provisions institution + inst_admin with a one-time temp
 * password, returned exactly once).
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  getRouteParam,
  portalAuth,
  getPortalService,
} = require('../../../../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const kind = getRouteParam(req, 'kind');
    if (!['business', 'university'].includes(kind)) {
      return res.status(400).json({ error: "kind must be 'business' or 'university'" });
    }
    const permission = kind === 'business' ? 'leasing' : 'scholars';

    const auth = await portalAuth.requirePortal(req, res, permission);
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid application id' });

    return res.json(await getPortalService().approveApplication(kind, id, auth, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
};
