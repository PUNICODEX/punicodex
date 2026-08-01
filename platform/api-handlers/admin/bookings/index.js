/**
 * /api/admin/bookings
 * GET — list bookings + stats
 * POST — create a booking as admin
 */

const { setCors, requireAdmin, handleError } = require('../../../../api/_utils.js');
const { listBookings, createBookingAdmin } = require('../../../api/admin-booking-service.js');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method === 'GET') {
      const { status, site } = req.query || {};
      return res.json(await listBookings({ status, site }));
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const result = await createBookingAdmin(body, req.headers['x-admin-token']);
      return res.status(201).json(result);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    handleError(res, err);
  }
};
