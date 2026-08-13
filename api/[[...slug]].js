/**
 * /api/* — root catch-all serverless function for the single-file endpoint
 * namespaces (contact, store/*, sites/*, crawl/*, verify/*, game/ink/*,
 * entry/:id, tenant-ads/*, spam/*, and the one-file directories).
 *
 * The 39 handlers live under platform/api-handlers/root/ (moved out of api/
 * so Vercel ships one function bundle instead of one per file).
 * Matching mirrors Vercel filesystem routing: exact static paths win over
 * [param] patterns; captured bracket values are written back to req.query
 * under their original folder names, exactly what Vercel dynamic routes
 * injected before. Handlers are require()d lazily via literal-path thunks:
 * a cold start loads only the handler that serves it, and the literal
 * requires keep every handler visible to Vercel bundle tracing. Unknown
 * paths get the house JSON 404.
 *
 * ROUTING PRECEDENCE (load-bearing): Vercel ranks predefined filesystem
 * routes above dynamic routes, and dynamic routes above catch-alls, with
 * the most specific (deepest) match winning. Every namespace that kept real
 * files therefore continues to resolve to its own function BEFORE this root
 * catch-all is consulted: /api/cron/* (real files, pinned by vercel.json
 * crons), /api/webhook/*, /api/admin/*, /api/v1/*, /api/v2/*, /api/search/*,
 * /api/analytics/*, /api/crawler/*, /api/account/*, /api/patrons/*,
 * /api/slots/*, /api/bookings/* (their own catch-alls, several pinned by
 * vercel.json rewrites). This router only ever serves the registered table
 * above; anything else is a 404 — it is never a proxy.
 */

const ROUTES = [
  { segments: ['agents'], load: () => require('../platform/api-handlers/root/agents/index.js') },
  {
    segments: ['arbitrage', 'apply'],
    load: () => require('../platform/api-handlers/root/arbitrage/apply/index.js'),
  },
  {
    segments: ['careers', 'apply'],
    load: () => require('../platform/api-handlers/root/careers/apply/index.js'),
  },
  { segments: ['contact'], load: () => require('../platform/api-handlers/root/contact.js') },
  { segments: ['crawl'], load: () => require('../platform/api-handlers/root/crawl/index.js') },
  {
    segments: ['crawl', 'events'],
    load: () => require('../platform/api-handlers/root/crawl/events/index.js'),
  },
  {
    segments: ['crawl', 'recrawl'],
    load: () => require('../platform/api-handlers/root/crawl/recrawl/index.js'),
  },
  {
    segments: ['discount', 'validate'],
    load: () => require('../platform/api-handlers/root/discount/validate/index.js'),
  },
  {
    segments: ['ecosystem'],
    load: () => require('../platform/api-handlers/root/ecosystem/index.js'),
  },
  {
    segments: ['entry', '[id]'],
    load: () => require('../platform/api-handlers/root/entry/[id]/index.js'),
  },
  {
    segments: ['flagships'],
    load: () => require('../platform/api-handlers/root/flagships/index.js'),
  },
  {
    segments: ['game', 'ink', 'checkout'],
    load: () => require('../platform/api-handlers/root/game/ink/checkout/index.js'),
  },
  {
    segments: ['game', 'ink', 'redeem'],
    load: () => require('../platform/api-handlers/root/game/ink/redeem/index.js'),
  },
  {
    segments: ['gamification'],
    load: () => require('../platform/api-handlers/root/gamification/index.js'),
  },
  { segments: ['glyph'], load: () => require('../platform/api-handlers/root/glyph/index.js') },
  { segments: ['health'], load: () => require('../platform/api-handlers/root/health/index.js') },
  {
    segments: ['marketplace'],
    load: () => require('../platform/api-handlers/root/marketplace/index.js'),
  },
  {
    segments: ['newsletter', 'subscribe'],
    load: () => require('../platform/api-handlers/root/newsletter/subscribe.js'),
  },
  { segments: ['oracle'], load: () => require('../platform/api-handlers/root/oracle/index.js') },
  {
    segments: ['pantheons'],
    load: () => require('../platform/api-handlers/root/pantheons/index.js'),
  },
  {
    segments: ['partners'],
    load: () => require('../platform/api-handlers/root/partners/index.js'),
  },
  {
    segments: ['protocol'],
    load: () => require('../platform/api-handlers/root/protocol/index.js'),
  },
  {
    segments: ['security', 'csp-report'],
    load: () => require('../platform/api-handlers/root/security/csp-report/index.js'),
  },
  { segments: ['sites'], load: () => require('../platform/api-handlers/root/sites/index.js') },
  {
    segments: ['sites', '[punycode]', 'keywords'],
    load: () => require('../platform/api-handlers/root/sites/[punycode]/keywords/index.js'),
  },
  {
    segments: ['sites', '[punycode]', 'spam'],
    load: () => require('../platform/api-handlers/root/sites/[punycode]/spam/index.js'),
  },
  {
    segments: ['spam', 'classify'],
    load: () => require('../platform/api-handlers/root/spam/classify/index.js'),
  },
  {
    segments: ['spam', 'review'],
    load: () => require('../platform/api-handlers/root/spam/review/index.js'),
  },
  { segments: ['stats'], load: () => require('../platform/api-handlers/root/stats/index.js') },
  {
    segments: ['store', 'checkout'],
    load: () => require('../platform/api-handlers/root/store/checkout.js'),
  },
  {
    segments: ['store', 'orders'],
    load: () => require('../platform/api-handlers/root/store/orders.js'),
  },
  {
    segments: ['store', 'products'],
    load: () => require('../platform/api-handlers/root/store/products.js'),
  },
  { segments: ['submit'], load: () => require('../platform/api-handlers/root/submit/index.js') },
  {
    segments: ['tenant-ads'],
    load: () => require('../platform/api-handlers/root/tenant-ads/index.js'),
  },
  {
    segments: ['tenant-ads', '[id]'],
    load: () => require('../platform/api-handlers/root/tenant-ads/[id]/index.js'),
  },
  {
    segments: ['tenant-ads', '[id]', 'analytics'],
    load: () => require('../platform/api-handlers/root/tenant-ads/[id]/analytics/index.js'),
  },
  {
    segments: ['verify', 'check'],
    load: () => require('../platform/api-handlers/root/verify/check/index.js'),
  },
  {
    segments: ['verify', 'send'],
    load: () => require('../platform/api-handlers/root/verify/send/index.js'),
  },
  {
    segments: ['workspace'],
    load: () => require('../platform/api-handlers/root/workspace/index.js'),
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
// ../platform/api-handlers/root (and nothing else). Runs outside production only;
// skipped on Vercel where the bundle has no full tree to walk.
function selfCheck() {
  const fs = require('node:fs');
  const path = require('node:path');
  const base = path.join(__dirname, '..', 'platform', 'api-handlers', 'root');
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
  if (typeof parts === 'string') parts = parts.split('/').filter(Boolean);

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
    const { handleError } = require('./_utils.js');
    return handleError(res, err);
  }
};

// Exposed for the router unit tests.
module.exports.matchRoute = matchRoute;
module.exports.selfCheck = selfCheck;
