/**
 * POST /api/admin/portal/scholars/:kind/:id/reject
 *
 * kind=edit|media. Scholars role. Body (edit): { comment?, status?:
 * 'rejected'|'needs_revision' }.
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
    if (!['edit', 'media'].includes(kind)) {
      return res.status(400).json({ error: "kind must be 'edit' or 'media'" });
    }

    const auth = await portalAuth.requirePortal(req, res, 'scholars');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid item id' });

    return res.json(await getPortalService().rejectScholarItem(kind, id, auth, req.body || {}));
  } catch (err) {
    sendError(res, err);
  }
};
