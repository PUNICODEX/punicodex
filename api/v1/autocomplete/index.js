/**
 * GET /api/v1/autocomplete
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const { validateAutocompleteQuery } = require('../../../platform/api/api-validation.js');
const namesService = require('../../../platform/api/names-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const { params, errors } = validateAutocompleteQuery(req.query);
  if (errors.length > 0) {
    error(res, 'VALIDATION_ERROR', 'Invalid query parameters.', {
      status: 400,
      details: { errors },
    });
    return;
  }

  success(res, namesService.autocompleteNames(params));
});
