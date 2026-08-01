/**
 * GET /api/v1/version
 */

const { createApiHandler } = require('../../../api/api-handler.js');
const { success, error } = require('../../../api/api-response.js');
const versionService = require('../../../api/version-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  success(res, versionService.getVersion());
});
