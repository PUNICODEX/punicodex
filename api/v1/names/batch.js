/**
 * POST /api/v1/names/batch
 * Look up multiple names by ID in a single request.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const namesService = require('../../../platform/api/names-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
    return;
  }

  const body = req.body || {};
  const ids = Array.isArray(body.ids) ? body.ids : [];

  if (ids.length === 0) {
    error(res, 'VALIDATION_ERROR', 'Request body must include a non-empty "ids" array.', {
      status: 400,
    });
    return;
  }

  if (ids.length > 100) {
    error(res, 'VALIDATION_ERROR', 'Maximum 100 IDs allowed per batch request.', {
      status: 400,
    });
    return;
  }

  const result = namesService.getNamesByIds(ids);
  success(res, result.found, {
    meta: {
      requested: ids.length,
      returned: result.count,
      missing: result.missing,
    },
  });
});
