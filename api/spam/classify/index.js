const { classifySite } = require('../../../platform/api/spam-classifier');
const { handleError, setCors, requireAdmin } = require('../../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method === 'POST') {
      const { punycode } = req.body || {};
      if (!punycode) {
        return res.status(400).json({ error: 'punycode is required' });
      }
      const result = classifySite(punycode);
      if (!result) return res.status(404).json({ error: 'Site not found' });
      return res.json(result);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
