/**
 * PuniCodex — Brand-Risk Language Regression Test
 *
 * Scans public-facing pages and source templates for phrasing that could invite
 * trademark disputes, UDRP claims, or implied-endorsement arguments from
 * modern brand holders (Nike Inc., Hermès, etc.).
 *
 * The test is intentionally strict: any match must be reviewed and either
 * rewritten or explicitly allow-listed in ALLOWED_FILES.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === '.vercel' ||
        entry.name === '.backup' ||
        entry.name === 'platform' ||
        entry.name === 'api' ||
        entry.name === 'test' ||
        entry.name === 'extended flagship materials'
      ) {
        continue;
      }
      walk(full, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (['.html', '.css', '.js'].includes(ext)) {
        files.push(full);
      }
    }
  }
  return files;
}

function isPublicPage(relativePath) {
  return (
    relativePath.startsWith('sites/') ||
    relativePath.startsWith('templates/flagship/') ||
    relativePath === 'about/index.html' ||
    relativePath === 'appraise/index.html' ||
    relativePath === 'terms/advertising/index.html' ||
    relativePath === 'index.html'
  );
}

// High-risk phrases. Regular expressions are case-insensitive.
const HIGH_RISK_PATTERNS = [
  { pattern: /\bbrand collision\b/i, label: 'brand collision' },
  { pattern: /In alignment with\b/i, label: 'In alignment with' },
  { pattern: /Premium advertising\b/i, label: 'Premium advertising' },
  { pattern: /Premium Ad Spaces\b/i, label: 'Premium Ad Spaces' },
  { pattern: /Your brand, endorsed\b/i, label: 'Your brand, endorsed' },
  { pattern: /\bendorsed by\b/i, label: 'endorsed by' },
  { pattern: /\bendorses\b/i, label: 'endorses' },
  { pattern: /\bendorsement\b/i, label: 'endorsement' },
  { pattern: /Advertiser Dashboard\b/i, label: 'Advertiser Dashboard' },
  { pattern: /advertiser dashboard\b/i, label: 'advertiser dashboard' },
  { pattern: /Nike, Inc\b/i, label: 'Nike, Inc' },
  { pattern: /Hermès Inc\b/i, label: 'Hermès Inc' },
  { pattern: /Hermes Inc\b/i, label: 'Hermes Inc' },
  { pattern: /Just Do It\b/i, label: 'Just Do It' },
  { pattern: /value of association\b/i, label: 'value of association' },
  { pattern: /\bsquatters\b/i, label: 'squatters' },
  { pattern: /modern sports brand Nike\b/i, label: 'modern sports brand Nike' },
  { pattern: /modern fashion brand Hermès\b/i, label: 'modern fashion brand Hermès' },
  { pattern: /modern fashion brand Hermes\b/i, label: 'modern fashion brand Hermes' },
  { pattern: /class="[^"]*endorsement-/i, label: 'endorsement- CSS class' },
];

// Phrases that are only risky in public pages, not in internal tooling.
const PUBLIC_ONLY_PATTERNS = [
  { pattern: /\bswoosh\b/i, label: 'swoosh' },
  { pattern: /\bSwoosh\b/, label: 'Swoosh' },
];

// Files that are allowed to contain otherwise risky terms.
const ALLOWED_FILES = new Set([
  // Internal migration / cleanup scripts. They intentionally reference old text.
  'scripts/neutralize-temple-language.js',
  'scripts/adapt-ra-ad-home.js',
  'scripts/rank-thin-content.js',
  'scripts/compare-zeus-aphrodite.js',
  // Documentation that discusses the risk itself.
  'docs/name-authenticity-plan.md',
]);

function relative(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

test('no high-risk brand language in public pages or flagship templates', () => {
  const files = walk(ROOT).filter((f) => {
    const rel = relative(f);
    return isPublicPage(rel) || rel.startsWith('css/') || rel.startsWith('js/');
  });

  const violations = [];
  for (const file of files) {
    const rel = relative(file);
    if (ALLOWED_FILES.has(rel)) continue;

    const content = fs.readFileSync(file, 'utf8');
    for (const { pattern, label } of HIGH_RISK_PATTERNS) {
      if (pattern.test(content)) {
        violations.push(`${rel}: ${label}`);
      }
    }

    if (isPublicPage(rel)) {
      for (const { pattern, label } of PUBLIC_ONLY_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(`${rel}: ${label}`);
        }
      }
    }
  }

  assert.deepStrictEqual(
    violations,
    [],
    `Brand-risk language found. Rewrite or allow-list the file:\n${violations.join('\n')}`
  );
});

test('no tracked .backup directories with stale brand language', () => {
  const { execSync } = require('node:child_process');
  const tracked = execSync('git ls-files "**/.backup/**"', {
    cwd: ROOT,
    encoding: 'utf8',
  }).trim();
  assert.strictEqual(tracked, '', 'tracked .backup directories found; remove them from git');
});

test('line endings in generated files are LF', () => {
  const generated = [
    'middleware.js',
    'data-version.json',
    'sitemap.xml',
    'js/original-script-lookup.js',
  ];
  const violations = [];
  for (const rel of generated) {
    const file = path.join(ROOT, rel);
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('\r\n')) {
      violations.push(`${rel}: contains CRLF`);
    }
  }
  assert.deepStrictEqual(
    violations,
    [],
    `CRLF found in generated files:\n${violations.join('\n')}`
  );
});

async function runSuite() {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      await t.fn();
      passed++;
      console.log(`  ✓ ${t.name}`);
    } catch (err) {
      failed++;
      console.error(`  ✗ ${t.name}`);
      console.error(`    ${err.message.split('\n').join('\n    ')}`);
    }
  }
  console.log(`\nBrand Risk Language: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
