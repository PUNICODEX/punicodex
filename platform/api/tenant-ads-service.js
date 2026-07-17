/**
 * PUNICODEX — Tenant Search Advertising Service
 *
 * Manages advertiser tenants who want their ASCII domains and offerings to
 * appear in search results and on temple pages for specific lexicon entries.
 *
 * A tenant search ad is always tied to a canonical lexicon entry. When a user
 * searches for that entry (by Unicode, ASCII, Greek, or keyword), the ad is
 * eligible to appear as a sponsored result.
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

function generateToken() {
  return crypto.randomBytes(24).toString('hex');
}

function hashIp(ip) {
  return crypto
    .createHash('sha256')
    .update(ip || 'unknown')
    .digest('hex')
    .slice(0, 16);
}

function parseJson(json, fallback = null) {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

function isActive(ad) {
  if (ad.status !== 'active') return false;
  const now = Date.now();
  if (ad.active_from) {
    const from = new Date(ad.active_from).getTime();
    if (!Number.isNaN(from) && now < from) return false;
  }
  if (ad.active_until) {
    const until = new Date(ad.active_until).getTime();
    if (!Number.isNaN(until) && now > until) return false;
  }
  return true;
}

function toSqliteDateTime(date) {
  if (!date) return null;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return d
    .toISOString()
    .replace('T', ' ')
    .replace(/\.\d{3}Z$/, '');
}

/**
 * List tenant ads with optional filters.
 */
function listTenantAds({ entryId, status, limit = 50, offset = 0 } = {}) {
  const db = getDb();
  let sql = `
    SELECT a.*, e.unicode as entry_unicode, e.ascii as entry_ascii, e.pantheon as entry_pantheon
    FROM tenant_search_ads a
    JOIN entries e ON a.entry_id = e.id
    WHERE 1=1
  `;
  const params = [];
  if (entryId) {
    sql += ' AND a.entry_id = ?';
    params.push(entryId);
  }
  if (status) {
    sql += ' AND a.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY a.bid_score DESC, a.created_at DESC LIMIT ? OFFSET ?';

  const rows = db.prepare(sql).all(...params, limit, offset);
  return rows.map(enrichAd);
}

/**
 * Get a single tenant ad by ID.
 */
function getTenantAd(id) {
  const db = getDb();
  const row = db
    .prepare(
      `
      SELECT a.*, e.unicode as entry_unicode, e.ascii as entry_ascii, e.pantheon as entry_pantheon
      FROM tenant_search_ads a
      JOIN entries e ON a.entry_id = e.id
      WHERE a.id = ?
    `
    )
    .get(id);
  return row ? enrichAd(row) : null;
}

/**
 * Create a new tenant search ad.
 */
function createTenantAd({
  entryId,
  companyName,
  websiteUrl,
  displayUrl,
  headline,
  description,
  keywords,
  bidScore,
  weight,
  activeFrom,
  activeUntil,
}) {
  const db = getDb();
  if (!entryId || !companyName || !websiteUrl || !headline) {
    throw new Error('entryId, companyName, websiteUrl, and headline are required');
  }
  const entry = db.prepare('SELECT id FROM entries WHERE id = ?').get(entryId);
  if (!entry) {
    throw new Error(`Unknown lexicon entry: ${entryId}`);
  }
  const token = generateToken();
  const result = db
    .prepare(
      `
      INSERT INTO tenant_search_ads
        (entry_id, company_name, website_url, display_url, headline, description, keywords,
         status, bid_score, weight, active_from, active_until, analytics_token)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)
    `
    )
    .run(
      entryId,
      companyName,
      websiteUrl,
      displayUrl || websiteUrl,
      headline,
      description || null,
      keywords ? JSON.stringify(keywords) : null,
      bidScore != null ? Number(bidScore) : 1.0,
      weight != null ? Number(weight) : 1,
      toSqliteDateTime(activeFrom) || toSqliteDateTime(new Date()),
      toSqliteDateTime(activeUntil) || null,
      token
    );
  return getTenantAd(result.lastInsertRowid);
}

/**
 * Update an existing tenant ad.
 */
function updateTenantAd(id, updates) {
  const db = getDb();
  const allowed = [
    'company_name',
    'website_url',
    'display_url',
    'headline',
    'description',
    'keywords',
    'status',
    'bid_score',
    'weight',
    'active_from',
    'active_until',
  ];
  const sets = [];
  const values = [];
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      sets.push(`${key} = ?`);
      if ((key === 'active_from' || key === 'active_until') && updates[key]) {
        values.push(toSqliteDateTime(updates[key]));
      } else {
        values.push(
          key === 'keywords' && updates[key] ? JSON.stringify(updates[key]) : updates[key]
        );
      }
    }
  }
  if (sets.length === 0) return getTenantAd(id);

  sets.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);
  db.prepare(`UPDATE tenant_search_ads SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return getTenantAd(id);
}

/**
 * Delete a tenant ad.
 */
function deleteTenantAd(id) {
  const db = getDb();
  db.prepare('DELETE FROM tenant_ad_analytics WHERE tenant_ad_id = ?').run(id);
  db.prepare('DELETE FROM tenant_search_ads WHERE id = ?').run(id);
  return { deleted: true };
}

/**
 * Find active tenant ads for a given entry ID.
 */
function getTenantAdsForEntry(entryId, { limit = 3 } = {}) {
  const db = getDb();
  const rows = db
    .prepare(
      `
      SELECT a.*, e.unicode as entry_unicode, e.ascii as entry_ascii, e.pantheon as entry_pantheon
      FROM tenant_search_ads a
      JOIN entries e ON a.entry_id = e.id
      WHERE a.entry_id = ?
        AND a.status = 'active'
        AND (a.active_from IS NULL OR a.active_from <= datetime('now'))
        AND (a.active_until IS NULL OR a.active_until >= datetime('now'))
      ORDER BY a.bid_score DESC, a.weight DESC, a.created_at DESC
      LIMIT ?
    `
    )
    .all(entryId, limit);
  return rows.map(enrichAd).filter(isActive);
}

/**
 * Find active tenant ads matching a search query.
 * Tries exact entry match first, then keyword match across active ads.
 */
function findTenantAdsForQuery(q, { limit = 3, offset = 0 } = {}) {
  const db = getDb();
  const normalized = String(q).toLowerCase().trim();
  if (!normalized) return [];

  const limitNum = Math.max(1, Number(limit) || 3);
  const offsetNum = Math.max(0, Number(offset) || 0);

  // Direct entry match
  const entry = db
    .prepare(
      `SELECT id FROM entries WHERE LOWER(id) = ? OR LOWER(ascii) = ? OR LOWER(unicode) = ? LIMIT 1`
    )
    .get(normalized, normalized, normalized);
  if (entry) {
    const ads = getTenantAdsForEntry(entry.id, { limit: limitNum + offsetNum });
    return ads.slice(offsetNum, offsetNum + limitNum);
  }

  // Keyword match across active ads
  const like = `%${normalized}%`;
  const rows = db
    .prepare(
      `
      SELECT a.*, e.unicode as entry_unicode, e.ascii as entry_ascii, e.pantheon as entry_pantheon
      FROM tenant_search_ads a
      JOIN entries e ON a.entry_id = e.id
      WHERE a.status = 'active'
        AND (a.active_from IS NULL OR a.active_from <= datetime('now'))
        AND (a.active_until IS NULL OR a.active_until >= datetime('now'))
        AND (
          LOWER(a.headline) LIKE ? OR
          LOWER(a.description) LIKE ? OR
          LOWER(a.keywords) LIKE ? OR
          LOWER(e.id) LIKE ? OR
          LOWER(e.ascii) LIKE ? OR
          LOWER(e.unicode) LIKE ?
        )
      ORDER BY a.bid_score DESC, a.weight DESC, a.created_at DESC
      LIMIT ? OFFSET ?
    `
    )
    .all(like, like, like, like, like, like, limitNum, offsetNum);
  return rows.map(enrichAd).filter(isActive);
}

/**
 * Record an analytics event (impression or click) for a tenant ad.
 */
function recordTenantAdEvent({ tenantAdId, eventType, ip, userAgent, referrer }) {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO tenant_ad_analytics (tenant_ad_id, event_type, ip_hash, user_agent, referrer)
    VALUES (?, ?, ?, ?, ?)
  `
  ).run(tenantAdId, eventType, hashIp(ip), userAgent || null, referrer || null);
}

function enrichAd(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    entryUnicode: row.entry_unicode,
    entryAscii: row.entry_ascii,
    entryPantheon: row.entry_pantheon,
    companyName: row.company_name,
    websiteUrl: row.website_url,
    displayUrl: row.display_url,
    headline: row.headline,
    description: row.description,
    keywords: parseJson(row.keywords, []),
    status: row.status,
    bidScore: row.bid_score,
    weight: row.weight,
    activeFrom: row.active_from,
    activeUntil: row.active_until,
    analyticsToken: row.analytics_token,
    createdAt: row.created_at,
  };
}

module.exports = {
  listTenantAds,
  getTenantAd,
  createTenantAd,
  updateTenantAd,
  deleteTenantAd,
  getTenantAdsForEntry,
  findTenantAdsForQuery,
  recordTenantAdEvent,
};
