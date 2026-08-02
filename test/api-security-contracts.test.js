/**
 * API security contracts — cross-cutting invariants that must hold for every
 * serverless endpoint, now and for every endpoint added in the future.
 *
 * 1. Every write-handling api file (POST/PUT/DELETE/PATCH) carries at least
 *    one protection mechanism: auth middleware, the v1/v2 api-handler
 *    (per-key tiered limits), a rate limiter, a signature/secret check.
 * 2. Every cron endpoint (api/cron tree) checks the cron secret.
 * 3. No api file opens CORS with a wildcard origin.
 * 4. No endpoint leaks a stack/secret in its error paths (no res.json(err.stack)
 *    or process.env passthrough into responses).
 *
 * Calibration 2026-07-22: 74 write-handling files, 0 violations.
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

const WRITE_RE =
  /req\.method\s*!==?\s*'(POST|PUT|DELETE|PATCH)'|method\s*===?\s*'(POST|PUT|DELETE|PATCH)'|router\.(post|put|delete|patch)/;

const PROTECTION_TOKENS = [
  // auth middleware
  'requireAuth',
  'requireAdmin',
  'requirePortal',
  'requireRole',
  'requireDepartmentAdmin',
  'x-admin-token',
  // v1/v2 envelope handler applies per-key tiered rate limits
  'createApiHandler',
  // rate limiters
  'checkPublicRateLimit',
  'rateLimit',
  'RATE_LIMIT',
  'rateLimited',
  'api-rate-limiter',
  'hits = new Map',
  // signature / secret verification
  'constructEvent',
  'CRON_SECRET',
  'cron-secret',
  'x-cron-secret',
  '_utils', // api/cron/_utils.js shared auth wrapper
];

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

// Handlers consolidated behind the catch-all routers live under
// platform/api-handlers/ — scan both trees so the contract keeps covering
// every endpoint file.
const apiFiles = [
  ...walk(path.join(ROOT, 'api')),
  ...walk(path.join(ROOT, 'platform', 'api-handlers')),
];

function run() {
  console.log('\n▸ API Security Contracts\n');

  test('every write-handling endpoint carries a protection mechanism', () => {
    const violations = [];
    for (const f of apiFiles) {
      const t = fs.readFileSync(f, 'utf8');
      if (!WRITE_RE.test(t)) continue;
      if (!PROTECTION_TOKENS.some((tok) => t.includes(tok))) {
        violations.push(path.relative(ROOT, f));
      }
    }
    assert.deepStrictEqual(
      violations,
      [],
      `write endpoints without any protection:\n${violations.join('\n')}`
    );
  });

  test('every cron endpoint checks the cron secret', () => {
    const cronDir = path.join(ROOT, 'api', 'cron');
    const violations = [];
    for (const f of walk(cronDir)) {
      const t = fs.readFileSync(f, 'utf8');
      if (f.endsWith('_utils.js')) continue; // the shared wrapper itself
      if (!t.includes('CRON_SECRET') && !t.includes('_utils') && !t.includes('cron-secret')) {
        violations.push(path.relative(ROOT, f));
      }
    }
    assert.deepStrictEqual(
      violations,
      [],
      `cron endpoints without secret check:\n${violations.join('\n')}`
    );
  });

  test('no endpoint opens CORS with a wildcard origin', () => {
    const violations = [];
    for (const f of apiFiles) {
      const t = fs.readFileSync(f, 'utf8');
      if (/Access-Control-Allow-Origin['"],\s*'\*'/.test(t)) {
        violations.push(path.relative(ROOT, f));
      }
    }
    assert.deepStrictEqual(violations, [], `wildcard CORS:\n${violations.join('\n')}`);
  });

  test('no endpoint leaks stacks or raw env into responses', () => {
    const violations = [];
    for (const f of apiFiles) {
      const t = fs.readFileSync(f, 'utf8');
      if (/res\.(json|send)\([^)]*err\.stack/.test(t) || /\.json\(\s*process\.env\s*\)/.test(t)) {
        violations.push(path.relative(ROOT, f));
      }
    }
    assert.deepStrictEqual(violations, [], `leaky error paths:\n${violations.join('\n')}`);
  });

  test('webhook verifies the Stripe signature before processing', () => {
    const handler = fs.readFileSync(path.join(ROOT, 'api', 'webhook', 'index.js'), 'utf8');
    assert.ok(
      handler.includes('stripe-signature') && handler.includes('processWebhook'),
      'handler must require the signature header and delegate to processWebhook'
    );
    const stripe = fs.readFileSync(path.join(ROOT, 'platform', 'api', 'stripe.js'), 'utf8');
    assert.ok(
      stripe.includes('constructEvent'),
      'platform stripe module must verify via constructEvent'
    );
    assert.ok(
      /STRIPE_WEBHOOK_SECRET|webhookSecret/i.test(stripe),
      'signature verification must use the signing secret'
    );
  });

  console.log(`\nAPI Security Contracts: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
