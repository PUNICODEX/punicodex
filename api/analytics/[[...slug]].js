/**
 * /api/analytics/* — single catch-all serverless function.
 *
 * The 8 analytics endpoint handlers live under
 * platform/api-handlers/analytics/ (moved out of api/ so Vercel ships one
 * function bundle instead of one per file).
 * Matching mirrors Vercel filesystem routing: exact static paths win over
 * [param] patterns; captured bracket values are written back to req.query
 * under their original folder names, exactly what Vercel dynamic routes
 * injected before. Handlers are require()d lazily via literal-path thunks:
 * a cold start loads only the handler that serves it, and the literal
 * requires keep every handler visible to Vercel bundle tracing. Unknown
 * paths get the house JSON 404.
 */

const ROUTES = [
  {
    segments: ['click'],
    load: () => require('../../platform/api-handlers/analytics/click/index.js'),
  },
  {
    segments: ['collect'],
    load: () => require('../../platform/api-handlers/analytics/collect/index.js'),
  },
  {
    segments: ['dashboard'],
    load: () => require('../../platform/api-handlers/analytics/dashboard/index.js'),
  },
  {
    segments: ['overview'],
    load: () => require('../../platform/api-handlers/analytics/overview/index.js'),
  },
  {
    segments: ['pixel.gif'],
    load: () => require('../../platform/api-handlers/analytics/pixel.gif/index.js'),
  },
  {
    segments: ['temple'],
    load: () => require('../../platform/api-handlers/analytics/temple/index.js'),
  },
  {
    segments: ['trending'],
    load: () => require('../../platform/api-handlers/analytics/trending/index.js'),
  },
  {
    segments: ['viewability'],
    load: () => require('../../platform/api-handlers/analytics/viewability/index.js'),
  },
];

// Exact static matches take precedence, mirroring Vercel's predefined >
// dynamic segment precedence.
const STATIC = new Map();
const DYNAMIC = [];
for (const route of ROUTES) {
  const isDynamic = route.segments.some((s) => s.startsWith('[') && s.endsWith(']'));
  if (isDynamic) DYNAMIC.push(route);
  else STATIC.set(route.segments.join('/'), route);
}

function matchRoute(parts) {
  const exact = STATIC.get(parts.join('/'));
  if (exact) return { route: exact, params: {} };
  for (const route of DYNAMIC) {
    if (route.segments.length !== parts.length) continue;
    const params = {};
    let ok = true;
    for (let i = 0; i < parts.length; i++) {
      const seg = route.segments[i];
      if (seg.startsWith('[') && seg.endsWith(']')) params[seg.slice(1, -1)] = parts[i];
      else if (seg !== parts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return null;
}

// Dev cold-start self-check: the table must cover every handler file under
// ../../platform/api-handlers/analytics (and nothing else). Runs outside production only;
// skipped on Vercel where the bundle has no full tree to walk.
function selfCheck() {
  const fs = require('node:fs');
  const path = require('node:path');
  const base = path.join(__dirname, '..', '..', 'platform', 'api-handlers', 'analytics');
  const found = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.js')) found.push(p);
    }
  })(base);
  const expected = new Set(
    found.map((f) => {
      const rel = path.relative(base, f).split(path.sep).join('/');
      return rel.endsWith('/index.js')
        ? rel.slice(0, -'/index.js'.length)
        : rel.slice(0, -'.js'.length);
    })
  );
  const seen = new Set();
  for (const route of ROUTES) {
    const pattern = route.segments.join('/');
    if (seen.has(pattern)) throw new Error(`duplicate route: ${pattern}`);
    seen.add(pattern);
    if (!expected.has(pattern)) throw new Error(`route has no handler file: ${pattern}`);
    expected.delete(pattern);
  }
  for (const missing of expected) {
    throw new Error(`handler not registered in catch-all router: ${missing}`);
  }
}

if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') selfCheck();

module.exports = async (req, res) => {
  let parts = req.query.slug || [];
  if (typeof parts === 'string') parts = [parts];

  const match = matchRoute(parts);
  if (!match) {
    return res.status(404).json({ error: 'Not found' });
  }

  // Vercel's dynamic routes injected captured segments into req.query under
  // the bracket names; restore that contract before delegating.
  for (const [name, value] of Object.entries(match.params)) {
    req.query[name] = value;
  }

  try {
    return await match.route.load()(req, res);
  } catch (err) {
    // Handlers catch their own errors; this guards module-load failures only.
    const { handleError } = require('../_utils.js');
    return handleError(res, err);
  }
};

// Exposed for the router unit tests.
module.exports.matchRoute = matchRoute;
module.exports.selfCheck = selfCheck;
