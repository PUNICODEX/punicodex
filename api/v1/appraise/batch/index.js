/**
 * POST /api/v1/appraise/batch
 * Appraise multiple Unicode domains at once.
 */

const { createApiHandler } = require('../../../../platform/api/api-handler.js');
const { success, error } = require('../../../../platform/api/api-response.js');
const { validateAppraiseBatchBody } = require('../../../../platform/api/api-validation.js');
const { appraiseBatch } = require('../../../../platform/api/appraise.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'POST') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only POST is allowed.', { status: 405 });
    return;
  }

  const { params, errors } = validateAppraiseBatchBody(req.body);
  if (errors.length > 0) {
    error(res, 'VALIDATION_ERROR', 'Invalid request body.', { status: 400, details: { errors } });
    return;
  }

  const result = appraiseBatch(params.domains);
  success(res, result.items, {
    meta: { count: result.count, requested: result.requested },
    links: { self: '/api/v1/appraise/batch' },
  });
});
