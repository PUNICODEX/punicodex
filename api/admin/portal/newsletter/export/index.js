/**
 * GET /api/admin/portal/newsletter/export
 *
 * Full subscriber export as a CSV attachment. Bulk PII exfiltration is
 * gated stricter than the list: leasing role (superadmin + leasing) only.
 * Cells are escaped against spreadsheet formula injection by the service.
 */

const { setPortalCors, sendError, portalAuth, getPortalService } = require('../../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const service = getPortalService();
    const rows = await service.listAllNewsletterSubscribers();
    const csv = service.newsletterSubscribersToCsv(rows);

    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="newsletter-${stamp}.csv"`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(csv);
  } catch (err) {
    sendError(res, err);
  }
};
