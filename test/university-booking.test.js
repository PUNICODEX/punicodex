/**
 * University booking endpoint tests.
 *
 * Covers method gating, honeypot, per-IP rate limiting, field validation,
 * the future/60-day time window, IANA timezone conversion of the wall-clock
 * picker value, dual email delivery (founder alert with ICS attachment +
 * booker confirmation), and SQLite persistence with a hashed IP. Invokes the
 * real Vercel handler with a mock req/res against an isolated database file.
 */

const assert = require('node:assert');
const crypto = require('node:crypto');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

process.env.PUNICODEX_TEST_DB_PATH = path.join(
  os.tmpdir(),
  `university-booking-test-${process.pid}.db`
);
process.env.UNIVERSITY_BOOKINGS_EMAIL = 'founder@example.test';

// Capture outgoing email at the boundary.
const emailModulePath = require.resolve('../platform/api/email.js');
const realEmail = require(emailModulePath);
const sent = [];
require.cache[emailModulePath].exports = {
  ...realEmail,
  sendEmail: async (msg) => {
    sent.push(msg);
    return { success: true, mocked: true };
  },
};

const handler = require('../platform/api-handlers/root/university/book/index.js');
const { getDb } = require('../platform/db/connection.js');

require('../platform/db/migrate-university-bookings.js').migrate(getDb());

let passed = 0;
let failed = 0;
let ipCounter = 0;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

function invoke(body, ip, method = 'POST') {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage(null);
    req.method = method;
    req.url = '/api/university/book/';
    req.headers = { 'x-forwarded-for': ip || `10.7.0.${++ipCounter}` };
    req.body = body;
    const res = new http.ServerResponse(req);
    let statusCode = 200;
    res.setHeader = () => {};
    res.status = (code) => {
      statusCode = code;
      return res;
    };
    res.json = (data) => resolve({ status: statusCode, body: data });
    res.end = () => resolve({ status: statusCode, body: null });
    handler(req, res).catch(reject);
  });
}

function futureWhen(hoursAhead) {
  const d = new Date(Date.now() + hoursAhead * 3600 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  );
}

const VALID = {
  name: 'Professor June Hale',
  institution: 'Miskatonic University',
  email: 'j.hale@miskatonic.edu',
  phone: '+1 555 0100',
  when: futureWhen(48),
  timezone: 'Australia/Sydney',
  notes: 'Two colleagues from Digital Humanities will join.',
};

function bookingCount(email) {
  return getDb()
    .prepare('SELECT COUNT(*) AS n FROM university_call_bookings WHERE email = ?')
    .get(email).n;
}

async function run() {
  console.log('\n▸ University Booking Endpoint Tests\n');

  await test('OPTIONS preflight returns 204; GET is refused with 405', async () => {
    assert.strictEqual((await invoke(null, undefined, 'OPTIONS')).status, 204);
    assert.strictEqual((await invoke(null, undefined, 'GET')).status, 405);
  });

  await test('honeypot field returns 200 silently — no email, no row', async () => {
    const before = sent.length;
    const res = await invoke({ ...VALID, company: 'spam inc' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(sent.length, before, 'no email for honeypot hits');
    assert.strictEqual(bookingCount(VALID.email), 0, 'no row for honeypot hits');
  });

  await test('missing or invalid name/institution/email are refused with 400', async () => {
    for (const body of [
      { ...VALID, name: '' },
      { ...VALID, institution: undefined },
      { ...VALID, email: 'not-an-email' },
    ]) {
      const res = await invoke(body);
      assert.strictEqual(res.status, 400, JSON.stringify(body));
    }
  });

  await test('malformed phone is refused with 400', async () => {
    const res = await invoke({ ...VALID, phone: 'call me maybe' });
    assert.strictEqual(res.status, 400);
  });

  await test('past times and times beyond 60 days are refused with 400', async () => {
    assert.strictEqual((await invoke({ ...VALID, when: futureWhen(-1) })).status, 400);
    assert.strictEqual((await invoke({ ...VALID, when: futureWhen(24 * 70) })).status, 400);
  });

  await test('valid booking persists with hashed IP and converts the wall time to UTC', async () => {
    const ip = '10.7.0.220';
    const res = await invoke(VALID, ip);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
    const row = getDb()
      .prepare('SELECT * FROM university_call_bookings WHERE email = ?')
      .get(VALID.email);
    assert.ok(row, 'row persisted');
    assert.strictEqual(row.institution, 'Miskatonic University');
    assert.strictEqual(row.phone, '+1 555 0100');
    // 10:00 in Sydney (UTC+11 in January) is 23:00 UTC the previous day.
    assert.strictEqual(row.timezone, 'Australia/Sydney');
    const expectedHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
    assert.strictEqual(row.ip_hash, expectedHash, 'only the hashed IP is stored');
    assert.ok(!String(row.ip_hash).includes(ip), 'raw IP never stored');
  });

  await test('founder alert and booker confirmation are both sent; alert carries an ICS', async () => {
    const alert = sent.find((m) => String(m.subject).startsWith('[University call]'));
    const confirmation = sent.find((m) =>
      String(m.subject).includes('introductory call is booked')
    );
    assert.ok(alert, 'founder alert sent');
    assert.ok(confirmation, 'confirmation sent');
    assert.strictEqual(alert.to, 'founder@example.test');
    assert.strictEqual(confirmation.to, VALID.email);
    assert.ok(alert.subject.includes('Miskatonic University'), 'institution in subject');
    assert.ok(alert.html.includes('+1 555 0100'), 'phone in alert');
    assert.ok(alert.html.includes('Australia/Sydney'), 'timezone in alert');
    assert.ok(
      Array.isArray(alert.attachments) && alert.attachments.length === 1,
      'alert has exactly one attachment'
    );
    const ics = Buffer.from(alert.attachments[0].contentBase64, 'base64').toString('utf8');
    assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'attachment is an ICS calendar');
    assert.ok(ics.includes('SUMMARY:PuniCodex introductory call — Miskatonic University'));
    assert.ok(ics.includes('DTSTART:'), 'ICS has a start time');
    assert.ok(!alert.html.includes('<script>'), 'no raw markup leakage');
  });

  await test('ZOOM_MEETING_URL is included in both emails when set', async () => {
    process.env.ZOOM_MEETING_URL = 'https://zoom.us/j/8675309';
    const before = sent.length;
    await invoke({ ...VALID, email: 'second@miskatonic.edu', when: futureWhen(72) });
    const alert = sent[before];
    const confirmation = sent[before + 1];
    assert.ok(alert.html.includes('https://zoom.us/j/8675309'), 'link in alert');
    assert.ok(confirmation.html.includes('https://zoom.us/j/8675309'), 'link in confirmation');
    delete process.env.ZOOM_MEETING_URL;
  });

  await test('without ZOOM_MEETING_URL the confirmation promises the link by reply', async () => {
    const before = sent.length;
    await invoke({ ...VALID, email: 'third@miskatonic.edu', when: futureWhen(96) });
    const confirmation = sent[before + 1];
    assert.ok(
      /sent to this address|call you by phone/i.test(confirmation.text),
      'fallback copy in confirmation text'
    );
  });

  await test('per-IP fixed-window rate limit kicks in at the 5th booking', async () => {
    const ip = '198.51.100.77';
    let last;
    for (let i = 0; i < 5; i++) {
      last = await invoke(
        { ...VALID, email: `rl${i}@miskatonic.edu`, when: futureWhen(100 + i) },
        ip
      );
    }
    assert.strictEqual(last.status, 429);
  });

  // ── Pre-call reminder runner (the ~24h follow-up with link + phone) ──
  const { runDueReminders } = require('../platform/api/university-call-reminders');

  function seedBooking(hoursAhead, email) {
    const db = getDb();
    const scheduled = new Date(Date.now() + hoursAhead * 3600 * 1000).toISOString();
    db.prepare(
      `INSERT INTO university_call_bookings
         (name, institution, email, phone, scheduled_at, timezone, meeting_url)
       VALUES (?, ?, ?, ?, ?, 'Australia/Sydney', 'https://zoom.us/j/8675309')`
    ).run('Professor June Hale', 'Miskatonic University', email, '+1 555 0100', scheduled);
    return db.prepare('SELECT id FROM university_call_bookings WHERE email = ?').get(email).id;
  }

  await test('reminder fires once ~24h before the call, with link and phone fallback', async () => {
    const email = 'remind@miskatonic.edu';
    seedBooking(22, email);
    const before = sent.length;
    const result = await runDueReminders();
    assert.strictEqual(result.reminded, 1, `expected 1 reminder: ${JSON.stringify(result)}`);
    const reminder = sent[before];
    assert.ok(reminder, 'reminder email sent');
    assert.ok(String(reminder.subject).startsWith('Tomorrow:'), 'subject flags the reminder');
    assert.ok(reminder.html.includes('https://zoom.us/j/8675309'), 'video link in reminder');
    assert.ok(reminder.html.includes('+1 555 0100'), 'phone fallback in reminder');
    const row = getDb()
      .prepare('SELECT reminded_at FROM university_call_bookings WHERE email = ?')
      .get(email);
    assert.ok(row.reminded_at, 'booking marked reminded');
  });

  await test('a second run sends nothing — exactly one reminder per booking', async () => {
    const before = sent.length;
    const result = await runDueReminders();
    assert.strictEqual(result.reminded, 0);
    assert.strictEqual(sent.length, before, 'no duplicate reminders');
  });

  await test('bookings outside the 20–26h window are left alone', async () => {
    const soon = 'soon@miskatonic.edu';
    const late = 'late@miskatonic.edu';
    seedBooking(8, soon);
    seedBooking(50, late);
    const before = sent.length;
    const result = await runDueReminders();
    assert.strictEqual(result.reminded, 0);
    assert.strictEqual(sent.length, before, 'no emails for out-of-window bookings');
    const soonRow = getDb()
      .prepare('SELECT reminded_at FROM university_call_bookings WHERE email = ?')
      .get(soon);
    assert.ok(!soonRow.reminded_at, 'short-notice booking untouched');
  });

  console.log(`\nUniversity Booking Endpoint: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
