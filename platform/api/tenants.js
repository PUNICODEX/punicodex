/**
 * Tenant onboarding service.
 *
 * Handles creation, validation, and lease lifecycle of tenants on
 * PUNICODEX domains. A tenant is a business that leases a Unicode domain
 * and serves content on its front URL.
 */

const Database = require('better-sqlite3');
const { getDbPath } = require('../db/db');
const { isSafeUrl } = require('../crawler');
const { scoreArchetype } = require('./archetype-scorer');
const { safeJsonParse } = require('./safe-json');

let db;

function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

function getEntryById(id) {
  return getDb().prepare('SELECT * FROM entries WHERE id = ?').get(id);
}

function getSiteByEntryId(entryId) {
  return getDb()
    .prepare("SELECT * FROM indexed_sites WHERE lexicon_entry_id = ? AND status = 'active'")
    .get(entryId);
}

function normalizeUrl(url) {
  if (!url) return null;
  let u = url.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

/**
 * Propose a tenant for a domain. Performs validation but does not persist
 * unless `persist: true` is passed.
 */
async function proposeTenant({ entryId, companyName, category, frontUrl, email }) {
  const errors = [];
  if (!entryId) errors.push('entryId is required');
  if (!companyName || companyName.length < 2) errors.push('companyName is required (min 2 chars)');
  if (!frontUrl) errors.push('frontUrl is required');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push('email is invalid');

  const entry = entryId ? getEntryById(entryId) : null;
  if (entryId && !entry) errors.push(`No lexicon entry found for id: ${entryId}`);

  const normalizedUrl = normalizeUrl(frontUrl);
  if (normalizedUrl && !isSafeUrl(normalizedUrl)) {
    errors.push('frontUrl is not a safe HTTP/HTTPS URL');
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const site = getSiteByEntryId(entryId);
  if (!site) {
    return {
      success: false,
      errors: [
        `No active indexed site found for entry ${entryId}. The domain must be crawled first.`,
      ],
    };
  }

  // Archetype pre-check using the proposed tenant metadata.
  const previewSite = {
    ...site,
    tenant_name: companyName,
    tenant_category: category || '',
    tenant_front_url: normalizedUrl,
  };
  const archetype = await scoreArchetype(previewSite, entry);

  return {
    success: true,
    preview: {
      entryId,
      unicode: entry.unicode,
      domain: site.domain,
      companyName,
      category,
      frontUrl: normalizedUrl,
      archetype_score: archetype.archetype_score,
      archetype_signals: safeJsonParse(archetype.archetype_signals, {}),
    },
    warnings:
      archetype.archetype_score < 0.3
        ? ['Archetype alignment is low; tenant content may not fit the domain archetype.']
        : [],
  };
}

/**
 * Persist a tenant lease. Should be called after admin approval.
 */
async function createTenant({ entryId, companyName, category, frontUrl, email, notes }) {
  const proposal = await proposeTenant({ entryId, companyName, category, frontUrl, email });
  if (!proposal.success) return proposal;

  const { preview } = proposal;
  const dbConn = getDb();

  dbConn
    .prepare(
      `
      UPDATE indexed_sites
      SET tenant_name = ?,
          tenant_category = ?,
          tenant_front_url = ?,
          archetype_score = ?,
          archetype_signals = ?,
          archetype_version = ?,
          lease_status = 'leased'
      WHERE lexicon_entry_id = ? AND status = 'active'
    `
    )
    .run(
      companyName,
      category || null,
      preview.frontUrl,
      preview.archetype_score,
      JSON.stringify(preview.archetype_signals),
      'v1',
      entryId
    );

  // Record a simple audit row in bookings-like events table if available.
  try {
    dbConn
      .prepare(
        `
      INSERT INTO booking_events (booking_id, event_type, metadata, created_at)
      VALUES (?, 'tenant_created', ?, CURRENT_TIMESTAMP)
    `
      )
      .run(
        0,
        JSON.stringify({
          entryId,
          companyName,
          category,
          frontUrl: preview.frontUrl,
          email,
          notes,
          archetype_score: preview.archetype_score,
        })
      );
  } catch (_e) {
    // booking_events may not exist in all environments; ignore.
  }

  return {
    success: true,
    tenant: preview,
    message: `Tenant "${companyName}" created on ${preview.unicode} (${preview.domain}).`,
  };
}

function listTenants({ status, limit = 50, offset = 0 } = {}) {
  let sql = `
    SELECT s.*, e.unicode AS entry_unicode, e.ascii AS entry_ascii, e.greek AS entry_greek,
           e.meaning AS entry_meaning, e.tier AS entry_tier, e.pantheon AS entry_pantheon
    FROM indexed_sites s
    LEFT JOIN entries e ON s.lexicon_entry_id = e.id
    WHERE (s.lease_status = ? OR s.tenant_name IS NOT NULL)
  `;
  const params = [status || 'leased'];
  if (status) {
    sql = `
      SELECT s.*, e.unicode AS entry_unicode, e.ascii AS entry_ascii, e.greek AS entry_greek,
             e.meaning AS entry_meaning, e.tier AS entry_tier, e.pantheon AS entry_pantheon
      FROM indexed_sites s
      LEFT JOIN entries e ON s.lexicon_entry_id = e.id
      WHERE s.lease_status = ?
    `;
    params[0] = status;
  }
  sql += ' ORDER BY s.archetype_score DESC, s.tenant_name ASC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  return getDb()
    .prepare(sql)
    .all(...params);
}

function getTenant(entryId) {
  return getDb()
    .prepare('SELECT * FROM indexed_sites WHERE lexicon_entry_id = ? AND tenant_name IS NOT NULL')
    .get(entryId);
}

async function updateTenant(entryId, updates) {
  const tenant = getTenant(entryId);
  if (!tenant) return { success: false, errors: ['Tenant not found'] };

  const site = getSiteByEntryId(entryId);
  const entry = getEntryById(entryId);
  const companyName = updates.companyName ?? tenant.tenant_name;
  const category = updates.category ?? tenant.tenant_category;
  const frontUrl = normalizeUrl(updates.frontUrl ?? tenant.tenant_front_url);
  if (!companyName || companyName.length < 2) {
    return { success: false, errors: ['companyName is required (min 2 chars)'] };
  }
  if (frontUrl && !isSafeUrl(frontUrl)) {
    return { success: false, errors: ['frontUrl is not a safe HTTP/HTTPS URL'] };
  }

  const previewSite = {
    ...site,
    tenant_name: companyName,
    tenant_category: category || '',
    tenant_front_url: frontUrl,
  };
  const archetype = entry
    ? await scoreArchetype(previewSite, entry)
    : { archetype_score: 0, archetype_signals: '{}' };

  getDb()
    .prepare(
      `
      UPDATE indexed_sites
      SET tenant_name = ?,
          tenant_category = ?,
          tenant_front_url = ?,
          archetype_score = ?,
          archetype_signals = ?,
          archetype_version = ?,
          lease_status = ?
      WHERE lexicon_entry_id = ? AND tenant_name IS NOT NULL
    `
    )
    .run(
      companyName,
      category || null,
      frontUrl,
      archetype.archetype_score,
      archetype.archetype_signals,
      'v1',
      updates.leaseStatus || tenant.lease_status || 'leased',
      entryId
    );

  return {
    success: true,
    tenant: {
      ...tenant,
      tenant_name: companyName,
      tenant_category: category,
      tenant_front_url: frontUrl,
      archetype_score: archetype.archetype_score,
      archetype_signals: safeJsonParse(archetype.archetype_signals, {}),
      archetype_version: 'v1',
      lease_status: updates.leaseStatus || tenant.lease_status || 'leased',
    },
  };
}

function deleteTenant(entryId) {
  const tenant = getTenant(entryId);
  if (!tenant) return { success: false, errors: ['Tenant not found'] };

  const nextLeaseStatus = tenant.is_flagship ? 'flagship' : 'available';
  getDb()
    .prepare(
      `
      UPDATE indexed_sites
      SET tenant_name = NULL,
          tenant_category = NULL,
          tenant_front_url = NULL,
          lease_status = ?
      WHERE lexicon_entry_id = ? AND tenant_name IS NOT NULL
    `
    )
    .run(nextLeaseStatus, entryId);

  return { success: true, message: `Tenant removed from ${tenant.domain || tenant.punycode}.` };
}

module.exports = {
  proposeTenant,
  createTenant,
  listTenants,
  getTenant,
  updateTenant,
  deleteTenant,
};
