const {
  getTrialsNeedingReminder,
  recordTrialReminder,
  setBillingStatus,
} = require('../api/bookings');
const { notifyTrialEnding } = require('../api/email');

function daysBetween(from, to) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((to - from) / msPerDay);
}

async function runTrialReminders() {
  const trials = await getTrialsNeedingReminder();
  const now = new Date();
  let sent7 = 0;
  let sent1 = 0;
  let converted = 0;
  let errors = 0;

  for (const booking of trials) {
    try {
      const trialEnds = new Date(booking.trial_ends_at);
      const daysLeft = daysBetween(now, trialEnds);

      if (daysLeft <= 0 && booking.billing_status === 'trialing') {
        await setBillingStatus(booking.id, 'active');
        converted++;
        continue;
      }

      if (daysLeft <= 1 && daysLeft > 0 && !booking.reminder_1d_sent) {
        await notifyTrialEnding({
          email: booking.email,
          slotName: booking.slot_name,
          companyName: booking.company_name,
          daysLeft: 1,
          trialEndsAt: booking.trial_ends_at,
          bookingToken: booking.analytics_token,
          siteSlug: booking.site_slug,
        });
        await recordTrialReminder(booking.id, '1d');
        sent1++;
      } else if (daysLeft <= 7 && daysLeft > 1 && !booking.reminder_7d_sent) {
        await notifyTrialEnding({
          email: booking.email,
          slotName: booking.slot_name,
          companyName: booking.company_name,
          daysLeft,
          trialEndsAt: booking.trial_ends_at,
          bookingToken: booking.analytics_token,
          siteSlug: booking.site_slug,
        });
        await recordTrialReminder(booking.id, '7d');
        sent7++;
      }
    } catch (err) {
      console.error(`Trial reminder failed for booking ${booking.id}:`, err.message);
      errors++;
    }
  }

  return { sent7, sent1, converted, errors, checked: trials.length };
}

if (require.main === module) {
  runTrialReminders()
    .then((result) => {
      console.log('Trial reminders:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Trial reminder runner failed:', err);
      process.exit(1);
    });
}

module.exports = { runTrialReminders };
