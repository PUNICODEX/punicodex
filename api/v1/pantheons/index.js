/**
 * GET /api/v1/pantheons
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success, error } = require('../../../platform/api/api-response.js');
const namesService = require('../../../platform/api/names-service.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }

  success(res, namesService.listPantheons());
});
