/**
 * PUNYCODEX Discovery Cron
 *
 * Idempotent cron endpoint for Vercel.
 * Queries CT logs for recently seen xn-- domains and queues them for crawling.
 * Keeps limits small so it completes within serverless timeouts.
 */
const { discoverFromCtLogs } = require('../../../platform/scripts/discover-domains');
const { runCron } = require('../_utils');

const DEFAULT_DAYS = 1;
const DEFAULT_MAX_DOMAINS = 200;

module.exports = runCron('cron/discover', { ttlMinutes: 30, nextRun: '24 hours' })(async (req) => {
  const days = Math.min(parseInt(req.query?.days, 10) || DEFAULT_DAYS, 7);
  const maxDomains = Math.min(parseInt(req.query?.maxDomains, 10) || DEFAULT_MAX_DOMAINS, 500);

  const result = await discoverFromCtLogs({ days, maxDomains });
  return { ...result, days, maxDomains };
});
