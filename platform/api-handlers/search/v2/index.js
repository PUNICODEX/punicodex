const { searchV2 } = require('../../../api/search-v2');
const { handleError, setCors } = require('../../../../api/_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { q, vertical, sort, limit, cursor, pantheon, tier, unicodeOnly, hasSite, concept } =
      req.query;

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
        hasSite,
        concept,
      },
      req
    );

    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
};
