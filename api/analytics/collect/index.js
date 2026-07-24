const { recordPageView, recordEngagement } = require('../../../platform/api/site-analytics');
const { setCors } = require('../../_utils');
const { checkPublicRateLimitByReq } = require('../../../platform/api/public-rate-limiter');
const { getClientIp } = require('../../../platform/api/client-ip');

const MAX_BODY_LENGTH = 4096;

// The beacon may deliver JSON as a string (sendBeacon) or a pre-parsed
// object (Vercel body parsing). Both are accepted; anything else is dropped.
function parseBeaconBody(req) {
  let body = req.body;
  if (Buffer.isBuffer(body)) {
    body = body.toString('utf8');
  }
  if (typeof body === 'string') {
    if (body.length > MAX_BODY_LENGTH) {
      body = body.slice(0, MAX_BODY_LENGTH);
    }
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {};
  }
  return body;
}

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!(await checkPublicRateLimitByReq(req, res, 'analytics-collect'))) {
    return;
  }

  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = parseBeaconBody(req);
    if (body.t === 'eng') {
      await recordEngagement({
        path: body.p,
        sessionId: body.s,
        visibleMs: body.ms,
        scrollPct: body.sc,
        userAgent: req.headers['user-agent'],
      });
    } else {
      await recordPageView({
        path: body.p,
        referrer: body.r,
        sessionId: body.s,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
      });
    }
  } catch (err) {
    // Analytics must never 500 — log and still acknowledge the beacon.
    console.error('[site-analytics] collect failed:', err.message);
  }
  return res.status(204).end();
};
