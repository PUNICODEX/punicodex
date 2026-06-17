const { discoverCandidates } = require('../../platform/agents/scout');
const { verifyAvailability } = require('../../platform/agents/sentinel');
const { findGaps, suggestSources } = require('../../platform/agents/lore-curator');
const {
  createReport,
  completeReport,
  getReports,
} = require('../../platform/agents/research-assistant');
const { getSessionToken, getOrCreateSession } = require('../../platform/api/search-v2');
const { handleError, setCors } = require('../_utils');

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = getSessionToken(req);
    if (!token) return res.status(400).json({ error: 'Session token required' });
    const session = getOrCreateSession(token);
    if (!session) return res.status(400).json({ error: 'Invalid session' });

    const { agent } = req.query;

    if (req.method === 'POST') {
      if (agent === 'scout') {
        const { domains } = req.body || {};
        if (!Array.isArray(domains))
          return res.status(400).json({ error: 'domains array required' });
        const result = discoverCandidates(domains);
        return res.json(result);
      }
      if (agent === 'sentinel') {
        const { batchSize } = req.body || {};
        const result = await verifyAvailability(batchSize || 50);
        return res.json({ checked: result.length, results: result });
      }
      if (agent === 'lore-curator') {
        const gaps = findGaps();
        return res.json({ gaps: gaps.map((g) => ({ ...g, suggestions: suggestSources(g) })) });
      }
      if (agent === 'research') {
        const { topic } = req.body || {};
        if (!topic) return res.status(400).json({ error: 'topic required' });
        const report = createReport(session.token, topic);
        const completed = completeReport(report.id);
        return res.json(completed);
      }
      return res.status(400).json({ error: 'Unknown agent' });
    }

    if (req.method === 'GET') {
      if (agent === 'research') {
        return res.json({ reports: getReports(session.token) });
      }
      return res.status(400).json({ error: 'Use POST to run agents' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    handleError(res, err);
  }
};
