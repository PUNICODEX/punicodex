const { getDashboard } = require('../../../platform/api/ad-analytics');
const { handleError, setCors } = require('../../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    await getDashboard(req.query.token, res);
  } catch (err) {
    handleError(res, err);
  }
};
