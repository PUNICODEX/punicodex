/**
 * GET /api/v1/threat-feed/stats
 *
 * Aggregated counts of threat feed events.
 */

const { createApiHandler } = require('../../../../api/api-handler.js');
const { handleThreatFeedStats } = require('../../../../api/threat-routes.js');
const { error } = require('../../../../api/api-response.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }
  handleThreatFeedStats(req, res);
});
