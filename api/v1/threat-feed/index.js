/**
 * GET /api/v1/threat-feed
 *
 * List threat feed events.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { handleThreatFeedList } = require('../../../platform/api/threat-routes.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    const { error } = require('../../../platform/api/api-response.js');
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }
  handleThreatFeedList(req, res);
});
