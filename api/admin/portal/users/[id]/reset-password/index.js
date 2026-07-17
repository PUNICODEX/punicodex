/**
 * POST /api/admin/portal/users/:id/reset-password
 *
 * Superadmin-only. Sets a one-time temp password (returned exactly once),
 * marks the account temp_password=1, and destroys all of its sessions.
 */

const { setPortalCors, sendError, parseIdParam, portalAuth } = require('../../../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'users');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid user id' });

    const result = await portalAuth.resetPassword(id, auth);
    return res.json(result);
  } catch (err) {
    sendError(res, err);
  }
};
