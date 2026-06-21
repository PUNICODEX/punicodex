const { processPendingEvents } = require('../../../platform/api/event-crawler-service');
const { runCron } = require('../_utils');

module.exports = runCron('cron/process-events', { ttlMinutes: 30, nextRun: '1 hour' })(
  async (req) => {
    const limit = Math.min(parseInt(req.query?.limit || req.body?.limit, 10) || 20, 100);
    const results = await processPendingEvents({ limit });
    return { processed: results.length, results };
  }
);
