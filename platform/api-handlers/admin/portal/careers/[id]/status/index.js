/**
 * POST /api/admin/portal/careers/:id/status
 *
 * Triage flow for a careers application: pending → contacted → closed
 * (any transition between the three is accepted; the audit trail records
 * from/to). Leasing-gated like the queue list.
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  portalAuth,
  getPortalService,
} = require('../../../../../../../api/admin/portal/_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid application id' });

    const { status } = req.body || {};
    return res.json(await getPortalService().setCareerApplicationStatus(id, status, auth));
  } catch (err) {
    sendError(res, err);
  }
};
