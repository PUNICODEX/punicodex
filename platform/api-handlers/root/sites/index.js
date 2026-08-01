const { getSites } = require('../../platform/api/crawler-db');
const { handleError, setCors } = require('../_utils');
const { checkPublicRateLimitByReq } = require('../../platform/api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await checkPublicRateLimitByReq(req, res, 'api-sites');
  if (!allowed) return;

  try {
    const { status, pantheon, entryId, trust, limit, offset } = req.query;
    res.json(
      getSites({
        status,
        pantheon,
        entryId,
        trust,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      })
    );
  } catch (err) {
    handleError(res, err);
  }
};
