/**
 * POST /api/admin/portal/users/:id/disable
 *
 * Superadmin-only. Disables the account and destroys all of its sessions
 * immediately.
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  portalAuth,
} = require('../../../../../../../api/admin/portal/_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'users');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid user id' });

    const user = await portalAuth.disableUser(id, auth);
    return res.json({ user });
  } catch (err) {
    sendError(res, err);
  }
};
