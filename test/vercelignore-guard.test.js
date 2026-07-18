/**
 * .vercelignore runtime-path guard
 *
 * Regression guard for the class of bug where an unanchored .vercelignore
 * directory pattern (e.g. `scripts/`, `docs/`) silently excludes runtime
 * code at the same-named path deeper in the tree (platform/scripts/,
 * api/v1/docs/) and production 404s/500s result. Anchored patterns
 * (`/scripts/`, `/docs/`) only match the root dir. This suite walks api/ and
 * platform/scripts/ and asserts no runtime directory is excluded.
 *
 * Run: node test/vercelignore-guard.test.js
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// Minimal matcher for the pattern classes used in this repo's .vercelignore:
// comments, blanks, anchored dir (`/x/`), unanchored dir (`x/`), plain name,
// and simple globs (`*.ext`, `**` segments). Anything fancier fails the test
// on purpose so a human reviews it.
function parsePatterns(lines) {
  return lines
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#') && !l.startsWith('!'))
    .map((raw) => {
      const anchored = raw.startsWith('/');
      const dirOnly = raw.endsWith('/');
      const pat = raw.replace(/^\//, '').replace(/\/$/, '');
      if (!/^[A-Za-z0-9_.*~$/ -]+$/.test(pat)) {
        throw new Error(`Unrecognized .vercelignore pattern for guard matcher: ${raw}`);
      }
      return { raw, anchored, dirOnly, pat };
    });
}

function matches(pattern, relPath, isDir) {
  const { anchored, dirOnly, pat } = pattern;
  if (dirOnly && !isDir) return false;
  const segments = relPath.split('/');
  if (pat.includes('**')) return false; // glob paths (e.g. **/.backup) — not dir-excluders of runtime code here
  if (pat.includes('*')) return false; // file globs (e.g. *.log) — not directory exclusions
  if (anchored) {
    return relPath === pat || relPath.startsWith(`${pat}/`);
  }
  return segments.includes(pat);
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(full);
      walk(full, out);
    }
  }
  return out;
}

test('.vercelignore excludes nothing under api/ or platform/scripts/', () => {
  const lines = fs.readFileSync(path.join(ROOT, '.vercelignore'), 'utf8').split(/\r?\n/);
  const patterns = parsePatterns(lines);
  const runtimeDirs = [
    ...walk(path.join(ROOT, 'api')),
    path.join(ROOT, 'platform', 'scripts'),
    ...walk(path.join(ROOT, 'platform', 'scripts')),
  ];
  const violations = [];
  for (const dir of runtimeDirs) {
    const rel = path.relative(ROOT, dir).split(path.sep).join('/');
    for (const p of patterns) {
      if (p.dirOnly && matches(p, rel, true)) {
        violations.push(`${p.raw} excludes ${rel}`);
      }
    }
  }
  assert.deepStrictEqual(violations, [], violations.join('\n'));
});

test('.vercelignore does not exclude the vendored runtime assets (vendor/)', () => {
  const lines = fs.readFileSync(path.join(ROOT, '.vercelignore'), 'utf8').split(/\r?\n/);
  const patterns = parsePatterns(lines);
  const vendorDirs = walk(path.join(ROOT, 'vendor'));
  const violations = [];
  for (const dir of [path.join(ROOT, 'vendor'), ...vendorDirs]) {
    const rel = path.relative(ROOT, dir).split(path.sep).join('/');
    for (const p of patterns) {
      if (p.dirOnly && matches(p, rel, true)) {
        violations.push(`${p.raw} excludes ${rel}`);
      }
    }
  }
  assert.deepStrictEqual(violations, [], violations.join('\n'));
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message.split('\n').join('\n    ')}`);
  }
}
console.log(`\nVercelignore Guard: ${tests.length - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
