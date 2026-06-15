/**
 * PATCH /api/admin/api-keys/:id
 */

const { setCors, requireAdmin, handleError } = require('../../../../api/_utils.js');
const { updateKey } = require('../../../../platform/api/api-key-admin.js');

function getId(req) {
  return req.query?.id || req.params?.id || req.url.split('/').pop().split('?')[0];
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method !== 'PATCH') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    const id = parseInt(getId(req), 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid key id' });

    const { name, tier, scopes, rateLimit } = req.body || {};
    const key = updateKey(id, { name, tier, scopes, rateLimit });
    if (!key) return res.status(404).json({ error: 'Key not found' });
    return res.json({ success: true, key });
  } catch (err) {
    handleError(res, err);
  }
};
