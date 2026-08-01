const { recordTenantAdEvent } = require('../../../../../api/tenant-ads-service');
const { handleError, setCors } = require('../../../../../../api/_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ad ID' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { eventType } = req.body || {};
    if (!['impression', 'click'].includes(eventType)) {
      return res.status(400).json({ error: 'eventType must be impression or click' });
    }

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    recordTenantAdEvent({
      tenantAdId: id,
      eventType,
      ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers.referer,
    });

    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
};
