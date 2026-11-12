#!/usr/bin/env node
/**
 * PuniCodex — Pre-Push Gate
 *
 * Runs BEFORE `git push` (installed as the pre-push hook by
 * scripts/install-hooks.js) so the failure classes that used to reach CI —
 * format drift, lint errors, broken test contracts, divergence between
 * canonical sources and generated artifacts — are caught locally while the
 * push is still reversible.
 *
 * Design: instead of the full 250-suite battery (40+ min), the gate maps the
 * files you actually changed to the suites that can possibly break, and runs
 * only those — plus the always-on CI-parity gates (Format Check, Biome Lint).
 * Suite commands are resolved from test/run-all.js at runtime, so the mapping
 * can never drift from the real runner.
 *
 * Usage:
 *   node scripts/prepush-gate.js            # normal (hook) mode
 *   node scripts/prepush-gate.js --self-test  # verify mapping integrity only
 *   PREPUSH_FILES="a.js b.js" node scripts/prepush-gate.js  # override diff
 *   PREPUSH_FULL=1 node scripts/prepush-gate.js  # force the full battery
 *   git push --no-verify                    # emergency escape hatch
 */

const { execFileSync, execSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
// npm is a shell shim (npm.cmd on Windows, a shell script elsewhere) — it
// cannot be spawned directly, so npm-based suites run through the shell.
const NPM = 'npm';
const SHELL_OPT = { shell: true };

const C = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

// ── Suite command resolution (parsed from the real runner, never duplicated) ─

function loadSuiteCommands() {
  const src = fs.readFileSync(path.join(ROOT, 'test', 'run-all.js'), 'utf8');
  const commands = new Map();
  // Match single-line entries: { name: 'X', cmd: 'Y' } (timeouts may follow).
  const re = /name:\s*'([^']+)',\s*cmd:\s*'([^']+)'/g;
  let m;
  while ((m = re.exec(src))) commands.set(m[1], m[2]);
  return commands;
}

// ── Change → suite mapping ───────────────────────────────────────────────────
// Each rule: when any changed file matches `pattern`, run `suites`.
// Keep names EXACTLY as in test/run-all.js — --self-test enforces this.

const ALWAYS_SUITES = ['Format Check', 'Biome Lint'];

// Canonical flywheel sources: regeneration must stay byte-stable, so the
// divergence gate + flywheel validators run whenever these move.
const CANONICAL_PATTERN =
  /^(type\/js\/|js\/archetypes-v2\.js$|platform\/db\/owned-domains\.json$|templates\/|scripts\/(generate|sync-|inject-|create-flagship|generate-temples|validate-flywheel)|platform\/blog\/content\/|platform\/scholars\/content\/|platform\/public\/|platform\/texts\/|scripts\/lore-catalog\.json$|scripts\/gallery-data\.json$)/;

const CANONICAL_SUITES = [
  'Lexicon Validator',
  'Generated Artifacts Tests',
  'Flywheel Integrity',
  'Finetune Drills Tests',
];

const RULES = [
  {
    pattern: /^scripts\/(?:prepush-gate|deploy-release)\.js$|^test\/(?:prepush-attestation|release-orchestration)\.test\.js$/,
    suites: ['Pre-push Attestation Tests', 'Release Orchestration Tests'],
  },
  {
    pattern: /^scripts\/(?:generation-lock|write-file-retry|generate|inject-analytics|inject-university-collaborators|inject-herald-beacon|inject-cookie-consent|inject-hero-videos|inject-px-core|generate-strata-page)\.js$|^test\/generation-lock\.test\.js$/,
    suites: ['Generation Lock Tests', 'Cookie Consent Tests'],
  },
  {
    pattern: /^test\/browser-e2e\.test\.js$/,
    suites: ['Browser E2E Tests'],
  },
  {
    pattern: /^platform\/(?:api\/(?:identity|identity-analytics|product-analytics|tenant-portal|email)\.js$|db\/(?:migrate-identity|init-operational-postgres|operational)\.js$|api-handlers\/(?:admin\/portal\/(?:identities|analytics\/identity)|analytics\/collect)\/|public\/admin-portal\/(?:identities\/|portal\.js$|login\/index\.html$)|scholars\/(?:auth|router)\.js$)|^api\/(?:account\/|webhook\/index\.js$)|^account\/|^scripts\/migrate-identity-backfill\.js$|^test\/(?:identity|institution-identity|admin-route-authority|admin-cookie-security|analytics-consent)/,
    suites: [
      'Identity Kernel Tests',
      'Public Identity API Tests',
      'Institution Identity API Tests',
      'Identity Analytics Tests',
      'Identity Backfill Tests',
      'Admin Route Authority Tests',
      'Admin Cookie Security Tests',
      'Analytics Consent Tests',
      'Identity Browser Tests',
      'Tenant Portal Tests',
      'Scholars API Tests',
      'Scholars Session Revocation Tests',
      'Admin Portal Tests',
      'Admin Portal Page Tests',
    ],
  },
  {
    pattern: /^js\/analytics-beacon\.js$|^privacy\/index\.html$|^terms\/analytics\/|^platform\/api\/analytics-events\.js$|^test\/analytics-consent\.test\.js$/,
    suites: ['Analytics Consent Tests', 'Identity Analytics Tests'],
  },
  {
    pattern: /^scripts\/(arche-chapters|generate-arche-page)\.js$|^js\/arche\.js$|^css\/arche\.css$|^genesis\/|^test\/arche\.test\.js$/,
    suites: ['Archē Tests'],
  },
  {
    pattern: /^data\/sacred-sites\.json$|^scripts\/generate-sacred-atlas\.js$|^world\/sacred\/|^js\/sacred-globe\.js$|^css\/sacred-globe\.css$|^test\/sacred-atlas\.test\.js$/,
    suites: ['Sacred Atlas Tests'],
  },
  {
    pattern: /^data\/pantheon-strata\.json$|^scripts\/generate-strata-page\.js$|^pantheon\/(?:origins|strata)\/|^test\/strata-page\.test\.js$/,
    suites: ['STRATA Page Tests'],
  },
  {
    pattern: /^scripts\/(?:lib\/ascii-editorial|generate-scholars-content|generate-blog-content|generate-blog-series-restoration|generate-blog-series-canonical|create-flagship)\.js$|^platform\/(?:scholars\/content|blog\/(?:content|series))\/|^test\/ascii-editorial-truth\.test\.js$/,
    suites: ['ASCII Editorial Truth Tests'],
  },
  {
    pattern: /^templates\/flagship\/(gallery|blog|lore|patron|patterns|scholars|index)\.html$|^scripts\/create-flagship\.js$|^assets\/ai-commons\/|^test\/temple-commons-gallery\.test\.js$/,
    suites: ['Temple Commons Gallery Tests'],
  },
  {
    // Temple Art Room — the tab-strip restructure (STORE▾Merch·Art), the
    // per-temple art pages, and the gallery/creatives redirect stubs.
    pattern: /^scripts\/(?:generate-temple-art|create-flagship|generate-blog-pages|generate-blog-series-pages)\.js$|^templates\/flagship\/.*\.html$|^css\/(?:temple-base|commons-viewer)\.css$|^js\/(?:temple-base|commons-viewer)\.js$|^test\/(?:temple-art-room|flagship-mobile-nav)\.test\.js$/,
    suites: [
      'Temple Art Room Tests',
      'Flagship Mobile Nav Tests',
      'Flagship Patterns Tests',
      'Flagship Content Quality Audit',
      'Browser E2E Tests',
    ],
  },
  {
    pattern: /^scripts\/sync-mobile-menu\.js$|^scripts\/nav-tree\.js$|^scripts\/generate-herald\.js$|^templates\/herald\/|^platform\/public\/scholars\/|^test\/mobile-menu-drift\.test\.js$/,
    suites: [
      'Mobile Menu Drift Tests',
      'Mobile Menu Consistency Tests',
      'Menu Consistency Tests',
    ],
  },
  {
    pattern: /^platform\/api-handlers\/root\/university\/|^platform\/api\/(university-call-reminders|university-pitch-email|email)\.js$|^platform\/db\/migrate-university-bookings\.js$|^university\/book\/|^api\/cron\/university-call-reminders\/|^test\/university-booking\.test\.js$/,
    suites: ['University Booking Endpoint Tests', 'University Outreach Tests', 'Pitch Email Tests'],
  },
  {
    pattern:
      /^scripts\/generate-variants\.js$|^scripts\/lib\/variant-conventions\.js$|^data\/variants\.json$|^platform\/api\/variants\.json$|^test\/variants\.test\.js$|^platform\/api\/names-service\.js$|^platform\/api\/api-v2-router\.js$/,
    suites: ['Name Variants Contracts', 'API v1 Integration Tests', 'API v2 Integration Tests', 'OpenAPI Contract Tests'],
  },
  {
    pattern: /^platform\/api\/sponsor-brain\.js$|^test\/sponsor-brain\.test\.js$/,
    suites: ['Sponsor Brain Tests', 'Pitch Email Tests', 'University Outreach Tests'],
  },
  {
    pattern: /^platform\/api\/oracle\.js$|^platform\/api\/llm\.js$/,
    suites: [
      'Oracle Tests',
      'Oracle Eval Battery',
      'Oracle Backend Flag Tests',
      'Oracle Page Tests',
      'LLM Client Tests',
    ],
  },
  {
    pattern: /^data\/corpus\/|^scripts\/generate-.*corpus|^scripts\/generate-unified-corpus/,
    suites: [
      'Model Corpus Tests',
      'Teacher Corpus Tests',
      'Safety Corpus Tests',
      'AI Corpus Phases Tests',
      'Oracle Doctrine Corpus Tests',
    ],
  },
  {
    pattern: /^scripts\/prepare-finetune-data\.js$|^data\/finetune\/|^test\/finetune-drills\.test\.js$/,
    suites: ['Finetune Drills Tests'],
  },
  {
    pattern: /^platform\/db\/(?!owned-domains)/,
    suites: ['Operational DB Tests', 'Crawler DB Tests', 'Scholars DB Tests'],
  },
  {
    pattern: /^api\/|^platform\/api-handlers\//,
    suites: [
      'API Security Contracts',
      'API v1 Integration Tests',
      'API v2 Integration Tests',
      'OpenAPI Contract Tests',
      'API Trailing Slash Regression',
    ],
  },
  {
    pattern:
      /^platform\/api\/(booking|bookings|stripe|booking-upload|booking-validation|discount-service|admin-booking-service|creative-purge|verified-sessions|email|store-fulfillment|tenant-portal)\.js$|^platform\/scripts\/(lease-expiry|trial-reminders)\.js$|^api\/(bookings|slots|webhook)\//,
    suites: [
      'Booking Battle Tests',
      'Booking Service Tests',
      'Sponsorship State Machine Tests',
      'Booking Lifecycle E2E',
    ],
  },
  {
    pattern: /^platform\/api\/booking|^platform\/services\/booking|^templates\/flagship\/flagship\.js$/,
    suites: [
      'Booking Lifecycle E2E',
      'Booking Service Tests',
      'Booking Validation Tests',
      'Booking Publish/Pause Tests',
      'Sponsorship Flow Tests',
      'Sponsorship State Machine Tests',
      'Sponsorship Slot Invariant Tests',
    ],
  },
  {
    pattern: /^js\/archetypes-v2\.js$|^platform\/db\/migrate-booking-v3\.js$|^scripts\/sync-missing-slots-to-postgres\.js$|^sites\/[^/]+\/index\.html$/,
    suites: ['Slots Seeded Tests'],
  },
  {
    pattern: /^platform\/(services|api)\/analytics|^platform\/db\/migrate-analytics/,
    suites: [
      'Site Analytics Tests',
      'Admin Analytics V2 Tests',
      'Analytics Schema Drift Tests',
      'Analytics E2E Tests',
    ],
  },
  {
    pattern: /^platform\/api-handlers\/admin|^platform\/api\/admin|^platform\/public\/admin-portal/,
    suites: [
      'Admin Tests',
      'Admin Portal Tests',
      'Admin Portal Page Tests',
      'Portal Shell v2 Tests',
      'Admin Route Auth Contract Tests',
      'Admin Booking Routes',
    ],
  },
  {
    pattern: /^platform\/api\/(pitch-email|sponsor-brain)\.js$|^platform\/api-handlers\/admin\/portal\/sponsors\/|^data\/crawler\/sponsors\/prospect-evidence\.json$|^test\/(sponsor-pitch-render|pitch-email|sponsor-brain)\.test\.js$/,
    suites: ['Sponsor Pitch Render Tests', 'Pitch Email Tests', 'Sponsor Brain Tests'],
  },
  {
    pattern: /^scripts\/generate-pod-products\.js$|^store\/products\.json$|^store\/placement-overrides\.json$|^test\/store-placement-containment\.test\.js$/,
    suites: ['Store Placement Containment Tests', 'Store Configurator Data Tests', 'Store Structure Tests'],
  },
  {
    pattern: /^index\.html$|^css\/home-critical\.css$|^js\/front-court\.js$|^test\/home-front-court\.test\.js$/,
    suites: ['Front Court Tests'],
  },
  {
    pattern: /^templates\/herald-restoration\/|^herald\/index\.html$|^herald\/assets\/|^test\/herald-scene\.test\.js$/,
    suites: ['Herald Scene Tests'],
  },
  {
    pattern: /^js\/herald-beacon\.js$|^scripts\/inject-herald-beacon\.js$|^herald\//,
    suites: ['Herald Beacon Tests', 'Herald Page Tests'],
  },
  {
    pattern: /^middleware\.js$|^vercel\.json$/,
    suites: ['Vercel Config Contract', 'Middleware Execution Tests', 'Router Behavior Tests'],
  },
  {
    pattern: /^platform\/(services|api)\/(store|printful)|^scripts\/.*printful|^store\//,
    suites: [
      'Store Orders Tests',
      'Store Checkout Tests',
      'Store Webhook Tests',
      'Printful Webhook Tests',
      'Store Structure Tests',
    ],
  },
  {
    // Configurator data + PDP template: products.json shape and every store
    // page re-render. (generate-store-pages.js is added here because the
    // broad store rule above only matches scripts/*printful*.)
    pattern:
      /^store\/products\.json$|^scripts\/generate-pod-products\.js$|^scripts\/printful-color-table\.js$|^scripts\/generate-store-pages\.js$|^js\/store-configurator|^css\/store-configurator|^store\/creative-artworks\.json$|^assets\/store-creatives\/|^assets\/store-base\/|^scripts\/sync-store-creatives\.js$|^scripts\/fetch-store-base-images\.js$|^platform\/api\/(store-orders|store-fulfillment|printful-orders)\.js$/,
    suites: [
      'Store Configurator Data Tests',
      'Store Configurator Browser Tests',
      'Store Structure Tests',
      'Store Creative Artworks Tests',
      'Store Checkout Tests',
      'University Outreach Tests',
      'Store Ops Contract Tests',
    ],
  },
  {
    pattern:
      /^platform\/api\/analytics-journeys\.js$|^js\/analytics-beacon\.js$|^platform\/api-handlers\/admin\/portal\/analytics\/|^platform\/api\/university-pitch-email\.js$|^platform\/db\/university-prospects\.js$|^platform\/api-handlers\/admin\/portal\/universities\/|^scripts\/seed-australian-universities\.js$|^scripts\/crawl-australian-universities\.js$|^platform\/public\/scholars\/$/,
    suites: [
      'University Outreach Tests',
      'University Crawl Tests',
      'Analytics Journeys Tests',
      'Scholars Battle Tests',
      'Creative Marketplace Tests',
      'Creator Merch Tests',
    ],
  },
  {
    // Sponsorship scouting pipeline: prospect store, scout engine, admin
    // portal section (page + API handlers), and the sponsor seed dataset.
    pattern:
      /^platform\/db\/business-prospects\.js$|^platform\/api-handlers\/admin\/portal\/sponsors\/|^scripts\/scout-temple-sponsors\.js$|^scripts\/seed-sponsor-prospects\.js$|^store\/sponsor-seed\.json$|^platform\/public\/admin-portal\/sponsors\/|^platform\/public\/admin-portal\/portal\.js$|^api\/admin\/\[\[\.\.\.slug\]\]\.js$/,
    suites: [
      'Sponsor Scout Tests',
      'Admin Portal Page Tests',
    ],
  },
  {
    pattern: /^platform\/models\/authenticity|^platform\/edge\/authenticity|^extension-v2\//,
    suites: [
      'Authenticity Service Tests',
      'Authenticity Ensemble Tests',
      'Homograph Defense Tests',
      'Confusable Atlas Tests',
    ],
  },
  {
    pattern: /^platform\/scholars\/(?!content)/,
    suites: [
      'Scholars Taxonomy Tests',
      'Scholars Auth Tests',
      'Scholars AuthZ Tests',
      'Scholars API Tests',
      'Scholars DB Tests',
    ],
  },
  {
    pattern: /^platform\/texts\//,
    suites: ['Texts Section Tests', 'Texts Chapters Tests'],
  },
  {
    pattern: /^js\/(?!archetypes-v2)|^css\//,
    suites: ['Frontend Smoke Tests', 'Asset Version Tests'],
  },
  {
    pattern: /^game\//,
    suites: ['Mythic Duel v2 Tests', 'Game Economy Safety'],
  },
  {
    pattern: /^sw\.js$/,
    suites: ['Service Worker Contract Tests'],
  },
  {
    pattern: /^mobile\/|^android\//,
    suites: ['Mobile Menu Consistency Tests', 'Mobile Share Extension Tests'],
  },
  {
    pattern:
      /^scripts\/(nav-tree|asset-pins|sync-desktop-nav|sync-mobile-menu|sync-footer|generate-hubs|generate-store-pages|sync-temple-store-links|sync-middleware-domains)\.js$|^css\/(nav-hubs|mobile-menu|hub)\.css$|^js\/(nav-hubs|hub3d)\.js$|^middleware\.js$|^test\/nav-hubs-regression\.test\.js$|^store\/products\.json$/,
    suites: [
      'Nav & Hub Regression Tests',
      'Menu Consistency Tests',
      'Mobile Menu Consistency Tests',
      'Footer Consistency Tests',
      'Middleware Execution Tests',
      'Browser E2E Tests',
      'Store Structure Tests',
    ],
  },
  {
    pattern: /^platform\/(api\/admin-portal-auth\.js|api-handlers\/admin\/portal\/|db\/ensure-admin-schema-postgres\.js|db\/migrate-admin-users\.js)$|^test\/admin-(portal|schema-postgres)\.test\.js$|^api\/admin\//,
    suites: [
      'Admin Portal Tests',
      'Admin Schema Self-Heal Tests',
      'Portal Endpoints Tests',
      'API Security Contracts',
    ],
  },
  {
    pattern: /^sdk\//,
    suites: ['iOS SDK Contract Tests', 'Android SDK Contract Tests'],
  },
];

// Fallback core when platform/api code changed but no specific rule matched.
const CORE_SUITES = ['Operational DB Tests', 'API Security Contracts'];

// ── Changed-file discovery ───────────────────────────────────────────────────

function changedFiles() {
  if (process.env.PREPUSH_FILES) {
    return process.env.PREPUSH_FILES.split(/\s+/).filter(Boolean);
  }
  const candidates = [
    'git diff --name-only origin/master...HEAD',
    'git diff --name-only @{push} HEAD',
    'git diff --name-only HEAD~1 HEAD',
  ];
  for (const cmd of candidates) {
    try {
      const out = execSync(cmd, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      if (out.trim()) return out.trim().split('\n');
    } catch {
      // try the next ref strategy
    }
  }
  return [];
}

// ── Suite selection ──────────────────────────────────────────────────────────

function selectSuites(files, suiteCommands) {
  const selected = new Set(ALWAYS_SUITES);

  // Any changed test file runs its own suite — a contract edit can never
  // slip through unexercised (the AI-corpus-phases failure class).
  for (const f of files) {
    if (!/\.test\.js$/.test(f)) continue;
    for (const [name, cmd] of suiteCommands) {
      if (cmd.includes(f)) selected.add(name);
    }
  }

  let canonical = false;
  let platformTouched = false;
  let ruleHit = false;

  for (const f of files) {
    if (CANONICAL_PATTERN.test(f)) canonical = true;
    if (/^(platform|api)\//.test(f) && !/\.test\.js$/.test(f)) platformTouched = true;
    for (const rule of RULES) {
      if (rule.pattern.test(f)) {
        ruleHit = true;
        for (const s of rule.suites) selected.add(s);
      }
    }
  }

  if (canonical) {
    for (const s of CANONICAL_SUITES) selected.add(s);
    selected.add('__DIVERGENCE__'); // npm run generate:check
  }
  if (platformTouched && !ruleHit) for (const s of CORE_SUITES) selected.add(s);

  return { selected: [...selected], canonical };
}

// ── Runner ───────────────────────────────────────────────────────────────────

const LOG_FILE = (() => {
  try {
    return path.join(ROOT, '.git', 'prepush-last-run.log');
  } catch {
    return null;
  }
})();

function appendLog(text) {
  if (!LOG_FILE) return;
  try {
    fs.appendFileSync(LOG_FILE, text + '\n');
  } catch {}
}

function runSuite(name, cmd) {
  const start = Date.now();
  try {
    if (cmd.startsWith('npm ')) {
      execFileSync(NPM, cmd.slice(4).split(' '), {
        cwd: ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        ...SHELL_OPT,
      });
    } else {
      const [bin, ...args] = cmd.split(' ');
      execFileSync(bin, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    }
    console.log(`  ${C.green}✓${C.reset} ${name} ${C.dim}(${((Date.now() - start) / 1000).toFixed(1)}s)${C.reset}`);
    return true;
  } catch (err) {
    console.log(`  ${C.red}✗ ${name}${C.reset}`);
    const out = [err.stdout, err.stderr]
      .filter(Boolean)
      .map((b) => b.toString())
      .join('\n');
    appendLog(`\n===== FAILED SUITE: ${name} (${cmd}) =====\n${out}`);
    console.log(
      out
        .split('\n')
        .filter((l) => l.trim())
        .slice(-25)
        .map((l) => `    ${C.dim}${l}${C.reset}`)
        .join('\n')
    );
    console.log(`    ${C.dim}Full failure output: ${LOG_FILE}${C.reset}`);
    return false;
  }
}

function suiteCommandsHash(suiteCommands) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify([...suiteCommands.entries()].sort()))
    .digest('hex');
}

function attestationFile() {
  return process.env.PREPUSH_ATTESTATION_FILE || path.join(ROOT, '.git', 'prepush-attestation.json');
}

function readAttestation() {
  try {
    return JSON.parse(fs.readFileSync(attestationFile(), 'utf8'));
  } catch {
    return null;
  }
}

function workingTreeClean() {
  return execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim() === '';
}

function currentHeadAndTree() {
  return {
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    tree: execFileSync('git', ['rev-parse', 'HEAD^{tree}'], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim(),
  };
}

function canReuseAttestation(record, input) {
  if (!record || input.dirty) return false;
  if (!record.head || !record.tree || !record.commandsHash) return false;
  if (
    record.head !== input.head ||
    record.tree !== input.tree ||
    record.commandsHash !== input.commandsHash
  ) {
    return false;
  }
  const covered = new Set(record.selected || []);
  if (!input.selected.every((suite) => covered.has(suite))) return false;
  return !input.canonical || record.canonical === true;
}

function reusableAttestation(selected, canonical, suiteCommands) {
  const input = {
    ...currentHeadAndTree(),
    selected,
    canonical,
    commandsHash: suiteCommandsHash(suiteCommands),
    dirty: !workingTreeClean(),
  };
  const record = readAttestation();
  return canReuseAttestation(record, input) ? record : null;
}

function writeAttestation(input) {
  const record = {
    version: 1,
    createdAt: new Date().toISOString(),
    head: input.head,
    tree: input.tree,
    commandsHash: input.commandsHash,
    selected: [...input.selected].sort(),
    canonical: input.canonical,
  };
  const file = attestationFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, file);
  return record;
}

function selfTest(suiteCommands) {
  let ok = true;
  const named = new Set([...ALWAYS_SUITES, ...CANONICAL_SUITES, ...CORE_SUITES]);
  for (const rule of RULES) for (const s of rule.suites) named.add(s);
  for (const name of named) {
    if (!suiteCommands.has(name)) {
      console.error(`  ${C.red}mapping references unknown suite: ${name}${C.reset}`);
      ok = false;
    }
  }
  const artRule = RULES.find((rule) => rule.suites.includes('Temple Art Room Tests'));
  for (const file of [
    'templates/flagship/index.html',
    'templates/flagship/blog/index.html',
    'templates/flagship/creatives/index.html',
  ]) {
    if (!artRule?.pattern.test(file)) {
      console.error(`  ${C.red}temple-art rule does not cover: ${file}${C.reset}`);
      ok = false;
    }
  }
  return ok;
}

function main() {
  console.log(`\n${C.bold}${C.cyan}▸ Pre-Push Gate${C.reset}`);
  console.log(
    `  ${C.dim}Full failure output is written to ${LOG_FILE} — do not pipe this gate through tail/head.${C.reset}`
  );
  if (LOG_FILE) {
    try {
      fs.writeFileSync(LOG_FILE, `Pre-push gate run — ${new Date().toISOString()}\n`);
    } catch {}
  }

  const suiteCommands = loadSuiteCommands();
  if (!selfTest(suiteCommands)) {
    console.error(`\n${C.red}Gate mapping is stale — fix RULES in scripts/prepush-gate.js.${C.reset}`);
    process.exit(1);
  }
  if (process.argv.includes('--self-test')) {
    console.log(`  ${C.green}✓ mapping integrity (${suiteCommands.size} suites resolvable)${C.reset}`);
    return;
  }

  if (process.env.PREPUSH_FULL === '1') {
    console.log(`  ${C.yellow}PREPUSH_FULL=1 — running the full battery${C.reset}`);
    try {
      execFileSync(NPM, ['test'], { cwd: ROOT, stdio: 'inherit', ...SHELL_OPT });
    } catch {
      process.exit(1);
    }
    return;
  }

  const files = changedFiles();
  if (!files.length) {
    console.log(`  ${C.dim}no changed files detected — skipping${C.reset}`);
    return;
  }

  const { selected, canonical } = selectSuites(files, suiteCommands);
  const attestation = reusableAttestation(selected, canonical, suiteCommands);
  if (attestation) {
    console.log(
      `  ${C.green}✓ Reusing exact-tree gate attestation from ${attestation.createdAt}${C.reset}`
    );
    console.log(
      `  ${C.dim}Same commit, generated tree, suite definitions, and clean working tree; no new content to verify.${C.reset}`
    );
    return;
  }
  console.log(`  ${C.dim}${files.length} changed file(s) → ${selected.length} gate(s)${C.reset}`);
  for (const f of files.slice(0, 12)) console.log(`    ${C.dim}· ${f}${C.reset}`);
  if (files.length > 12) console.log(`    ${C.dim}· …and ${files.length - 12} more${C.reset}`);

  let failed = false;
  for (const name of selected) {
    if (name === '__DIVERGENCE__') continue;
    const cmd = suiteCommands.get(name);
    if (!runSuite(name, cmd)) failed = true;
  }

  // Divergence gate LAST (it regenerates everything and diffs — the most
  // expensive check) — but it runs even when fast suites failed, so a push
  // with both a suite failure and drift reports both classes in one pass
  // instead of serializing them into separate blocked rounds.
  let suiteFailures = failed;
  if (canonical) {
    const start = Date.now();
    // The divergence generate runs for ~12 min and hammers every temple
    // page. On some Windows hosts an AV/indexer lock (UNKNOWN/-4094) or an
    // OS-level kill takes the whole generate process down mid-flight —
    // spawnSync reports a non-zero exit with empty output and the gate dies
    // between suite checks with no verdict, blocking the push as a silent
    // riddle. generate.js already retries per-script INSIDE its own process,
    // but it cannot retry when the process itself is killed — so retry the
    // whole generate:check here. A real drift failure repeats identically on
    // every attempt; a transient kill usually passes on the rerun.
    let lastErr = null;
    let passed = false;
    // The divergence generate must match CI byte-for-byte. CI sets
    // PUNICODEX_GENERATE_SKIP_BINARY=1 (the binary-only composites steps
    // regenerate gitignored multi-GB assets a git diff can never see, and
    // their fresh outputs can ripple into later store renders); a full local
    // generate here validates a DIFFERENT artifact than CI will — green gate,
    // red CI. Skip binaries in the gate too.
    const GEN_ENV = { ...process.env, PUNICODEX_GENERATE_SKIP_BINARY: '1' };
    for (let attempt = 1; attempt <= 3 && !passed; attempt++) {
      try {
        execFileSync(NPM, ['run', 'generate:check'], {
          cwd: ROOT,
          env: GEN_ENV,
          stdio: ['ignore', 'ignore', 'pipe'],
          // `npm run generate` prints hundreds of KB (per-site flagship regen
          // lines). The execFileSync default 1 MiB maxBuffer aborts the child
          // with ERR_CHILD_PROCESS_STDIO_MAXBUFFER mid-generate — surfaced as
          // a spurious "out of sync" — once output crosses the cap. Size the
          // buffer for the worst-case run instead.
          maxBuffer: 64 * 1024 * 1024,
          ...SHELL_OPT,
        });
        passed = true;
      } catch (err) {
        lastErr = err;
        const code = err.status == null ? 'killed' : `exit ${err.status}`;
        console.log(
          `  ${C.dim}Divergence Gate attempt ${attempt}/3 ${code} — ${err.status == null ? 'transient kill, retrying' : 'checking output...'}${C.reset}`
        );
      }
    }
    if (passed) {
      console.log(`  ${C.green}✓${C.reset} Divergence Gate ${C.dim}(${((Date.now() - start) / 1000).toFixed(1)}s)${C.reset}`);
    } else {
      failed = true;
      const err = lastErr;
      console.log(`  ${C.red}✗ Divergence Gate — generated artifacts out of sync${C.reset}`);
      const out = [err.stdout, err.stderr]
        .filter(Boolean)
        .map((b) => b.toString())
        .join('\n');
      appendLog(`\n===== DIVERGENCE GATE FAILED =====\n${out}`);
      // Surface the actual drifted files directly — the generate log tail
      // scrolls them off. A second porcelain read is cheap and robust.
      try {
        const drift = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' })
          .split('\n')
          .filter((l) => l && !l.startsWith('??'))
          .slice(0, 60);
        if (drift.length) {
          console.log(`    ${C.red}Drifted files:${C.reset}`);
          for (const d of drift) console.log(`    ${C.red} ${d}${C.reset}`);
        }
      } catch {}
      console.log(`    ${C.dim}Full failure output: ${LOG_FILE}${C.reset}`);
      console.log(
        `    ${C.dim}Remediation: npm run generate, then git add/commit the regenerated files — see AGENTS.md “Pre-push gate”.${C.reset}`
      );
      // --fix: when suites are green and ONLY drift failed, run the full
      // pipeline ourselves, stage the regenerated files, and re-verify.
      // Hand-patching generated pages with standalone scripts is what causes
      // repeat blocks — this makes the full pipeline the only repair path.
      if (!suiteFailures && process.argv.includes('--fix')) {
        console.log(`\n  ${C.cyan}▸ --fix: running npm run generate…${C.reset}`);
        try {
          execFileSync(NPM, ['run', 'generate'], { cwd: ROOT, env: GEN_ENV, stdio: 'inherit', ...SHELL_OPT });
          execFileSync('git', ['add', '-A', '--', ':!Kimi_Agent_Unicode Pantheon Animation Plan'], {
            cwd: ROOT,
            stdio: 'inherit',
          });
          execFileSync(NPM, ['run', 'generate:check'], { cwd: ROOT, env: GEN_ENV, stdio: 'inherit', maxBuffer: 64 * 1024 * 1024, ...SHELL_OPT });
          console.log(
            `\n  ${C.green}✓ Regenerated, staged, and divergence-clean.${C.reset}` +
              `\n  ${C.dim}Commit the staged files and push again.${C.reset}\n`
          );
        } catch (fixErr) {
          console.log(`  ${C.red}✗ --fix failed: ${fixErr.message}${C.reset}`);
        }
      }
    }
  }

  if (failed) {
    console.log(
      `\n${C.red}${C.bold}✗ Push blocked.${C.reset}${C.red} Fix the failures above — CI would fail the same way.\n` +
        `  Emergency override (you own the red CI): git push --no-verify${C.reset}\n`
    );
    process.exit(1);
  }
  writeAttestation({
    ...currentHeadAndTree(),
    selected,
    canonical,
    commandsHash: suiteCommandsHash(suiteCommands),
  });
  console.log(`\n${C.green}${C.bold}✓ Pre-push gate passed — safe to push.${C.reset}\n`);
}

if (require.main === module) main();

module.exports = {
  canReuseAttestation,
  readAttestation,
  reusableAttestation,
  suiteCommandsHash,
  writeAttestation,
};
