const { searchV2 } = require('../../../platform/api/search-v2');
const { handleError, setCors } = require('../../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { q, vertical, sort, limit, cursor, pantheon, tier, unicodeOnly, concept } = req.query;

    const result = await searchV2(
      q,
      {
        vertical,
        sort,
        limit,
        cursor,
        pantheon,
        tier,
        unicodeOnly,
        concept,
      },
      req
    );

    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};
