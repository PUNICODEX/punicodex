const marketplace = require('../../platform/api/marketplace');
const { getSessionToken, getOrCreateSession } = require('../../platform/api/search-v2');
const { handleError, setCors } = require('../_utils');
const { checkPublicRateLimitByReq } = require('../../platform/api/public-rate-limiter');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const allowed = await checkPublicRateLimitByReq(req, res, 'api-marketplace');
  if (!allowed) return;

  try {
    const token = getSessionToken(req);
    if (!token) return res.status(400).json({ error: 'Session token required' });
    const session = getOrCreateSession(token);
    if (!session) return res.status(400).json({ error: 'Invalid session' });

    const { action, entryId, domain } = req.query;

    if (req.method === 'GET') {
      if (action === 'listings') return res.json(marketplace.listPremiumListings());
      if (action === 'reviews' && entryId) return res.json(marketplace.getReviews(entryId));
      if (action === 'registrars' && domain) return res.json(marketplace.compareRegistrars(domain));
      const inquiries = marketplace.getLeaseInquiries(session.token);
      return res.json({ inquiries });
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.action === 'inquiry') {
        if (!body.entryId) return res.status(400).json({ error: 'entryId required' });
        const inquiry = marketplace.createLeaseInquiry(session.token, body);
        return res.status(201).json(inquiry);
      }
      if (body.action === 'review') {
        if (!body.entryId || !body.rating)
          return res.status(400).json({ error: 'entryId and rating required' });
        const review = marketplace.addReview(session.token, body);
        return res.status(201).json(review);
      }
      if (body.action === 'listing' && body.entryId) {
        const listing = marketplace.createPremiumListing(body.entryId, body);
        return res.status(201).json(listing);
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
