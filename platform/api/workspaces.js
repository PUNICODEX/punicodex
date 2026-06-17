/**
 * Spatial Workspace API — synced workspaces, reading list, session timeline.
 */
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

const DB_PATH = getDbPath();
let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function migrateWorkspaces() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS synced_workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      public_id TEXT UNIQUE NOT NULL,
      owner_session TEXT,
      name TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_synced_workspaces_owner ON synced_workspaces(owner_session);
    CREATE INDEX IF NOT EXISTS idx_synced_workspaces_public_id ON synced_workspaces(public_id);

    CREATE TABLE IF NOT EXISTS reading_list (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token TEXT NOT NULL,
      entry_id TEXT,
      url TEXT NOT NULL,
      title TEXT,
      note TEXT,
      status TEXT DEFAULT 'unread',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      visited_at DATETIME
    );

    CREATE INDEX IF NOT EXISTS idx_reading_list_session ON reading_list(session_token);
    CREATE INDEX IF NOT EXISTS idx_reading_list_entry ON reading_list(entry_id);

    CREATE TABLE IF NOT EXISTS session_timeline (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_token TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_session_timeline_session ON session_timeline(session_token);
    CREATE INDEX IF NOT EXISTS idx_session_timeline_created ON session_timeline(created_at);
  `);
}

function generatePublicId() {
  return crypto.randomBytes(8).toString('hex');
}

function parseJson(str, fallback) {
  try {
    return JSON.parse(str || 'null');
  } catch {
    return fallback;
  }
}

// --- Synced Workspaces ---

function createWorkspace(sessionToken, name, payload) {
  migrateWorkspaces();
  const db = getDb();
  const publicId = generatePublicId();
  db.prepare(
    'INSERT INTO synced_workspaces (public_id, owner_session, name, payload) VALUES (?, ?, ?, ?)'
  ).run(publicId, sessionToken, name, JSON.stringify(payload));
  return { publicId, name, payload };
}

function updateWorkspace(publicId, sessionToken, name, payload) {
  migrateWorkspaces();
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM synced_workspaces WHERE public_id = ? AND owner_session = ?')
    .get(publicId, sessionToken);
  if (!existing) return null;
  db.prepare(
    "UPDATE synced_workspaces SET name = ?, payload = ?, updated_at = datetime('now') WHERE public_id = ?"
  ).run(name ?? existing.name, JSON.stringify(payload), publicId);
  return { publicId, name: name ?? existing.name, payload };
}

function getWorkspace(publicId) {
  migrateWorkspaces();
  const db = getDb();
  const row = db.prepare('SELECT * FROM synced_workspaces WHERE public_id = ?').get(publicId);
  if (!row) return null;
  return {
    publicId: row.public_id,
    name: row.name,
    ownerSession: row.owner_session,
    payload: parseJson(row.payload, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function listWorkspaces(sessionToken) {
  migrateWorkspaces();
  const db = getDb();
  return db
    .prepare(
      'SELECT public_id, name, created_at, updated_at FROM synced_workspaces WHERE owner_session = ? ORDER BY updated_at DESC'
    )
    .all(sessionToken)
    .map((r) => ({
      publicId: r.public_id,
      name: r.name,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
}

function deleteWorkspace(publicId, sessionToken) {
  migrateWorkspaces();
  const db = getDb();
  const result = db
    .prepare('DELETE FROM synced_workspaces WHERE public_id = ? AND owner_session = ?')
    .run(publicId, sessionToken);
  return result.changes > 0;
}

// --- Reading List ---

function addToReadingList(sessionToken, { entryId, url, title, note }) {
  migrateWorkspaces();
  const db = getDb();
  const result = db
    .prepare(
      'INSERT INTO reading_list (session_token, entry_id, url, title, note) VALUES (?, ?, ?, ?, ?)'
    )
    .run(sessionToken, entryId || null, url, title || null, note || null);
  return { id: result.lastInsertRowid, entryId, url, title, status: 'unread' };
}

function getReadingList(sessionToken, { status, limit = 50, offset = 0 } = {}) {
  migrateWorkspaces();
  const db = getDb();
  let sql = 'SELECT * FROM reading_list WHERE session_token = ?';
  const params = [sessionToken];
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  return db
    .prepare(sql)
    .all(...params, limit, offset)
    .map((r) => ({
      id: r.id,
      entryId: r.entry_id,
      url: r.url,
      title: r.title,
      note: r.note,
      status: r.status,
      createdAt: r.created_at,
      visitedAt: r.visited_at,
    }));
}

function updateReadingItem(id, sessionToken, updates) {
  migrateWorkspaces();
  const db = getDb();
  const allowed = ['status', 'visited_at', 'note', 'title'];
  const fields = Object.keys(updates).filter((k) => allowed.includes(k));
  if (fields.length === 0) return null;
  const setClause = fields.map((k) => `${k} = ?`).join(', ');
  const values = fields.map((k) => updates[k]);
  const result = db
    .prepare(`UPDATE reading_list SET ${setClause} WHERE id = ? AND session_token = ?`)
    .run(...values, id, sessionToken);
  return result.changes > 0;
}

function removeFromReadingList(id, sessionToken) {
  migrateWorkspaces();
  const db = getDb();
  const result = db
    .prepare('DELETE FROM reading_list WHERE id = ? AND session_token = ?')
    .run(id, sessionToken);
  return result.changes > 0;
}

// --- Session Timeline ---

function recordTimelineEvent(sessionToken, eventType, payload) {
  migrateWorkspaces();
  const db = getDb();
  db.prepare(
    'INSERT INTO session_timeline (session_token, event_type, payload) VALUES (?, ?, ?)'
  ).run(sessionToken, eventType, JSON.stringify(payload));
}

function getTimeline(sessionToken, { limit = 100, offset = 0 } = {}) {
  migrateWorkspaces();
  const db = getDb();
  return db
    .prepare(
      'SELECT * FROM session_timeline WHERE session_token = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    )
    .all(sessionToken, limit, offset)
    .map((r) => ({
      id: r.id,
      eventType: r.event_type,
      payload: parseJson(r.payload, {}),
      createdAt: r.created_at,
    }));
}

module.exports = {
  createWorkspace,
  updateWorkspace,
  getWorkspace,
  listWorkspaces,
  deleteWorkspace,
  addToReadingList,
  getReadingList,
  updateReadingItem,
  removeFromReadingList,
  recordTimelineEvent,
  getTimeline,
};
