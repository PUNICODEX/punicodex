/**
 * GET /api/v1/authenticity
 * Endpoint map for the Authenticity API (homograph/confusable detection).
 */

const { createApiHandler } = require('../../../platform/api/api-handler.js');

module.exports = createApiHandler(async (req, res) => {
  if (req.method !== 'GET') {
    const { error } = require('../../../platform/api/api-response.js');
    error(res, 'METHOD_NOT_ALLOWED', 'Only GET is allowed.', { status: 405 });
    return;
  }
  res.status(200).json({
    service: 'PuniCodex Authenticity API',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/authenticity/check/?name={name}',
        summary: 'Check a name for homograph/confusable risk',
      },
      {
        method: 'POST',
        path: '/api/v1/authenticity/report/',
        summary: 'Full authenticity report for a name',
      },
      {
        method: 'POST',
        path: '/api/v1/authenticity/abuse-report/',
        summary: 'Report a false positive or abuse',
      },
    ],
    docs: '/api/v1/docs/',
    openapi: '/api/v1/openapi.json',
  });
});
