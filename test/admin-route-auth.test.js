/**
 * Admin Route Auth Contract Tests
 *
 * Regression contract: EVERY serverless route under api/admin/** rejects
 * unauthenticated requests. The suite walks the route tree (skipping
 * underscore-prefixed helper modules, which Vercel does not route), invokes
 * each handler with no credentials on every common method, and asserts:
 *
 *   1. no method ever returns a 2xx response without a token (OPTIONS
 *      preflight excepted — it must stay 200 for CORS);
 *   2. no method ever returns 5xx without a token (auth runs before any
 *      work that could throw);
 *   3. every handler answers 401 on at least one method — proof the route
 *      actually enforces auth rather than merely 405ing everything;
 *   4. OPTIONS preflight returns 200 without a token.
 *
 * The two login routes satisfy (3) naturally: a credential-less POST is a
 * failed login (401). If a future route ever ships without an auth check,
 * this suite fails on the file path.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

process.env.ADMIN_PASSWORD = 'test-route-auth-admin-password';
process.env.PUNICODEX_BCRYPT_ROUNDS = '4';
process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
process.env.PLATFORM_URL = 'https://punicodex.com';

const { prepareTestDb } = require('./helpers/test-db.js');
prepareTestDb(__filename);

// Mock the Stripe SDK before any route loads it (booking routes).
const stripeModulePath = require.resolve('stripe');
require.cache[stripeModulePath] = {
  id: stripeModulePath,
  filename: stripeModulePath,
  loaded: true,
  exports: () => ({
    checkout: {
      sessions: {
        create: async (config) => ({
          id: 'cs_test_route_auth',
          url: 'https://checkout.stripe.com/route-auth-mock',
          mode: config.mode || 'payment',
        }),
      },
    },
    webhooks: {
      constructEvent: (payload) => JSON.parse(payload),
    },
  }),
};

const { invoke } = require('./helpers/http.js');
const { resetLimiters } = require('../platform/api/api-rate-limiter.js');

const API_ADMIN_ROOT = path.join(__dirname, '..', 'api', 'admin');
const METHODS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];

function collectHandlers(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectHandlers(full));
    } else if (entry.name.endsWith('.js') && !entry.name.startsWith('_')) {
      files.push(full);
    }
  }
  return files;
}

// Rotating source IPs so the login routes' shared 'admin-login' rate-limit
// bucket (10/min/IP) never trips inside the sweep.
let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `10.66.${Math.floor(ipCounter / 250)}.${ipCounter % 250}`;
}

// Vercel routes [param] directories with the segment name as a query param.
// Values keep parameterized routes on their normal code path: [kind] must be
// a valid kind or the route 400s before auth runs (validation order is fine —
// the contract only needs one method to reach the auth check).
function paramsFor(relPath) {
  const params = {};
  for (const match of relPath.matchAll(/\[([^\]]+)\]/g)) {
    const name = match[1];
    if (name === 'kind') {
      params.kind = relPath.startsWith('portal/applications/')
        ? 'business'
        : relPath.startsWith('portal/scholars/')
          ? 'edit'
          : '1';
    } else {
      params[name] = '1';
    }
  }
  return params;
}

async function runTests() {
  console.log('\n▸ Admin Route Auth Contract Tests\n');
  resetLimiters();

  const handlers = collectHandlers(API_ADMIN_ROOT).sort();
  assert.ok(
    handlers.length >= 30,
    `expected the full api/admin route tree, found ${handlers.length}`
  );

  let failed = 0;
  for (const file of handlers) {
    const rel = path.relative(API_ADMIN_ROOT, file).replace(/\\/g, '/');
    const label = `api/admin/${rel}`;
    try {
      const handler = require(file);
      const params = paramsFor(rel);
      const url = `/api/admin/${rel.replace(/\/index\.js$/, '').replace(/\.js$/, '')}/`;

      let saw401 = false;
      for (const method of METHODS) {
        const res = await invoke(handler, method, url, {
          headers: { 'x-forwarded-for': nextIp() },
          params,
          body: method === 'GET' ? null : {},
        });
        assert.ok(
          res.status < 200 || res.status >= 300,
          `${method} returned ${res.status} without a token — unauthenticated 2xx`
        );
        assert.ok(
          res.status < 500,
          `${method} returned ${res.status} without a token — 5xx before auth`
        );
        if (res.status === 401) saw401 = true;
      }

      const preflight = await invoke(handler, 'OPTIONS', url, {
        headers: { 'x-forwarded-for': nextIp() },
        params,
      });
      assert.strictEqual(preflight.status, 200, 'OPTIONS preflight must stay 200');

      assert.ok(saw401, 'no method answered 401 — route may lack an auth check');
      console.log(`  ✓ ${label}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${label}`);
      console.error(`    ${err.message}`);
    }
  }

  console.log(
    `\nAdmin Route Auth Contract: ${handlers.length - failed}/${handlers.length} routes enforced`
  );
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
