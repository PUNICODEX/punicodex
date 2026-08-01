/**
 * GET /api/v1/pantheons/:name
 */

const { createApiHandler } = require('../../../../api/api-handler.js');
const { success, error } = require('../../../../api/api-response.js');
const { validateString, VALID_PANTHEONS } = require('../../../../api/api-validation.js');
const namesService = require('../../../../api/names-service.js');

function getName(req) {
  const fromQuery = req.query?.name || req.params?.name;
  if (fromQuery) return fromQuery;
  // URL fallback: strip query string and any trailing slash first
  const pathname = req.url.split('?')[0].replace(/\/+$/, '');
  return pathname.split('/').pop();
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
