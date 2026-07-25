/**
 * GET /api/admin/portal/tenants
 *
 * Leasing permission (superadmin/ops/leasing). Tenants directory: every
 * tenant_account augmented with its ownership linkage (owned temple slugs
 * from bookings, patron temple ids, booking/patron counts, last login).
 * Read-only. Query: ?limit=&offset= → { items, total, limit, offset }.
 */

const { setPortalCors, sendError, parseLimitOffset, portalAuth } = require('../_portal.js');
const tenantPortal = require('../../../../platform/api/tenant-portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const { limit, offset } = parseLimitOffset(req);
    return res.json(await tenantPortal.adminListTenants({ limit, offset }));
  } catch (err) {
    sendError(res, err);
  }
};
