/**
 * GET /api/v1/similarities
 *
 * Returns the full generated cross-cultural similarity graph:
 * nodes (deities) and edges (relationships), plus metadata.
 * Used by the /connections/ visual atlas.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const similarityService = require('../../../platform/api/similarity-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const graph = similarityService.getFullGraph();
  if (!graph) {
    error(res, 'NOT_FOUND', 'Similarity graph is not available.', { status: 404 });
    return;
  }

  success(res, graph, {
    links: {
      self: '/api/v1/similarities',
      relationships: '/api/v1/similarities/relationships',
      taxonomy: '/api/v1/connections/taxonomy',
    },
  });
});
