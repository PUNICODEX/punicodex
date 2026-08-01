/**
 * GET /api/v1/names/:id/original-script
 */

const { createApiHandler } = require('../../../../api/api-handler.js');
const { success, error } = require('../../../../api/api-response.js');
const { validateId } = require('../../../../api/api-validation.js');
const namesService = require('../../../../api/names-service.js');

function getId(req) {
  return req.params?.id || req.query?.id || req.url.split('/')[req.url.split('/').length - 2];
}

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const { value: id, error: idError } = validateId(getId(req));
  if (idError) {
    error(res, 'VALIDATION_ERROR', idError.message, {
      status: 400,
      details: { errors: [idError] },
    });
    return;
  }

  const originalScript = namesService.getOriginalScriptForName(id);
  if (originalScript === null) {
    error(res, 'NOT_FOUND', `No entry found for id: ${id}`, { status: 404 });
    return;
  }

  success(res, originalScript);
});
