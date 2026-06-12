const { didYouMean } = require('../../../platform/api/query-intel');
const { handleError, setCors } = require('../../_utils');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const q = req.query.q || '';
    const limit = parseInt(req.query.limit, 10) || 3;
    const suggestions = didYouMean(q, limit);
    res.json({ suggestions });
  } catch (err) {
    handleError(res, err);
  }
};
