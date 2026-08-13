const {
  setPortalCors,
  sendError,
  portalAuth,
} = require('../../../../../api/admin/portal/_portal.js');
const { getSecurityOverview } = require('../../../../api/security-overview.js');

/**
 * GET /api/admin/portal/security/
 *
 * Live attack/abuse telemetry for the Security tab: request-log error
 * volumes and top attacked paths/sources, login-failure audit counts,
 * authenticity/spoof posture, CSP violation reports, and the deployed
 * security-header posture. Permission: ops.
 */
module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const auth = await portalAuth.requirePortal(req, res, 'ops');
    if (!auth) return;

    return res.json(await getSecurityOverview());
  } catch (err) {
    sendError(res, err);
  }
};
