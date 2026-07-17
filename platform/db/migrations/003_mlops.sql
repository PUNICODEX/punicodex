-- PUNICODEX — MLOps & Continuous Learning Schema (Phase 14)
-- Idempotent. Run via platform/db/init.js or platform/db/migrate-mlops.js.

CREATE TABLE IF NOT EXISTS telemetry_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  client_hash TEXT,
  event_type TEXT NOT NULL,
  model_version TEXT,
  verdict TEXT,
  severity TEXT,
  features_hash TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_events_created
  ON telemetry_events(created_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_tenant
  ON telemetry_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_client
  ON telemetry_events(client_hash);

CREATE TABLE IF NOT EXISTS drift_samples (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT,
  model_version TEXT,
  feature_name TEXT NOT NULL,
  bucket INTEGER NOT NULL,
  count INTEGER DEFAULT 1,
  window_start TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tenant_id, model_version, feature_name, bucket, window_start)
);

CREATE INDEX IF NOT EXISTS idx_drift_samples_feature
  ON drift_samples(feature_name, window_start);
CREATE INDEX IF NOT EXISTS idx_drift_samples_model
  ON drift_samples(model_version, window_start);

CREATE TABLE IF NOT EXISTS active_learning_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  input_hash TEXT NOT NULL,
  input TEXT NOT NULL,
  probability REAL NOT NULL,
  predicted_verdict TEXT,
  features TEXT,
  priority_score REAL DEFAULT 0,
  reviewed INTEGER DEFAULT 0,
  reviewer_decision TEXT,
  reviewer_id TEXT,
  reviewer_notes TEXT,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_active_learning_reviewed
  ON active_learning_queue(reviewed, priority_score DESC, created_at);
CREATE INDEX IF NOT EXISTS idx_active_learning_hash
  ON active_learning_queue(input_hash);

CREATE TABLE IF NOT EXISTS reviewer_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  input_hash TEXT NOT NULL,
  decision TEXT NOT NULL,
  previous_verdict TEXT,
  reviewer_id TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reviewer_feedback_hash
  ON reviewer_feedback(input_hash);
CREATE INDEX IF NOT EXISTS idx_reviewer_feedback_decision
  ON reviewer_feedback(decision);

CREATE TABLE IF NOT EXISTS model_retrain_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  model_version TEXT NOT NULL,
  previous_version TEXT,
  benchmark_f1 REAL,
  previous_benchmark_f1 REAL,
  status TEXT,
  report_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_model_retrain_runs_version
  ON model_retrain_runs(model_version);
