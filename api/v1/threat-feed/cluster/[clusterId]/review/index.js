/**
 * POST /api/v1/threat-feed/cluster/:clusterId/review
 *
 * Update the review status of a cluster.
 */

const { createApiHandler } = require('../../../../../../platform/api/api-handler.js');
const {
  handleThreatFeedClusterReview,
} = require('../../../../../../platform/api/threat-routes.js');
const { error } = require('../../../../../../platform/api/api-response.js');

module.exports = createApiHandler(
  async (req, res) => {
    if (req.method !== 'POST') {
      error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
      return;
    }
    handleThreatFeedClusterReview(req, res);
  },
  { requireAuth: true, scopes: ['threat:write'] }
);
