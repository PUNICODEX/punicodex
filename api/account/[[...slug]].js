/**
 * /api/account — Tenant portal serverless API (catch-all).
 *
 * Reached through vercel.json rewrites for every /api/account/* path,
 * including trailing-slash variants.
 *
 *   POST /api/account/auth/set-password   — one-time token → bcrypt hash + session
 *   POST /api/account/auth/login          — email + password → session (rate-limited)
 *   POST /api/account/auth/logout         — destroy the bearer session
 *   POST /api/account/auth/forgot         — issue a reset token + email (rate-limited)
 *   GET  /api/account/me                  — profile + owned resources summary
 *   GET  /api/account/analytics/space     — per owned slot / patron spot stats
 *   GET  /api/account/analytics/temple/:id — aggregate temple stats (owners only)
 *   GET  /api/account/analytics/slot/:id   — placement detail for one owned booking
 *                                            (also accepts ?id= on /analytics/slot/)
 *   GET  /api/account/analytics/site      — site-wide public-level aggregates
 *   GET  /api/account/requests            — own change requests with statuses
 *   POST /api/account/requests            — create a change request (ownership-checked)
 *   POST /api/account/patrons/:id/cancel  — cancel own patron membership (ownership-checked)
 *
 * The tenant portal migration is idempotent and runs on every cold start
 * because the Vercel SQLite database lives in ephemeral /tmp.
 */

const { handleError, setCors } = require('../_utils');
const { getDb } = require('../../platform/db/connection');
const { migrate: migrateTenantPortal } = require('../../platform/db/migrate-tenant-portal');
const tenantPortal = require('../../platform/api/tenant-portal');
const { checkRateLimit } = require('../../platform/api/api-rate-limiter');
const { getClientIp } = require('../../platform/api/client-ip');

migrateTenantPortal(getDb());

// Stricter bucket for credential endpoints (login/forgot), mirroring the
// patrons checkout limiter.
async function checkAuthRateLimit(req, res, bucket) {
  const key = `${bucket}:${getClientIp(req)}`;
  const result = await checkRateLimit(key, 'public-strict');

  res.setHeader('X-RateLimit-Limit', String(result.limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      error: 'Too many requests. Please slow down.',
      retryAfter,
    });
    return false;
  }
  return true;
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // SPLIT, not wrap: Vercel joins the capture with slashes, so wrapping
    // turned "analytics/abc" into the single segment ["analytics/abc"] and no
    // multi-segment account route ever matched.
    let slugParts = req.query.slug || [];
    if (typeof slugParts === 'string') slugParts = slugParts.split('/').filter(Boolean);
    const body = req.body || {};

    // ── Auth ──────────────────────────────────────────────────
    if (slugParts[0] === 'auth' && req.method === 'POST') {
      if (slugParts.length === 2 && slugParts[1] === 'set-password') {
        const { token, password } = body;
        return res.json(await tenantPortal.setPassword({ token, password }));
      }
      if (slugParts.length === 2 && slugParts[1] === 'login') {
        if (!(await checkAuthRateLimit(req, res, 'tenant-login'))) return;
        const { email, password } = body;
        return res.json(await tenantPortal.login({ email, password }));
      }
      if (slugParts.length === 2 && slugParts[1] === 'logout') {
        await tenantPortal.logout(tenantPortal.bearerToken(req));
        return res.json({ success: true });
      }
      if (slugParts.length === 2 && slugParts[1] === 'forgot') {
        if (!(await checkAuthRateLimit(req, res, 'tenant-forgot'))) return;
        const { email } = body;
        return res.json(await tenantPortal.forgot({ email }));
      }
    }

    // ── Profile ───────────────────────────────────────────────
    if (slugParts.length === 1 && slugParts[0] === 'me' && req.method === 'GET') {
      const account = await tenantPortal.requireAccount(req, res);
      if (!account) return;
      return res.json(await tenantPortal.getMe(account));
    }

    // ── Analytics ─────────────────────────────────────────────
    if (slugParts[0] === 'analytics' && req.method === 'GET') {
      const account = await tenantPortal.requireAccount(req, res);
      if (!account) return;

      if (slugParts.length === 2 && slugParts[1] === 'space') {
        return res.json(await tenantPortal.getSpaceAnalytics(account));
      }
      if (slugParts.length === 3 && slugParts[1] === 'temple') {
        return res.json(await tenantPortal.getTempleAnalytics(account, slugParts[2]));
      }
      // Placement detail: /analytics/slot/:id or /analytics/slot/?id=
      if (slugParts[1] === 'slot' && (slugParts.length === 2 || slugParts.length === 3)) {
        const bookingId = slugParts.length === 3 ? slugParts[2] : req.query.id;
        return res.json(await tenantPortal.getSlotAnalytics(account, bookingId));
      }
      if (slugParts.length === 2 && slugParts[1] === 'site') {
        return res.json(await tenantPortal.getSiteAnalytics());
      }
    }

    // ── Change requests ───────────────────────────────────────
    if (slugParts.length === 1 && slugParts[0] === 'requests') {
      const account = await tenantPortal.requireAccount(req, res);
      if (!account) return;

      if (req.method === 'GET') {
        return res.json({ items: await tenantPortal.listChangeRequests(account) });
      }
      if (req.method === 'POST') {
        const { type, target, payload } = body;
        const request = await tenantPortal.createChangeRequest(account, { type, target, payload });
        return res.status(201).json({ request });
      }
    }

    // ── Patron membership ─────────────────────────────────────
    if (slugParts[0] === 'patrons' && slugParts.length === 3 && slugParts[2] === 'cancel') {
      const account = await tenantPortal.requireAccount(req, res);
      if (!account) return;
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const { cancelPatron } = require('../../platform/api/digest-service');
      return res.json(await cancelPatron({ patronId: slugParts[1], email: account.email }));
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    handleError(res, err);
  }
};
