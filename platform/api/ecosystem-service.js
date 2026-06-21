/**
 * PÚNYCODEX — Ecosystem Service (Phase 9)
 *
 * Public partner directory and lightweight usage accounting for the partner
 * program. Partners can opt into public listing and report usage of shared
 * protocol endpoints.
 */

const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');
const partners = require('./partners.js');

let db;
function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function getEcosystemDirectory() {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, website_url, tier, scopes, rate_limit, created_at
       FROM partners
       WHERE active = 1 AND (is_public = 1 OR is_public IS NULL)
       ORDER BY created_at DESC`
    )
    .all();
  return {
    count: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      websiteUrl: r.website_url || null,
      tier: r.tier,
      scopes: safeJson(r.scopes, []),
      rateLimit: r.rate_limit,
      joinedAt: r.created_at,
    })),
  };
}

function recordUsage({ partnerKey, endpoint }) {
  const partner = partners.validatePartnerKey(partnerKey);
  if (!partner) return null;

  const db = getDb();
  const day = new Date().toISOString().split('T')[0];
  const info = db
    .prepare(
      `INSERT INTO ecosystem_usage (partner_id, endpoint, day)
       VALUES (?, ?, ?)
       ON CONFLICT(partner_id, endpoint, day)
       DO UPDATE SET requests = requests + 1`
    )
    .run(partner.id, endpoint || 'unknown', day);
  return { partnerId: partner.id, endpoint, day, requests: info.changes };
}

function getUsageSummary(partnerId) {
  const db = getDb();
  const total = db
    .prepare('SELECT SUM(requests) as total FROM ecosystem_usage WHERE partner_id = ?')
    .get(partnerId);
  const byEndpoint = db
    .prepare(
      `SELECT endpoint, SUM(requests) as requests
       FROM ecosystem_usage
       WHERE partner_id = ?
       GROUP BY endpoint
       ORDER BY requests DESC`
    )
    .all(partnerId);
  return {
    partnerId,
    totalRequests: total?.total || 0,
    byEndpoint: byEndpoint.map((r) => ({ endpoint: r.endpoint, requests: r.requests })),
  };
}

function safeJson(str, fallback) {
  try {
    return JSON.parse(str || 'null');
  } catch {
    return fallback;
  }
}

module.exports = {
  getEcosystemDirectory,
  recordUsage,
  getUsageSummary,
};
