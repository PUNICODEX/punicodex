const { recordTenantAdEvent } = require('../../../../../api/tenant-ads-service');
const { handleError, setCors, getRouteParam } = require('../../../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../../../api/public-rate-limiter');
const { getClientIp } = require('../../../../../api/client-ip');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // This endpoint is unauthenticated by design (a browser reports its own
    // impressions), so a rate limit is the only thing standing between it and
    // fabricated ad metrics.
    if (!(await checkPublicRateLimitByReq(req, res, 'tenant-ad-analytics'))) return;

    // Vercel never populates req.params — the catch-all router restores
    // bracket segments into req.query. Reading req.params.id threw a
    // TypeError on every request, so no impression or click was ever recorded.
    const id = parseInt(getRouteParam(req, 'id'), 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    const { eventType } = req.body || {};
    if (!['impression', 'click'].includes(eventType)) {
      return res.status(400).json({ error: 'eventType must be impression or click' });
    }

    const ip = getClientIp(req);
    recordTenantAdEvent({
      tenantAdId: id,
      eventType,
      ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer,
    });

    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
};
