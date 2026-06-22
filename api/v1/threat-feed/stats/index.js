/**
 * GET /api/v1/threat-feed/stats
 *
 * Aggregated counts of threat feed events.
 */

const { createApiHandler } = require('../../../../platform/api/api-handler.js');
const { handleThreatFeedStats } = require('../../../../platform/api/threat-routes.js');
const { error } = require('../../../../platform/api/api-response.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }
  handleThreatFeedStats(req, res);
});
