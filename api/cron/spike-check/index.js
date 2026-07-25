const { runSpikeCheck } = require('../../../platform/api/alerts-service');
const { runCron } = require('../_utils');

module.exports = runCron('cron/spike-check', { ttlMinutes: 20, nextRun: '24 hours' })(async () => {
  return runSpikeCheck();
});
