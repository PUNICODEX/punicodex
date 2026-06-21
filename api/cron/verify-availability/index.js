/**
 * PUNYCODEX Availability Verification Cron
 *
 * Idempotent cron endpoint for Vercel.
 * Re-checks a batch of availability rows against live DNS.
 */
const { verifyAvailability } = require('../../../platform/scripts/verify-availability');
const { runCron } = require('../_utils');

const DEFAULT_MAX_AGE_HOURS = 24;
const DEFAULT_LIMIT = 500;

module.exports = runCron('cron/verify-availability', { ttlMinutes: 30, nextRun: '24 hours' })(
  async (req) => {
    const maxAgeHours = Math.min(
      parseInt(req.query?.maxAgeHours, 10) || DEFAULT_MAX_AGE_HOURS,
      168
    );
    const limit = Math.min(parseInt(req.query?.limit, 10) || DEFAULT_LIMIT, 1000);

    return verifyAvailability({ maxAgeHours, limit });
  }
);
