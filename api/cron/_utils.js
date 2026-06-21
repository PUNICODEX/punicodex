const { setCors, handleError, requireCronSecret } = require('../../_utils');
const { withCronLock } = require('../../platform/api/cron-single-flight');

/**
 * Standard wrapper for Vercel cron endpoints.
 *
 * - Handles CORS preflight
 * - Restricts to GET/POST
 * - Validates x-cron-secret
 * - Acquires a single-flight lock so overlapping invocations skip
 *
 * The handler should be an async function that receives (req) and returns
 * the JSON payload to merge under { success: true, ...result, nextRun }.
 */
function runCron(name, options = {}) {
  const ttlMinutes = options.ttlMinutes || 10;
  const nextRun = options.nextRun || '1 hour';

  return (handler) => async (req, res) => {
    setCors(req, res);
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    if (!requireCronSecret(req, res)) return;

    try {
      const skipped = await withCronLock(name, ttlMinutes, async () => {
        const result = await handler(req);
        res.json({ success: true, ...result, nextRun });
      });

      if (skipped) {
        res.json({
          success: true,
          skipped: true,
          reason: 'already-running',
          nextRun,
        });
      }
    } catch (err) {
      handleError(res, err);
    }
  };
}

module.exports = { runCron };
