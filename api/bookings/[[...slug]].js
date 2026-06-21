const bookingService = require('../../platform/api/booking-service');
const { handleError, setCors } = require('../_utils');
const { checkPublicRateLimitByReq } = require('../../platform/api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const slugParts = req.query.slug || [];
    const body = req.body || {};

    // POST /api/bookings (create)
    if (slugParts.length === 0 && req.method === 'POST') {
      if (!(await checkPublicRateLimitByReq(req, res, 'bookings'))) return;
      const result = await bookingService.createBookingRequest(body);
      return res.json(result);
    }

    // POST /api/bookings/apply
    if (slugParts.length === 1 && slugParts[0] === 'apply' && req.method === 'POST') {
      if (!(await checkPublicRateLimitByReq(req, res, 'bookings'))) return;
      const result = await bookingService.applyBookingRequest(body);
      return res.json(result);
    }

    // POST /api/bookings/recover
    if (slugParts.length === 1 && slugParts[0] === 'recover' && req.method === 'POST') {
      if (!(await checkPublicRateLimitByReq(req, res, 'bookings-recover'))) return;
      const result = await bookingService.recoverBookings(body.email);
      return res.json(result);
    }

    // Token-level routes: /api/bookings/:token or /api/bookings/:token/:action
    if (slugParts.length >= 1) {
      const token = slugParts[0];
      const action = slugParts.length >= 2 ? slugParts[1] : null;

      if (slugParts.length === 1 && req.method === 'GET') {
        const booking = await bookingService.getBookingByTokenSafe(token);
        return res.json(booking);
      }

      if (slugParts.length === 2 && action === 'all' && req.method === 'GET') {
        const result = await bookingService.getAllBookingsByToken(token);
        return res.json(result);
      }

      if (slugParts.length === 2 && action === 'check-payment' && req.method === 'GET') {
        const result = await bookingService.checkBookingPayment(token);
        return res.json(result);
      }

      if (slugParts.length === 2 && action === 'slots' && req.method === 'GET') {
        const result = await bookingService.getBookingSlotCreatives(token);
        return res.json(result);
      }

      if (slugParts.length === 2 && action === 'meta' && req.method === 'POST') {
        if (!(await checkPublicRateLimitByReq(req, res, 'booking-meta'))) return;
        const result = await bookingService.updateBookingMeta(token, body);
        return res.json(result);
      }

      if (slugParts.length === 2 && action === 'cancel' && req.method === 'POST') {
        if (!(await checkPublicRateLimitByReq(req, res, 'booking-meta'))) return;
        const result = await bookingService.cancelBooking(token);
        return res.json(result);
      }

      if (slugParts.length === 2 && action === 'uncancel' && req.method === 'POST') {
        if (!(await checkPublicRateLimitByReq(req, res, 'booking-meta'))) return;
        const result = await bookingService.uncancelBooking(token);
        return res.json(result);
      }

      if (slugParts.length === 2 && action === 'renew' && req.method === 'POST') {
        if (!(await checkPublicRateLimitByReq(req, res, 'booking-meta'))) return;
        const result = await bookingService.renewBooking(token, body.extensionMonths);
        return res.json(result);
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof bookingService.BookingError) {
      return res.status(err.status).json({ error: err.message });
    }
    handleError(res, err);
  }
};
