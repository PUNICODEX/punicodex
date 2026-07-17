/**
 * Test factories for creating real rows in the isolated test database.
 *
 * All factories assume `prepareTestDb(__filename)` has already been called and
 * `process.env.PUNICODEX_TEST_DB_PATH` is set.
 */

const crypto = require('node:crypto');
const { getDbPath } = require('../../platform/db/db.js');
const Database = require('better-sqlite3');
const partners = require('../../platform/api/partners.js');
const { createKey } = require('../../platform/api/api-key-admin.js');
const { createTenantAd } = require('../../platform/api/tenant-ads-service.js');
const { login: adminLogin } = require('../../platform/api/admin.js');

function getDb() {
  return new Database(getDbPath());
}

function makePartner(overrides = {}) {
  const result = partners.registerPartner({
    name: overrides.name || `Test Partner ${crypto.randomBytes(4).toString('hex')}`,
    email: overrides.email || 'partner@example.com',
    tier: overrides.tier || 'free',
    scopes: overrides.scopes || ['read'],
    rateLimit: overrides.rateLimit ?? 100,
  });
  return {
    ...result,
    cleanup() {
      const db = getDb();
      db.prepare('DELETE FROM partner_records WHERE partner_id = ?').run(result.id);
      db.prepare('DELETE FROM partners WHERE id = ?').run(result.id);
      db.close();
    },
  };
}

async function makeApiKey(overrides = {}) {
  const key = await createKey({
    name: overrides.name || `Test Key ${crypto.randomBytes(4).toString('hex')}`,
    tier: overrides.tier || 'free',
    scopes: overrides.scopes || ['names:read'],
    rateLimit: overrides.rateLimit,
  });
  return {
    id: key.id,
    plaintext: key.plaintext,
    tier: key.tier,
    scopes: key.scopes,
    cleanup() {
      const db = getDb();
      db.prepare('DELETE FROM api_request_log WHERE key_id = ?').run(key.id);
      db.prepare('DELETE FROM api_keys WHERE id = ?').run(key.id);
      db.close();
    },
  };
}

async function makeAdminToken(password) {
  if (password) {
    process.env.ADMIN_PASSWORD = password;
  }
  const login = await adminLogin(process.env.ADMIN_PASSWORD || 'test-admin-password-for-ci');
  return {
    token: login.token,
    cleanup() {
      const db = getDb();
      if (login.token) {
        db.prepare('DELETE FROM admin_sessions WHERE token = ?').run(login.token);
      }
      db.close();
    },
  };
}

function makeIndexedSite(overrides = {}) {
  const db = getDb();
  const domain = overrides.domain || `test-${crypto.randomBytes(4).toString('hex')}.com`;
  const punycode = overrides.punycode || domain;
  const result = db
    .prepare(
      `INSERT INTO indexed_sites
       (punycode, domain, title, description, content_snippet, status, is_flagship, lexicon_entry_id, trust_tier, last_crawled,
        tenant_name, tenant_category, tenant_front_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      punycode,
      domain,
      overrides.title || 'Test Site',
      overrides.description || 'A test indexed site.',
      overrides.content || 'test content',
      overrides.status || 'active',
      overrides.isFlagship ? 1 : 0,
      overrides.entryId || null,
      overrides.trustTier || 'unknown',
      overrides.lastCrawled || new Date().toISOString(),
      overrides.tenantName || null,
      overrides.tenantCategory || null,
      overrides.tenantFrontUrl || null
    );
  const id = result.lastInsertRowid;
  db.close();
  return {
    id,
    domain,
    punycode,
    title: overrides.title || 'Test Site',
    tenantName: overrides.tenantName || null,
    tenantCategory: overrides.tenantCategory || null,
    tenantFrontUrl: overrides.tenantFrontUrl || null,
    cleanup() {
      const db2 = getDb();
      db2.prepare('DELETE FROM indexed_sites WHERE id = ?').run(id);
      db2.close();
    },
  };
}

function makeTenantAd(overrides = {}) {
  const ad = createTenantAd({
    entryId: overrides.entryId || 'zeus',
    companyName: overrides.companyName || 'Test Co',
    websiteUrl: overrides.websiteUrl || 'https://example.com',
    displayUrl: overrides.displayUrl,
    headline: overrides.headline || 'Test Headline',
    description: overrides.description || 'Test description',
    keywords: overrides.keywords || ['zeus', 'greek'],
    bidScore: overrides.bidScore ?? 1.0,
    weight: overrides.weight ?? 1,
    activeFrom: overrides.activeFrom || new Date(),
    activeUntil: overrides.activeUntil,
  });
  return {
    ...ad,
    cleanup() {
      const db = getDb();
      db.prepare('DELETE FROM tenant_ad_analytics WHERE tenant_ad_id = ?').run(ad.id);
      db.prepare('DELETE FROM tenant_search_ads WHERE id = ?').run(ad.id);
      db.close();
    },
  };
}

module.exports = {
  makePartner,
  makeApiKey,
  makeAdminToken,
  makeIndexedSite,
  makeTenantAd,
};
