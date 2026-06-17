const {
  recordFeedback,
  updatePreferences,
  getSessionToken,
  getOrCreateSession,
} = require('../../../platform/api/search-v2');
const { handleError, setCors } = require('../../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = getSessionToken(req);
    const session = token ? getOrCreateSession(token) : null;
    if (!session) {
      return res.status(400).json({ error: 'Session token required' });
    }

    if (req.method === 'POST') {
      const { query, siteId, entryId, helpful, reason } = req.body || {};
      if (!query) return res.status(400).json({ error: 'query required' });
      recordFeedback(session.token, query, { siteId, entryId, helpful, reason });
      return res.json({ ok: true });
    }

    if (req.method === 'PATCH') {
      const prefs = req.body || {};
      const merged = updatePreferences(session.token, prefs);
      return res.json({ ok: true, preferences: merged });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
