const { trackPixel } = require('../../../../platform/api/ad-analytics');
const { handleError, setCors } = require('../../../_utils');
const { checkPublicRateLimitByReq } = require('../../../../platform/api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  if (!(await checkPublicRateLimitByReq(req, res, 'analytics-pixel'))) {
    return;
  }

  try {
    await trackPixel(req.query.b, req, res);
  } catch (err) {
    handleError(res, err);
  }
};
