const { recordClick } = require('../../../api/ltr-service');
const { handleError, setCors } = require('../../../../api/_utils');

module.exports = (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, siteId, position, source } = req.body || {};
    if (!query || !siteId) {
      return res.status(400).json({ error: 'query and siteId required' });
    }

    const sessionToken = req.headers['x-session-token'] || req.body?.sessionToken || null;

    recordClick({
      query: query.trim(),
      siteId: parseInt(siteId, 10),
      position: parseInt(position || 0, 10),
      source: source || 'search',
      sessionToken,
    });

    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
};
