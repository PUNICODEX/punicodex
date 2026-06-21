/**
 * GET /api/admin/revenue
 */

const { setCors, requireAdmin, handleError } = require('../../_utils.js');
const { getRevenue } = require('../../../platform/api/admin-booking-service.js');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const days = parseInt(req.query?.days, 10) || 30;
    res.json(await getRevenue({ days }));
  } catch (err) {
    handleError(res, err);
  }
};
