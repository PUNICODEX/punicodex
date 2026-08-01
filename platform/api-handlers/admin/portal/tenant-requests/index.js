/**
 * GET /api/admin/portal/tenant-requests
 *
 * Tenant change-request approval queue (sponsor creative swaps, patron
 * social-link changes). Ops permission (superadmin/ops). Optional
 * ?status=pending|approved|rejected&limit=&offset= filters; defaults to the
 * pending queue.
 */

const {
  setPortalCors,
  sendError,
  parseLimitOffset,
  portalAuth,
} = require('../../../../../api/admin/portal/_portal.js');
const tenantPortal = require('../../../../api/tenant-portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'ops');
    if (!auth) return;

    const { status } = req.query || {};
    const { limit, offset } = parseLimitOffset(req);
    return res.json(
      await tenantPortal.adminListChangeRequests({ status: status || 'pending', limit, offset })
    );
  } catch (err) {
    sendError(res, err);
  }
};
