/**
 * POST /api/admin/portal/scholars/:kind/:id/approve
 *
 * kind=edit|media. Scholars role. Acts as curator through the Scholars
 * service layer; the portal user is recorded in the admin audit trail.
 * Body (edit): { comment? }.
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
    if (!['edit', 'media'].includes(kind)) {
      return res.status(400).json({ error: "kind must be 'edit' or 'media'" });
    }

    const auth = await portalAuth.requirePortal(req, res, 'scholars');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid item id' });

    return res.json(await portalService.approveScholarItem(kind, id, auth, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
};
