/**
 * GET|POST /api/admin/portal/users
 *
 * Superadmin-only portal user management. POST creates a user; when no
 * password is supplied a one-time temp password is generated and returned
 * exactly once.
 */

const { setPortalCors, sendError, portalAuth } = require('../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await portalAuth.requirePortal(req, res, 'users');
    if (!auth) return;

    if (req.method === 'GET') {
      return res.json({ items: await portalAuth.listUsers() });
    }

    if (req.method === 'POST') {
      const { email, password, displayName, role } = req.body || {};
      const result = await portalAuth.createUser({ email, password, displayName, role }, auth);
      return res.status(201).json(result);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    sendError(res, err);
  }
};
