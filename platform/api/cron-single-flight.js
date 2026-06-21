/**
 * PÚNYCODEX — Cron single-flight guard
 *
 * Prevents overlapping cron invocations from doing duplicate work. Uses a
 * lightweight SQLite-backed lock table so the guard works for both local
 * long-running processes and Vercel serverless invocations that share the
 * same database file. When Redis is configured it could be swapped in later,
 * but SQLite is sufficient for the current deployment model and keeps tests
 * dependency-free.
 */

const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

const DEFAULT_TTL_MINUTES = 10;

function openLockDb() {
  const db = new Database(getDbPath());
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  return db;
}

function ensureTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cron_locks (
      name TEXT PRIMARY KEY,
      acquired_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL
    )
  `);
}

/**
 * Try to acquire a single-flight lock for the named cron job.
 * Returns an object with { acquired: true, name, db } on success, or
 * { acquired: false, name } if another invocation still holds the lock.
 * The caller MUST call releaseCronLock() when done, including on errors.
 */
async function acquireCronLock(name, options = {}) {
  const ttlMinutes = options.ttlMinutes || DEFAULT_TTL_MINUTES;
  const db = openLockDb();
  try {
    ensureTable(db);
    // Remove any stale/expired locks before attempting to acquire.
    db.prepare(`DELETE FROM cron_locks WHERE expires_at < datetime('now')`).run();

    const result = db
      .prepare(
        `INSERT OR IGNORE INTO cron_locks (name, acquired_at, expires_at)
         VALUES (?, datetime('now'), datetime('now', ?))`
      )
      .run(name, `+${ttlMinutes} minutes`);

    if (result.changes > 0) {
      return { acquired: true, name, db };
    }

    db.close();
    return { acquired: false, name };
  } catch (err) {
    db.close();
    throw err;
  }
}

/**
 * Release a lock previously acquired with acquireCronLock(). Safe to call
 * even if the lock was not acquired.
 */
async function releaseCronLock(lock) {
  if (!lock?.acquired) return;
  try {
    lock.db.prepare(`DELETE FROM cron_locks WHERE name = ?`).run(lock.name);
  } finally {
    lock.db.close();
  }
}

/**
 * Run `fn()` while holding the named cron lock. Returns `true` if the work
 * was skipped because another invocation holds the lock, otherwise `false`.
 * Any error thrown by `fn` is propagated after the lock is released.
 */
async function withCronLock(name, ttlMinutes, fn) {
  const lock = await acquireCronLock(name, { ttlMinutes });
  if (!lock.acquired) {
    return true;
  }
  try {
    await fn();
    return false;
  } finally {
    await releaseCronLock(lock);
  }
}

module.exports = {
  acquireCronLock,
  releaseCronLock,
  withCronLock,
};
