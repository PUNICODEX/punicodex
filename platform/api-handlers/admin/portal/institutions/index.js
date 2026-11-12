const {
  setPortalCors,
  sendError,
  portalAuth,
} = require('../../../../../api/admin/portal/_portal.js');
const identity = require('../../../../api/identity.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const auth = await portalAuth.requirePortal(req, res, 'users');
    if (!auth) return;
    return res.json({ items: await identity.adminListInstitutions() });
  } catch (err) {
    sendError(res, err);
  }
};
