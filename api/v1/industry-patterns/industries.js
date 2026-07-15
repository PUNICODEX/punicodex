/**
 * GET /api/v1/industry-patterns/industries
 *
 * Lists every industry in the pattern map with member counts — a directory
 * view for advertisers and researchers.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const industryPatternService = require('../../../platform/api/industry-pattern-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const industries = industryPatternService.listIndustries();
  if (!industries) {
    error(res, 'NOT_FOUND', 'Industry-pattern map is not available.', { status: 404 });
    return;
  }

  success(
    res,
    { count: industries.length, industries },
    {
      links: {
        self: '/api/v1/industry-patterns/industries',
        full: '/api/v1/industry-patterns',
      },
    }
  );
});
