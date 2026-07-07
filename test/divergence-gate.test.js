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
 *   4. Run `npm run generate` a second time.
 *   5. Fail if the second run changed anything at all (idempotency).
 */

'use strict';

const assert = require('node:assert');
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

test('working tree is inside a git repository', () => {
  const topLevel = run('git rev-parse --show-toplevel');
  assert.strictEqual(path.resolve(topLevel), path.resolve(ROOT));
});

test('npm run generate does not introduce new changes on a clean-ish tree', () => {
  const before = parseStatus(gitStatusPorcelain());

  run('npm run generate', { timeout: 300000 });

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

test('npm run generate is idempotent (second run produces zero diff)', () => {
  const afterFirst = parseStatus(gitStatusPorcelain());

  run('npm run generate', { timeout: 300000 });

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
