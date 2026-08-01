/**
 * /api/v2/* — single catch-all serverless function for API v2.
 *
 * The 16 explicit-route shims that used to sit beside this file were pure
 * createV2Route() delegations to the same route() used here, so this
 * catch-all already covers every path they served (names, sites, pantheons,
 * tiers, convert(+batch), autocomplete, health, version, openapi.json,
 * search/web, and the root docs). They now live under
 * platform/api-handlers/v2/ for anyone who needs to require a path-scoped
 * handler directly; Vercel traffic for all /api/v2/* paths resolves here.
 */

const { createApiHandler } = require('../../platform/api/api-handler.js');
const { route } = require('../../platform/api/api-v2-router.js');

module.exports = createApiHandler(route, { version: 'v2' });
