/**
 * GET /api/v1/openapi.json
 * Vercel route: api/v1/openapi.json.js
 */

const { createApiHandler } = require('../../platform/api/api-handler.js');
const openapi = require('../../platform/api/openapi.json');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    const { error } = require('../../platform/api/api-response.js');
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }
  // Return the raw OpenAPI spec (not the API envelope) so Swagger UI can parse it.
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json(openapi);
});
