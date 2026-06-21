const bookingService = require('../../platform/api/booking-service');
const { handleError, setCors } = require('../_utils');
const { checkPublicRateLimitByReq } = require('../../platform/api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action } = req.query;
    const body = req.body || {};

    if (action === 'send') {
      if (!(await checkPublicRateLimitByReq(req, res, 'verify-send'))) return;
      const result = await bookingService.sendVerification(body.email);
      return res.json(result);
    }

    if (action === 'check') {
      if (!(await checkPublicRateLimitByReq(req, res, 'verify-check'))) return;
      const result = await bookingService.checkVerification(body.email, body.code);
      return res.json(result);
    }

    return res.status(404).json({ error: 'Unknown verification action' });
  } catch (err) {
    if (err instanceof bookingService.BookingError) {
      return res.status(err.status).json({ error: err.message });
    }
    handleError(res, err);
  }
};
