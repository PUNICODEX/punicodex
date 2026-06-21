const { processQueue } = require('../../../platform/scripts/bulk-crawl');
const { runCron } = require('../_utils');

module.exports = runCron('cron/process-queue', { ttlMinutes: 30, nextRun: '1 hour' })(
  async (req) => {
    const batchSize = Math.min(parseInt(req.query?.batchSize || req.body?.batchSize, 10) || 10, 50);
    const concurrency = Math.min(
      parseInt(req.query?.concurrency || req.body?.concurrency, 10) || 3,
      10
    );

    return processQueue({ batchSize, concurrency });
  }
);
