/**
 * PÚNYCODEX — Divergence Gate Test
 *
 * Reproduces the CI "Ensure generated files are in sync" step locally so
 * non-idempotent generators are caught before pushing.
 *
 * Strategy:
 *   1. Record files already modified/untracked in the working tree.
 *   2. Run `npm run generate`.
 *   3. Fail if the generator introduced *new* tracked changes or *new*
 *      untracked files on top of the pre-existing state.
 *   4. Fail if any known generated artifact is still dirty (catches the
 *      common case where a canonical source was edited but `npm run generate`
 *      was not run and committed).
 *   5. Run `npm run generate` a second time.
 *   6. Fail if the second run changed anything at all (idempotency).
 */

'use strict';

const assert = require('node:assert');
const { execSync } = require('node:child_process');
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

function gitStatusPorcelain() {
  // --porcelain=v1 is stable and machine-readable.
  return run('git status --porcelain=v1').split('\n').filter(Boolean);
}

function parseStatus(lines) {
  const modified = new Set(); // tracked files with working-tree changes
  const untracked = new Set();
  for (const line of lines) {
    const xy = line.slice(0, 2);
    const file = line.slice(3);
    if (xy === '??') {
      untracked.add(file);
    } else {
      // Index or working tree change (M, A, D, R, C, U) on a tracked file.
      modified.add(file);
    }
  }
  return { modified, untracked };
}

function setDiff(a, b) {
  return [...b].filter((x) => !a.has(x));
}

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
  if (/^sites\/[^/]+\/(index\.html|styles\.css|script\.js|scholars\/index\.html)$/.test(file))
    return true;
  return false;
}

test('working tree is inside a git repository', () => {
  const topLevel = run('git rev-parse --show-toplevel');
  assert.strictEqual(path.resolve(topLevel), path.resolve(ROOT));
});

test('npm run generate does not introduce new changes on a clean-ish tree', () => {
  const before = parseStatus(gitStatusPorcelain());

  run('npm run generate', { timeout: 600000 });

  const afterFirst = parseStatus(gitStatusPorcelain());
  const newlyModified = setDiff(before.modified, afterFirst.modified);
  const newlyUntracked = setDiff(before.untracked, afterFirst.untracked);

  assert.deepStrictEqual(
    newlyModified,
    [],
    `npm run generated modified tracked file(s) that were not already dirty:\n${newlyModified.join('\n')}`
  );
  assert.deepStrictEqual(
    newlyUntracked,
    [],
    `npm run generate created untracked file(s):\n${newlyUntracked.join('\n')}`
  );
});

test('generated artifacts are fully committed after npm run generate', () => {
  const afterFirst = parseStatus(gitStatusPorcelain());
  const dirtyGenerated = [...afterFirst.modified, ...afterFirst.untracked].filter(
    isGeneratedArtifact
  );

  assert.deepStrictEqual(
    dirtyGenerated,
    [],
    `generated artifact(s) are still dirty after regeneration; run \`npm run generate\` and commit them:\n${dirtyGenerated.join('\n')}`
  );
});

test('npm run generate is idempotent (second run produces zero diff)', () => {
  const afterFirst = parseStatus(gitStatusPorcelain());

  run('npm run generate', { timeout: 600000 });

  const afterSecond = parseStatus(gitStatusPorcelain());
  const newlyModified = setDiff(afterFirst.modified, afterSecond.modified);
  const newlyUntracked = setDiff(afterFirst.untracked, afterSecond.untracked);
  const vanishedModified = setDiff(afterSecond.modified, afterFirst.modified);
  const vanishedUntracked = setDiff(afterSecond.untracked, afterFirst.untracked);

  const problems = [
    ...(newlyModified.length ? [`newly modified: ${newlyModified.join(', ')}`] : []),
    ...(newlyUntracked.length ? [`newly untracked: ${newlyUntracked.join(', ')}`] : []),
    ...(vanishedModified.length ? [`unexpectedly clean: ${vanishedModified.join(', ')}`] : []),
    ...(vanishedUntracked.length ? [`unexpectedly removed: ${vanishedUntracked.join(', ')}`] : []),
  ];

  assert.deepStrictEqual(
    problems,
    [],
    `second npm run generate was not idempotent:\n${problems.join('\n')}`
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
  console.log(`\nDivergence Gate: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

runSuite();
