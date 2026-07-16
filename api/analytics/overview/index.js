/**
 * /api/analytics/overview
 * GET — site-wide (or per-temple, with ?temple=<id>) traffic overview.
 * Admin-only.
 */

const { setCors, requireAdmin, handleError } = require('../../_utils');
const { getOverview, getTempleTraffic } = require('../../../platform/api/site-analytics');

function parseDays(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(90, Math.max(1, n));
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await requireAdmin(req, res))) return;

  try {
    const days = parseDays(req.query?.days);
    const temple =
      typeof req.query?.temple === 'string' && req.query.temple ? req.query.temple : null;
    const data = temple ? await getTempleTraffic(temple, { days }) : await getOverview({ days });
    res.json({ success: true, data });
  } catch (err) {
    handleError(res, err);
  }
};
