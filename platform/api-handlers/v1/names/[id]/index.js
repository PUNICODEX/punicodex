/**
 * GET /api/v1/names/:id
 * Full scholarly record for a single entry.
 */

const { createApiHandler } = require('../../../../api/api-handler.js');
const { success, error } = require('../../../../api/api-response.js');
const { validateId } = require('../../../../api/api-validation.js');
const namesService = require('../../../../api/names-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  const { value: id, error: idError } = validateId(
    req.query?.id || req.params?.id || req.url.split('/').pop()
  );
  if (idError) {
    error(res, 'VALIDATION_ERROR', idError.message, {
      status: 400,
      details: { errors: [idError] },
    });
    return;
  }

  const entry = namesService.getName(id);
  if (!entry) {
    error(res, 'NOT_FOUND', `No entry found for id: ${id}`, { status: 404 });
    return;
  }

  success(res, entry);
});
