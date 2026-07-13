/**
 * GET /api/v1/connections/taxonomy
 *
 * Returns the canonical concept taxonomy used by the Connections graph:
 * domains, concept arms, and the raw relationship -> concept mapping.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const { getTaxonomy } = require('../../../platform/api/similarity-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const taxonomy = getTaxonomy();
  if (!taxonomy) {
    error(res, 'NOT_FOUND', 'Connection taxonomy is not available.', { status: 404 });
    return;
  }

  success(res, taxonomy, {
    links: {
      self: '/api/v1/connections/taxonomy',
      graph: '/api/v1/names/{id}/graph',
      similarities: '/api/v1/names/{id}/similarities',
    },
  });
});
