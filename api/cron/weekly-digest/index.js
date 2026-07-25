const { sendWeeklyDigest } = require('../../../platform/api/digest-service');
const { runCron } = require('../_utils');

module.exports = runCron('cron/weekly-digest', { ttlMinutes: 30, nextRun: '7 days' })(async () => {
  return sendWeeklyDigest();
});
