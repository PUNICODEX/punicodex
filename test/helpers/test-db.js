/**
 * Test DB isolation helpers.
 *
 * Each mutating test suite should call `prepareTestDb(__filename)` at the top
 * of the file, set `process.env.PUNYCODEX_TEST_DB_PATH` to the returned path,
 * and then require any service that opens a DB connection.
 *
 * Because `test/run-all.js` spawns each suite in a separate process, module
 * caching does not leak DB paths across suites.
 */

const fs = require('node:fs');
const path = require('node:path');

const GOLDEN_DB = path.join(__dirname, '..', '..', 'platform', 'db', 'punycodex.db');
const TEST_TMP = path.join(__dirname, '..', 'tmp');

function ensureTmp() {
  if (!fs.existsSync(TEST_TMP)) {
    fs.mkdirSync(TEST_TMP, { recursive: true });
  }
}

function slug(name) {
  return path.basename(name).replace(/[^a-z0-9]/gi, '_');
}

function prepareTestDb(suiteName) {
  ensureTmp();
  const name = slug(suiteName);
  const testDb = path.join(TEST_TMP, `${name}.db`);

  if (!fs.existsSync(GOLDEN_DB)) {
    throw new Error(`Golden database not found at ${GOLDEN_DB}`);
  }

  fs.copyFileSync(GOLDEN_DB, testDb);

  // Copy WAL/shm if they exist so the copied DB is in a consistent state.
  for (const ext of ['-wal', '-shm']) {
    const src = `${GOLDEN_DB}${ext}`;
    const dst = `${testDb}${ext}`;
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dst);
    } else if (fs.existsSync(dst)) {
      fs.unlinkSync(dst);
    }
  }

  process.env.PUNYCODEX_TEST_DB_PATH = testDb;
  return testDb;
}

function getTestDbPath(suiteName) {
  ensureTmp();
  return path.join(TEST_TMP, `${slug(suiteName)}.db`);
}

function resetTestDb(suiteName) {
  return prepareTestDb(suiteName);
}

function cleanupTestDb(suiteName) {
  const testDb = getTestDbPath(suiteName);
  for (const file of [testDb, `${testDb}-wal`, `${testDb}-shm`]) {
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (_e) {
      // best effort
    }
  }
}

module.exports = {
  prepareTestDb,
  getTestDbPath,
  resetTestDb,
  cleanupTestDb,
};
