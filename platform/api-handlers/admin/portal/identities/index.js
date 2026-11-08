const {
  setPortalCors,
  sendError,
  parseLimitOffset,
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
    const { limit, offset } = parseLimitOffset(req);
    return res.json(
      await identity.adminListAccounts({
        search: req.query?.search || '',
        limit,
        offset,
      })
    );
  } catch (err) {
    sendError(res, err);
  }
};
