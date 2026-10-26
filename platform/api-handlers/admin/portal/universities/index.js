/**
 * /api/admin/portal/universities
 *
 * Scholars permission (superadmin/scholars). University outreach prospects —
 * the seed/crawl pipeline that feeds the partnership pitch emails.
 *
 * GET — { items, total, byStatus }
 */

const {
  setPortalCors,
  sendError,
  portalAuth,
} = require('../../../../../api/admin/portal/_portal.js');
const prospects = require('../../../../db/university-prospects.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'scholars');
    if (!auth) return;

    const status =
      typeof req.query?.status === 'string' && req.query.status.trim()
        ? req.query.status.trim()
        : null;
    const items = await prospects.listProspects({ status: status || undefined });
    const byStatus = {};
    for (const p of items) byStatus[p.status] = (byStatus[p.status] || 0) + 1;

    return res.json({
      items: items.map((p) => ({
        id: p.id,
        institutionName: p.institution_name,
        slug: p.slug,
        country: p.country,
        state: p.state,
        domain: p.domain,
        departments: safeParse(p.departments),
        contactEmail: p.contact_email,
        status: p.status,
        source: p.source,
        pitchCount: p.pitch_count,
        lastPitchedAt: p.last_pitched_at,
      })),
      total: items.length,
      byStatus,
    });
  } catch (err) {
    sendError(res, err);
  }
};

function safeParse(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
