/**
 * PÚNYCODEX — Generator Idempotency Tests
 *
 * Fast, targeted regression tests for generator scripts that have historically
 * been non-idempotent (rewriting timestamps on every run). Each test runs a
 * single generator twice and asserts the affected output files do not change.
 */

'use strict';

const assert = require('node:assert');
const crypto = require('node:crypto');
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function run(cmd, opts = {}) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    ...opts,
  }).trim();
}

function hashFile(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function hashFiles(files) {
  return files.map((f) => `${f}:${hashFile(f)}`);
}

function runGeneratorTwice(scriptPath, outputs) {
  run(`node "${scriptPath}"`, { timeout: 60000 });
  const first = hashFiles(outputs);
  run(`node "${scriptPath}"`, { timeout: 60000 });
  const second = hashFiles(outputs);
  assert.deepStrictEqual(
    second,
    first,
    `generator ${scriptPath} produced different output on second run`
  );
}

test('export-codex-data.js is idempotent for codex/data/*.json', () => {
  const outputs = [
    'codex/data/codex-lexicon.json',
    'codex/data/original-scripts.json',
    'codex/data/source-catalog.json',
    'codex/data/owned-domains.json',
  ].map((f) => path.join(ROOT, f));
  runGeneratorTwice('scripts/export-codex-data.js', outputs);
});

test('generate-scholars-manifests.js is idempotent for manifest files', () => {
  const manifestDir = path.join(ROOT, 'platform', 'scholars', 'manifests');
  const outputs = [
    path.join(manifestDir, 'all.json'),
    path.join(manifestDir, 'zeus.json'),
    path.join(manifestDir, 'nike.json'),
    path.join(manifestDir, 'apollon.json'),
  ];
  runGeneratorTwice('scripts/generate-scholars-manifests.js', outputs);
});

test('update-data-version.js is idempotent when canonical sources are unchanged', () => {
  const output = path.join(ROOT, 'data-version.json');
  runGeneratorTwice('scripts/update-data-version.js', [output]);
});

test('sync-middleware-domains.js is idempotent when domain set is unchanged', () => {
  const output = path.join(ROOT, 'middleware.js');
  runGeneratorTwice('scripts/sync-middleware-domains.js', [output]);
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
  console.log(`\nGenerator Idempotency: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
