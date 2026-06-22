/**
 * POST /api/v1/threat-feed/ingest
 *
 * Ingest a threat event. Requires a valid API key.
 */

const { createApiHandler } = require('../../../../platform/api/api-handler.js');
const { handleThreatFeedIngest } = require('../../../../platform/api/threat-routes.js');
const { error } = require('../../../../platform/api/api-response.js');

module.exports = createApiHandler(
  async (req, res) => {
    if (req.method !== 'POST') {
      error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
      return;
    }
    handleThreatFeedIngest(req, res);
  },
  { requireAuth: true, scopes: ['threat:write'] }
);
