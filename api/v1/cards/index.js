/**
 * GET /api/v1/cards
 * List and search the generated PuniCodex card set.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const cardsService = require('../../../platform/api/cards-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const result = cardsService.listCards(req.query || {});
  if (result.errors) {
    error(res, 'VALIDATION_ERROR', 'Invalid query parameters.', {
      status: 400,
      details: { errors: result.errors },
    });
    return;
  }

  success(res, result.items, {
    meta: {
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        next:
          result.offset + result.limit < result.total
            ? `/api/v1/cards/?limit=${result.limit}&offset=${result.offset + result.limit}`
            : null,
      },
    },
    links: {
      self: '/api/v1/cards',
    },
  });
});
