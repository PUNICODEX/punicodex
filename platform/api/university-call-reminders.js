/**
 * PuniCodex — pre-call reminders for university introductory calls.
 *
 * The booking confirmation carries the meeting link at booking time, but a
 * call booked days ahead deserves a nudge the day before. The
 * university-call-reminders cron calls runDueReminders() hourly; any booking
 * 20–26 hours out that has not been reminded yet gets ONE reminder email
 * (video link + phone fallback) and is marked reminded_at. The six-hour
 * window against an hourly cron guarantees exactly one fire per booking, and
 * a mailer failure leaves the row unmarked so the next run retries.
 */

const { getDb } = require('../db/connection');
const { migrate } = require('../db/migrate-university-bookings');

const REMIND_MIN_HOURS = 20;
const REMIND_MAX_HOURS = 26;

let migrated = false;
function ensureDb() {
  const db = getDb();
  if (!migrated) {
    migrate(db);
    migrated = true;
  }
  return db;
}

async function runDueReminders(now = new Date()) {
  const db = ensureDb();
  const min = new Date(now.getTime() + REMIND_MIN_HOURS * 3600 * 1000).toISOString();
  const max = new Date(now.getTime() + REMIND_MAX_HOURS * 3600 * 1000).toISOString();
  const due = db
    .prepare(
      `SELECT * FROM university_call_bookings
       WHERE reminded_at IS NULL AND scheduled_at >= ? AND scheduled_at <= ?
       ORDER BY scheduled_at ASC
       LIMIT 50`
    )
    .all(min, max);

  const email = require('./email.js');
  let reminded = 0;
  let failed = 0;
  for (const booking of due) {
    try {
      const result = await email.notifyUniversityCallReminder({
        email: booking.email,
        name: booking.name,
        institution: booking.institution,
        whenUtc: booking.scheduled_at,
        timezone: booking.timezone,
        meetingUrl: booking.meeting_url || '',
        phone: booking.phone || '',
      });
      if (result && result.success) {
        db.prepare('UPDATE university_call_bookings SET reminded_at = ? WHERE id = ?').run(
          new Date().toISOString(),
          booking.id
        );
        reminded++;
      } else {
        failed++;
      }
    } catch (err) {
      failed++;
      console.error(`[university-call-reminders] booking ${booking.id}: ${err.message}`);
    }
  }
  return { due: due.length, reminded, failed };
}

module.exports = { runDueReminders, REMIND_MIN_HOURS, REMIND_MAX_HOURS };
