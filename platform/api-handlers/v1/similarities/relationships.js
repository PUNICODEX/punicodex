/**
 * GET /api/v1/similarities/relationships
 *
 * Lists the distinct relationship types present in the similarity graph,
 * with their categories and edge counts.
 */

const { createApiHandler } = require('../../../api/api-handler.js');
const { success, error } = require('../../../api/api-response.js');
const similarityService = require('../../../api/similarity-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const result = similarityService.listRelationshipTypes();
  success(
    res,
    {
      count: result.length,
      items: result,
    },
    {
      links: {
        self: '/api/v1/similarities/relationships',
      },
    }
  );
});
