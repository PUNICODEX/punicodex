const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, '..', 'db', 'punycodex.db');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'nike-admin-2026';

function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

function createAdminToken() {
  const db = getDb();
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO admin_sessions (token) VALUES (?)').run(token);
  db.close();
  return token;
}

function validateAdminToken(token) {
  if (!token) return false;
  const db = getDb();
  const row = db.prepare('SELECT * FROM admin_sessions WHERE token = ?').get(token);
  db.close();
  return !!row;
}

function login(password) {
  if (password !== ADMIN_PASSWORD) {
    return { success: false, error: 'Invalid password' };
  }
  const token = createAdminToken();
  return { success: true, token };
}

function getAllBookings(status = null) {
  const db = getDb();
  let query = `
    SELECT b.*, s.name as slot_name, s.slug as slot_slug, s.width, s.height
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
  `;
  const params = [];
  if (status) {
    query += ' WHERE b.status = ?';
    params.push(status);
  }
  query += ' ORDER BY b.created_at DESC';
  const bookings = db.prepare(query).all(...params);
  db.close();
  return bookings;
}

function getBookingStats() {
  const db = getDb();
  const totalLive = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'live'").get().c;
  const totalPending = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_approval'").get().c;
  const totalPendingPayment = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_payment'").get().c;
  const totalPendingUpload = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_upload'").get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(amount_paid_cents), 0) as c FROM bookings WHERE status IN ('live', 'ended', 'approved')").get().c;
  db.close();
  return {
    totalLive,
    totalPending,
    totalPendingPayment,
    totalPendingUpload,
    revenueCents: revenue,
    revenueDollars: (revenue / 100).toFixed(2),
  };
}

module.exports = {
  login,
  validateAdminToken,
  getAllBookings,
  getBookingStats,
};
