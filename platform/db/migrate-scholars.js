/**
 * Migration: Scholarly Edition tables
 *
 * Creates the SQLite schema for the PÚNYCODEX Scholarly Edition.
 * Operational sync to Neon is handled by platform/db/init-operational-postgres.js.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNYCODEX_TEST_DB_PATH || path.join(__dirname, 'punycodex.db');

const SCHOLARS_SCHEMA = `
  -- Institutions (universities, colleges, research bodies)
  CREATE TABLE IF NOT EXISTS scholars_institutions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT,
    accreditation TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    metadata TEXT NOT NULL DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_institutions_status ON scholars_institutions(status);
  CREATE INDEX IF NOT EXISTS idx_scholars_institutions_domain ON scholars_institutions(domain);

  -- Users (students, faculty, admins, curators)
  CREATE TABLE IF NOT EXISTS scholars_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    institution_id INTEGER,
    role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'reviewer', 'dept_admin', 'inst_admin', 'curator')),
    department TEXT,
    orcid TEXT,
    display_name TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME,
    FOREIGN KEY (institution_id) REFERENCES scholars_institutions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_users_email ON scholars_users(email);
  CREATE INDEX IF NOT EXISTS idx_scholars_users_institution ON scholars_users(institution_id);
  CREATE INDEX IF NOT EXISTS idx_scholars_users_role ON scholars_users(role);

  -- Sessions
  CREATE TABLE IF NOT EXISTS scholars_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_hash TEXT,
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES scholars_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_sessions_user ON scholars_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_scholars_sessions_expires ON scholars_sessions(expires_at);

  -- Temples (one row per flagship)
  CREATE TABLE IF NOT EXISTS scholars_temples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    pantheon TEXT NOT NULL,
    tier TEXT NOT NULL,
    manifest_version TEXT NOT NULL,
    snapshot_version INTEGER NOT NULL DEFAULT 0,
    is_frozen INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_temples_entry ON scholars_temples(entry_id);
  CREATE INDEX IF NOT EXISTS idx_scholars_temples_pantheon ON scholars_temples(pantheon);

  -- Sections (current published state of each scholarly section)
  CREATE TABLE IF NOT EXISTS scholars_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temple_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    label TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    sources TEXT NOT NULL DEFAULT '[]',
    media TEXT NOT NULL DEFAULT '[]',
    editor_notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'draft', 'published')),
    version INTEGER NOT NULL DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (temple_id) REFERENCES scholars_temples(id),
    FOREIGN KEY (updated_by) REFERENCES scholars_users(id),
    UNIQUE(temple_id, key)
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_sections_temple ON scholars_sections(temple_id);
  CREATE INDEX IF NOT EXISTS idx_scholars_sections_key ON scholars_sections(key);

  -- Edits (pending/proposed changes)
  CREATE TABLE IF NOT EXISTS scholars_edits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    proposed_body TEXT NOT NULL DEFAULT '',
    proposed_sources TEXT NOT NULL DEFAULT '[]',
    proposed_media TEXT NOT NULL DEFAULT '[]',
    editor_notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision', 'withdrawn')),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES scholars_sections(id),
    FOREIGN KEY (user_id) REFERENCES scholars_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_edits_section ON scholars_edits(section_id);
  CREATE INDEX IF NOT EXISTS idx_scholars_edits_user ON scholars_edits(user_id);
  CREATE INDEX IF NOT EXISTS idx_scholars_edits_status ON scholars_edits(status);
  CREATE INDEX IF NOT EXISTS idx_scholars_edits_created ON scholars_edits(created_at);

  -- Reviews (approval decisions)
  CREATE TABLE IF NOT EXISTS scholars_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    edit_id INTEGER NOT NULL,
    reviewer_id INTEGER NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_revision')),
    comment TEXT,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (edit_id) REFERENCES scholars_edits(id),
    FOREIGN KEY (reviewer_id) REFERENCES scholars_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_reviews_edit ON scholars_reviews(edit_id);
  CREATE INDEX IF NOT EXISTS idx_scholars_reviews_reviewer ON scholars_reviews(reviewer_id);

  -- History (immutable record of every published version)
  CREATE TABLE IF NOT EXISTS scholars_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL,
    edit_id INTEGER,
    body TEXT NOT NULL,
    sources TEXT NOT NULL DEFAULT '[]',
    media TEXT NOT NULL DEFAULT '[]',
    attribution TEXT NOT NULL DEFAULT '{}',
    diff TEXT,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (section_id) REFERENCES scholars_sections(id),
    FOREIGN KEY (edit_id) REFERENCES scholars_edits(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_history_section ON scholars_history(section_id);
  CREATE INDEX IF NOT EXISTS idx_scholars_history_applied ON scholars_history(applied_at);

  -- Snapshots (rendered static artifacts)
  CREATE TABLE IF NOT EXISTS scholars_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temple_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    html_path TEXT NOT NULL,
    json_path TEXT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (temple_id) REFERENCES scholars_temples(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_snapshots_temple ON scholars_snapshots(temple_id);

  -- Media attachments
  CREATE TABLE IF NOT EXISTS scholars_media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    mime_type TEXT,
    size_bytes INTEGER,
    caption TEXT,
    license TEXT,
    source TEXT,
    creator TEXT,
    uploaded_by INTEGER,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES scholars_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_media_uploaded_by ON scholars_media(uploaded_by);
  CREATE INDEX IF NOT EXISTS idx_scholars_media_status ON scholars_media(status);

  -- Notifications
  CREATE TABLE IF NOT EXISTS scholars_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data TEXT NOT NULL DEFAULT '{}',
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES scholars_users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_notifications_user ON scholars_notifications(user_id);
  CREATE INDEX IF NOT EXISTS idx_scholars_notifications_read ON scholars_notifications(is_read);

  -- Audit log
  CREATE TABLE IF NOT EXISTS scholars_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    details TEXT NOT NULL DEFAULT '{}',
    ip_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_scholars_audit_action ON scholars_audit_log(action);
  CREATE INDEX IF NOT EXISTS idx_scholars_audit_resource ON scholars_audit_log(resource_type, resource_id);
  CREATE INDEX IF NOT EXISTS idx_scholars_audit_created ON scholars_audit_log(created_at);
`;

function migrate(db) {
  db.exec(SCHOLARS_SCHEMA);
}

function runStandalone() {
  const db = new Database(DB_PATH);
  migrate(db);
  db.close();
  console.log('Scholarly Edition migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, SCHOLARS_SCHEMA };
