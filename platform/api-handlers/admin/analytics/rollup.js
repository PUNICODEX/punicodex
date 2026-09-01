/**
 * POST /api/admin/analytics/rollup
 *
 * On-demand materialization of analytics rollups. Mirrors the daily cron job
 * but is gated by a portal admin session with ops permission.
 */

const { setPortalCors, sendError, portalAuth } = require('../../../../api/admin/portal/_portal.js');
const { materializeAllRollups } = require('../../../api/analytics-rollups.js');

function parseDays(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(120, Math.max(1, n));
}

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'ops');
    if (!auth) return;

    const days = parseDays(req.body?.days ?? req.query?.days);
    const materialized = await materializeAllRollups({ days });

    return res.json({
      ok: true,
      materialized,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    sendError(res, err);
  }
};
