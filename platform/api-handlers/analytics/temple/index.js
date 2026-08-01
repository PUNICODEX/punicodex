const { getTempleAnalytics } = require('../../../api/site-analytics');
const { setCors } = require('../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../api/public-rate-limiter');

/**
 * GET /api/analytics/temple/?temple=<id>&days=30
 *
 * Public per-temple analytics for the trending drill-down page: views over
 * time, unique sessions, attention time, countries, referrers, sub-pages,
 * devices, and "also visited" sister temples. Aggregates only — nothing
 * per-visitor is ever served. Unknown/invalid temple ids return an empty
 * analytics envelope (not an error), so the page can show its empty state.
 */
module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await checkPublicRateLimitByReq(req, res, 'analytics-temple'))) {
    return;
  }

  res.setHeader('Cache-Control', 'public, max-age=120');
  try {
    const data = await getTempleAnalytics(req.query.temple, { days: req.query.days });
    if (!data) {
      return res.status(200).json({
        success: true,
        data: {
          templeId: null,
          periodDays: 30,
          generatedAt: new Date().toISOString(),
          totals: { views: 0, uniqueSessions: 0, avgVisibleMs: 0, engagementDays: 0 },
          byDay: [],
          countries: null,
          referrers: null,
          subPages: null,
          devices: null,
          alsoVisited: null,
        },
      });
    }
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error('[site-analytics] temple analytics failed:', err.message);
    return res.status(200).json({
      success: true,
      data: {
        templeId: null,
        periodDays: 30,
        generatedAt: new Date().toISOString(),
        totals: { views: 0, uniqueSessions: 0, avgVisibleMs: 0, engagementDays: 0 },
        byDay: [],
        countries: null,
        referrers: null,
        subPages: null,
        devices: null,
        alsoVisited: null,
      },
    });
  }
};
