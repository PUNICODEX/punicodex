const { runSponsorshipExpiry } = require('../../../platform/scripts/sponsorship-expiry');
const { runCron } = require('../_utils');

module.exports = runCron('cron/sponsorship-expiry', { ttlMinutes: 30, nextRun: '24 hours' })(
  async () => {
    return runSponsorshipExpiry();
  }
);
