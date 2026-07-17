/**
 * POST /api/admin/portal/me/password
 *
 * Self-service password change. Destroys every session of the caller
 * (including the current one) so the user signs in again with the new
 * password. Clears the one-time temp-password flag.
 */

const { setPortalCors, sendError, portalAuth } = require('../../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, null);
    if (!auth) return;
    const { currentPassword, newPassword } = req.body || {};
    const result = await portalAuth.changePassword(auth.user.id, { currentPassword, newPassword });
    return res.json(result);
  } catch (err) {
    sendError(res, err);
  }
};
