const {
  getTenantAd,
  updateTenantAd,
  deleteTenantAd,
} = require('../../../../api/tenant-ads-service');
const { handleError, setCors, requireAdmin } = require('../../../../../api/_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    if (req.method === 'GET') {
      const ad = getTenantAd(id);
      if (!ad) return res.status(404).json({ error: 'Tenant ad not found' });
      return res.json(ad);
    }

    if (req.method === 'PATCH' || req.method === 'PUT') {
      if (!(await requireAdmin(req, res))) return;
      const ad = updateTenantAd(id, req.body);
      if (!ad) return res.status(404).json({ error: 'Tenant ad not found' });
      return res.json(ad);
    }

    if (req.method === 'DELETE') {
      if (!(await requireAdmin(req, res))) return;
      deleteTenantAd(id);
      return res.status(204).end();
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
