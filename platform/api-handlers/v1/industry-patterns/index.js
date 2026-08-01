/**
 * GET /api/v1/industry-patterns
 *
 * Returns the full generated industry-pattern map: sectors, industries with
 * weighted members, and per-entry profiles. Used by the flagship Patterns
 * pages, advertisers mapping temple constellations, and researchers.
 */

const { createApiHandler } = require('../../../api/api-handler.js');
const { success, error } = require('../../../api/api-response.js');
const industryPatternService = require('../../../api/industry-pattern-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const graph = industryPatternService.getFullPatterns();
  if (!graph) {
    error(res, 'NOT_FOUND', 'Industry-pattern map is not available.', { status: 404 });
    return;
  }

  success(res, graph, {
    links: {
      self: '/api/v1/industry-patterns',
      industries: '/api/v1/industry-patterns/industries',
      similarities: '/api/v1/similarities',
    },
  });
});
