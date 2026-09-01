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
    ...opts,
  });
}

console.log('Regenerating derived artifacts...');
run('npm run generate', { timeout: 3600000 });

function isGeneratedArtifact(file) {
  if (file === 'middleware.js') return true;
  if (file === 'data-version.json') return true;
  if (file === 'sitemap.xml') return true;
  if (file === 'js/original-script-lookup.js') return true;
  if (file.startsWith('codex/data/')) return true;
  if (file.startsWith('platform/scholars/manifests/')) return true;
  if (file.startsWith('platform/browser/renderer/')) return true;
  if (file.startsWith('extension/shared/')) return true;
  if (file.startsWith('mobile/shared/')) return true;
  if (file.startsWith('android/app/src/main/assets/shared/')) return true;
  if (/^sites\/[^/]+\/(index\.html|styles\.css|script\.js|scholars\/index\.html)$/.test(file)) return true;
  return false;
}

console.log('Refreshing git index after regeneration...');
run('git update-index --refresh --really-refresh || true');

console.log('Checking for uncommitted generated changes...');
const lines = run('git status --porcelain=v1').split('\n').filter(Boolean);
const dirtyGenerated = [];
for (const line of lines) {
  const file = line.slice(3);
  if (isGeneratedArtifact(file)) dirtyGenerated.push(file);
}

if (dirtyGenerated.length > 0) {
  console.error('\n❌ Generated files are out of sync with canonical sources.');
  console.error('\nDirty generated files:\n' + dirtyGenerated.join('\n'));
  console.error('\nRun `npm run generate` and commit the regenerated files.');
  process.exit(1);
}

console.log('\n✅ Generated files are in sync. Safe to push.');
