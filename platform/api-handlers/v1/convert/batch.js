/**
 * POST /api/v1/convert/batch
 */

const { createApiHandler } = require('../../../api/api-handler.js');
const { success, error } = require('../../../api/api-response.js');
const { validateBatchConvertBody } = require('../../../api/api-validation.js');
const namesService = require('../../../api/names-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
    return;
  }

  const { params, errors } = validateBatchConvertBody(req.body);
  if (errors.length > 0) {
    error(res, 'VALIDATION_ERROR', 'Invalid request body.', { status: 400, details: { errors } });
    return;
  }

  success(res, namesService.convertBatch(params));
});
