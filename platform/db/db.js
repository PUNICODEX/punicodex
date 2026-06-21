const fs = require('node:fs');
const path = require('node:path');

function getDbPath() {
  // Tests can point at an isolated copy of the database.
  if (process.env.PUNYCODEX_TEST_DB_PATH) {
    return process.env.PUNYCODEX_TEST_DB_PATH;
  }

  // On Vercel serverless functions the project root is read-only;
  // copy the bundled SQLite DB to /tmp so better-sqlite3 can open it
  // with write access (the bundled DB uses WAL journal mode).
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const src = path.join(process.cwd(), 'platform', 'db', 'punycodex.db');
    const tmpDir = process.env.TMPDIR || process.env.TEMP || '/tmp';
    const tmpDb = path.join(tmpDir, 'punycodex.db');
    if (!fs.existsSync(tmpDb)) {
      fs.copyFileSync(src, tmpDb);
    }
    return tmpDb;
  }
  // Local development: use the project DB directly
  return path.join(__dirname, 'punycodex.db');
}

module.exports = { getDbPath };
