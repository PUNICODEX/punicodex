/**
 * /api/admin/portal/bookings
 *
 * Leasing permission (superadmin/ops/leasing).
 *
 * GET  — paged booking roster for the Leasing section. Query:
 *        ?status=pending_application|pending_payment|pending_upload|
 *               pending_approval|approved|live|trialing|ended|cancelled|rejected
 *        &temple=<site_slug>&search=<email/company>&limit=&offset=
 *        → { items, total, stats, revenue, limit, offset }.
 * POST — admin-create a booking (pass-through to the admin booking service;
 *        body validated there → pending_upload). Audit rows record the
 *        portal user.
 */

const {
  setPortalCors,
  sendError,
  parseLimitOffset,
  portalAuth,
} = require('../../../../../api/admin/portal/_portal.js');
const adminBookings = require('../../../../api/admin-booking-service.js');

const BOOKING_STATUSES = new Set([
  'pending_application',
  'pending_payment',
  'pending_upload',
  'pending_approval',
  'approved',
  'live',
  'trialing',
  'ended',
  'cancelled',
  'rejected',
]);

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await portalAuth.requirePortal(req, res, 'leasing');
    if (!auth) return;

    if (req.method === 'GET') {
      const { status, temple, search, email } = req.query || {};
      if (status && !BOOKING_STATUSES.has(status)) {
        return res
          .status(400)
          .json({ error: `status must be one of: ${[...BOOKING_STATUSES].join(', ')}` });
      }
      const { limit, offset } = parseLimitOffset(req);
      return res.json(
        await adminBookings.listBookingsPortal({
          status: status || null,
          site: temple || null,
          search: search || email || null,
          limit,
          offset,
        })
      );
    }

    const result = await adminBookings.createBookingAdmin(req.body || {}, auth);
    return res.status(201).json(result);
  } catch (err) {
    sendError(res, err);
  }
};
