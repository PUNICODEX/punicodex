/**
 * Factory for explicit Vercel API v2 routes.
 *
 * The catch-all route works locally and in some Vercel configurations, but
 * explicit routes are the safest cross-deployment shape. This factory reuses
 * the same v2 router for every explicit path.
 */

const { createApiHandler } = require('./api-handler.js');
const { route } = require('./api-v2-router.js');

function createV2Route(slugTemplate) {
  return createApiHandler(
    async (req, res) => {
      // Vercel dynamic segments land in req.query.<param>
      const slug = slugTemplate.map((segment) => {
        if (typeof segment === 'string') return segment;
        // segment is { param: 'name' }
        const key = Object.values(segment)[0];
        return req.query[key] || '';
      });
      req.query.slug = slug;
      req.path = `/${slug.join('/')}`;
      await route(req, res);
    },
    { version: 'v2' }
  );
}

module.exports = { createV2Route };
