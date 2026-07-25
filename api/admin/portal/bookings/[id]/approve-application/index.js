/**
 * POST /api/admin/portal/bookings/:id/approve-application
 *
 * Leasing permission. Approves a sponsor application: creates the Stripe
 * checkout session (returned as stripeUrl for the Leasing page modal) and
 * moves the booking to pending_payment. Audit rows record the portal user.
 */

const { setPortalCors, sendError, parseIdParam, portalAuth } = require('../../../_portal.js');
const { approveApplication } = require('../../../../../../platform/api/admin-booking-service.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid booking id' });

    return res.json(await approveApplication(id, auth));
  } catch (err) {
    sendError(res, err);
  }
};
