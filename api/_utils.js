const crypto = require('node:crypto');
const { validateAdminToken } = require('../platform/api/admin');
const { setLicenseHeaders, addLicenseToPayload } = require('../platform/api/license-headers.js');

// In production, 500 responses must not leak internal error details (stack
// fragments, SQL messages, file paths) to clients. The full error is always
// logged server-side; the client receives a generic message.
function isProduction() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
}

function handleError(res, err) {
  console.error('API error:', err);
  setLicenseHeaders(res);
  const message = isProduction() ? 'Internal server error' : err.message || 'Internal server error';
  res.status(500).json(addLicenseToPayload({ error: message }));
}

const ALLOWED_ORIGINS = new Set(
  (process.env.ALLOWED_ORIGINS || 'https://punycodex.com,http://localhost:3456')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, x-session-token, Authorization, x-admin-token, x-cron-secret'
  );
  res.setHeader('Vary', 'Origin');
  setLicenseHeaders(res);
}

async function requireAdmin(req, res) {
  const token = req.headers['x-admin-token'];
  if (!token || !(await validateAdminToken(token))) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

function constantTimeCompare(a, b) {
  const ah = crypto.createHash('sha256').update(a).digest();
  const bh = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ah, bh);
}

function requireCronSecret(req, res) {
  const secret = process.env.CRON_SECRET;
  const provided = req.headers['x-cron-secret'];
  if (!secret) {
    res.status(500).json({ error: 'Cron secret not configured' });
    return false;
  }
  if (!provided || !constantTimeCompare(secret, provided)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

function getRouteParam(req, name) {
  return req.query?.[name] ?? req.params?.[name] ?? undefined;
}

module.exports = { handleError, setCors, requireAdmin, requireCronSecret, getRouteParam };
