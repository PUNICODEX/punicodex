/**
 * /api/admin/* — single catch-all serverless function.
 *
 * The 65 admin handlers live under platform/api-handlers/admin/ (moved out of
 * api/ so Vercel ships one function bundle instead of one per file). This
 * router maps the incoming path (req.query.slug) back to the original
 * handler module:
 *
 *   /api/admin/login                       → login/index.js
 *   /api/admin/api-keys/:id/revoke         → api-keys/[id]/revoke.js
 *   /api/admin/portal/applications/:kind/:id/approve
 *                                          → portal/applications/[kind]/[id]/approve/index.js
 *
 * Matching mirrors Vercel filesystem-routing precedence: exact static paths
 * win over [param] patterns (e.g. portal/patrons/stats beats
 * portal/patrons/[id]). Captured bracket values are written to req.query
 * under their original folder names (id, kind) — exactly what Vercel dynamic
 * routes injected before — so handlers need no changes.
 *
 * Handlers are require()d lazily on first match: a cold start loads only the
 * handler that serves it. The literal require calls inside the load thunks
 * keep every handler visible to Vercel's static bundle tracing. CORS and
 * OPTIONS stay with the handlers (each sets its own headers and answers
 * preflights), preserving per-route behavior exactly.
 */

const ROUTES = [
  {
    segments: ['api-keys'],
    load: () => require('../../platform/api-handlers/admin/api-keys/index.js'),
  },
  {
    segments: ['api-keys', '[id]'],
    load: () => require('../../platform/api-handlers/admin/api-keys/[id]/index.js'),
  },
  {
    segments: ['api-keys', '[id]', 'revoke'],
    load: () => require('../../platform/api-handlers/admin/api-keys/[id]/revoke.js'),
  },
  {
    segments: ['api-keys', '[id]', 'unrevoke'],
    load: () => require('../../platform/api-handlers/admin/api-keys/[id]/unrevoke.js'),
  },
  {
    segments: ['api-keys', '[id]', 'usage'],
    load: () => require('../../platform/api-handlers/admin/api-keys/[id]/usage.js'),
  },
  {
    segments: ['authenticity', 'spoofs'],
    load: () => require('../../platform/api-handlers/admin/authenticity/spoofs/index.js'),
  },
  {
    segments: ['authenticity', 'spoofs', '[id]', 'review'],
    load: () =>
      require('../../platform/api-handlers/admin/authenticity/spoofs/[id]/review/index.js'),
  },
  {
    segments: ['bookings'],
    load: () => require('../../platform/api-handlers/admin/bookings/index.js'),
  },
  {
    segments: ['bookings', '[id]', 'approve'],
    load: () => require('../../platform/api-handlers/admin/bookings/[id]/approve/index.js'),
  },
  {
    segments: ['bookings', '[id]', 'approve-application'],
    load: () =>
      require('../../platform/api-handlers/admin/bookings/[id]/approve-application/index.js'),
  },
  {
    segments: ['bookings', '[id]', 'end'],
    load: () => require('../../platform/api-handlers/admin/bookings/[id]/end/index.js'),
  },
  {
    segments: ['bookings', '[id]', 'golive'],
    load: () => require('../../platform/api-handlers/admin/bookings/[id]/golive/index.js'),
  },
  {
    segments: ['bookings', '[id]', 'reject'],
    load: () => require('../../platform/api-handlers/admin/bookings/[id]/reject/index.js'),
  },
  {
    segments: ['bookings', '[id]', 'report'],
    load: () => require('../../platform/api-handlers/admin/bookings/[id]/report/index.js'),
  },
  {
    segments: ['lease-expiry'],
    load: () => require('../../platform/api-handlers/admin/lease-expiry/index.js'),
  },
  { segments: ['login'], load: () => require('../../platform/api-handlers/admin/login/index.js') },
  {
    segments: ['logout'],
    load: () => require('../../platform/api-handlers/admin/logout/index.js'),
  },
  {
    segments: ['observability'],
    load: () => require('../../platform/api-handlers/admin/observability/index.js'),
  },
  {
    segments: ['portal', 'analytics'],
    load: () => require('../../platform/api-handlers/admin/portal/analytics/index.js'),
  },
  {
    segments: ['portal', 'applications'],
    load: () => require('../../platform/api-handlers/admin/portal/applications/index.js'),
  },
  {
    segments: ['portal', 'applications', '[kind]', '[id]', 'approve'],
    load: () =>
      require('../../platform/api-handlers/admin/portal/applications/[kind]/[id]/approve/index.js'),
  },
  {
    segments: ['portal', 'applications', '[kind]', '[id]', 'reject'],
    load: () =>
      require('../../platform/api-handlers/admin/portal/applications/[kind]/[id]/reject/index.js'),
  },
  {
    segments: ['portal', 'arbitrage'],
    load: () => require('../../platform/api-handlers/admin/portal/arbitrage/index.js'),
  },
  {
    segments: ['portal', 'arbitrage', '[id]', 'status'],
    load: () => require('../../platform/api-handlers/admin/portal/arbitrage/[id]/status/index.js'),
  },
  {
    segments: ['portal', 'bookings'],
    load: () => require('../../platform/api-handlers/admin/portal/bookings/index.js'),
  },
  {
    segments: ['portal', 'bookings', '[id]', 'approve'],
    load: () => require('../../platform/api-handlers/admin/portal/bookings/[id]/approve/index.js'),
  },
  {
    segments: ['portal', 'bookings', '[id]', 'approve-application'],
    load: () =>
      require('../../platform/api-handlers/admin/portal/bookings/[id]/approve-application/index.js'),
  },
  {
    segments: ['portal', 'bookings', '[id]', 'end'],
    load: () => require('../../platform/api-handlers/admin/portal/bookings/[id]/end/index.js'),
  },
  {
    segments: ['portal', 'bookings', '[id]', 'golive'],
    load: () => require('../../platform/api-handlers/admin/portal/bookings/[id]/golive/index.js'),
  },
  {
    segments: ['portal', 'bookings', '[id]', 'approve-live'],
    load: () =>
      require('../../platform/api-handlers/admin/portal/bookings/[id]/approve-live/index.js'),
  },
  {
    segments: ['portal', 'bookings', '[id]', 'reject'],
    load: () => require('../../platform/api-handlers/admin/portal/bookings/[id]/reject/index.js'),
  },
  {
    segments: ['portal', 'bookings', '[id]', 'report'],
    load: () => require('../../platform/api-handlers/admin/portal/bookings/[id]/report/index.js'),
  },
  {
    segments: ['portal', 'careers'],
    load: () => require('../../platform/api-handlers/admin/portal/careers/index.js'),
  },
  {
    segments: ['portal', 'careers', '[id]', 'status'],
    load: () => require('../../platform/api-handlers/admin/portal/careers/[id]/status/index.js'),
  },
  {
    segments: ['portal', 'dashboard'],
    load: () => require('../../platform/api-handlers/admin/portal/dashboard/index.js'),
  },
  {
    segments: ['portal', 'discounts'],
    load: () => require('../../platform/api-handlers/admin/portal/discounts/index.js'),
  },
  {
    segments: ['portal', 'discounts', '[id]'],
    load: () => require('../../platform/api-handlers/admin/portal/discounts/[id]/index.js'),
  },
  {
    segments: ['portal', 'discounts', '[id]', 'redemptions'],
    load: () =>
      require('../../platform/api-handlers/admin/portal/discounts/[id]/redemptions/index.js'),
  },
  {
    segments: ['portal', 'discounts', '[id]', 'pitch'],
    load: () => require('../../platform/api-handlers/admin/portal/discounts/[id]/pitch/index.js'),
  },
  {
    segments: ['portal', 'login'],
    load: () => require('../../platform/api-handlers/admin/portal/login/index.js'),
  },
  {
    segments: ['portal', 'logout'],
    load: () => require('../../platform/api-handlers/admin/portal/logout/index.js'),
  },
  {
    segments: ['portal', 'me'],
    load: () => require('../../platform/api-handlers/admin/portal/me/index.js'),
  },
  {
    segments: ['portal', 'me', 'password'],
    load: () => require('../../platform/api-handlers/admin/portal/me/password/index.js'),
  },
  {
    segments: ['portal', 'merch'],
    load: () => require('../../platform/api-handlers/admin/portal/merch/index.js'),
  },
  {
    segments: ['portal', 'merch', '[id]', 'withdraw'],
    load: () => require('../../platform/api-handlers/admin/portal/merch/[id]/withdraw/index.js'),
  },
  {
    segments: ['portal', 'newsletter'],
    load: () => require('../../platform/api-handlers/admin/portal/newsletter/index.js'),
  },
  {
    segments: ['portal', 'newsletter', 'export'],
    load: () => require('../../platform/api-handlers/admin/portal/newsletter/export/index.js'),
  },
  {
    segments: ['portal', 'patrons'],
    load: () => require('../../platform/api-handlers/admin/portal/patrons/index.js'),
  },
  {
    segments: ['portal', 'patrons', '[id]'],
    load: () => require('../../platform/api-handlers/admin/portal/patrons/[id]/index.js'),
  },
  {
    segments: ['portal', 'patrons', 'stats'],
    load: () => require('../../platform/api-handlers/admin/portal/patrons/stats/index.js'),
  },
  {
    segments: ['portal', 'scholars', '[kind]', '[id]', 'approve'],
    load: () =>
      require('../../platform/api-handlers/admin/portal/scholars/[kind]/[id]/approve/index.js'),
  },
  {
    segments: ['portal', 'scholars', '[kind]', '[id]', 'reject'],
    load: () =>
      require('../../platform/api-handlers/admin/portal/scholars/[kind]/[id]/reject/index.js'),
  },
  {
    segments: ['portal', 'scholars', 'pending'],
    load: () => require('../../platform/api-handlers/admin/portal/scholars/pending/index.js'),
  },
  {
    segments: ['portal', 'security'],
    load: () => require('../../platform/api-handlers/admin/portal/security/index.js'),
  },
  {
    segments: ['portal', 'store-orders'],
    load: () => require('../../platform/api-handlers/admin/portal/store-orders/index.js'),
  },
  {
    segments: ['portal', 'store-orders', '[id]'],
    load: () => require('../../platform/api-handlers/admin/portal/store-orders/[id]/index.js'),
  },
  {
    segments: ['portal', 'store-orders', '[id]', 'retry-fulfillment'],
    load: () =>
      require('../../platform/api-handlers/admin/portal/store-orders/[id]/retry-fulfillment/index.js'),
  },
  {
    segments: ['portal', 'tenant-requests'],
    load: () => require('../../platform/api-handlers/admin/portal/tenant-requests/index.js'),
  },
  {
    segments: ['portal', 'tenant-requests', '[id]', 'approve'],
    load: () =>
      require('../../platform/api-handlers/admin/portal/tenant-requests/[id]/approve/index.js'),
  },
  {
    segments: ['portal', 'tenant-requests', '[id]', 'reject'],
    load: () =>
      require('../../platform/api-handlers/admin/portal/tenant-requests/[id]/reject/index.js'),
  },
  {
    segments: ['portal', 'tenants'],
    load: () => require('../../platform/api-handlers/admin/portal/tenants/index.js'),
  },
  {
    segments: ['portal', 'users'],
    load: () => require('../../platform/api-handlers/admin/portal/users/index.js'),
  },
  {
    segments: ['portal', 'users', '[id]'],
    load: () => require('../../platform/api-handlers/admin/portal/users/[id]/index.js'),
  },
  {
    segments: ['portal', 'users', '[id]', 'disable'],
    load: () => require('../../platform/api-handlers/admin/portal/users/[id]/disable/index.js'),
  },
  {
    segments: ['portal', 'users', '[id]', 'reset-password'],
    load: () =>
      require('../../platform/api-handlers/admin/portal/users/[id]/reset-password/index.js'),
  },
  {
    segments: ['revenue'],
    load: () => require('../../platform/api-handlers/admin/revenue/index.js'),
  },
  {
    segments: ['analytics', 'rollup'],
    load: () => require('../../platform/api-handlers/admin/analytics/rollup.js'),
  },
  {
    segments: ['analytics', 'retention'],
    load: () => require('../../platform/api-handlers/admin/analytics/retention.js'),
  },
  {
    segments: ['trial-reminders'],
    load: () => require('../../platform/api-handlers/admin/trial-reminders/index.js'),
  },
];

// Exact static matches take precedence, mirroring Vercel's predefined >
// dynamic segment precedence.
const STATIC = new Map();
const DYNAMIC = [];
for (const route of ROUTES) {
  if (route.segments.some((s) => /^\[.+\]$/.test(s))) DYNAMIC.push(route);
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
      const bracket = /^\[(.+)\]$/.exec(route.segments[i]);
      if (bracket) params[bracket[1]] = parts[i];
      else if (route.segments[i] !== parts[i]) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return null;
}

// Dev cold-start self-check: the table must cover every handler file under
// platform/api-handlers/admin (and nothing else). Runs outside production
// only; skipped on Vercel where the bundle has no full tree to walk.
function selfCheck() {
  const fs = require('node:fs');
  const path = require('node:path');
  const base = path.join(__dirname, '..', '..', 'platform', 'api-handlers', 'admin');
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
    if (seen.has(pattern)) throw new Error(`duplicate admin route: ${pattern}`);
    seen.add(pattern);
    if (!expected.has(pattern)) throw new Error(`admin route has no handler file: ${pattern}`);
    expected.delete(pattern);
  }
  for (const missing of expected) {
    throw new Error(`admin handler not registered in catch-all router: ${missing}`);
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
    const { handleError } = require('../_utils.js');
    return handleError(res, err);
  }
};

// Exposed for the router unit tests.
module.exports.matchRoute = matchRoute;
module.exports.selfCheck = selfCheck;
