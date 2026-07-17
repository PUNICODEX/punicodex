/**
 * POST /api/admin/portal/logout
 *
 * Destroys the caller's portal session.
 */

const { setPortalCors, sendError, portalAuth } = require('../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, null);
    if (!auth) return;
    await portalAuth.logout(req.headers['x-admin-token']);
    return res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
};
