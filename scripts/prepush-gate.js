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

const CANONICAL_SUITES = ['Lexicon Validator', 'Generated Artifacts Tests', 'Flywheel Integrity'];

const RULES = [
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
      'Admin Route Auth Contract Tests',
      'Admin Booking Routes',
    ],
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
    console.log(
      out
        .split('\n')
        .filter((l) => l.trim())
        .slice(-25)
        .map((l) => `    ${C.dim}${l}${C.reset}`)
        .join('\n')
    );
    return false;
  }
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
  return ok;
}

function main() {
  console.log(`\n${C.bold}${C.cyan}▸ Pre-Push Gate${C.reset}`);

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
  console.log(`  ${C.dim}${files.length} changed file(s) → ${selected.length} gate(s)${C.reset}`);
  for (const f of files.slice(0, 12)) console.log(`    ${C.dim}· ${f}${C.reset}`);
  if (files.length > 12) console.log(`    ${C.dim}· …and ${files.length - 12} more${C.reset}`);

  let failed = false;
  for (const name of selected) {
    if (name === '__DIVERGENCE__') continue;
    const cmd = suiteCommands.get(name);
    if (!runSuite(name, cmd)) failed = true;
  }

  if (canonical && !failed) {
    // Divergence gate last: it regenerates everything and diffs — the most
    // expensive check, only worth running once the fast gates are green.
    const start = Date.now();
    try {
      execFileSync(NPM, ['run', 'generate:check'], {
        cwd: ROOT,
        stdio: ['ignore', 'ignore', 'pipe'],
        ...SHELL_OPT,
      });
      console.log(`  ${C.green}✓${C.reset} Divergence Gate ${C.dim}(${((Date.now() - start) / 1000).toFixed(1)}s)${C.reset}`);
    } catch (err) {
      failed = true;
      console.log(`  ${C.red}✗ Divergence Gate — generated artifacts out of sync${C.reset}`);
      const out = [err.stdout, err.stderr]
      .filter(Boolean)
      .map((b) => b.toString())
      .join('\n');
      console.log(out.split('\n').slice(-15).map((l) => `    ${C.dim}${l}${C.reset}`).join('\n'));
    }
  } else if (canonical && failed) {
    console.log(`  ${C.yellow}⚠ divergence gate skipped (fix the failures above first)${C.reset}`);
  }

  if (failed) {
    console.log(
      `\n${C.red}${C.bold}✗ Push blocked.${C.reset}${C.red} Fix the failures above — CI would fail the same way.\n` +
        `  Emergency override (you own the red CI): git push --no-verify${C.reset}\n`
    );
    process.exit(1);
  }
  console.log(`\n${C.green}${C.bold}✓ Pre-push gate passed — safe to push.${C.reset}\n`);
}

main();
