/**
 * GET /api/v1/threat-feed/campaigns/:identityId
 *
 * Graph query: all events impersonating an identity in the last N days.
 */

const { createApiHandler } = require('../../../../../api/api-handler.js');
const { handleThreatFeedCampaigns } = require('../../../../../api/threat-routes.js');
const { error } = require('../../../../../api/api-response.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }
  handleThreatFeedCampaigns(req, res);
});
