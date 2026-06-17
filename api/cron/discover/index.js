/**
 * PUNYCODEX Discovery Cron
 *
 * Idempotent cron endpoint for Vercel.
 * Queries CT logs for recently seen xn-- domains and queues them for crawling.
 * Keeps limits small so it completes within serverless timeouts.
 */
const { discoverFromCtLogs } = require('../../../platform/scripts/discover-domains');
const { setCors, handleError } = require('../../_utils');

const DEFAULT_DAYS = 1;
const DEFAULT_MAX_DOMAINS = 200;

module.exports = async (req, res) => {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const days = Math.min(parseInt(req.query?.days, 10) || DEFAULT_DAYS, 7);
    const maxDomains = Math.min(parseInt(req.query?.maxDomains, 10) || DEFAULT_MAX_DOMAINS, 500);

    const result = await discoverFromCtLogs({ days, maxDomains });

    res.json({
      success: true,
      ...result,
      days,
      maxDomains,
      nextRun: '24 hours',
    });
  } catch (err) {
    handleError(res, err);
  }
};
