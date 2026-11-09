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
