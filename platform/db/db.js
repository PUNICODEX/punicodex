const fs = require('node:fs');
const path = require('node:path');

function getDbPath() {
  // Tests can point at an isolated copy of the database.
  if (process.env.PUNICODEX_TEST_DB_PATH) {
    return process.env.PUNICODEX_TEST_DB_PATH;
  }

  // On Vercel serverless functions the project root is read-only;
  // copy the bundled SQLite DB to /tmp so better-sqlite3 can open it
  // with write access (the bundled DB uses WAL journal mode).
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const src = path.join(process.cwd(), 'platform', 'db', 'punicodex.db');
    const tmpDir = process.env.TMPDIR || process.env.TEMP || '/tmp';
    const tmpDb = path.join(tmpDir, 'punicodex.db');
    if (!fs.existsSync(tmpDb) && fs.existsSync(src)) {
      fs.copyFileSync(src, tmpDb);
    }
    // No bundled seed DB (CI-built deployments, where the gitignored local
    // DB file is absent): leave tmpDb absent — better-sqlite3 creates it and
    // the idempotent migrations build the schema on cold start.
    return tmpDb;
  }
  // Local development: use the project DB directly
  return path.join(__dirname, 'punicodex.db');
}

module.exports = { getDbPath };
