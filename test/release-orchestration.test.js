const assert = require('node:assert/strict');
const test = require('node:test');

const {
  isRetryablePushError,
  selectWorkflowRun,
  workflowOutcome,
} = require('../scripts/deploy-release.js');

test('only transport failures are retried by the release controller', () => {
  for (const output of [
    'error: RPC failed; HTTP 408 curl 22',
    'error: RPC failed; curl 55 Send failure: Connection was aborted',
    'send-pack: unexpected disconnect while reading sideband packet',
    'fatal: the remote end hung up unexpectedly',
    'Error: fetch failed',
    'HTTP 503 Service Unavailable',
  ]) {
    assert.equal(isRetryablePushError(output), true, output);
  }
  for (const output of [
    '✗ Push blocked. Fix the failures above',
    'remote: Permission denied',
    'error: failed to push some refs',
    'generated files are out of sync',
  ]) {
    assert.equal(isRetryablePushError(output), false, output);
  }
});

test('workflow selection uses the requested commit and newest matching run', () => {
  const other = { head_sha: 'other', created_at: '2026-11-09T12:00:00Z' };
  const older = { head_sha: 'target', created_at: '2026-11-09T10:00:00Z' };
  const newer = { head_sha: 'target', created_at: '2026-11-09T11:00:00Z' };
  assert.equal(selectWorkflowRun([other, older, newer], 'target'), newer);
  assert.equal(selectWorkflowRun([other], 'target'), null);
  assert.equal(selectWorkflowRun(null, 'target'), null);
});

test('only completed successful workflows pass the deployment gate', () => {
  assert.equal(workflowOutcome(null), 'pending');
  assert.equal(workflowOutcome({ status: 'queued' }), 'pending');
  assert.equal(workflowOutcome({ status: 'in_progress' }), 'pending');
  assert.equal(workflowOutcome({ status: 'completed', conclusion: 'success' }), 'success');
  for (const conclusion of ['failure', 'cancelled', 'skipped', 'timed_out']) {
    assert.equal(workflowOutcome({ status: 'completed', conclusion }), 'failure');
  }
});

test('masters CI rebuilds and guards the complete media fleet with scoped credentials', () => {
  const fs = require('node:fs');
  const workflow = fs.readFileSync('.github/workflows/deploy-masters.yml', 'utf8');
  for (const marker of [
    'secrets.VERCEL_TOKEN',
    '--project punycodex-masters',
    'node scripts/generate-merch-composites.js',
    'node scripts/sync-masters-composites.js',
    'node scripts/sync-masters-assets.js',
    'node scripts/sync-masters-legacy-root.js',
    'node scripts/generate-local-mockups.js',
    'bash scripts/deploy-masters.sh',
    'Verify production mockup bytes',
  ]) {
    assert.ok(workflow.includes(marker), `masters workflow missing ${marker}`);
  }
  assert.ok(!workflow.includes('secrets.VERCEL_PROJECT_ID'));

  const { legacyRootIds } = require('../scripts/masters-legacy-root.json');
  assert.equal(new Set(legacyRootIds).size, legacyRootIds.length);
  assert.ok(legacyRootIds.length >= 55);
  for (const id of legacyRootIds) {
    for (const kind of ['mascot', 'logomark']) {
      assert.ok(fs.existsSync(`sites/${id}/assets/${id}_${kind}.png`), `${id} ${kind}`);
    }
  }
  const deployScript = fs.readFileSync('scripts/deploy-masters.sh', 'utf8');
  assert.ok(deployScript.includes('VERCEL_CLI_PACKAGE'));
  assert.ok(deployScript.includes('TOKEN_ARGS=(--token "$VERCEL_TOKEN")'));
});
