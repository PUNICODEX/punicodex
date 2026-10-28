const { runCron } = require('../_utils');
const { runDueReminders } = require('../../../platform/api/university-call-reminders');

// Idempotent migration on cold start.
const { getDb } = require('../../../platform/db/connection');
try {
  require('../../../platform/db/migrate-university-bookings').migrate(getDb());
} catch (err) {
  console.error('[cron/university-call-reminders] migration failed:', err.message);
}

/**
 * /api/cron/university-call-reminders — hourly pre-call reminders.
 *
 * Fires one reminder email per university introductory call ~24h before the
 * booked time (20–26h window against an hourly schedule), carrying the video
 * link and the phone fallback. Idempotent: reminded_at marks each booking.
 */
module.exports = runCron('cron/university-call-reminders', { ttlMinutes: 30, nextRun: '1 hour' })(
  async () => {
    return runDueReminders();
  }
);
