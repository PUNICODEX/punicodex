-- PUNYCODEX — Enterprise Governance & Compliance Schema (Phase 10)
-- Idempotent. Run via platform/db/init.js or platform/db/migrate-enterprise-governance.js.

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  rate_limit_tier TEXT NOT NULL DEFAULT 'free',
  data_region TEXT NOT NULL DEFAULT 'us-east-1',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tenant_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  email_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin','tenant_admin','analyst','viewer','api')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','invited')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_users_email_tenant
  ON tenant_users(tenant_id, email_hash);

CREATE TABLE IF NOT EXISTS api_keys_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  user_id INTEGER,
  name TEXT,
  key_hash TEXT UNIQUE NOT NULL,
  scopes TEXT NOT NULL DEFAULT '[]',
  rate_limit INTEGER,
  revoked INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_used_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES tenant_users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_api_keys_v2_hash ON api_keys_v2(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_v2_tenant ON api_keys_v2(tenant_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('api_key','user','system')),
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata TEXT,
  previous_hash TEXT,
  entry_hash TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created
  ON audit_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON audit_logs(action);

CREATE TABLE IF NOT EXISTS raw_inputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  input_hash TEXT,
  input_preview TEXT,
  is_aggregate INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_raw_inputs_tenant_created
  ON raw_inputs(tenant_id, created_at);
