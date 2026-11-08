const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const LOCK_PATH = process.env.PUNICODEX_GENERATE_LOCK_PATH || path.join(ROOT, '.git', 'punicodex-generate.lock');

function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

function readLock() {
  try {
    return JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function acquireGenerationLock(owner) {
  if (process.env.PUNICODEX_GENERATE_LOCK_HELD === '1') return () => {};

  const existing = readLock();
  if (existing && alive(existing.pid)) {
    throw new Error(
      `Generation already running: ${existing.owner || 'unknown'} (pid ${existing.pid}). ` +
        'Wait for it to finish before starting another generator.'
    );
  }

  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });
  const token = `${process.pid}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  let fd;
  try {
    fd = fs.openSync(LOCK_PATH, 'wx');
    fs.writeFileSync(fd, JSON.stringify({ owner, pid: process.pid, token }), 'utf8');
  } catch (err) {
    if (fd !== undefined) fs.closeSync(fd);
    if (err.code === 'EEXIST') {
      const current = readLock();
      if (current && alive(current.pid)) {
        throw new Error(
          `Generation already running: ${current.owner || 'unknown'} (pid ${current.pid}). ` +
            'Wait for it to finish before starting another generator.'
        );
      }
      fs.unlinkSync(LOCK_PATH);
      return acquireGenerationLock(owner);
    }
    throw err;
  }
  fs.closeSync(fd);

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    try {
      if (readLock()?.token === token) fs.unlinkSync(LOCK_PATH);
    } catch {}
  };
  process.once('exit', release);
  return release;
}

module.exports = { acquireGenerationLock, LOCK_PATH };
