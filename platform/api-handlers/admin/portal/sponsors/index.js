/**
 * /api/admin/portal/sponsors
 *
 * Leasing permission (superadmin/leasing). Sponsorship-scouting prospects —
 * businesses matched to flagship temples by the scouting ecosystem, ready
 * for the founding-frame pitch emails.
 *
 * GET — { items, total, byStatus, byTemple }
 */

const {
  setPortalCors,
  sendError,
  portalAuth,
} = require('../../../../../api/admin/portal/_portal.js');
const prospects = require('../../../../db/business-prospects.js');
const { loadTemple } = require('../../../../api/pitch-email.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const status =
      typeof req.query?.status === 'string' && req.query.status.trim()
        ? req.query.status.trim()
        : null;
    const templeId =
      typeof req.query?.temple === 'string' && req.query.temple.trim()
        ? req.query.temple.trim()
        : null;
    const items = await prospects.listProspects({
      status: status || undefined,
      templeId: templeId || undefined,
    });
    const byStatus = {};
    const byTemple = {};
    for (const p of items) {
      byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      byTemple[p.temple_id] = (byTemple[p.temple_id] || 0) + 1;
    }

    return res.json({
      items: items.map((p) => ({
        id: p.id,
        templeId: p.temple_id,
        templeLabel: loadTemple(p.temple_id)?.unicode || p.temple_id,
        businessName: p.business_name,
        domain: p.domain,
        industrySeat: p.industry_seat,
        industryName: p.industry_name,
        contactEmail: p.contact_email,
        status: p.status,
        source: p.source,
        score: p.score,
        signals: safeParse(p.signals),
        pitchCount: p.pitch_count,
        lastPitchedAt: p.last_pitched_at,
        codeId: p.code_id,
      })),
      total: items.length,
      byStatus,
      byTemple,
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
