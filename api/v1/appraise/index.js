/**
 * GET /api/v1/appraise
 * Appraise a Unicode domain name.
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const { validateAppraiseQuery } = require('../../../platform/api/api-validation.js');
const { appraise } = require('../../../platform/api/appraise.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const { params, errors } = validateAppraiseQuery(req.query);
  if (errors.length > 0) {
    error(res, 'VALIDATION_ERROR', 'Invalid query parameters.', {
      status: 400,
      details: { errors },
    });
    return;
  }

  const result = appraise(params.q);
  if (result.error) {
    error(res, result.error, result.message, { status: 400 });
    return;
  }

  success(res, result, {
    links: { self: `/api/v1/appraise/?q=${encodeURIComponent(params.q)}` },
  });
});
