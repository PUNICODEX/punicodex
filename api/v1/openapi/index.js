/**
 * GET /api/v1/openapi.json
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');
const { success } = require('../../../platform/api/api-response.js');
const openapi = require('../../../platform/api/openapi.json');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    const { error } = require('../../../platform/api/api-response.js');
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }
  success(res, openapi);
});
