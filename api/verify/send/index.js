const bookingService = require('../../../platform/api/booking-service');
const { handleError, setCors } = require('../../_utils');
const { checkPublicRateLimitByReq } = require('../../../platform/api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!(await checkPublicRateLimitByReq(req, res, 'verify-send'))) return;
    const body = req.body || {};
    const result = await bookingService.sendVerification(body.email);
    return res.json(result);
  } catch (err) {
    if (err instanceof bookingService.BookingError) {
      return res.status(err.status).json({ error: err.message });
    }
    handleError(res, err);
  }
};
