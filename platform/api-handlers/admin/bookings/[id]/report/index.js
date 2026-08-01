/**
 * POST /api/admin/bookings/:id/report
 */

const {
  setCors,
  requireAdmin,
  handleError,
  getRouteParam,
} = require('../../../../../../api/_utils.js');
const { sendBookingReport } = require('../../../../../api/admin-booking-service.js');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const id = parseInt(getRouteParam(req, 'id'), 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid booking id' });

    const result = await sendBookingReport(id, req.headers['x-admin-token']);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    handleError(res, err);
  }
};
