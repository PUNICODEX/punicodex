/**
 * Partner program API — register partners, validate keys, exchange records.
 */
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');

let db;
function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function migratePartners() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT,
      tier TEXT DEFAULT 'free',
      api_key TEXT UNIQUE NOT NULL,
      scopes TEXT,
      rate_limit INTEGER,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_partners_key ON partners(api_key);

    CREATE TABLE IF NOT EXISTS partner_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      record_id TEXT UNIQUE NOT NULL,
      payload TEXT NOT NULL,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_partner_records_partner ON partner_records(partner_id);
  `);
}

function generateKey() {
  return `pcd_${crypto.randomBytes(24).toString('hex')}`;
}

function registerPartner({ name, email, tier, scopes, rateLimit }) {
  migratePartners();
  const db = getDb();
  const key = generateKey();
  db.prepare(
    'INSERT INTO partners (name, email, tier, api_key, scopes, rate_limit) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(
    name,
    email || null,
    tier || 'free',
    key,
    JSON.stringify(scopes || ['read']),
    rateLimit || 100
  );
  return { id: db.prepare('SELECT id FROM partners WHERE api_key = ?').get(key).id, apiKey: key };
}

function validatePartnerKey(key) {
  migratePartners();
  const db = getDb();
  const row = db.prepare('SELECT * FROM partners WHERE api_key = ? AND active = 1').get(key);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    tier: row.tier,
    scopes: safeJson(row.scopes, []),
    rateLimit: row.rate_limit,
  };
}

function submitRecord(partnerId, record) {
  migratePartners();
  const db = getDb();
  const recordId = record.recordId || record.punycode || crypto.randomUUID();
  db.prepare(
    'INSERT OR REPLACE INTO partner_records (partner_id, record_id, payload) VALUES (?, ?, ?)'
  ).run(partnerId, recordId, JSON.stringify(record));
  return { recordId };
}

function queryRecords({ q, limit = 20, offset = 0 }) {
  migratePartners();
  const db = getDb();
  let sql = 'SELECT record_id, payload FROM partner_records';
  const params = [];
  if (q) {
    sql += ' WHERE payload LIKE ?';
    params.push(`%${q}%`);
  }
  sql += ' ORDER BY submitted_at DESC LIMIT ? OFFSET ?';
  const rows = db.prepare(sql).all(...params, limit, offset);
  const total = db
    .prepare(`SELECT COUNT(*) as c FROM partner_records ${q ? 'WHERE payload LIKE ?' : ''}`)
    .get(...(q ? [`%${q}%`] : [])).c;
  return {
    records: rows.map((r) => ({ recordId: r.record_id, ...safeJson(r.payload, {}) })),
    total,
    limit,
    offset,
  };
}

function listPartners() {
  migratePartners();
  const db = getDb();
  return db
    .prepare(
      'SELECT id, name, email, tier, scopes, rate_limit, active, created_at FROM partners ORDER BY created_at DESC'
    )
    .all()
    .map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      tier: r.tier,
      scopes: safeJson(r.scopes, []),
      rateLimit: r.rate_limit,
      active: r.active,
      createdAt: r.created_at,
    }));
}

function safeJson(str, fallback) {
  try {
    return JSON.parse(str || 'null');
  } catch {
    return fallback;
  }
}

module.exports = { registerPartner, validatePartnerKey, submitRecord, queryRecords, listPartners };
