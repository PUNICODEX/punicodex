/**
 * GET /api/admin/portal/scholars/pending
 *
 * Scholarly review queues: pending edits and pending media uploads.
 */

const {
  setPortalCors,
  sendError,
  parseLimitOffset,
  portalAuth,
  portalService,
} = require('../../_portal.js');

module.exports = async (req, res) => {
  setPortalCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await portalAuth.requirePortal(req, res, 'read');
    if (!auth) return;
    const { limit } = parseLimitOffset(req);
    return res.json(portalService.getScholarsPending({ limit }));
  } catch (err) {
    sendError(res, err);
  }
};
