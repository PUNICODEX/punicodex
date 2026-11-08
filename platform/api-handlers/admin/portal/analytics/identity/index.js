const {
  setPortalCors,
  sendError,
  portalAuth,
} = require('../../../../../../api/admin/portal/_portal.js');
const { getIdentityAnalytics } = require('../../../../../api/identity-analytics.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const auth = await portalAuth.requirePortal(req, res, 'read');
    if (!auth) return;
    return res.json(await getIdentityAnalytics({ days: req.query?.days || 30 }));
  } catch (err) {
    sendError(res, err);
  }
};
