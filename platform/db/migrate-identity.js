const Database = require('better-sqlite3');
const path = require('node:path');
const operational = require('./operational');

const TABLES = [
  'accounts',
  'identity_links',
  'account_sessions',
  'account_tokens',
  'account_invitations',
  'institution_capability_policies',
  'account_initiation',
  'account_audit_log',
  'account_downloads',
];

const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    display_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','disabled')),
    email_verified_at DATETIME,
    auth_version INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME
  );
  CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

  CREATE TABLE IF NOT EXISTS identity_links (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    system TEXT NOT NULL CHECK (system IN ('tenant','scholar')),
    external_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(system, external_id),
    UNIQUE(account_id, system),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );
  CREATE INDEX IF NOT EXISTS idx_identity_links_account ON identity_links(account_id);
  CREATE INDEX IF NOT EXISTS idx_identity_links_external ON identity_links(system, external_id);

  CREATE TABLE IF NOT EXISTS account_sessions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    csrf_hash TEXT NOT NULL,
    auth_version INTEGER NOT NULL,
    auth_level TEXT NOT NULL DEFAULT 'password',
    expires_at DATETIME NOT NULL,
    rotated_at DATETIME,
    revoked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME,
    ip_hash TEXT,
    user_agent TEXT,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );
  CREATE INDEX IF NOT EXISTS idx_account_sessions_account ON account_sessions(account_id);
  CREATE INDEX IF NOT EXISTS idx_account_sessions_expiry ON account_sessions(expires_at);

  CREATE TABLE IF NOT EXISTS account_tokens (
    token_hash TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    purpose TEXT NOT NULL CHECK (purpose IN ('activate','reset')),
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );
  CREATE INDEX IF NOT EXISTS idx_account_tokens_account ON account_tokens(account_id);

  CREATE TABLE IF NOT EXISTS account_invitations (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    institution_id INTEGER NOT NULL,
    department TEXT,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','reviewer','dept_admin','inst_admin')),
    token_hash TEXT UNIQUE NOT NULL,
    invited_by TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked')),
    expires_at DATETIME NOT NULL,
    accepted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invited_by) REFERENCES accounts(id)
  );
  CREATE INDEX IF NOT EXISTS idx_account_invitations_institution ON account_invitations(institution_id, status);
  CREATE INDEX IF NOT EXISTS idx_account_invitations_email ON account_invitations(email);

  CREATE TABLE IF NOT EXISTS institution_capability_policies (
    id TEXT PRIMARY KEY,
    institution_id INTEGER NOT NULL,
    department TEXT NOT NULL DEFAULT '',
    capability TEXT NOT NULL,
    effect TEXT NOT NULL CHECK (effect IN ('allow','deny')),
    updated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, department, capability),
    FOREIGN KEY (updated_by) REFERENCES accounts(id)
  );
  CREATE INDEX IF NOT EXISTS idx_institution_policies_scope ON institution_capability_policies(institution_id, department);

  CREATE TABLE IF NOT EXISTS account_initiation (
    account_id TEXT PRIMARY KEY,
    current_chapter INTEGER NOT NULL DEFAULT 0,
    completed_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );

  CREATE TABLE IF NOT EXISTS account_downloads (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    asset_id TEXT NOT NULL,
    temple_id TEXT NOT NULL,
    title TEXT NOT NULL,
    asset_url TEXT NOT NULL,
    license TEXT NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 1 CHECK (download_count > 0),
    first_downloaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_downloaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, asset_id),
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );
  CREATE INDEX IF NOT EXISTS idx_account_downloads_recent ON account_downloads(account_id, last_downloaded_at DESC);

  CREATE TABLE IF NOT EXISTS account_audit_log (
    id TEXT PRIMARY KEY,
    account_id TEXT,
    actor_account_id TEXT,
    actor_admin_id INTEGER,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details TEXT NOT NULL DEFAULT '{}',
    ip_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (actor_account_id) REFERENCES accounts(id)
  );
  CREATE INDEX IF NOT EXISTS idx_account_audit_account ON account_audit_log(account_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_account_audit_action ON account_audit_log(action, created_at);
`;

const PG_SCHEMA = SQLITE_SCHEMA.replace(/DATETIME/g, 'TIMESTAMPTZ');

function migrate(db) {
  db.exec(SQLITE_SCHEMA);
}

async function migratePostgres(helpers = operational) {
  if (!helpers.isPostgres()) return;
  await helpers.exec(PG_SCHEMA);
}

function runStandalone() {
  const dbPath = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  db.close();
  console.log('Unified identity migration complete.');
}

if (require.main === module) {
  runStandalone();
  migratePostgres().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { migrate, migratePostgres, TABLES, SQLITE_SCHEMA, PG_SCHEMA };
