/**
 * GET /api/v1/names
 * List and search Unicode name entries.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const { validateListNamesQuery } = require('../../../platform/api/api-validation.js');
const namesService = require('../../../platform/api/names-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const { params, errors } = validateListNamesQuery(req.query);
  if (errors.length > 0) {
    error(res, 'VALIDATION_ERROR', 'Invalid query parameters.', {
      status: 400,
      details: { errors },
    });
    return;
  }

  const result = namesService.listNames(params);
  success(res, result.items, {
    meta: {
      pagination: {
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        next:
          result.offset + result.limit < result.total
            ? `/api/v1/names/?limit=${result.limit}&offset=${result.offset + result.limit}`
            : null,
      },
    },
  });
});
