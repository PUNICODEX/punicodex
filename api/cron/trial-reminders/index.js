const { runTrialReminders } = require('../../../platform/scripts/trial-reminders');
const { setCors, handleError, requireCronSecret } = require('../../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireCronSecret(req, res)) return;

  try {
    const result = await runTrialReminders();

    res.json({
      success: true,
      ...result,
      nextRun: '24 hours',
    });
  } catch (err) {
    handleError(res, err);
  }
};
