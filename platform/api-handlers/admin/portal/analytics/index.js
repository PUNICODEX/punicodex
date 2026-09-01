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
  getQuarterlyOverview,
  getTrendMetrics,
  getCrossTempleFlows,
  exportAnalyticsCsv,
} = require('../../../../api/site-analytics.js');

/**
 * GET /api/admin/portal/analytics/?mode=rolling|quarter|cross|export&...
 *
 * Portal-native deep analytics: traffic overview (human/bot/uniques, by-day,
 * top temples, referrers, devices), engagement (visible time, scroll depth,
 * per-temple attention leaders), session depth (pages/session, bounce),
 * quarterly roll-ups with quarter-over-quarter comparison, trend/momentum
 * metrics, and cross-temple navigation flows.
 *
 * Query parameters:
 *   mode=rolling|quarter|cross|export   (default: rolling)
 *   days=7|30|90|120                    rolling/cross/export window (default: 30)
 *   temple=<id>                         scope to a single temple
 *   quarter=2026-Q3                     quarter mode target
 *   compare=1                           include previous period / previous quarter
 *   format=csv                          export format (only csv supported)
 *   type=overview|daily|temples|referrers|flows|quarterly  export slice
 *
 * All data comes from the first-party beacon pipeline — aggregated, hashed,
 * and consent-gated at collection time. Permission: read.
 */

function parseDays(value) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return 30;
  return Math.min(120, Math.max(1, n));
}

function parseQuarter(value) {
  if (typeof value !== 'string' || !value) return null;
  const m = value.match(/^(\d{4})-Q([1-4])$/);
  return m ? value : null;
}

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const auth = await portalAuth.requirePortal(req, res, 'read');
    if (!auth) return;

    const mode = req.query.mode || 'rolling';
    const days = parseDays(req.query.days);
    const temple =
      typeof req.query.temple === 'string' && req.query.temple ? req.query.temple : null;
    const quarter = parseQuarter(req.query.quarter);
    const compare = req.query.compare === '1' || req.query.compare === 'true';

    // CSV export is served as text/csv with a download filename.
    if (mode === 'export') {
      const type = req.query.type || 'overview';
      const csv = await exportAnalyticsCsv({
        mode: type,
        days,
        templeId: temple,
        yearQuarter: quarter,
      });
      const filename = `punicodex-analytics-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    }

    if (mode === 'quarter') {
      const targetQuarter =
        quarter ||
        (() => {
          const d = new Date();
          const y = d.getUTCFullYear();
          const q = Math.ceil((d.getUTCMonth() + 1) / 3);
          return `${y}-Q${q}`;
        })();
      const prev = compare
        ? (() => {
            const [y, q] = targetQuarter
              .split('-Q')
              .map((x, i) => (i === 0 ? parseInt(x, 10) : parseInt(x, 10)));
            if (q === 1) return `${y - 1}-Q4`;
            return `${y}-Q${q - 1}`;
          })()
        : null;
      const overview = await getQuarterlyOverview({
        yearQuarter: targetQuarter,
        templeId: temple,
        compareWith: prev,
      });
      return res.json({
        mode: 'quarter',
        quarter: targetQuarter,
        overview,
        generatedAt: new Date().toISOString(),
      });
    }

    if (mode === 'cross') {
      const crossTemple = await getCrossTempleFlows({ days, templeId: temple, limit: 25 });
      return res.json({
        mode: 'cross',
        days,
        crossTemple,
        generatedAt: new Date().toISOString(),
      });
    }

    // Default rolling mode.
    const [overview, engagement, depth, trends] = await Promise.all([
      temple ? getTempleTraffic(temple, { days }) : getOverview({ days }),
      getEngagementStats({ days }),
      getSessionDepth({ days }),
      compare ? getTrendMetrics({ days, templeId: temple }) : Promise.resolve(null),
    ]);

    return res.json({
      mode: 'rolling',
      days,
      overview,
      engagement,
      depth, // null when the active storage driver cannot compute it
      trends,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    sendError(res, err);
  }
};
