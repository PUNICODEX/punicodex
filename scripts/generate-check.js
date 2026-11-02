#!/usr/bin/env node
/**
 * PuniCodex — Local divergence gate
 *
 * Mirrors the CI check that runs after `npm run generate`: it regenerates all
 * derived artifacts and fails if any tracked file is still dirty. Run this
 * before pushing to catch forgotten generated-file updates.
 *
 *   npm run generate:check
 */

'use strict';

const { execSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: 'pipe',
    // Large content waves dirty 15k+ files; `update-index --refresh` prints
    // one line per file and blows the 1 MiB default buffer (ENOBUFS).
    maxBuffer: 64 * 1024 * 1024,
    ...opts,
  });
}

console.log('Regenerating derived artifacts...');
run('npm run generate', { timeout: 3600000 });

// The check MUST mirror CI exactly: ci.yml runs `npm run generate` then
// `git diff --exit-code` on a fully-committed checkout — any file the
// pipeline regenerates differently fails. The earlier allowlist of
// "generated" paths had blind spots (root surfaces drifted invisibly at
// 9edd97e4/40d00336), so this now flags EVERY tracked modification/deletion.
// Untracked files are excluded: they cannot ship (CI's checkout is
// committed), so they cannot diverge — but the workflow rule stands:
// canonical-source changes ship WITH their regenerated files.
function findDrift() {
  const lines = run('git status --porcelain=v1').split('\n').filter(Boolean);
  return lines.filter((l) => !l.startsWith('??'));
}
run('git update-index --refresh --really-refresh || true');

console.log('Checking for drift against HEAD (CI-mirror: any tracked change fails)...');
const drift = findDrift();

if (drift.length > 0) {
  console.error('\n❌ Generated files are out of sync with canonical sources.');
  console.error('\nDrifted files:\n' + drift.slice(0, 60).join('\n'));
  if (drift.length > 60) console.error(`  … and ${drift.length - 60} more`);
  console.error('\nRun `npm run generate`, review, and commit the regenerated files.');
  process.exit(1);
}
console.log('\n✅ Generated files are in sync. Safe to push.');
