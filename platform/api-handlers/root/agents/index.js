const { discoverCandidates } = require('../../../agents/scout');
const { verifyAvailability } = require('../../../agents/sentinel');
const { findGaps, suggestSources } = require('../../../agents/lore-curator');
const { createReport, completeReport, getReports } = require('../../../agents/research-assistant');
const { getSessionToken, getOrCreateSession } = require('../../../api/search-v2');
const { checkPublicRateLimitByReq } = require('../../../api/public-rate-limiter');
const { handleError, setCors } = require('../../../../api/_utils');

// verifyAvailability performs real DNS lookups per row; cap the batch so an
// anonymous caller cannot turn this endpoint into an outbound DNS amplifier.
const SENTINEL_MAX_BATCH = 50;

function parseBatchSize(raw) {
  if (raw == null) return SENTINEL_MAX_BATCH;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.min(SENTINEL_MAX_BATCH, Math.max(1, Math.floor(value)));
}

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
      if (!(await checkPublicRateLimitByReq(req, res, 'agents-run', { tier: 'public-strict' })))
        return;
      if (agent === 'scout') {
        const { domains } = req.body || {};
        if (!Array.isArray(domains))
          return res.status(400).json({ error: 'domains array required' });
        const result = discoverCandidates(domains);
        return res.json(result);
      }
      if (agent === 'sentinel') {
        const batchSize = parseBatchSize(req.body?.batchSize);
        if (batchSize == null) return res.status(400).json({ error: 'batchSize must be a number' });
        const result = await verifyAvailability(batchSize);
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
