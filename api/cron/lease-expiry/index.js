const { runLeaseExpiry } = require('../../../platform/scripts/lease-expiry');
const { runCron } = require('../_utils');

module.exports = runCron('cron/lease-expiry', { ttlMinutes: 30, nextRun: '24 hours' })(async () => {
  return runLeaseExpiry();
});
