/**
 * /api/v1/* — single catch-all serverless function.
 *
 * The 51 public v1 endpoint handlers live under platform/api-handlers/v1/
 * (moved out of api/ so Vercel ships one function bundle instead of one per
 * file). This router maps the incoming path (req.query.slug) back to the
 * original handler module:
 *
 *   /api/v1/names                          → names/index.js
 *   /api/v1/names/:id/variants             → names/[id]/variants.js
 *   /api/v1/threat-feed/campaigns/:identityId
 *                                          → threat-feed/campaigns/[identityId]/index.js
 *
 * Real files in this directory — scholars.js, creatives.js, openapi.json.js —
 * outrank the catch-all under Vercel's routing precedence, so the
 * vercel.json rewrites for /api/v1/scholars/* and /api/v1/creatives/* keep
 * hitting their dedicated bundles untouched.
 *
 * Matching mirrors Vercel filesystem-routing precedence: exact static paths
 * win over [param] patterns. Captured bracket values are written to
 * req.query under their original folder names (id, name, identityId,
 * clusterId) — exactly what Vercel dynamic routes injected before — so
 * handlers need no changes. Each handler keeps its own createApiHandler
 * wrapper (auth, scopes, rate limits, caching, CORS), so per-route options
 * are preserved by construction.
 *
 * Handlers are require()d lazily on first match: a cold start loads only the
 * handler that serves it. The literal require calls inside the load thunks
 * keep every handler visible to Vercel's static bundle tracing.
 */

const ROUTES = [
  {
    segments: ['appraise'],
    load: () => require('../../platform/api-handlers/v1/appraise/index.js'),
  },
  {
    segments: ['appraise', 'batch'],
    load: () => require('../../platform/api-handlers/v1/appraise/batch/index.js'),
  },
  {
    segments: ['authenticity'],
    load: () => require('../../platform/api-handlers/v1/authenticity/index.js'),
  },
  {
    segments: ['authenticity', 'abuse-report'],
    load: () => require('../../platform/api-handlers/v1/authenticity/abuse-report/index.js'),
  },
  {
    segments: ['authenticity', 'check'],
    load: () => require('../../platform/api-handlers/v1/authenticity/check/index.js'),
  },
  {
    segments: ['authenticity', 'check', 'batch'],
    load: () => require('../../platform/api-handlers/v1/authenticity/check/batch/index.js'),
  },
  {
    segments: ['authenticity', 'report'],
    load: () => require('../../platform/api-handlers/v1/authenticity/report/index.js'),
  },
  {
    segments: ['authenticity', 'report', '[id]', 'pdf'],
    load: () => require('../../platform/api-handlers/v1/authenticity/report/[id]/pdf/index.js'),
  },
  {
    segments: ['autocomplete'],
    load: () => require('../../platform/api-handlers/v1/autocomplete/index.js'),
  },
  { segments: ['canary'], load: () => require('../../platform/api-handlers/v1/canary/index.js') },
  {
    segments: ['canonical-register'],
    load: () => require('../../platform/api-handlers/v1/canonical-register/index.js'),
  },
  { segments: ['cards'], load: () => require('../../platform/api-handlers/v1/cards/index.js') },
  {
    segments: ['cards', '[id]'],
    load: () => require('../../platform/api-handlers/v1/cards/[id]/index.js'),
  },
  {
    segments: ['connections', 'taxonomy'],
    load: () => require('../../platform/api-handlers/v1/connections/taxonomy.js'),
  },
  { segments: ['convert'], load: () => require('../../platform/api-handlers/v1/convert/index.js') },
  {
    segments: ['convert', 'batch'],
    load: () => require('../../platform/api-handlers/v1/convert/batch.js'),
  },
  { segments: ['docs'], load: () => require('../../platform/api-handlers/v1/docs/index.js') },
  {
    segments: ['industry-patterns'],
    load: () => require('../../platform/api-handlers/v1/industry-patterns/index.js'),
  },
  {
    segments: ['industry-patterns', 'industries'],
    load: () => require('../../platform/api-handlers/v1/industry-patterns/industries.js'),
  },
  {
    segments: ['industry-patterns', 'match'],
    load: () => require('../../platform/api-handlers/v1/industry-patterns/match.js'),
  },
  { segments: ['names'], load: () => require('../../platform/api-handlers/v1/names/index.js') },
  {
    segments: ['names', '[id]'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/index.js'),
  },
  {
    segments: ['names', '[id]', 'archaeology'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/archaeology.js'),
  },
  {
    segments: ['names', '[id]', 'availability'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/availability.js'),
  },
  {
    segments: ['names', '[id]', 'breakdown'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/breakdown.js'),
  },
  {
    segments: ['names', '[id]', 'etymology'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/etymology.js'),
  },
  {
    segments: ['names', '[id]', 'graph'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/graph.js'),
  },
  {
    segments: ['names', '[id]', 'lore'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/lore.js'),
  },
  {
    segments: ['names', '[id]', 'mythology'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/mythology.js'),
  },
  {
    segments: ['names', '[id]', 'original-script'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/original-script.js'),
  },
  {
    segments: ['names', '[id]', 'patterns'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/patterns.js'),
  },
  {
    segments: ['names', '[id]', 'pronunciation'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/pronunciation.js'),
  },
  {
    segments: ['names', '[id]', 'similarities'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/similarities.js'),
  },
  {
    segments: ['names', '[id]', 'site'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/site.js'),
  },
  {
    segments: ['names', '[id]', 'slots'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/slots.js'),
  },
  {
    segments: ['names', '[id]', 'variants'],
    load: () => require('../../platform/api-handlers/v1/names/[id]/variants.js'),
  },
  {
    segments: ['names', 'batch'],
    load: () => require('../../platform/api-handlers/v1/names/batch.js'),
  },
  {
    segments: ['pantheons'],
    load: () => require('../../platform/api-handlers/v1/pantheons/index.js'),
  },
  {
    segments: ['pantheons', '[name]'],
    load: () => require('../../platform/api-handlers/v1/pantheons/[name]/index.js'),
  },
  { segments: ['policy'], load: () => require('../../platform/api-handlers/v1/policy/index.js') },
  {
    segments: ['policy', 'evaluate'],
    load: () => require('../../platform/api-handlers/v1/policy/evaluate/index.js'),
  },
  {
    segments: ['similarities'],
    load: () => require('../../platform/api-handlers/v1/similarities/index.js'),
  },
  {
    segments: ['similarities', 'relationships'],
    load: () => require('../../platform/api-handlers/v1/similarities/relationships.js'),
  },
  {
    segments: ['threat-feed'],
    load: () => require('../../platform/api-handlers/v1/threat-feed/index.js'),
  },
  {
    segments: ['threat-feed', 'campaigns', '[identityId]'],
    load: () =>
      require('../../platform/api-handlers/v1/threat-feed/campaigns/[identityId]/index.js'),
  },
  {
    segments: ['threat-feed', 'cluster', '[clusterId]', 'review'],
    load: () =>
      require('../../platform/api-handlers/v1/threat-feed/cluster/[clusterId]/review/index.js'),
  },
  {
    segments: ['threat-feed', 'ingest'],
    load: () => require('../../platform/api-handlers/v1/threat-feed/ingest/index.js'),
  },
  {
    segments: ['threat-feed', 'stats'],
    load: () => require('../../platform/api-handlers/v1/threat-feed/stats/index.js'),
  },
  { segments: ['tiers'], load: () => require('../../platform/api-handlers/v1/tiers/index.js') },
  {
    segments: ['transparency-report'],
    load: () => require('../../platform/api-handlers/v1/transparency-report/index.js'),
  },
  { segments: ['version'], load: () => require('../../platform/api-handlers/v1/version/index.js') },
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
// platform/api-handlers/v1 (and nothing else). Runs outside production only;
// skipped on Vercel where the bundle has no full tree to walk.
function selfCheck() {
  const fs = require('node:fs');
  const path = require('node:path');
  const base = path.join(__dirname, '..', '..', 'platform', 'api-handlers', 'v1');
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
    if (seen.has(pattern)) throw new Error('duplicate v1 route: ' + pattern);
    seen.add(pattern);
    if (!expected.has(pattern)) throw new Error('v1 route has no handler file: ' + pattern);
    expected.delete(pattern);
  }
  for (const missing of expected) {
    throw new Error('v1 handler not registered in catch-all router: ' + missing);
  }
}

if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') selfCheck();

module.exports = async (req, res) => {
  let parts = req.query.slug || [];
  if (typeof parts === 'string') parts = parts.split('/').filter(Boolean);

  const match = matchRoute(parts);
  if (!match) {
    // v1 error envelope, required lazily so unmatched paths stay cheap.
    const { error } = require('../../platform/api/api-response.js');
    return error(res, 'NOT_FOUND', 'The requested resource was not found.', { status: 404 });
  }

  // Vercel's dynamic routes injected captured segments into req.query under
  // the bracket names; restore that contract before delegating.
  for (const [name, value] of Object.entries(match.params)) {
    req.query[name] = value;
  }

  return match.route.load()(req, res);
};

// Exposed for the router unit tests.
module.exports.matchRoute = matchRoute;
module.exports.selfCheck = selfCheck;
