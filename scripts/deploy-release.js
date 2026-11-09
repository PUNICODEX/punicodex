#!/usr/bin/env node

'use strict';

const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const REPO = 'PUNICODEX/punicodex';
const STATE_FILE = path.join(ROOT, '.git', 'deploy-release-last-run.json');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  }).trim();
}

function writeState(state) {
  const temporary = `${STATE_FILE}.tmp.${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
  fs.renameSync(temporary, STATE_FILE);
}

function isRetryablePushError(output) {
  return /RPC failed|HTTP 408|curl 55|fetch failed|unexpected disconnect|remote end hung up|Connection was aborted|HTTP 50[234]|Connection reset|Timed out/i.test(
    output
  );
}

function selectWorkflowRun(runs, headSha) {
  return (runs || [])
    .filter((run) => run.head_sha === headSha)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0] || null;
}

function workflowOutcome(run) {
  if (!run || run.status !== 'completed') return 'pending';
  return run.conclusion === 'success' ? 'success' : 'failure';
}

function githubCredential() {
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
    return process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  }
  const fields = Object.fromEntries(
    execFileSync('git', ['credential', 'fill'], {
      input: 'protocol=https\nhost=github.com\n\n',
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
  if (!fields.password) throw new Error('No GitHub credential found');
  return fields.password;
}

async function github(endpoint, token) {
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await fetch(`https://api.github.com${endpoint}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'punicodex-release-controller',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      const data = await response.json();
      if (response.ok) return data;
      const error = new Error(`GitHub ${response.status}: ${data.message || endpoint}`);
      error.status = response.status;
      if (![408, 429, 500, 502, 503, 504].includes(response.status)) throw error;
      lastError = error;
    } catch (error) {
      if (error.status && ![408, 429, 500, 502, 503, 504].includes(error.status)) throw error;
      lastError = error;
    }
    await sleep(attempt * 1500);
  }
  throw lastError;
}

function pushWithRetry(maxAttempts = 4) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`\nPush attempt ${attempt}/${maxAttempts}`);
    const result = spawnSync('git', ['push', 'origin', 'master'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024,
    });
    const output = `${result.stdout || ''}${result.stderr || ''}`;
    process.stdout.write(output);
    if (result.status === 0) return;
    if (!isRetryablePushError(output) || attempt === maxAttempts) {
      throw new Error(`git push failed permanently with status ${result.status}`);
    }
    console.log('Transient push transport failure; the exact-tree attestation will be reused.');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 5000);
  }
}

async function waitForWorkflow(file, headSha, token, timeoutMinutes) {
  const started = Date.now();
  const deadline = started + timeoutMinutes * 60 * 1000;
  let previous = '';
  while (Date.now() < deadline) {
    const data = await github(
      `/repos/${REPO}/actions/workflows/${file}/runs?head_sha=${headSha}&per_page=20`,
      token
    );
    const run = selectWorkflowRun(data.workflow_runs, headSha);
    const outcome = workflowOutcome(run);
    const status = run ? `${run.status}/${run.conclusion || 'pending'}` : 'not-created';
    if (status !== previous) {
      console.log(`${file}: ${status}${run ? ` — ${run.html_url}` : ''}`);
      previous = status;
    }
    if (outcome === 'success') return run;
    if (outcome === 'failure') {
      throw new Error(`${file} failed${run ? `: ${run.html_url}` : ''}`);
    }
    await sleep(30000);
  }
  throw new Error(`${file} did not complete within ${timeoutMinutes} minutes for ${headSha}`);
}

async function verifyProduction() {
  const expectations = [
    ['/pantheon/strata/', 'STRATA'],
    ['/world/sacred/', 'Sacred Geography'],
    ['/', '>World</a>'],
    ['/ninlil/lore/', 'canonical digital temple'],
    ['/', 'Station I · The Collection'],
  ];
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      for (const [pathname, marker] of expectations) {
        const response = await fetch(`https://punicodex.com${pathname}`, {
          headers: { 'Cache-Control': 'no-cache', 'User-Agent': 'punicodex-release-verifier' },
        });
        const html = await response.text();
        if (!response.ok || !html.includes(marker)) {
          throw new Error(`${pathname}: HTTP ${response.status} or missing marker ${marker}`);
        }
        console.log(`Production verified: ${pathname}`);
      }
      return;
    } catch (error) {
      if (attempt === 12) throw error;
      console.log(`Production is still converging (${error.message}); retrying in 10s`);
      await sleep(10000);
    }
  }
}

async function main() {
  if (git(['status', '--porcelain'])) {
    throw new Error('Working tree is not clean; commit or stash changes before deploying');
  }
  execFileSync('git', ['fetch', 'origin', 'master'], { cwd: ROOT, stdio: 'inherit' });
  const divergence = git(['rev-list', '--left-right', '--count', 'HEAD...origin/master']);
  const [ahead, behind] = divergence.split(/\s+/).map(Number);
  if (behind > 0) {
    throw new Error(`Local master is ${behind} commit(s) behind origin; reconcile before deploying`);
  }

  execFileSync(process.execPath, ['scripts/prepush-gate.js'], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  const head = git(['rev-parse', 'HEAD']);
  const token = githubCredential();
  const state = { head, startedAt: new Date().toISOString(), stage: 'push' };
  writeState(state);

  if (ahead > 0) pushWithRetry();
  else console.log('Remote already contains HEAD; no upload required');

  const remote = git(['ls-remote', 'origin', 'refs/heads/master']);
  if (!remote.startsWith(head)) throw new Error(`Remote master does not match ${head}`);
  writeState({ ...state, stage: 'ci' });
  const ci = await waitForWorkflow('ci.yml', head, token, 75);
  writeState({ ...state, stage: 'deploy', ciUrl: ci.html_url });
  const deployment = await waitForWorkflow('deploy-prebuilt.yml', head, token, 135);
  writeState({ ...state, stage: 'verify', ciUrl: ci.html_url, deployUrl: deployment.html_url });
  await verifyProduction();
  writeState({
    ...state,
    stage: 'complete',
    ciUrl: ci.html_url,
    deployUrl: deployment.html_url,
    completedAt: new Date().toISOString(),
  });
  console.log('\nRelease deployed and production verified.');
}

if (require.main === module) {
  main().catch((error) => {
    let state = {};
    try {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch {}
    writeState({ ...state, stage: 'failed', error: error.message, failedAt: new Date().toISOString() });
    console.error(`\nRelease stopped: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  isRetryablePushError,
  selectWorkflowRun,
  workflowOutcome,
};
