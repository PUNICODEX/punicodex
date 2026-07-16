const { trackClick } = require('../../../platform/api/ad-analytics');
const { handleError, setCors } = require('../../_utils');
const { checkPublicRateLimitByReq } = require('../../../platform/api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).send('Method not allowed');

  if (!(await checkPublicRateLimitByReq(req, res, 'analytics-click'))) {
    return;
  }

  try {
    await trackClick(req.query.b, req.query.url, req, res);
  } catch (err) {
    handleError(res, err);
  }
};
