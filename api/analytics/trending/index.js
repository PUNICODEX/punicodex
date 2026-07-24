const { getTrending } = require('../../../platform/api/site-analytics');
const { setCors } = require('../../_utils');
const { checkPublicRateLimitByReq } = require('../../../platform/api/public-rate-limiter');

/**
 * GET /api/analytics/trending/?days=7&limit=20
 *
 * Public, privacy-safe popularity aggregates: human page-view counts per
 * temple and per path. Counts only — no sessions, no referrers, nothing
 * per-visitor. Cached server-side for 10 minutes by the service.
 */
module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await checkPublicRateLimitByReq(req, res, 'analytics-trending'))) {
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=300');
  try {
    const data = await getTrending({ days: req.query.days, limit: req.query.limit });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[site-analytics] trending failed:', err.message);
    return res.status(200).json({
      success: true,
      data: { periodDays: 7, generatedAt: new Date().toISOString(), temples: [], pages: [] },
    });
  }
};
