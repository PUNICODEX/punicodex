const bookingService = require('../../platform/api/booking-service');
const { uploadBookingCreative, uploadSlotCreative } = require('../../platform/api/booking-upload');
const { handleError, setCors } = require('../_utils');
const { checkPublicRateLimitByReq } = require('../../platform/api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Vercel delivers the catch-all capture as one slash-joined STRING. Left
    // unsplit, `slugParts.length` is a character count and `slugParts[0]` is a
    // single letter, so every subpath here silently missed its route.
    let slugParts = req.query.slug || [];
    if (typeof slugParts === 'string') slugParts = slugParts.split('/').filter(Boolean);
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

      // POST /api/bookings/:token/upload
      if (slugParts.length === 2 && action === 'upload' && req.method === 'POST') {
        if (!(await checkPublicRateLimitByReq(req, res, 'booking-upload'))) return;
        const result = await uploadBookingCreative(token, body, {
          notifyAdminPending: () => Promise.resolve(),
        });
        return res.status(result.status).json(result.body);
      }

      // POST /api/bookings/:token/slot/:slotId/upload
      if (
        slugParts.length === 4 &&
        slugParts[1] === 'slot' &&
        slugParts[3] === 'upload' &&
        req.method === 'POST'
      ) {
        if (!(await checkPublicRateLimitByReq(req, res, 'booking-upload'))) return;
        const slotId = parseInt(slugParts[2], 10);
        const result = await uploadSlotCreative(token, slotId, body);
        return res.status(result.status).json(result.body);
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
