/**
 * POST /api/admin/portal/bookings/:id/approve-live
 *
 * Leasing permission. One-step creative review for the Creative Review
 * queue: approves the creative (status → approved, approval audit + email),
 * then publishes it (status → live; starts the trial clock when the lease
 * has trial months). Audit rows record the portal user.
 */

const {
  setPortalCors,
  sendError,
  parseIdParam,
  portalAuth,
} = require('../../../../../../../api/admin/portal/_portal.js');
const { approveAndGoLive } = require('../../../../../../api/admin-booking-service.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    const id = parseIdParam(req);
    if (id == null) return res.status(400).json({ error: 'Invalid booking id' });

    const { note } = req.body || {};
    return res.json(await approveAndGoLive(id, note, auth));
  } catch (err) {
    sendError(res, err);
  }
};
