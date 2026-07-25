/**
 * POST /api/admin/portal/bookings/:id/reject
 *
 * Leasing permission. Rejects the booking with a reviewer note (status →
 * rejected; the note is emailed to the advertiser). Body: { note? }.
 * Audit rows record the portal user.
 */

const { setPortalCors, sendError, parseIdParam, portalAuth } = require('../../../_portal.js');
const { rejectBooking } = require('../../../../../../platform/api/admin-booking-service.js');

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
    return res.json(await rejectBooking(id, note, auth));
  } catch (err) {
    sendError(res, err);
  }
};
