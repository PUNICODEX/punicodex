/**
 * POST /api/admin/portal/applications/:kind/:id/reject
 *
 * kind=business → leasing role; kind=university → scholars role.
 * Body: { note?, reviewComment? }.
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  getRouteParam,
  portalAuth,
  portalService,
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

    return res.json(await portalService.rejectApplication(kind, id, auth, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
};
