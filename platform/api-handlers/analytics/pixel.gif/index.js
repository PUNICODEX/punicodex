const { trackPixel } = require('../../../api/ad-analytics');
const { handleError, setCors } = require('../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  if (!(await checkPublicRateLimitByReq(req, res, 'analytics-pixel'))) {
    return;
  }

  try {
    await trackPixel(req.query.b, req, res, req.query.slot);
  } catch (err) {
    handleError(res, err);
  }
};
