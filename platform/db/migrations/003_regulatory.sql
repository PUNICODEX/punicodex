-- PUNYCODEX — Regulatory, Legal & Abuse-Handling Schema (Phase 16)
-- Idempotent. Run via platform/db/init.js or platform/db/migrate-regulatory.js.

CREATE TABLE IF NOT EXISTS dsar_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT UNIQUE NOT NULL,
  client_hash TEXT NOT NULL,
  tenant_id TEXT,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'delete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'cancelled', 'failed')
  ),
  deadline_at DATETIME NOT NULL,
  completed_at DATETIME,
  result TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dsar_client_hash ON dsar_requests(client_hash);
CREATE INDEX IF NOT EXISTS idx_dsar_status_deadline ON dsar_requests(status, deadline_at);

CREATE TABLE IF NOT EXISTS udrp_cases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  case_id TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  complainant TEXT,
  respondent TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'decided', 'dismissed', 'settled', 'appealed')
  ),
  outcome TEXT,
  evidence_package TEXT,
  decided_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_udrp_domain ON udrp_cases(domain);
CREATE INDEX IF NOT EXISTS idx_udrp_status ON udrp_cases(status);

CREATE TABLE IF NOT EXISTS abuse_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_id TEXT UNIQUE NOT NULL,
  reporter_contact_hash TEXT,
  reporter_api_key_hash TEXT,
  domain TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('phishing', 'homograph', 'trademark', 'copyright', 'malware', 'spam', 'other')
  ),
  description TEXT,
  evidence TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (
    status IN ('received', 'triaged', 'escalated', 'resolved', 'dismissed')
  ),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  classification_snapshot TEXT,
  escalated_at DATETIME,
  resolved_at DATETIME,
  resolution_note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_abuse_domain ON abuse_reports(domain);
CREATE INDEX IF NOT EXISTS idx_abuse_status_priority ON abuse_reports(status, priority);

CREATE TABLE IF NOT EXISTS lawful_access_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT UNIQUE NOT NULL,
  requester_authority TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('preservation', 'production', 'emergency')),
  legal_basis TEXT NOT NULL,
  target_client_hash TEXT,
  scope TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (
    status IN ('received', 'reviewing', 'fulfilled', 'rejected', 'appealed')
  ),
  due_date DATETIME,
  fulfilled_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lawful_status ON lawful_access_requests(status);

-- System tenant used by regulatory services for audit-log entries.
INSERT OR IGNORE INTO tenants (id, name, plan, rate_limit_tier, data_region)
VALUES ('system', 'PUNYCODEX System', 'internal', 'internal', 'us-east-1');
