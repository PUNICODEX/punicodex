const { sendExpiryReminders } = require('../../../platform/api/digest-service');
const { runCron } = require('../_utils');

module.exports = runCron('cron/patron-expiry', { ttlMinutes: 20, nextRun: '24 hours' })(
  async () => {
    return sendExpiryReminders();
  }
);
