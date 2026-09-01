const { runCron } = require('./_utils');
const { materializeAllRollups } = require('../../platform/api/analytics-rollups');

module.exports = runCron('cron/analytics-rollups', { ttlMinutes: 30, nextRun: '24 hours' })(
  async () => {
    const materialized = await materializeAllRollups({ days: 30 });
    return { ok: true, materialized };
  }
);
