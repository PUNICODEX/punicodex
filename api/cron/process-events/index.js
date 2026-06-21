const { processPendingEvents } = require('../../../platform/api/event-crawler-service');
const { setCors, handleError, requireCronSecret } = require('../../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireCronSecret(req, res)) return;

  try {
    const limit = Math.min(parseInt(req.query?.limit || req.body?.limit, 10) || 20, 100);

    const results = await processPendingEvents({ limit });

    res.json({
      success: true,
      processed: results.length,
      results,
      nextRun: '1 hour',
    });
  } catch (err) {
    handleError(res, err);
  }
};
