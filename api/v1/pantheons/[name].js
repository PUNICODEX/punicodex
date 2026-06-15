/**
 * GET /api/v1/pantheons/:name
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const { validateString, VALID_PANTHEONS } = require('../../../platform/api/api-validation.js');
const namesService = require('../../../platform/api/names-service.js');

function getName(req) {
  return req.params?.name || req.url.split('/').pop().split('?')[0];
}

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const name = getName(req);
  const nameErr = validateString(name, 'name', { required: true, allowed: VALID_PANTHEONS });
  if (nameErr) {
    error(res, 'VALIDATION_ERROR', nameErr.message, {
      status: 400,
      details: { errors: [nameErr] },
    });
    return;
  }

  success(res, namesService.getPantheon(name));
});
