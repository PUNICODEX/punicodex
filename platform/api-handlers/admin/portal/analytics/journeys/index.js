/**
 * GET /api/admin/portal/analytics/journeys/?days=7
 *
 * The nervous-system read: journey flows, entry pages, attribution,
 * surface conversion, dwell, session samples, bot overview — human-only by
 * contract, bots reported separately for security context. Read permission.
 */

const {
  setPortalCors,
  sendError,
  portalAuth,
} = require('../../../../../../api/admin/portal/_portal.js');
const journeys = require('../../../../../api/analytics-journeys.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'read');
    if (!auth) return;

    const days = Math.min(Math.max(Number(req.query?.days) || 7, 1), 90);
    const [flows, top, entries, attr, surfaces, dwell, samples, bots] = await Promise.all([
      journeys.journeyFlows({ days }),
      journeys.topJourneys({ days }),
      journeys.entryPages({ days }),
      journeys.attribution({ days }),
      journeys.surfaceAttribution({ days }),
      journeys.dwellByPath({ days }),
      journeys.sessionSamples({ days: Math.min(days, 3) }),
      journeys.botOverview({ days }),
    ]);

    return res.json({
      days,
      flows,
      topJourneys: top,
      entryPages: entries,
      attribution: attr,
      surfaceAttribution: surfaces,
      dwellByPath: dwell,
      sessionSamples: samples,
      botOverview: bots,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    sendError(res, err);
  }
};
