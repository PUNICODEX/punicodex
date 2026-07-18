/**
 * PuniCodex — Master Test Runner
 * Runs all Node.js test suites and reports combined results.
 * Run: node test/run-all.js
 */

const { execSync } = require('node:child_process');
const path = require('node:path');

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

const SUITES = [
  { name: 'Lexicon Validator', cmd: 'node type/js/validate.js' },
  { name: 'Engine Unit Tests', cmd: 'node type/js/test-engine.js' },
  { name: 'Card Engine Tests', cmd: 'node --test test/card-engine.test.js' },
  { name: 'Generated Card Set Tests', cmd: 'node --test test/cards.test.js' },
  { name: 'Cards API Tests', cmd: 'node --test test/cards-api.test.js' },
  { name: 'Scholars Taxonomy Tests', cmd: 'node platform/scholars/taxonomy.test.js' },
  { name: 'Scholars Quality Gate Tests', cmd: 'node platform/scholars/quality.test.js' },
  { name: 'Scholars DB Tests', cmd: 'node platform/db/scholars/index.test.js' },
  { name: 'Scholars Auth Tests', cmd: 'node platform/scholars/auth.test.js' },
  { name: 'Scholars AuthZ Tests', cmd: 'node platform/scholars/authz.test.js' },
  { name: 'Scholars API Tests', cmd: 'node platform/scholars/router.test.js' },
  { name: 'Scholars Dept Admin Tests', cmd: 'node platform/scholars/dept-admin.test.js' },
  { name: 'Scholars Content Regression', cmd: 'node test/scholars-content.test.js' },
  { name: 'Scholars API Flow Regression', cmd: 'node test/scholars-api-flow.test.js' },
  { name: 'Flagship Blog Tests', cmd: 'node --test test/blog.test.js' },
  { name: 'Blog Index Tests', cmd: 'node --test test/blog-index.test.js' },
  {
    name: 'Scholars Session Revocation Tests',
    cmd: 'node platform/scholars/session-revocation.test.js',
  },
  { name: 'Scholars Load Tests', cmd: 'node platform/scholars/load.test.js' },
  { name: 'Scholars Concurrency Tests', cmd: 'node platform/scholars/concurrency.test.js' },
  { name: 'Oracle Tests', cmd: 'node test/oracle.test.js' },
  { name: 'Oracle Page Tests', cmd: 'node test/oracle-page.test.js' },
  { name: 'Search v2 Tests', cmd: 'node test/search-v2.test.js' },
  { name: 'Browser Shell Tests', cmd: 'node test/browser-shell.test.js' },
  { name: 'Workspace Tests', cmd: 'node test/workspaces.test.js' },
  { name: 'Gamification Tests', cmd: 'node test/gamification.test.js' },
  { name: 'Marketplace Tests', cmd: 'node test/marketplace.test.js' },
  { name: 'Creative Marketplace Tests', cmd: 'node test/creative-marketplace.test.js' },
  { name: 'Agents Tests', cmd: 'node test/agents.test.js' },
  { name: 'Multimodal Tests', cmd: 'node test/multimodal.test.js' },
  { name: 'Partner Tests', cmd: 'node test/partners.test.js' },
  { name: 'API v1 Integration Tests', cmd: 'node test/api-v1.test.js' },
  { name: 'API Auth Tests', cmd: 'node test/api-auth.test.js' },
  { name: 'API Utils Tests', cmd: 'node test/api-utils.test.js' },
  { name: 'Client IP Tests', cmd: 'node test/client-ip.test.js' },
  { name: 'Rate Limiter Tests', cmd: 'node test/rate-limiter.test.js' },
  { name: 'Redis Client Resilience Tests', cmd: 'node test/redis-client.test.js' },
  { name: 'Security Hardening Tests', cmd: 'node test/security-hardening.test.js' },
  { name: 'Safe JSON Tests', cmd: 'node test/safe-json.test.js' },
  { name: 'Operational DB Tests', cmd: 'node test/operational-db.test.js' },
  { name: 'Availability Checker Tests', cmd: 'node test/availability-checker.test.js' },
  { name: 'Foundation Tests', cmd: 'node test/foundations.test.js' },
  { name: 'Search Service Tests', cmd: 'node test/search.test.js' },
  { name: 'Crawler DB Tests', cmd: 'node test/crawler-db.test.js' },
  { name: 'API v2 Integration Tests', cmd: 'node test/api-v2.test.js' },
  { name: 'OpenAPI Contract Tests', cmd: 'node test/openapi-contract.test.js' },
  { name: 'Appraisal Tests', cmd: 'node test/appraise.test.js' },
  { name: 'Observability Tests', cmd: 'node test/observability.test.js' },
  { name: 'Admin Tests', cmd: 'node test/admin.test.js' },
  { name: 'Admin Booking Routes', cmd: 'node test/admin-bookings.test.js' },
  { name: 'Admin Portal Tests', cmd: 'node test/admin-portal.test.js', timeout: 60000 },
  { name: 'Patrons API Tests', cmd: 'node test/patrons-api.test.js', timeout: 60000 },
  { name: 'Stripe Webhook Tests', cmd: 'node test/stripe-webhook.test.js' },
  { name: 'Ad Analytics Tests', cmd: 'node test/ad-analytics.test.js' },
  {
    name: 'Site Analytics Tests',
    cmd: 'node test/site-analytics.test.js',
    timeout: 600000,
  },
  { name: 'Booking Service Tests', cmd: 'node test/booking-service.test.js' },
  { name: 'Booking Validation Tests', cmd: 'node test/booking-validation.test.js' },
  { name: 'Patron Service Tests', cmd: 'node test/patron-service.test.js' },
  { name: 'Patron Page Tests', cmd: 'node test/patron-page.test.js' },
  { name: 'Patron Contract Tests', cmd: 'node --test test/patron-contract.test.js' },
  { name: 'Collaborators Strip Tests', cmd: 'node test/collaborators-strip.test.js' },
  { name: 'Brand Tests', cmd: 'node test/brand.test.js' },
  { name: 'Admin Portal Page Tests', cmd: 'node test/admin-portal-page.test.js' },
  { name: 'Portal Endpoints Tests', cmd: 'node test/portal-endpoints.test.js', timeout: 60000 },
  { name: 'API Fuzz Tests', cmd: 'node test/api-fuzz.test.js', timeout: 60000 },
  { name: 'Analytics E2E Tests', cmd: 'node test/analytics-e2e.test.js' },
  { name: 'Vercelignore Guard', cmd: 'node test/vercelignore-guard.test.js' },
  { name: 'Vendored Libs Tests', cmd: 'node test/vendored-libs.test.js' },
  { name: 'Flagship Mobile Nav Tests', cmd: 'node test/flagship-mobile-nav.test.js' },
  { name: 'Realms Page Tests', cmd: 'node test/realms-page.test.js' },
  {
    name: 'Flagship Content Quality Audit',
    cmd: 'node test/flagship-content-quality.test.js',
    timeout: 120000,
  },
  { name: 'Similarity Service Tests', cmd: 'node test/similarity-service.test.js' },
  { name: 'Connection Taxonomy Tests', cmd: 'node test/connection-taxonomy.test.js' },
  { name: 'Connections Page Tests', cmd: 'node test/connections-page.test.js' },
  { name: 'Connections Helpers Tests', cmd: 'node test/connections-helpers.test.js' },
  {
    name: 'Flagship Patterns Tests',
    cmd: 'node test/flagship-patterns.test.js',
    timeout: 120000,
  },
  { name: 'Cron Single-Flight Tests', cmd: 'node test/cron-single-flight.test.js' },
  { name: 'Email Safety Tests', cmd: 'node test/email.test.js' },
  { name: 'Lexicon Entry Cases', cmd: 'node test/lexicon-entry-cases.test.js' },
  { name: 'Domain Parser Tests', cmd: 'node test/domain-parser.test.js' },
  { name: 'URL Decomposer Tests', cmd: 'node test/url-decomposer.test.js' },
  { name: 'URL Classifier Tests', cmd: 'node test/url-classifier.test.js' },
  { name: 'IDNA Validator Tests', cmd: 'node test/idna-validator.test.js' },
  { name: 'DNS Enricher Tests', cmd: 'node test/dns-enricher.test.js' },
  { name: 'Authenticity Service Tests', cmd: 'node test/authenticity-service.test.js' },
  { name: 'Authenticity Ensemble Tests', cmd: 'node test/authenticity-ensemble.test.js' },
  { name: 'Verdict Mapper Tests', cmd: 'node test/verdict-mapper.test.js' },
  { name: 'Confusable Atlas Tests', cmd: 'node test/confusable-atlas.test.js' },
  { name: 'Authenticity Threat Feed Tests', cmd: 'node test/authenticity-threat-feed.test.js' },
  { name: 'Hermès Disambiguation Tests', cmd: 'node test/hermes-disambiguation.test.js' },
  { name: 'Brand Shield Tests', cmd: 'node test/brand-shield.test.js' },
  { name: 'Threat Intelligence Stream Tests', cmd: 'node test/threat-stream.test.js' },
  { name: 'Dispute Service Tests', cmd: 'node test/dispute-service.test.js' },
  { name: 'Authenticity Case Matrix', cmd: 'node test/authenticity-cases.test.js' },
  { name: 'Confusable Atlas V2 Tests', cmd: 'node test/confusable-atlas-v2.test.js' },
  { name: 'Glyph Renderer Tests', cmd: 'node test/glyph-renderer.test.js' },
  { name: 'Authenticity SDK JS Tests', cmd: 'node test/sdk-js.test.js' },
  { name: 'Authenticity Extension v2 Tests', cmd: 'node test/extension-v2.test.js' },
  { name: 'Extensions Audit Tests', cmd: 'node test/extensions-audit.test.js' },
  { name: 'Policy Engine Tests', cmd: 'node test/policy-engine.test.js' },
  { name: 'RBAC Tests', cmd: 'node test/rbac.test.js' },
  { name: 'Audit Log Tests', cmd: 'node test/audit-log.test.js' },
  { name: 'Retention Tests', cmd: 'node test/retention.test.js' },
  { name: 'Telemetry Privacy Tests', cmd: 'node test/telemetry-privacy.test.js' },
  { name: 'Active Learning Tests', cmd: 'node test/active-learning.test.js' },
  { name: 'Drift Monitor Tests', cmd: 'node test/drift-monitor.test.js' },
  { name: 'Model Retrain Tests', cmd: 'node test/model-retrain.test.js' },
  { name: 'i18n Bundle Tests', cmd: 'node test/i18n.test.js' },
  { name: 'Interstitial Smoke Tests', cmd: 'node test/interstitial-smoke.test.js' },
  { name: 'Normalization Attack Tests', cmd: 'node test/normalization-attacks.test.js' },
  { name: 'Adversarial Generator Tests', cmd: 'node test/adversarial-generator.test.js' },
  { name: 'Red-Team CI Tests', cmd: 'node test/red-team-ci.test.js' },
  { name: 'False Positive Budget Tests', cmd: 'node test/false-positive-budget.test.js' },
  { name: 'False Negative Budget Tests', cmd: 'node test/false-negative-budget.test.js' },
  { name: 'Ecosystem Tests', cmd: 'node test/ecosystem.test.js' },
  { name: 'Protocol Tests', cmd: 'node test/protocol.test.js' },
  { name: 'Homograph Defense Tests', cmd: 'node test/homograph-defense.test.js' },
  { name: 'Tenant Ads Tests', cmd: 'node test/tenant-ads.test.js' },
  { name: 'Names Service Tests', cmd: 'node test/names-service.test.js' },
  { name: 'Keyboard Completeness Tests', cmd: 'node test/keyboard-completeness.test.js' },
  { name: 'Event Crawler Tests', cmd: 'node test/event-crawler.test.js' },
  { name: 'Spam Classifier Tests', cmd: 'node test/spam-classifier.test.js' },
  { name: 'LTR Tests', cmd: 'node test/ltr.test.js' },
  { name: 'Generated Artifacts Tests', cmd: 'node test/generated-artifacts.test.js' },
  { name: 'Generator Idempotency Tests', cmd: 'node test/generator-idempotency.test.js' },
  {
    name: 'Divergence Gate',
    cmd: 'node test/divergence-gate.test.js',
    timeout: 1800000,
  },
  {
    name: 'Brand Risk Language',
    cmd: 'node test/brand-risk-language.test.js',
    timeout: 120000,
  },
  { name: 'Frontend Smoke Tests', cmd: 'node test/frontend-smoke.test.js' },
  { name: 'API Trailing Slash Regression', cmd: 'node test/api-trailing-slash.test.js' },
  {
    name: 'Global Strip Mobile Regression',
    cmd: 'node test/global-strip-mobile-regression.test.js',
  },
  {
    name: 'Base Temple Mobile Nav',
    cmd: 'node test/base-temple-mobile-nav.test.js',
  },
  {
    name: 'Mobile Menu Consistency Tests',
    cmd: 'node --test test/mobile-menu-consistency.test.js',
  },
  {
    name: 'Provenance Mobile Regression',
    cmd: 'node test/provenance-mobile-regression.test.js',
  },
  {
    name: 'Hero Canvas Background Regression',
    cmd: 'node test/hero-canvas-background-regression.test.js',
  },
  { name: 'Mobile Share Extension Tests', cmd: 'node test/mobile-share-extension.test.js' },
  { name: 'iOS SDK Contract Tests', cmd: 'node sdk/ios/Tests/contract.test.js' },
  { name: 'Android SDK Contract Tests', cmd: 'node sdk/android/app/src/test/contract.test.js' },
  { name: 'Codex Export Tests', cmd: 'node test/codex-export.test.js' },
  { name: 'Model Corpus Tests', cmd: 'node test/model-corpus.test.js' },
  { name: 'Safety Corpus Tests', cmd: 'node test/safety-corpus.test.js' },
  { name: 'AI Corpus Phases Tests', cmd: 'node test/ai-corpus-phases.test.js' },
  { name: 'Lighthouse Thresholds', cmd: 'node --test test/lighthouse.test.js' },
  { name: 'Font Self-Hosting Tests', cmd: 'node test/fonts-selfhosted.test.js' },
  { name: 'Link Checker', cmd: 'node test/links.js' },
  { name: 'SEO Validator', cmd: 'node scripts/validate-seo.js' },
  { name: 'Philological Accuracy', cmd: 'node scripts/validate-accuracy.js' },
  { name: 'Flywheel Integrity', cmd: 'node scripts/validate-flywheel.js' },
  { name: 'Original Script Provenance', cmd: 'node scripts/validate-provenance.js' },
];

const results = [];
let totalPass = 0;
let _totalFail = 0;

console.log(`${C.bold}╔══════════════════════════════════════════════════╗${C.reset}`);
console.log(`${C.bold}║     PuniCodex — Master Test Runner              ║${C.reset}`);
console.log(`${C.bold}╚══════════════════════════════════════════════════╝${C.reset}`);

for (const suite of SUITES) {
  console.log(`\n${C.cyan}▸ ${suite.name}${C.reset}`);
  try {
    const output = execSync(suite.cmd, {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: suite.timeout || 30000,
    });
    console.log(output.trimEnd());
    results.push({ name: suite.name, ok: true });
    // Try to extract pass count from output
    const match = output.match(/(\d+) assertions passed|All (\d+) tests passed/);
    if (match) {
      totalPass += parseInt(match[1] || match[2], 10);
    }
  } catch (err) {
    console.log(err.stdout ? err.stdout.toString().trimEnd() : '');
    if (err.stderr) console.log(err.stderr.toString());
    results.push({ name: suite.name, ok: false });
    _totalFail++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`${C.bold}Results:${C.reset}`);
results.forEach((r) => {
  const icon = r.ok ? `${C.green}✓${C.reset}` : `${C.red}✗${C.reset}`;
  console.log(`  ${icon} ${r.name}`);
});

if (totalPass > 0) {
  console.log(
    `\n  ${C.dim}Total assertions passed:${C.reset} ${C.green}${totalPass.toLocaleString()}${C.reset}`
  );
}

const allOk = results.every((r) => r.ok);
if (allOk) {
  console.log(`\n  ${C.green}✓ All suites passed${C.reset}`);
  process.exit(0);
} else {
  console.log(`\n  ${C.red}✗ ${results.filter((r) => !r.ok).length} suite(s) failed${C.reset}`);
  process.exit(1);
}
