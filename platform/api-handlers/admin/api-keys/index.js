/**
 * /api/admin/api-keys
 * GET — list keys + stats
 * POST — create key
 */

const { setCors, requireAdmin, handleError } = require('../../../../api/_utils.js');
const { listKeys, createKey, getKeyStats } = require('../../../api/api-key-admin.js');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method === 'GET') {
      return res.json({ keys: await listKeys(), stats: await getKeyStats() });
    }
    if (req.method === 'POST') {
      const { name, tier, scopes, rateLimit } = req.body || {};
      const key = await createKey({ name, tier, scopes, rateLimit });
      return res.status(201).json({ success: true, key });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
