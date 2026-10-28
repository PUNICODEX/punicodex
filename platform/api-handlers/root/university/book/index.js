/**
 * PuniCodex — University introductory-call booking endpoint.
 * POST /api/university/book { name, institution, email, phone?, when,
 *                            timezone?, notes?, company? }
 *
 * The calendar on /university/book/ posts here. Validates and honeypot-filters
 * the payload, rate-limits per IP, persists the booking (SQLite, hashed IP
 * only), then alerts the founder inbox (with an ICS attachment) and confirms
 * to the booker. The meeting link is the standing ZOOM_MEETING_URL when set;
 * otherwise the confirmation promises the link by reply. Email failures are
 * logged, never fatal — the row is the primary record.
 */

const crypto = require('node:crypto');
const { getDb } = require('../../../../db/connection.js');
const { migrate } = require('../../../../db/migrate-university-bookings.js');

const RATE_LIMIT = 4; // bookings per IP per hour
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map();

// Bookings must be at least 15 minutes out and at most 60 days out.
const MIN_LEAD_MS = 15 * 60 * 1000;
const MAX_LEAD_MS = 60 * 24 * 60 * 60 * 1000;

let migrated = false;
function ensureDb() {
  const db = getDb();
  if (!migrated) {
    try {
      migrate(db);
      migrated = true;
    } catch (err) {
      console.error('[university/book] migration failed:', err.message);
    }
  }
  return db;
}

function clientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function rateLimited(ip) {
  const now = Date.now();
  const windowStart = now - (now % WINDOW_MS);
  const key = `${ip}:${windowStart}`;
  const count = (hits.get(key) || 0) + 1;
  hits.set(key, count);
  if (hits.size > 10000) hits.clear();
  return count > RATE_LIMIT;
}

/**
 * Interpret a naive wall-clock local time ("YYYY-MM-DDTHH:mm", as produced by
 * <input type="datetime-local">) as that wall time in `timezone` (an IANA
 * name when the browser supplied one) and return the UTC instant. Falls back
 * to interpreting it as UTC when no usable timezone is given.
 */
function wallTimeToUtc(when, timezone) {
  const m = String(when).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m;
  const asUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  if (!timezone) return new Date(asUtc);
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(asUtc)).map((p) => [p.type, p.value])
    );
    // What that UTC instant reads as wall time in the zone; the difference is
    // the zone offset, so subtracting it pins the intended wall time to UTC.
    const asIfUtc = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour % 24,
      +parts.minute,
      +parts.second
    );
    return new Date(asUtc - (asIfUtc - asUtc));
  } catch {
    return new Date(asUtc);
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://punicodex.com');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'Too many requests — please try again later.' });
  }

  const { name, institution, email, phone, when, timezone, notes, company } = req.body || {};
  // Honeypot: a filled hidden field means a bot. Pretend success.
  if (company) return res.status(200).json({ ok: true });

  if (
    typeof name !== 'string' ||
    typeof institution !== 'string' ||
    typeof email !== 'string' ||
    !name.trim() ||
    !institution.trim() ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
  ) {
    return res.status(400).json({
      error: 'Please provide your name, institution, and a valid email address.',
    });
  }

  const trimmedPhone = typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 40) : '';
  if (trimmedPhone && !/^[+()\-.\s\d]{5,40}$/.test(trimmedPhone)) {
    return res.status(400).json({ error: 'That phone number does not look right.' });
  }

  const whenUtc = wallTimeToUtc(when, typeof timezone === 'string' ? timezone.slice(0, 64) : '');
  if (!whenUtc || Number.isNaN(whenUtc.getTime())) {
    return res.status(400).json({ error: 'Please choose a date and time for the call.' });
  }
  const lead = whenUtc.getTime() - Date.now();
  if (lead < MIN_LEAD_MS) {
    return res
      .status(400)
      .json({ error: 'Please choose a time at least fifteen minutes from now.' });
  }
  if (lead > MAX_LEAD_MS) {
    return res.status(400).json({ error: 'Please choose a time within the next sixty days.' });
  }

  const trimmedName = name.trim().slice(0, 120);
  const trimmedInstitution = institution.trim().slice(0, 160);
  const trimmedEmail = email.trim().slice(0, 200);
  const trimmedTimezone = typeof timezone === 'string' ? timezone.trim().slice(0, 64) : '';
  const trimmedNotes = typeof notes === 'string' ? notes.trim().slice(0, 2000) : '';
  const meetingUrl = (process.env.ZOOM_MEETING_URL || '').trim().slice(0, 300);
  const ipHash = crypto.createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 16);

  const database = ensureDb();
  database
    .prepare(
      `INSERT INTO university_call_bookings
         (name, institution, email, phone, scheduled_at, timezone, notes, meeting_url, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      trimmedName,
      trimmedInstitution,
      trimmedEmail,
      trimmedPhone,
      whenUtc.toISOString(),
      trimmedTimezone,
      trimmedNotes,
      meetingUrl,
      ipHash
    );

  const emailArgs = {
    name: trimmedName,
    institution: trimmedInstitution,
    email: trimmedEmail,
    phone: trimmedPhone,
    whenUtc,
    timezone: trimmedTimezone,
    notes: trimmedNotes,
    meetingUrl,
  };

  // Best-effort: the booking row is the primary record; a mailer hiccup must
  // not turn a booked call into a lost one.
  try {
    await require('../../../../api/email.js').notifyUniversityCallBooked(emailArgs);
  } catch (err) {
    console.error('[university/book] founder alert failed:', err.message);
  }
  try {
    await require('../../../../api/email.js').notifyUniversityCallConfirmation(emailArgs);
  } catch (err) {
    console.error('[university/book] confirmation failed:', err.message);
  }

  return res.status(200).json({ ok: true });
};
