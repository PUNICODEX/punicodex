const { getFlagships } = require('../../../api/search');
const { handleError, setCors } = require('../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await checkPublicRateLimitByReq(req, res, 'api-flagships');
  if (!allowed) return;

  try {
    res.json(getFlagships());
  } catch (err) {
    handleError(res, err);
  }
};
