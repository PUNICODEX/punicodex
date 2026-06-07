const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

// ─── Ad Slots ───

function getSlots() {
  const db = getDb();
  const slots = db.prepare(`
    SELECT s.*, b.status as booking_status, b.analytics_token, b.company_name, b.website_url, b.creative_path, b.custom_heading, b.custom_subtitle, b.hide_meta
    FROM ad_slots s
    LEFT JOIN bookings b ON s.current_booking_id = b.id
    ORDER BY s.sort_order
  `).all();
  db.close();
  return slots;
}

function getSlotBySlug(slug) {
  const db = getDb();
  const slot = db.prepare(`
    SELECT s.*, b.status as booking_status, b.analytics_token, b.company_name, b.website_url
    FROM ad_slots s
    LEFT JOIN bookings b ON s.current_booking_id = b.id
    WHERE s.slug = ?
  `).get(slug);
  db.close();
  return slot;
}

function getSlotById(id) {
  const db = getDb();
  const slot = db.prepare('SELECT * FROM ad_slots WHERE id = ?').get(id);
  db.close();
  return slot;
}

// ─── Bookings ───

function createBooking({ slotId, email, companyName, websiteUrl, customHeading, customSubtitle }) {
  const db = getDb();
  const token = generateToken();
  const stmt = db.prepare(`
    INSERT INTO bookings (slot_id, email, company_name, website_url, custom_heading, custom_subtitle, status, analytics_token)
    VALUES (?, ?, ?, ?, ?, ?, 'pending_payment', ?)
  `);
  const result = stmt.run(slotId, email, companyName || null, websiteUrl || null, customHeading || null, customSubtitle || null, token);
  db.close();
  return { id: result.lastInsertRowid, token };
}

function getBookingByToken(token) {
  const db = getDb();
  const booking = db.prepare(`
    SELECT b.*, s.name as slot_name, s.slug as slot_slug, s.width, s.height, s.price_cents
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
    WHERE b.analytics_token = ?
  `).get(token);
  db.close();
  return booking;
}

function getBookingById(id) {
  const db = getDb();
  const booking = db.prepare(`
    SELECT b.*, s.name as slot_name, s.slug as slot_slug
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
    WHERE b.id = ?
  `).get(id);
  db.close();
  return booking;
}

function getBookingByStripeSession(sessionId) {
  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE stripe_session_id = ?').get(sessionId);
  db.close();
  return booking;
}

function updateBookingStripeSession(bookingId, sessionId) {
  const db = getDb();
  db.prepare('UPDATE bookings SET stripe_session_id = ?, status = ? WHERE id = ?')
    .run(sessionId, 'pending_payment', bookingId);
  db.close();
}

function markBookingPaid(sessionId, paymentIntent, amountCents) {
  const db = getDb();
  db.prepare(`
    UPDATE bookings
    SET stripe_payment_intent = ?, amount_paid_cents = ?, status = 'pending_upload', updated_at = CURRENT_TIMESTAMP
    WHERE stripe_session_id = ?
  `).run(paymentIntent, amountCents, sessionId);
  const booking = db.prepare('SELECT * FROM bookings WHERE stripe_session_id = ?').get(sessionId);
  db.close();
  return booking;
}

function saveCreative(bookingId, filePath, originalName) {
  const db = getDb();
  db.prepare(`
    UPDATE bookings
    SET creative_path = ?, creative_original_name = ?, status = 'pending_approval', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(filePath, originalName, bookingId);
  db.close();
}

function setBookingStatus(bookingId, status, note = null) {
  const db = getDb();
  const updates = ['status = ?', 'updated_at = CURRENT_TIMESTAMP'];
  const params = [status];
  if (note !== null) {
    updates.push('admin_note = ?');
    params.push(note);
  }
  params.push(bookingId);
  db.prepare(`UPDATE bookings SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  db.close();
}

function goLive(bookingId) {
  const db = getDb();
  const now = new Date().toISOString();
  const ends = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    UPDATE bookings
    SET status = 'live', started_at = ?, ends_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(now, ends, bookingId);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  db.prepare(`UPDATE ad_slots SET status = 'live', current_booking_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .run(bookingId, booking.slot_id);
  db.close();
  return booking;
}

function endBooking(bookingId) {
  const db = getDb();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
  db.prepare(`
    UPDATE bookings SET status = 'ended', updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(bookingId);
  db.prepare(`
    UPDATE ad_slots SET status = 'available', current_booking_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(booking.slot_id);
  db.close();
}

function getBookingsByEmail(email) {
  const db = getDb();
  const bookings = db.prepare(`
    SELECT b.*, s.name as slot_name, s.slug as slot_slug
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
    WHERE b.email = ?
    ORDER BY b.created_at DESC
  `).all(email);
  db.close();
  return bookings;
}

// ─── Analytics ───

function recordEvent({ bookingId, eventType, ip, userAgent, referrer }) {
  const db = getDb();
  const ipHash = hashIp(ip || 'unknown');
  db.prepare(`
    INSERT INTO analytics_events (booking_id, event_type, ip_hash, user_agent, referrer)
    VALUES (?, ?, ?, ?, ?)
  `).run(bookingId, eventType, ipHash, userAgent || null, referrer || null);
  db.close();
}

function getDashboardMetrics(token) {
  const db = getDb();
  const booking = db.prepare(`
    SELECT b.*, s.name as slot_name, s.slug as slot_slug
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
    WHERE b.analytics_token = ?
  `).get(token);
  if (!booking) {
    db.close();
    return null;
  }

  const totalImpressions = db.prepare(`
    SELECT COUNT(*) as c FROM analytics_events
    WHERE booking_id = ? AND event_type = 'impression'
  `).get(booking.id).c;

  const uniqueImpressions = db.prepare(`
    SELECT COUNT(DISTINCT ip_hash) as c FROM analytics_events
    WHERE booking_id = ? AND event_type = 'impression'
  `).get(booking.id).c;

  const totalClicks = db.prepare(`
    SELECT COUNT(*) as c FROM analytics_events
    WHERE booking_id = ? AND event_type = 'click'
  `).get(booking.id).c;

  const daily = db.prepare(`
    SELECT date(created_at) as day, event_type, COUNT(*) as count
    FROM analytics_events
    WHERE booking_id = ? AND created_at >= date('now', '-30 days')
    GROUP BY day, event_type
    ORDER BY day DESC
  `).all(booking.id);

  const referrers = db.prepare(`
    SELECT referrer, COUNT(*) as count
    FROM analytics_events
    WHERE booking_id = ? AND event_type = 'impression' AND referrer IS NOT NULL
    GROUP BY referrer
    ORDER BY count DESC
    LIMIT 10
  `).all(booking.id);

  db.close();

  return {
    booking: {
      id: booking.id,
      slot_name: booking.slot_name,
      slot_slug: booking.slot_slug,
      company_name: booking.company_name,
      website_url: booking.website_url,
      status: booking.status,
      creative_path: booking.creative_path,
      started_at: booking.started_at,
      ends_at: booking.ends_at,
      created_at: booking.created_at,
    },
    metrics: {
      totalImpressions,
      uniqueImpressions,
      totalClicks,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00',
      daily,
      referrers,
    }
  };
}

module.exports = {
  getSlots,
  getSlotBySlug,
  getSlotById,
  createBooking,
  getBookingByToken,
  getBookingById,
  getBookingByStripeSession,
  updateBookingStripeSession,
  markBookingPaid,
  saveCreative,
  setBookingStatus,
  goLive,
  endBooking,
  getBookingsByEmail,
  recordEvent,
  getDashboardMetrics,
  generateToken,
  hashIp,
};
