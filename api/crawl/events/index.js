const {
  enqueueEvent,
  processPendingEvents,
} = require('../../../platform/api/event-crawler-service');
const { handleError, setCors, requireAdmin } = require('../../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Public webhook for external domain-change notifications
    if (req.method === 'POST') {
      const { source, domain, punycode, eventType, payload, priority } = req.body || {};
      if (!domain || !source) {
        return res.status(400).json({ error: 'domain and source are required' });
      }
      const id = enqueueEvent({
        source,
        domain,
        punycode,
        eventType: eventType || 'update',
        payload,
        priority: priority != null ? Number(priority) : 5,
      });
      return res.status(202).json({ id, status: 'pending' });
    }

    // Admin-only: process pending events synchronously
    if (req.method === 'PUT') {
      if (!(await requireAdmin(req, res))) return;
      const results = await processPendingEvents({ limit: 10 });
      return res.json({ processed: results.length, results });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
