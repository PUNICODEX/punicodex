/**
 * GET /api/admin/portal/newsletter
 *
 * Newsletter subscriber list (email, phone, source, subscribed date) with
 * ?limit=&offset= pagination. Read-gated like the patron roster (the only
 * other PII list in the portal); bulk export lives on the leasing-gated
 * /export route.
 */

const {
  setPortalCors,
  sendError,
  parseLimitOffset,
  portalAuth,
  getPortalService,
} = require('../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'read');
    if (!auth) return;

    const { limit, offset } = parseLimitOffset(req);
    return res.json(await getPortalService().listNewsletterSubscribers({ limit, offset }));
  } catch (err) {
    sendError(res, err);
  }
};
