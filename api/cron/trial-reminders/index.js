const { runTrialReminders } = require('../../../platform/scripts/trial-reminders');
const { runCron } = require('../_utils');

module.exports = runCron('cron/trial-reminders', { ttlMinutes: 30, nextRun: '24 hours' })(
  async () => {
    return runTrialReminders();
  }
);
