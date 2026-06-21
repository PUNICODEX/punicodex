const bookingService = require('../../platform/api/booking-service');
const { handleError, setCors } = require('../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const slugParts = req.query.slug || [];
    const siteSlug = req.query.site || null;

    if (slugParts.length === 0 && req.method === 'GET') {
      const result = await bookingService.listSlots(siteSlug);
      return res.json(result);
    }

    if (slugParts.length === 1 && req.method === 'GET') {
      const slot = await bookingService.getSlot(slugParts[0], siteSlug);
      return res.json(slot);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof bookingService.BookingError) {
      return res.status(err.status).json({ error: err.message });
    }
    handleError(res, err);
  }
};
