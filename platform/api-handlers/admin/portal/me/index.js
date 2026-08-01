/**
 * GET /api/admin/portal/me
 *
 * Identity + role + permission set for the current portal session.
 */

const {
  setPortalCors,
  sendError,
  portalAuth,
} = require('../../../../../api/admin/portal/_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'read');
    if (!auth) return;
    return res.json({
      user: auth.user,
      role: auth.role,
      permissions: portalAuth.ROLE_PERMISSIONS[auth.role] || [],
    });
  } catch (err) {
    sendError(res, err);
  }
};
