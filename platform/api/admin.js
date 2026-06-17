const crypto = require('node:crypto');
const { get, all, run } = require('../db/operational');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

async function createAdminToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await run('INSERT INTO admin_sessions (token, expires_at) VALUES ($1, $2)', [token, expiresAt]);
  return token;
}

async function validateAdminToken(token) {
  if (!token) return false;
  const row = await get('SELECT * FROM admin_sessions WHERE token = $1', [token]);
  if (!row) return false;
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    await revokeToken(token);
    return false;
  }
  return true;
}

async function revokeToken(token) {
  await run('DELETE FROM admin_sessions WHERE token = $1', [token]);
}

async function login(password) {
  if (!ADMIN_PASSWORD) {
    return { success: false, error: 'Admin password not configured' };
  }
  if (password !== ADMIN_PASSWORD) {
    return { success: false, error: 'Invalid password' };
  }
  const token = await createAdminToken();
  return { success: true, token };
}

async function getAllBookings(status = null, siteSlug = null) {
  let query = `
    SELECT b.*, s.name as slot_name, s.slug as slot_slug, s.width, s.height, s.is_bundle
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
  `;
  const params = [];
  const conditions = [];
  if (status) {
    conditions.push(`b.status = $${params.length + 1}`);
    params.push(status);
  }
  if (siteSlug) {
    conditions.push(`b.site_slug = $${params.length + 1}`);
    params.push(siteSlug);
  }
  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }
  query += ' ORDER BY b.created_at DESC';
  return all(query, params);
}

async function getBookingStats(siteSlug = null) {
  const params = [];
  const siteClause = siteSlug ? ` AND site_slug = $${params.length + 1}` : '';
  if (siteSlug) params.push(siteSlug);

  const totalLiveRow = await get(
    `SELECT COUNT(*) as c FROM bookings WHERE status = 'live'${siteClause}`,
    params
  );
  const totalPendingRow = await get(
    `SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_approval'${siteClause}`,
    params
  );
  const totalPendingPaymentRow = await get(
    `SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_payment'${siteClause}`,
    params
  );
  const totalPendingUploadRow = await get(
    `SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_upload'${siteClause}`,
    params
  );
  const totalTrialingRow = await get(
    `SELECT COUNT(*) as c FROM bookings WHERE status = 'live' AND billing_status = 'trialing'${siteClause}`,
    params
  );
  const revenueRow = await get(
    `SELECT COALESCE(SUM(amount_paid_cents), 0) as c FROM bookings WHERE status IN ('live', 'ended', 'approved')${siteClause}`,
    params
  );

  return {
    totalLive: totalLiveRow?.c || 0,
    totalPending: totalPendingRow?.c || 0,
    totalPendingPayment: totalPendingPaymentRow?.c || 0,
    totalPendingUpload: totalPendingUploadRow?.c || 0,
    totalTrialing: totalTrialingRow?.c || 0,
    revenueCents: revenueRow?.c || 0,
    revenueDollars: ((revenueRow?.c || 0) / 100).toFixed(2),
  };
}

async function getRevenueStats(days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString();

  const daily = await all(
    `
      SELECT
        date(created_at) as day,
        COUNT(*) as bookings,
        COALESCE(SUM(amount_paid_cents), 0) as revenue_cents
      FROM bookings
      WHERE status IN ('live', 'ended', 'approved')
        AND created_at >= $1
      GROUP BY day
      ORDER BY day ASC
    `,
    [cutoffIso]
  );

  const totalRevenueRow = await get(
    `
      SELECT COALESCE(SUM(amount_paid_cents), 0) as c
      FROM bookings
      WHERE status IN ('live', 'ended', 'approved')
    `
  );

  const totalBookingsRow = await get(
    `
      SELECT COUNT(*) as c
      FROM bookings
      WHERE status IN ('live', 'ended', 'approved')
    `
  );

  const totalRevenue = totalRevenueRow?.c || 0;
  const totalBookings = totalBookingsRow?.c || 0;

  const series = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayIso = d.toISOString().slice(0, 10);
    const found = daily.find((row) => row.day === dayIso);
    series.push({
      day: dayIso,
      bookings: found ? found.bookings : 0,
      revenueCents: found ? found.revenue_cents : 0,
      revenueDollars: found ? (found.revenue_cents / 100).toFixed(2) : '0.00',
    });
  }

  return {
    days,
    totalRevenueCents: totalRevenue,
    totalRevenueDollars: (totalRevenue / 100).toFixed(2),
    totalBookings,
    daily: series,
  };
}

module.exports = {
  login,
  validateAdminToken,
  revokeToken,
  getAllBookings,
  getBookingStats,
  getRevenueStats,
};
