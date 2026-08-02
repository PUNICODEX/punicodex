const {
  setPortalCors,
  sendError,
  portalAuth,
} = require('../../../../../api/admin/portal/_portal.js');
const {
  getOverview,
  getEngagementStats,
  getSessionDepth,
  getTempleTraffic,
} = require('../../../../api/site-analytics.js');

/**
 * GET /api/admin/portal/analytics/?days=30&temple=<id>
 *
 * Portal-native deep analytics: traffic overview (human/bot/uniques, by-day,
 * top temples, referrers, devices), engagement (visible time, scroll depth,
 * per-temple attention leaders), and session depth (pages/session, bounce).
 * All data comes from the first-party beacon pipeline — aggregated, hashed,
 * and consent-gated at collection time. Permission: read.
 */
module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const auth = await portalAuth.requirePortal(req, res, 'read');
    if (!auth) return;

    const days = req.query.days;
    const temple =
      typeof req.query.temple === 'string' && req.query.temple ? req.query.temple : null;

    const [overview, engagement, depth] = await Promise.all([
      temple ? getTempleTraffic(temple, { days }) : getOverview({ days }),
      getEngagementStats({ days }),
      getSessionDepth({ days }),
    ]);

    return res.json({
      overview,
      engagement,
      depth, // null when the active storage driver cannot compute it
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    sendError(res, err);
  }
};
