/**
 * GET /api/admin/observability
 *
 * Operational metrics for administrators. Requires a valid admin token.
 */

const {
  getMetrics,
  getTopSearches,
  getSlowEndpoints,
  getHealthSummary,
  getRecentRequests,
} = require('../../../platform/api/observability-service.js');
const { handleError, setCors, requireAdmin } = require('../../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!(await requireAdmin(req, res))) return;

    const hours = Math.min(parseInt(req.query.hours || '24', 10), 168);
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 100);

    const [metrics, topSearches, slowEndpoints, health, recentRequests] = await Promise.all([
      getMetrics({ hours }),
      getTopSearches({ hours, limit }),
      getSlowEndpoints({ hours, limit }),
      getHealthSummary(),
      getRecentRequests({ hours, limit }),
    ]);

    res.json({
      success: true,
      data: {
        health,
        metrics,
        topSearches,
        slowEndpoints,
        recentRequests,
      },
      meta: {
        windowHours: hours,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    handleError(res, err);
  }
};
