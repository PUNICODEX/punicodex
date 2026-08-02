/**
 * POST /api/admin/api-keys/:id/revoke
 */

const {
  setCors,
  requireAdmin,
  handleError,
  getRouteParam,
} = require('../../../../../api/_utils.js');
const { revokeKey } = require('../../../../api/api-key-admin.js');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const id = parseInt(getRouteParam(req, 'id'), 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid key id' });

    const key = await revokeKey(id, req.adminActor);
    if (!key) return res.status(404).json({ error: 'Key not found' });
    return res.json({ success: true, key });
  } catch (err) {
    handleError(res, err);
  }
};
