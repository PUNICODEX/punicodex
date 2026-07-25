const crypto = require('node:crypto');
const { get, all, run } = require('../db/operational');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function constantTimeCompare(a, b) {
  if (!a || !b) return false;
  const bufA = crypto.createHash('sha256').update(a).digest();
  const bufB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

async function createAdminToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  await run('INSERT INTO admin_sessions (token, expires_at) VALUES ($1, $2)', [
    tokenHash,
    expiresAt,
  ]);
  return token;
}

async function validateAdminToken(token) {
  if (!token) return false;
  const tokenHash = hashToken(token);
  const row = await get('SELECT * FROM admin_sessions WHERE token = $1', [tokenHash]);
  if (!row) return false;
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    await revokeToken(token);
    return false;
  }
  return true;
}

async function revokeToken(token) {
  const tokenHash = hashToken(token);
  await run('DELETE FROM admin_sessions WHERE token = $1', [tokenHash]);
}

async function login(password) {
  if (!ADMIN_PASSWORD) {
    return { success: false, error: 'Admin password not configured' };
  }
  if (!constantTimeCompare(password, ADMIN_PASSWORD)) {
    return { success: false, error: 'Invalid password' };
  }
  const token = await createAdminToken();
  return { success: true, token };
}

async function getAllBookings(
  status = null,
  siteSlug = null,
  { search = null, limit = null, offset = null } = {}
) {
  const { where, params } = bookingWhere({ status, siteSlug, search });
  let query = `
    SELECT b.*, s.name as slot_name, s.slug as slot_slug, s.width, s.height, s.is_bundle
    FROM bookings b
    JOIN ad_slots s ON b.slot_id = s.id
  `;
  query += where;
  query += ' ORDER BY b.created_at DESC';
  if (limit != null) {
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset || 0);
  }
  return all(query, params);
}

/**
 * Shared WHERE builder for booking admin queries. `status` accepts the
 * pseudo-status 'trialing' (live bookings whose billing is still in trial).
 * `search` is an escaped case-insensitive substring match on email/company.
 */
function bookingWhere({ status = null, siteSlug = null, search = null } = {}) {
  const params = [];
  const conditions = [];
  if (status === 'trialing') {
    conditions.push(`b.status = 'live' AND b.billing_status = 'trialing'`);
  } else if (status) {
    conditions.push(`b.status = $${params.length + 1}`);
    params.push(status);
  }
  if (siteSlug) {
    conditions.push(`b.site_slug = $${params.length + 1}`);
    params.push(siteSlug);
  }
  if (search) {
    const term = `%${String(search)
      .toLowerCase()
      .replace(/[%_\\]/g, (m) => `\\${m}`)}%`;
    conditions.push(
      `(LOWER(b.email) LIKE $${params.length + 1} ESCAPE '\\' OR LOWER(b.company_name) LIKE $${params.length + 2} ESCAPE '\\')`
    );
    params.push(term, term);
  }
  return { where: conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '', params };
}

async function getBookingCount({ status = null, siteSlug = null, search = null } = {}) {
  const { where, params } = bookingWhere({ status, siteSlug, search });
  const row = await get(`SELECT COUNT(*) as c FROM bookings b${where}`, params);
  return row?.c || 0;
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
  const byStatusRows = await all(
    `SELECT status, COUNT(*) as c FROM bookings WHERE 1=1${siteClause} GROUP BY status`,
    params
  );
  const byStatus = {};
  for (const row of byStatusRows) {
    byStatus[row.status] = Number(row.c) || 0;
  }

  return {
    totalLive: totalLiveRow?.c || 0,
    totalPending: totalPendingRow?.c || 0,
    totalPendingPayment: totalPendingPaymentRow?.c || 0,
    totalPendingUpload: totalPendingUploadRow?.c || 0,
    totalTrialing: totalTrialingRow?.c || 0,
    revenueCents: revenueRow?.c || 0,
    revenueDollars: ((revenueRow?.c || 0) / 100).toFixed(2),
    byStatus,
  };
}

async function getRevenueStats(days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString();

  // Independent aggregates — run concurrently (each is a cross-region round
  // trip on Postgres).
  const [daily, totalRevenueRow, totalBookingsRow] = await Promise.all([
    all(
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
    ),
    get(
      `
      SELECT COALESCE(SUM(amount_paid_cents), 0) as c
      FROM bookings
      WHERE status IN ('live', 'ended', 'approved')
    `
    ),
    get(
      `
      SELECT COUNT(*) as c
      FROM bookings
      WHERE status IN ('live', 'ended', 'approved')
    `
    ),
  ]);

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
  getBookingCount,
  getBookingStats,
  getRevenueStats,
  hashToken,
};
