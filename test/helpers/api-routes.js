/**
 * Resolve an /api/... request path to the serverless function that serves it.
 *
 * The api/ tree mixes real per-path files (cron, webhook, the kept v1
 * bundles, slots/index.js) with catch-all routers ([[...slug]].js) whose
 * handler modules live under platform/api-handlers/. Resolution order
 * mirrors Vercel's filesystem routing precedence: deepest real file first,
 * then the namespace catch-alls (consulting their route tables), then the
 * root catch-all.
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..');

// Namespace prefix → catch-all router with an exported matchRoute table.
const TABLE_CATCH_ALLS = [
  ['api/admin', 'api/admin/[[...slug]].js'],
  ['api/v1', 'api/v1/[[...slug]].js'],
  ['api/search', 'api/search/[[...slug]].js'],
  ['api/analytics', 'api/analytics/[[...slug]].js'],
  ['api/crawler', 'api/crawler/[[...slug]].js'],
];

// Namespaces whose catch-all serves arbitrary subpaths at request time (no
// static table to consult; the router module itself answers 404s).
const PREFIX_CATCH_ALLS = ['api/v2', 'api/account', 'api/bookings', 'api/patrons', 'api/slots'];

// Routers are required once; their matchRoute is a pure function.
const routerCache = new Map();
function getMatcher(routerRel) {
  if (!routerCache.has(routerRel)) {
    const abs = path.join(ROOT, routerRel);
    if (!fs.existsSync(abs)) return null;
    routerCache.set(routerRel, require(abs).matchRoute || null);
  }
  return routerCache.get(routerRel);
}

/**
 * @param {string} literalBase - e.g. '/api/v1/names/' or '/api/store/products'
 * @returns {string|null} absolute path of the serving function file, or null
 */
function resolveApiHandler(literalBase) {
  const rel = literalBase.replace(/^\/+|\/+$/g, '');
  if (!rel.startsWith('api/')) return null;

  // 1. Real files on disk (exact .js or directory index.js).
  const asIndex = path.join(ROOT, rel, 'index.js');
  if (fs.existsSync(asIndex)) return asIndex;
  const asFile = path.join(ROOT, `${rel}.js`);
  if (fs.existsSync(asFile)) return asFile;

  // 2. Namespace catch-alls with route tables (deepest prefix first).
  for (const [prefix, routerRel] of TABLE_CATCH_ALLS) {
    if (rel === prefix || rel.startsWith(`${prefix}/`)) {
      const matchRoute = getMatcher(routerRel);
      if (!matchRoute) return null;
      const rest = rel === prefix ? [] : rel.slice(prefix.length + 1).split('/');
      return matchRoute(rest) ? path.join(ROOT, routerRel) : null;
    }
  }

  // 3. Prefix catch-alls without tables — any subpath resolves.
  for (const prefix of PREFIX_CATCH_ALLS) {
    if (rel === prefix || rel.startsWith(`${prefix}/`)) {
      const routerPath = path.join(ROOT, prefix, '[[...slug]].js');
      return fs.existsSync(routerPath) ? routerPath : null;
    }
  }

  // 4. Root catch-all for the consolidated single-file namespaces.
  const rootRouterRel = 'api/[[...slug]].js';
  const rootMatch = getMatcher(rootRouterRel);
  if (rootMatch?.(rel.slice('api/'.length).split('/'))) return path.join(ROOT, rootRouterRel);

  return null;
}

module.exports = { resolveApiHandler };
