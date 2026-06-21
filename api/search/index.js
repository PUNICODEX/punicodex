const { search } = require('../../platform/api/search');
const { handleError, setCors } = require('../_utils');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { q, pantheon, tier, hasSite, type, sort, limit, offset, trust } = req.query;
    const result = search({
      q,
      pantheon,
      tier,
      hasSite,
      type: type || 'all',
      sort: sort || 'relevance',
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
      trust: trust || 'safe',
    });
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};
