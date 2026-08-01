const {
  listTenantAds,
  createTenantAd,
  findTenantAdsForQuery,
} = require('../../../api/tenant-ads-service');
const { handleError, setCors, requireAdmin } = require('../../../../api/_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      const { q, entryId, status, limit, offset } = req.query;
      if (q) {
        return res.json({
          results: findTenantAdsForQuery(q, { limit: limit ? parseInt(limit, 10) : 3 }),
        });
      }
      return res.json(
        listTenantAds({
          entryId,
          status,
          limit: limit ? parseInt(limit, 10) : 50,
          offset: offset ? parseInt(offset, 10) : 0,
        })
      );
    }

    if (req.method === 'POST') {
      if (!(await requireAdmin(req, res))) return;
      const ad = createTenantAd(req.body);
      return res.status(201).json(ad);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
