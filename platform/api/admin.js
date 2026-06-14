const Database = require('better-sqlite3');
const crypto = require('node:crypto');
const { getDbPath } = require('../db/db');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function getDb() {
  const db = new Database(getDbPath());
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
  if (!ADMIN_PASSWORD) {
    return { success: false, error: 'Admin password not configured' };
  }
  if (password !== ADMIN_PASSWORD) {
    return { success: false, error: 'Invalid password' };
  }
  const token = createAdminToken();
  return { success: true, token };
}

function getAllBookings(status = null, siteSlug = null) {
  const db = getDb();
  let query = `
    SELECT b.*, s.name as slot_name, s.slug as slot_slug, s.width, s.height, s.is_bundle
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
  `;
  const params = [];
  const conditions = [];
  if (status) {
    conditions.push('b.status = ?');
    params.push(status);
  }
  if (siteSlug) {
    conditions.push('b.site_slug = ?');
    params.push(siteSlug);
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ' ORDER BY b.created_at DESC';
  const bookings = db.prepare(query).all(...params);
  db.close();
  return bookings;
}

function getBookingStats(siteSlug = null) {
  const db = getDb();
  const params = [];
  const siteClause = siteSlug ? ' AND site_slug = ?' : '';
  if (siteSlug) params.push(siteSlug);
  const totalLive = db
    .prepare(`SELECT COUNT(*) as c FROM bookings WHERE status = 'live'${siteClause}`)
    .get(...params).c;
  const totalPending = db
    .prepare(`SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_approval'${siteClause}`)
    .get(...params).c;
  const totalPendingPayment = db
    .prepare(`SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_payment'${siteClause}`)
    .get(...params).c;
  const totalPendingUpload = db
    .prepare(`SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_upload'${siteClause}`)
    .get(...params).c;
  const totalTrialing = db
    .prepare(
      `SELECT COUNT(*) as c FROM bookings WHERE status = 'live' AND billing_status = 'trialing'${siteClause}`
    )
    .get(...params).c;
  const revenue = db
    .prepare(
      `SELECT COALESCE(SUM(amount_paid_cents), 0) as c FROM bookings WHERE status IN ('live', 'ended', 'approved')${siteClause}`
    )
    .get(...params).c;
  db.close();
  return {
    totalLive,
    totalPending,
    totalPendingPayment,
    totalPendingUpload,
    totalTrialing,
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
