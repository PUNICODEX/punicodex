/**
 * GET /api/v2/* — Optional catch-all route for API v2 (local/tests).
 * Explicit routes in this directory take precedence in Vercel deployments.
 */

const { createApiHandler } = require('../../platform/api/api-handler.js');
const { route } = require('../../platform/api/api-v2-router.js');

module.exports = createApiHandler(route, { version: 'v2' });
