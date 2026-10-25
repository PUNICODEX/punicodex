const bookingService = require('../../../../api/booking-service');
const {
  verifySendCooldownRemaining,
  stampVerifySend,
} = require('../../../../api/verified-sessions');
const { handleError, setCors } = require('../../../../../api/_utils');
const { checkPublicRateLimitByReq } = require('../../../../api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // The dedicated 'verify-send' bucket (5/hour/IP) replaces the generic
    // public tier: verification sends deliver email, so a tight cap bounds
    // inbox-bombing via IP rotation.
    if (!(await checkPublicRateLimitByReq(req, res, 'verify-send', { tier: 'verify-send' })))
      return;
    const body = req.body || {};
    // Per-email cooldown on top of the per-IP bucket (shared with the
    // Express server in verified-sessions.js).
    const remaining = await verifySendCooldownRemaining(body.email);
    if (remaining > 0) {
      return res
        .status(429)
        .json({ error: 'Please wait before requesting a new code.', retryAfterMs: remaining });
    }
    const result = await bookingService.sendVerification(body.email);
    await stampVerifySend(body.email);
    return res.json(result);
  } catch (err) {
    if (err instanceof bookingService.BookingError) {
      return res.status(err.status).json({ error: err.message });
    }
    handleError(res, err);
  }
};
