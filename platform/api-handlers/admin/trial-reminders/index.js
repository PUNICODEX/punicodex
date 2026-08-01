/**
 * POST /api/admin/trial-reminders
 */

const { setCors, requireAdmin, handleError } = require('../../../../api/_utils.js');
const { runTrialRemindersAdmin } = require('../../../api/admin-booking-service.js');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!(await requireAdmin(req, res))) return;

  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    res.json(await runTrialRemindersAdmin(req.headers['x-admin-token']));
  } catch (err) {
    handleError(res, err);
  }
};
