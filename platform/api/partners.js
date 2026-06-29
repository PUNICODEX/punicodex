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

const PARTNER_TIERS = {
  'browser-vendor': {
    rateLimit: 1000000,
    slaUptime: 99.999,
    supportResponseMinutes: 15,
    revenueSharePercent: 15,
  },
  browser: {
    rateLimit: 1000000,
    slaUptime: 99.999,
    supportResponseMinutes: 15,
    revenueSharePercent: 15,
  },
  registrar: {
    rateLimit: 500000,
    slaUptime: 99.99,
    supportResponseMinutes: 30,
    revenueSharePercent: 20,
  },
  isp: { rateLimit: 250000, slaUptime: 99.99, supportResponseMinutes: 30, revenueSharePercent: 12 },
  enterprise: {
    rateLimit: 100000,
    slaUptime: 99.99,
    supportResponseMinutes: 60,
    revenueSharePercent: 0,
  },
  ngo: { rateLimit: 50000, slaUptime: 99.9, supportResponseMinutes: 240, revenueSharePercent: 0 },
  pro: { rateLimit: 10000, slaUptime: 99.9, supportResponseMinutes: 60, revenueSharePercent: 0 },
  free: { rateLimit: 100, slaUptime: 99.0, supportResponseMinutes: null, revenueSharePercent: 0 },
};

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
  migratePartnerOnboarding();
}

function migratePartnerOnboarding() {
  const db = getDb();
  const columns = db
    .prepare('PRAGMA table_info(partners)')
    .all()
    .map((r) => r.name);
  if (!columns.includes('organization')) {
    db.exec('ALTER TABLE partners ADD COLUMN organization TEXT');
  }
  if (!columns.includes('website_url')) {
    db.exec('ALTER TABLE partners ADD COLUMN website_url TEXT');
  }
  if (!columns.includes('use_case')) {
    db.exec('ALTER TABLE partners ADD COLUMN use_case TEXT');
  }
}

function generateKey() {
  return `pcd_${crypto.randomBytes(24).toString('hex')}`;
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function normalizeTier(tier) {
  const t = String(tier || 'free').toLowerCase();
  return PARTNER_TIERS[t] ? t : 'free';
}

function getPartnerSla(tier) {
  const t = normalizeTier(tier);
  return {
    tier: t,
    ...PARTNER_TIERS[t],
  };
}

function registerPartner({ name, email, tier, scopes, rateLimit }) {
  migratePartners();
  const db = getDb();
  const key = generateKey();
  const keyHash = hashKey(key);
  const normalizedTier = normalizeTier(tier);
  const limit = rateLimit || PARTNER_TIERS[normalizedTier].rateLimit;
  db.prepare(
    'INSERT INTO partners (name, email, tier, api_key, scopes, rate_limit) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email || null, normalizedTier, keyHash, JSON.stringify(scopes || ['read']), limit);
  return {
    id: db.prepare('SELECT id FROM partners WHERE api_key = ?').get(keyHash).id,
    apiKey: key,
  };
}

function onboardPartner({ name, email, organization, websiteUrl, useCase, tier, scopes }) {
  migratePartners();
  const normalizedTier = normalizeTier(tier);
  const result = registerPartner({
    name,
    email,
    tier: normalizedTier,
    scopes: scopes || ['read'],
  });

  const db = getDb();
  db.prepare(
    'UPDATE partners SET organization = ?, website_url = ?, use_case = ? WHERE id = ?'
  ).run(organization || null, websiteUrl || null, useCase || null, result.id);

  return {
    id: result.id,
    apiKey: result.apiKey,
    tier: normalizedTier,
    sla: getPartnerSla(normalizedTier),
    onboardingComplete: true,
  };
}

function rotatePartnerKey(partnerId) {
  migratePartners();
  const db = getDb();
  const row = db.prepare('SELECT id FROM partners WHERE id = ? AND active = 1').get(partnerId);
  if (!row) return null;
  const newKey = generateKey();
  const newHash = hashKey(newKey);
  db.prepare('UPDATE partners SET api_key = ? WHERE id = ?').run(newHash, partnerId);
  return { id: partnerId, apiKey: newKey };
}

function revokePartner(partnerId) {
  migratePartners();
  const db = getDb();
  const info = db.prepare('UPDATE partners SET active = 0 WHERE id = ?').run(partnerId);
  return { revoked: info.changes > 0 };
}

function validatePartnerKey(key) {
  migratePartners();
  if (!key || typeof key !== 'string') return null;
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM partners WHERE api_key = ? AND active = 1')
    .get(hashKey(key));
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

module.exports = {
  registerPartner,
  validatePartnerKey,
  submitRecord,
  queryRecords,
  listPartners,
  onboardPartner,
  rotatePartnerKey,
  revokePartner,
  getPartnerSla,
  PARTNER_TIERS,
};
