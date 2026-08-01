const { trackViewability } = require('../../../api/ad-analytics');
const { handleError, setCors } = require('../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await checkPublicRateLimitByReq(req, res, 'analytics-pixel'))) {
    return;
  }

  try {
    const { token, visibleSeconds, visiblePercent, slotSlug, slot } = req.body || {};
    await trackViewability(token, visibleSeconds, visiblePercent, req, res, slotSlug || slot);
  } catch (err) {
    handleError(res, err);
  }
};
