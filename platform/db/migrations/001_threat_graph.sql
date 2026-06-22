-- PUNYCODEX — Threat Intelligence Graph Schema Migration (Phase 8)
-- Idempotent. Run via platform/db/init.js or a SQL runner.

CREATE TABLE IF NOT EXISTS clusters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  target_identity_id TEXT,
  pattern TEXT NOT NULL,
  asn TEXT,
  nameserver TEXT,
  registrar TEXT,
  status TEXT DEFAULT 'open' CHECK(status IN ('open','reviewing','blocked','false_positive')),
  confidence REAL DEFAULT 0,
  auto_promoted INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cluster_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'open' CHECK(status IN ('open','reviewing','blocked','closed')),
  FOREIGN KEY(cluster_id) REFERENCES clusters(id)
);

CREATE TABLE IF NOT EXISTS spoof_relationships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  input TEXT NOT NULL,
  type TEXT CHECK(type IN ('domain','url','term')) DEFAULT 'domain',
  target_identity_id TEXT,
  cluster_id INTEGER,
  campaign_id INTEGER,
  discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  source TEXT,
  reputation_score REAL DEFAULT 0,
  status TEXT DEFAULT 'open' CHECK(status IN ('open','reviewing','blocked','false_positive')),
  FOREIGN KEY(cluster_id) REFERENCES clusters(id),
  FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
);

CREATE TABLE IF NOT EXISTS blocked_inputs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  input TEXT NOT NULL UNIQUE,
  type TEXT,
  cluster_id INTEGER,
  blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS identity_blocked_patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  identity_id TEXT NOT NULL,
  pattern TEXT NOT NULL,
  blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_clusters_target_identity_id ON clusters(target_identity_id);
CREATE INDEX IF NOT EXISTS idx_clusters_status ON clusters(status);
CREATE INDEX IF NOT EXISTS idx_clusters_pattern ON clusters(pattern);

CREATE INDEX IF NOT EXISTS idx_spoof_relationships_target_identity_id ON spoof_relationships(target_identity_id);
CREATE INDEX IF NOT EXISTS idx_spoof_relationships_cluster_id ON spoof_relationships(cluster_id);
CREATE INDEX IF NOT EXISTS idx_spoof_relationships_status ON spoof_relationships(status);
CREATE INDEX IF NOT EXISTS idx_spoof_relationships_discovered_at ON spoof_relationships(discovered_at);
CREATE INDEX IF NOT EXISTS idx_spoof_relationships_input ON spoof_relationships(input);

CREATE INDEX IF NOT EXISTS idx_blocked_inputs_input ON blocked_inputs(input);
CREATE INDEX IF NOT EXISTS idx_identity_blocked_patterns_identity_id ON identity_blocked_patterns(identity_id);
