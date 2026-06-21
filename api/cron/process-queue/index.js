const { processQueue } = require('../../../platform/scripts/bulk-crawl');
const { setCors, handleError, requireCronSecret } = require('../../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!requireCronSecret(req, res)) return;

  try {
    const batchSize = Math.min(parseInt(req.query?.batchSize || req.body?.batchSize, 10) || 10, 50);
    const concurrency = Math.min(
      parseInt(req.query?.concurrency || req.body?.concurrency, 10) || 3,
      10
    );

    const result = await processQueue({ batchSize, concurrency });

    res.json({
      success: true,
      ...result,
      nextRun: '1 hour',
    });
  } catch (err) {
    handleError(res, err);
  }
};
