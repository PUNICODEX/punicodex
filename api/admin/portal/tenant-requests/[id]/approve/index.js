/**
 * POST /api/admin/portal/tenant-requests/:id/approve
 *
 * Ops permission (superadmin/ops). Applies the requested change to the real
 * record (booking creative swap / patron social links) inside a transaction
 * and marks the request reviewed. Body: { note? }.
 */

const { setPortalCors, sendError, parseIdParam, portalAuth } = require('../../../_portal.js');
const tenantPortal = require('../../../../../../platform/api/tenant-portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'ops');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid request id' });

    const { note } = req.body || {};
    const request = await tenantPortal.reviewChangeRequest(id, 'approve', {
      note,
      reviewer: auth,
    });
    return res.json({ request });
  } catch (err) {
    sendError(res, err);
  }
};
