/**
 * POST /api/admin/bookings/:id/approve-application
 */

const { setCors, requireAdmin, handleError } = require('../../../../_utils.js');
const { approveApplication } = require('../../../../../platform/api/admin-booking-service.js');

function getId(req) {
  return req.query?.id || req.params?.id || req.url.split('/').slice(-2)[0].split('?')[0];
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const id = parseInt(getId(req), 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid booking id' });

    const result = await approveApplication(id, req.headers['x-admin-token']);
    res.json(result);
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    handleError(res, err);
  }
};
