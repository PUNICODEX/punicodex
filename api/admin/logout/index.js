const { revokeToken } = require('../../../platform/api/admin');
const { handleError, setCors } = require('../../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const token = req.headers['x-admin-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await revokeToken(token);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
};
