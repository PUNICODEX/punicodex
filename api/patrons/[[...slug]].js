/**
 * /api/patrons — Patron wall + checkout serverless API (catch-all).
 *
 * Reached through vercel.json rewrites for every /api/patrons/* path,
 * including the trailing-slash variant /api/patrons/checkout/ that the
 * flagship patron templates POST to.
 *
 *   GET   /api/patrons/:templeId   — public temple patron wall (rate-limited)
 *   POST  /api/patrons/checkout    — create a Stripe patron checkout session
 *                                    (stricter rate limit; also matches the
 *                                    trailing-slash form)
 *   GET   /api/patrons             — admin list (?temple=&status=&limit=&offset=)
 *   PATCH /api/patrons/:id         — admin cancel/expire { status }
 *
 * The patrons migration is idempotent and runs on every cold start because
 * the Vercel SQLite database lives in ephemeral /tmp.
 */

const { handleError, setCors, requireAdmin } = require('../_utils');
const { getDb } = require('../../platform/db/connection');
const { migrate: migratePatrons } = require('../../platform/db/migrate-patrons');
const {
  PATRON_LIMIT_PER_TEMPLE,
  PATRON_ADMIN_STATUSES,
  listActivePatronsByTemple,
  countActivePatronsByTemple,
  listPatrons,
  countPatrons,
  setPatronStatus,
} = require('../../platform/api/patron-service');
const { createPatronCheckoutSession } = require('../../platform/api/stripe');
const { checkPublicRateLimitByReq } = require('../../platform/api/public-rate-limiter');
const { checkRateLimit } = require('../../platform/api/api-rate-limiter');
const { getClientIp } = require('../../platform/api/client-ip');

migratePatrons(getDb());

function setPatronsCors(req, res) {
  setCors(req, res);
  // The admin subroute uses PATCH; the shared CORS helper only advertises GET/POST.
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
}

// Stricter bucket for checkout session creation (Stripe outbound work).
async function checkCheckoutRateLimit(req, res) {
  const key = `patrons-checkout:${getClientIp(req)}`;
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
  setPatronsCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let slugParts = req.query.slug || [];
    if (typeof slugParts === 'string') slugParts = [slugParts];
    const body = req.body || {};

    // POST /api/patrons/checkout (and the trailing-slash variant)
    if (slugParts.length === 1 && slugParts[0] === 'checkout' && req.method === 'POST') {
      if (!(await checkCheckoutRateLimit(req, res))) return;
      const {
        templeId,
        email,
        displayName,
        title,
        message,
        amountCents,
        socialPlatform,
        socialUrl,
      } = body;
      const result = await createPatronCheckoutSession({
        templeId,
        email,
        displayName,
        title,
        message,
        amountCents,
        socialPlatform,
        socialUrl,
      });
      return res.json(result);
    }

    // GET /api/patrons — admin list with filters
    if (slugParts.length === 0 && req.method === 'GET') {
      if (!(await requireAdmin(req, res))) return;
      const { temple, status } = req.query || {};
      if (status && !PATRON_ADMIN_STATUSES.includes(status)) {
        return res
          .status(400)
          .json({ error: `status must be one of: ${PATRON_ADMIN_STATUSES.join(', ')}` });
      }
      const limit = Math.min(Math.max(parseInt(req.query?.limit, 10) || 100, 1), 500);
      const offset = Math.max(parseInt(req.query?.offset, 10) || 0, 0);
      const [items, total] = await Promise.all([
        listPatrons({ templeId: temple || null, status: status || null, limit, offset }),
        countPatrons({ templeId: temple || null, status: status || null }),
      ]);
      return res.json({ items, total, limit, offset });
    }

    // PATCH /api/patrons/:id — admin cancel/expire
    if (slugParts.length === 1 && req.method === 'PATCH') {
      if (!(await requireAdmin(req, res))) return;
      const id = parseInt(slugParts[0], 10);
      if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid patron id' });
      const { status } = body;
      const patron = await setPatronStatus(id, status);
      if (!patron) return res.status(404).json({ error: 'Patron not found' });
      return res.json({ patron });
    }

    // GET /api/patrons/:templeId — public patron wall
    if (slugParts.length === 1 && req.method === 'GET') {
      if (!(await checkPublicRateLimitByReq(req, res, 'patrons'))) return;
      const templeId = slugParts[0];
      const [patrons, activeCount] = await Promise.all([
        listActivePatronsByTemple(templeId),
        countActivePatronsByTemple(templeId),
      ]);
      return res.json({
        patrons,
        limit: PATRON_LIMIT_PER_TEMPLE,
        activeCount,
        remaining: Math.max(0, PATRON_LIMIT_PER_TEMPLE - activeCount),
        isFull: activeCount >= PATRON_LIMIT_PER_TEMPLE,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    handleError(res, err);
  }
};
