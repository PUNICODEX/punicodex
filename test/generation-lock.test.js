const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');
const { test } = require('node:test');

const ROOT = path.join(__dirname, '..');
const LOCK_MODULE = path.join(ROOT, 'scripts', 'generation-lock.js');
const WRITE_MODULE = path.join(ROOT, 'scripts', 'write-file-retry.js');

function workspace(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'punicodex-generation-'));
  const lockPath = path.join(dir, 'generate.lock');
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return { dir, lockPath };
}

function lockHolder(lockPath, owner, holdMs = 500) {
  const source = `const {acquireGenerationLock}=require(${JSON.stringify(LOCK_MODULE)});acquireGenerationLock(${JSON.stringify(owner)});setTimeout(()=>process.exit(0),${holdMs});`;
  return spawn(process.execPath, ['-e', source], {
    env: { ...process.env, PUNICODEX_GENERATE_LOCK_PATH: lockPath },
    stdio: 'ignore',
  });
}

function lockAttempt(lockPath) {
  const source = `const {acquireGenerationLock}=require(${JSON.stringify(LOCK_MODULE)});acquireGenerationLock('contender');`;
  return spawnSync(process.execPath, ['-e', source], {
    env: { ...process.env, PUNICODEX_GENERATE_LOCK_PATH: lockPath },
    encoding: 'utf8',
  });
}

test('a second generator is rejected while the first is alive, then succeeds after release', async (t) => {
  const { lockPath } = workspace(t);
  const first = lockHolder(lockPath, 'first', 700);
  await new Promise((resolve, reject) => {
    const deadline = Date.now() + 3000;
    const poll = () => {
      if (fs.existsSync(lockPath)) return resolve();
      if (Date.now() > deadline) return reject(new Error('lock was not created'));
      setTimeout(poll, 15);
    };
    poll();
  });

  const contender = lockAttempt(lockPath);
  assert.notStrictEqual(contender.status, 0);
  assert.match(contender.stderr, /Generation already running: first/);
  await new Promise((resolve) => first.once('exit', resolve));
  assert.strictEqual(lockAttempt(lockPath).status, 0);
});

test('a crashed generator leaves a stale lock that the next run can reclaim', (t) => {
  const { lockPath } = workspace(t);
  fs.writeFileSync(lockPath, JSON.stringify({ owner: 'crashed', pid: 999999, token: 'stale' }));
  const result = lockAttempt(lockPath);
  assert.strictEqual(result.status, 0, result.stderr);
  assert.strictEqual(fs.existsSync(lockPath), false);
});

test('atomic writes never expose empty or partial HTML to a concurrent reader', async (t) => {
  const { dir, lockPath } = workspace(t);
  const target = path.join(dir, 'page.html');
  const initial = '<!DOCTYPE html><html><head></head><body>initial</body></html>';
  fs.writeFileSync(target, initial);
  const source = `
    const {writeFileWithRetry}=require(${JSON.stringify(WRITE_MODULE)});
    const target=${JSON.stringify(target)};
    for(let i=0;i<6;i++){
      const body=String(i)+':'+String.fromCharCode(97+i).repeat(1800000)+':end';
      writeFileWithRetry(target,'<!DOCTYPE html><html><head></head><body>'+body+'</body></html>');
    }
  `;
  const child = spawn(process.execPath, ['-e', source], {
    env: { ...process.env, PUNICODEX_GENERATE_LOCK_PATH: lockPath },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => (stderr += chunk));
  let reads = 0;
  const complete =
    /^<!DOCTYPE html><html><head><\/head><body>(?:initial|\d+:[a-z]+:end)<\/body><\/html>$/;
  while (child.exitCode === null && reads < 3000) {
    try {
      const html = fs.readFileSync(target, 'utf8');
      assert.ok(html.length > 0, 'reader observed an empty page');
      assert.match(html, complete, 'reader observed a partial page');
      reads++;
    } catch (err) {
      if (!['EPERM', 'EBUSY', 'EAGAIN', 'UNKNOWN'].includes(err.code)) throw err;
    }
    await new Promise((resolve) => setTimeout(resolve, reads % 10 === 0 ? 40 : 1));
  }
  const exitCode =
    child.exitCode !== null
      ? child.exitCode
      : await new Promise((resolve) => child.once('exit', resolve));
  assert.strictEqual(exitCode, 0, stderr);
  assert.ok(reads > 0, 'reader did not observe any writes');
});
