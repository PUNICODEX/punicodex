/**
 * PuniCodex — Admin Portal Service
 *
 * Composition layer behind the /api/admin/portal/* serverless handlers.
 * Aggregates leasing, scholars, patrons, and observability data into the
 * unified portal views, and delegates mutations to the existing service
 * layers (admin-booking-service, platform/db/scholars, patron-service)
 * instead of duplicating their SQL.
 *
 * Scholarly and university approvals executed here act through the canonical
 * "PuniCodex Team" curator identity (the same machine identity the Scholars
 * seed publishes under), because scholars_reviews.reviewer_id must reference
 * a scholars user. The acting portal user is always recorded in the
 * admin_actions audit trail.
 */

const { get, all } = require('../db/operational');
const { getDb } = require('../db/connection');
const { migrate: migrateScholars } = require('../db/migrate-scholars');
const { migrate: migrateQuality } = require('../db/migrate-scholars-quality');
const { migrate: migratePatrons } = require('../db/migrate-patrons');
const migrateNewsletter = require('../db/migrate-newsletter');
const { migrate: migrateCreatorMerch } = require('../db/migrate-creator-merch');
const creatorMerch = require('./creator-merch');
const dbApi = require('../db/scholars');
const { ensureAdminIdentity } = require('../db/scholars/seed');
const { hashPassword } = require('../scholars/auth');
const cache = require('../scholars/cache');
const { getRevenueStats } = require('./admin');
const { getMetrics, getHealthSummary } = require('./observability-service');
const bookingAdmin = require('./admin-booking-service');
const patronService = require('./patron-service');
const { logAction } = require('./admin-actions');
const { generateTempPassword } = require('./admin-portal-auth');
const emailModule = require('./email');

// Cold-start schema for every subsystem the portal touches. All migrations
// are idempotent. Runs lazily before the first DB use (once per serverless
// instance) instead of at require time, so importing this module — now
// deferred by api/admin/portal/_portal.js until a data route is hit — stays
// cheap.
let serviceSchemaReady = false;
function ensureServiceSchema() {
  if (serviceSchemaReady) return;
  const db = getDb();
  migrateScholars(db);
  migrateQuality(db);
  migratePatrons(db);
  migrateNewsletter(db);
  migrateCreatorMerch(db);
  serviceSchemaReady = true;
}

function portalError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────

// The dashboard aggregates a dozen queries across four subsystems (several
// cross-region round trips on Postgres). Memoize the payload briefly so a
// burst of portal page loads shares one snapshot; the payload carries
// generatedAt, so consumers can always see the snapshot's age.
const DASHBOARD_CACHE_TTL_MS = 45 * 1000;
let dashboardCache = null; // { payload, cachedAt }

async function getDashboard() {
  ensureServiceSchema();
  if (dashboardCache && Date.now() - dashboardCache.cachedAt < DASHBOARD_CACHE_TTL_MS) {
    return dashboardCache.payload;
  }

  // Every aggregate is best-effort: a single failing source (a table that
  // exists in only one driver, a transient upstream error) must not take the
  // whole portal landing page down — the affected widget shows zeros instead.
  const orFallback = (label, promise, fallback) =>
    promise.catch((err) => {
      console.warn(`[portal] dashboard source "${label}" degraded: ${err.message}`);
      return fallback;
    });

  const [pendingBusinessRow, revenue, metrics, health, patronStats] = await Promise.all([
    orFallback(
      'pendingBusiness',
      get("SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_application'"),
      null
    ),
    orFallback('revenue', getRevenueStats(30), { daily: [] }),
    orFallback('metrics', getMetrics({ hours: 24 }), {
      totalRequests: 0,
      errorCount: 0,
      errorRate: 0,
    }),
    orFallback('health', getHealthSummary(), { activeSites: 0 }),
    orFallback('patronStats', patronService.getPatronStats(), {
      active: 0,
      estimatedMrrCents: 0,
      estimatedMrrDollars: '0.00',
    }),
  ]);

  const universityPending = dbApi.countSponsorshipApplications({ status: 'pending' });
  const pendingEdits = dbApi.countPendingEdits();
  const pendingMedia = dbApi.countMedia({ status: 'pending' });

  const revenue30dCents = revenue.daily.reduce((sum, d) => sum + d.revenueCents, 0);
  const bookings30d = revenue.daily.reduce((sum, d) => sum + d.bookings, 0);

  const payload = {
    generatedAt: new Date().toISOString(),
    applications: {
      businessPending: pendingBusinessRow?.c || 0,
      universityPending,
    },
    scholars: {
      pendingEdits,
      pendingMedia,
    },
    patrons: {
      active: patronStats.active,
      estimatedMrrCents: patronStats.estimatedMrrCents,
      estimatedMrrDollars: patronStats.estimatedMrrDollars,
    },
    revenue: {
      windowDays: 30,
      last30dCents: revenue30dCents,
      last30dDollars: (revenue30dCents / 100).toFixed(2),
      bookingsLast30d: bookings30d,
    },
    traffic: {
      windowHours: 24,
      requests: metrics.totalRequests,
      errorCount: metrics.errorCount,
      errorRate: metrics.errorRate,
    },
    indexedSites: health.activeSites,
  };
  dashboardCache = { payload, cachedAt: Date.now() };
  return payload;
}

// ─────────────────────────────────────────────────────────────
// Unified applications (business bookings + university sponsorships)
// ─────────────────────────────────────────────────────────────

function toBusinessApplication(row) {
  return {
    kind: 'business',
    id: row.id,
    applicant: row.company_name || row.email,
    contactEmail: row.email,
    detail: `${row.slot_name || `slot #${row.slot_id}`} on ${row.site_slug || 'nike'} (${
      row.lease_months || 1
    }mo${row.trial_months ? `, ${row.trial_months}mo trial` : ''})`,
    status: row.status,
    createdAt: row.created_at,
    websiteUrl: row.website_url || null,
    siteSlug: row.site_slug || null,
    slotId: row.slot_id,
    slotName: row.slot_name || null,
    leaseMonths: row.lease_months || 1,
    trialMonths: row.trial_months || 0,
  };
}

function toUniversityApplication(row) {
  return {
    kind: 'university',
    id: row.id,
    applicant: row.institution_name,
    contactEmail: row.contact_email,
    detail: `${row.domain}${row.department_focus ? ` — ${row.department_focus}` : ''}`,
    status: row.status,
    createdAt: row.created_at,
    domain: row.domain,
    contactName: row.contact_name,
    departmentFocus: row.department_focus || '',
    message: row.message || '',
  };
}

async function listApplications({ kind = null, status = null, limit = 100, offset = 0 } = {}) {
  ensureServiceSchema();
  const businessStatus = status === 'pending' || !status ? 'pending_application' : status;
  const universityStatus = status || null;

  // Business reads go through the async driver: fire the list and the
  // pending-count queries up front so they overlap (two sequential
  // cross-region round trips otherwise). The university side stays
  // synchronous SQLite and runs while those are in flight.
  const businessPromise =
    !kind || kind === 'business'
      ? all(
          `SELECT b.*, s.name as slot_name
           FROM bookings b
           JOIN ad_slots s ON b.slot_id = s.id
           WHERE b.status = $1
           ORDER BY b.created_at DESC
           LIMIT 500`,
          [businessStatus]
        )
      : Promise.resolve([]);
  const pendingBusinessPromise = get(
    "SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_application'"
  );

  let university = [];
  if (!kind || kind === 'university') {
    university = dbApi
      .listSponsorshipApplications({ status: universityStatus, limit: 500, offset: 0 })
      .map(toUniversityApplication);
  }

  const [businessRows, pendingBusinessRow] = await Promise.all([
    businessPromise,
    pendingBusinessPromise,
  ]);
  const business = businessRows.map(toBusinessApplication);

  const items = [...business, ...university]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(offset, offset + limit);

  return {
    items,
    limit,
    offset,
    pendingCounts: {
      business: pendingBusinessRow?.c || 0,
      university: dbApi.countSponsorshipApplications({ status: 'pending' }),
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Application approve / reject
// ─────────────────────────────────────────────────────────────

async function approveBusinessApplication(id, actor, { note } = {}) {
  const result = await bookingAdmin.approveApplication(id, null);
  await logAction({
    adminUserId: actor.user.id,
    action: 'portal.application.approve',
    target: `booking:${id}`,
    meta: { kind: 'business', note: note || null, by: actor.user.email },
  });
  return result;
}

async function rejectBusinessApplication(id, actor, { note } = {}) {
  const result = await bookingAdmin.rejectBooking(id, note || 'Does not meet guidelines', null);
  await logAction({
    adminUserId: actor.user.id,
    action: 'portal.application.reject',
    target: `booking:${id}`,
    meta: { kind: 'business', note: note || null, by: actor.user.email },
  });
  return result;
}

function slugifyInstitutionName(name) {
  const base = String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base || 'institution';
}

function uniqueInstitutionSlug(name) {
  const base = slugifyInstitutionName(name);
  let candidate = base;
  let suffix = 2;
  while (dbApi.getInstitutionBySlug(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function approveUniversityApplication(id, actor, { reviewComment } = {}) {
  ensureServiceSchema();
  const application = dbApi.getSponsorshipApplicationById(Number(id));
  if (!application) throw portalError(404, 'Application not found');
  if (application.status !== 'pending') {
    throw portalError(400, `Application has already been ${application.status}`);
  }

  // Delegate provisioning to the Scholars service layer (same calls the
  // Scholars router makes); only the portal-specific actor wiring lives here.
  const tempPassword = generateTempPassword();
  const slug = uniqueInstitutionSlug(application.institution_name);

  let created;
  try {
    created = dbApi.createInstitutionWithAdmin({
      name: application.institution_name,
      slug,
      domain: application.domain,
      accreditation: '',
      metadata: { source: 'sponsorship_application', applicationId: application.id },
      sponsorshipStatus: 'active',
      departmentAllowlist: application.department_focus
        ? application.department_focus
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean)
        : [],
      adminEmail: application.contact_email,
      adminPasswordHash: hashPassword(tempPassword),
      adminDisplayName: application.contact_name,
      adminDepartment: null,
    });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      throw portalError(409, 'An institution or admin account with this slug/email already exists');
    }
    throw err;
  }

  dbApi.updateSponsorshipApplicationStatus(application.id, 'approved', {
    reviewComment: reviewComment || null,
    reviewedBy: null,
    createdInstitutionId: created.institutionId,
  });

  dbApi.audit({
    actorId: null,
    action: 'sponsorship_application_approved',
    resourceType: 'sponsorship_application',
    resourceId: application.id,
    details: {
      via: 'admin_portal',
      portalUser: actor.user.email,
      institutionId: created.institutionId,
    },
    ipHash: null,
  });

  await logAction({
    adminUserId: actor.user.id,
    action: 'portal.application.approve',
    target: `sponsorship_application:${id}`,
    meta: { kind: 'university', institutionId: created.institutionId, by: actor.user.email },
  });

  // Email the one-time temp password to the new institution admin.
  // Fire-and-forget: a delivery failure must not fail the approval, and the
  // password is still shown to the approver exactly once below.
  emailModule
    .notifyScholarsAccountProvisioned({
      email: application.contact_email,
      displayName: application.contact_name,
      institutionName: application.institution_name,
      tempPassword,
    })
    .catch(() => {});

  // The temp password is shown to the approver exactly once as a fallback
  // delivery channel alongside the provisioning email.
  return {
    approved: true,
    institutionId: created.institutionId,
    adminId: created.adminId,
    adminEmail: application.contact_email,
    adminPassword: tempPassword,
  };
}

async function rejectUniversityApplication(id, actor, { reviewComment } = {}) {
  ensureServiceSchema();
  const application = dbApi.getSponsorshipApplicationById(Number(id));
  if (!application) throw portalError(404, 'Application not found');
  if (application.status !== 'pending') {
    throw portalError(400, `Application has already been ${application.status}`);
  }

  dbApi.updateSponsorshipApplicationStatus(application.id, 'rejected', {
    reviewComment: reviewComment || null,
    reviewedBy: null,
  });

  dbApi.audit({
    actorId: null,
    action: 'sponsorship_application_rejected',
    resourceType: 'sponsorship_application',
    resourceId: application.id,
    details: { via: 'admin_portal', portalUser: actor.user.email },
    ipHash: null,
  });

  await logAction({
    adminUserId: actor.user.id,
    action: 'portal.application.reject',
    target: `sponsorship_application:${id}`,
    meta: { kind: 'university', by: actor.user.email },
  });

  return { rejected: true };
}

async function approveApplication(kind, id, actor, body = {}) {
  if (kind === 'business') return approveBusinessApplication(id, actor, body);
  if (kind === 'university') return approveUniversityApplication(id, actor, body);
  throw portalError(400, "kind must be 'business' or 'university'");
}

async function rejectApplication(kind, id, actor, body = {}) {
  if (kind === 'business') return rejectBusinessApplication(id, actor, body);
  if (kind === 'university') return rejectUniversityApplication(id, actor, body);
  throw portalError(400, "kind must be 'business' or 'university'");
}

// ─────────────────────────────────────────────────────────────
// Patrons administration
// ─────────────────────────────────────────────────────────────

async function listPatronsAdmin({ temple, status, limit = 100, offset = 0 } = {}) {
  ensureServiceSchema();
  if (status && !patronService.PATRON_ADMIN_STATUSES.includes(status)) {
    throw portalError(
      400,
      `status must be one of: ${patronService.PATRON_ADMIN_STATUSES.join(', ')}`
    );
  }
  const [items, total] = await Promise.all([
    patronService.listPatrons({ templeId: temple || null, status: status || null, limit, offset }),
    patronService.countPatrons({ templeId: temple || null, status: status || null }),
  ]);
  return { items, total, limit, offset };
}

async function updatePatronStatus(id, status, actor) {
  ensureServiceSchema();
  const updated = await patronService.setPatronStatus(id, status);
  if (!updated) throw portalError(404, 'Patron not found');
  await logAction({
    adminUserId: actor.user.id,
    action: `portal.patron.${status === 'cancelled' ? 'cancel' : 'expire'}`,
    target: `patron:${id}`,
    meta: { templeId: updated.temple_id, by: actor.user.email },
  });
  return updated;
}

// ─────────────────────────────────────────────────────────────
// Scholars queues (edits + media), acted on as curator
// ─────────────────────────────────────────────────────────────

function getScholarsPending({ limit = 100 } = {}) {
  ensureServiceSchema();
  const capped = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return {
    edits: {
      items: dbApi.listPendingEdits({ limit: capped }),
      total: dbApi.countPendingEdits(),
    },
    media: {
      items: dbApi.listMedia({ status: 'pending', limit: capped }),
      total: dbApi.countMedia({ status: 'pending' }),
    },
  };
}

function getTeamCurator() {
  ensureServiceSchema();
  // The canonical "PuniCodex Team" curator identity used for machine-side
  // scholarly actions; the acting portal user is recorded in admin_actions.
  return ensureAdminIdentity(getDb()).user;
}

function invalidateTempleCache(entryId) {
  cache.del(cache.cacheKey('temple', `/api/v1/scholars/temples/${entryId}`)).catch(() => {});
  cache
    .del(cache.cacheKey('temple', `/api/v1/scholars/temples/${entryId}/manifest`))
    .catch(() => {});
  cache.delByPrefix(cache.cacheKey('search', '')).catch(() => {});
  cache.delByPrefix(cache.cacheKey('section', '')).catch(() => {});
}

function notifyAuthorOfDecision(edit, section, temple, decision, comment) {
  const verb =
    decision === 'approved'
      ? 'approved'
      : decision === 'needs_revision'
        ? 'returned for revision'
        : 'rejected';
  const commentText = comment ? ` Comment: "${comment}"` : '';
  dbApi.createNotification({
    userId: edit.user_id,
    type: `edit_${decision}`,
    title: `Edit ${verb}: ${temple.name}`,
    body: `Your edit to "${section.label}" for ${temple.name} was ${verb}.${commentText}`,
    data: {
      editId: edit.id,
      sectionId: section.id,
      templeId: temple.entry_id,
      sectionKey: section.key,
      decision,
      comment,
    },
  });
}

async function reviewScholarEdit(id, decision, actor, { comment = '' } = {}) {
  ensureServiceSchema();
  const edit = dbApi.getEditById(Number(id));
  if (!edit) throw portalError(404, 'Edit not found');
  if (edit.status !== 'pending') throw portalError(400, 'Edit is not pending');

  const section = dbApi.getSectionById(edit.section_id);
  const author = dbApi.getUserById(edit.user_id);
  const teamUser = getTeamCurator();

  dbApi.withTransaction(() => {
    const current = dbApi.getEditById(edit.id);
    if (current.status !== 'pending') throw portalError(400, 'Edit is not pending');

    dbApi.createReview({ editId: edit.id, reviewerId: teamUser.id, decision, comment });
    dbApi.updateEditStatus(edit.id, decision, comment);

    if (decision === 'approved' && section) {
      const previousBody = section.body;
      const previousSources = section.sources;
      const previousMedia = section.media;

      dbApi.updateSection({
        id: section.id,
        body: edit.proposed_body,
        sources: edit.proposed_sources,
        media: edit.proposed_media,
        status: 'published',
        updatedBy: edit.user_id,
      });

      dbApi.createHistoryRecord({
        sectionId: section.id,
        editId: edit.id,
        body: edit.proposed_body,
        sources: edit.proposed_sources,
        media: edit.proposed_media,
        attribution: {
          userId: edit.user_id,
          institutionId: author ? author.institution_id : null,
          reviewerId: teamUser.id,
        },
        diff: JSON.stringify({ previousBody, previousSources, previousMedia }),
      });
    }
  });

  dbApi.audit({
    actorId: teamUser.id,
    action: decision === 'approved' ? 'edit_approved' : 'edit_rejected',
    resourceType: 'edit',
    resourceId: edit.id,
    details: { via: 'admin_portal', portalUser: actor.user.email, sectionId: section?.id },
    ipHash: null,
  });

  const temple = section ? dbApi.getTempleById(section.temple_id) : null;
  if (temple) {
    notifyAuthorOfDecision(edit, section, temple, decision, comment);
    if (decision === 'approved') invalidateTempleCache(temple.entry_id);
  }

  await logAction({
    adminUserId: actor.user.id,
    action: `portal.scholars.edit.${decision === 'approved' ? 'approve' : 'reject'}`,
    target: `scholars_edit:${edit.id}`,
    meta: { decision, comment: comment || null, by: actor.user.email },
  });

  return decision === 'approved' ? { approved: true } : { rejected: true, status: decision };
}

async function reviewScholarMedia(id, decision, actor) {
  ensureServiceSchema();
  const media = dbApi.getMediaById(Number(id));
  if (!media) throw portalError(404, 'Media not found');
  if (media.status !== 'pending') throw portalError(400, `Media has already been ${media.status}`);

  dbApi.updateMediaStatus(media.id, decision);

  dbApi.audit({
    actorId: getTeamCurator().id,
    action: decision === 'approved' ? 'media_approved' : 'media_rejected',
    resourceType: 'media',
    resourceId: media.id,
    details: { via: 'admin_portal', portalUser: actor.user.email, filename: media.filename },
    ipHash: null,
  });

  await logAction({
    adminUserId: actor.user.id,
    action: `portal.scholars.media.${decision === 'approved' ? 'approve' : 'reject'}`,
    target: `scholars_media:${media.id}`,
    meta: { filename: media.filename, by: actor.user.email },
  });

  return decision === 'approved' ? { approved: true } : { rejected: true };
}

async function approveScholarItem(kind, id, actor, body = {}) {
  if (kind === 'edit') return reviewScholarEdit(id, 'approved', actor, body);
  if (kind === 'media') return reviewScholarMedia(id, 'approved', actor);
  throw portalError(400, "kind must be 'edit' or 'media'");
}

async function rejectScholarItem(kind, id, actor, body = {}) {
  if (kind === 'edit') {
    const status = body.status === 'needs_revision' ? 'needs_revision' : 'rejected';
    return reviewScholarEdit(id, status, actor, body);
  }
  if (kind === 'media') return reviewScholarMedia(id, 'rejected', actor);
  throw portalError(400, "kind must be 'edit' or 'media'");
}

// ─────────────────────────────────────────────────────────────
// Newsletter subscribers (PII — list is read-gated, export is leasing-gated)
// ─────────────────────────────────────────────────────────────

async function listNewsletterSubscribers({ limit = 100, offset = 0 } = {}) {
  ensureServiceSchema();
  const [items, totalRow] = await Promise.all([
    all(
      `SELECT id, email, phone, source, subscribed_at
       FROM newsletter_subscribers
       ORDER BY subscribed_at DESC, id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
    get('SELECT COUNT(*) as c FROM newsletter_subscribers'),
  ]);
  return { items, total: Number(totalRow?.c ?? 0), limit, offset };
}

async function listAllNewsletterSubscribers() {
  ensureServiceSchema();
  return all(
    `SELECT email, phone, source, subscribed_at
     FROM newsletter_subscribers
     ORDER BY subscribed_at ASC, id ASC`
  );
}

/**
 * Escape one CSV cell. Two concerns:
 *  - structural: quote cells containing quotes/commas/newlines (RFC 4180).
 *  - spreadsheet formula injection: a cell whose first character is
 *    = + - @ is evaluated as a formula by Excel/Sheets. Phone numbers begin
 *    with '+', so this is a real vector here — prefix such cells with a
 *    single quote.
 */
function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function newsletterSubscribersToCsv(rows) {
  const header = 'email,phone,source,subscribed_at';
  const lines = rows.map((row) =>
    [csvCell(row.email), csvCell(row.phone), csvCell(row.source), csvCell(row.subscribed_at)].join(
      ','
    )
  );
  return [header, ...lines].join('\r\n');
}

// ─────────────────────────────────────────────────────────────
// Creator merch oversight
// ─────────────────────────────────────────────────────────────

function getCreatorMerchOverview() {
  ensureServiceSchema();
  const db = getDb();
  const products = db
    .prepare(
      `SELECT id, creative_asset_id, creator_id, creator_name, creator_university,
              title, product_type, price_cents, base_cost_cents, status, created_at, updated_at
       FROM creator_products
       ORDER BY created_at DESC, id DESC
       LIMIT 500`
    )
    .all();
  // Ledger totals exclude refunded orders, matching the creator-side
  // earnings math in creator-merch.js#getCreatorEarningsSummary.
  const totalsRow = db
    .prepare(
      `SELECT COUNT(*) AS orders,
              COALESCE(SUM(gross_cents), 0) AS gross_cents,
              COALESCE(SUM(base_cents), 0) AS base_cents,
              COALESCE(SUM(fees_cents), 0) AS fees_cents,
              COALESCE(SUM(creator_share_cents), 0) AS creator_share_cents,
              COALESCE(SUM(platform_share_cents), 0) AS platform_share_cents
       FROM creator_order_ledger
       WHERE status != 'refunded'`
    )
    .get();
  const refundedRow = db
    .prepare(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(gross_cents), 0) AS gross_cents
       FROM creator_order_ledger
       WHERE status = 'refunded'`
    )
    .get();
  const statusCounts = { pending: 0, live: 0, withdrawn: 0 };
  for (const row of db
    .prepare('SELECT status, COUNT(*) AS c FROM creator_products GROUP BY status')
    .all()) {
    statusCounts[row.status] = row.c;
  }
  return {
    products,
    productCounts: statusCounts,
    ledger: {
      orders: totalsRow.orders,
      grossCents: totalsRow.gross_cents,
      baseCents: totalsRow.base_cents,
      feesCents: totalsRow.fees_cents,
      creatorShareCents: totalsRow.creator_share_cents,
      platformShareCents: totalsRow.platform_share_cents,
      refundedOrders: refundedRow.orders,
      refundedGrossCents: refundedRow.gross_cents,
    },
  };
}

/**
 * Force-withdraw a live product (admin takedown). Reuses the creator-merch
 * module's withdrawal helper so the store catalog and the admin view can
 * never diverge, and records the action in the admin audit trail.
 */
async function withdrawCreatorProductById(id, actor) {
  ensureServiceSchema();
  const db = getDb();
  const product = db.prepare('SELECT * FROM creator_products WHERE id = ?').get(id);
  if (!product) throw portalError(404, 'Product not found');
  if (product.status !== 'live') {
    throw portalError(400, `Product is not live (status: ${product.status})`);
  }

  creatorMerch.withdrawCreatorProduct(product.creative_asset_id);

  await logAction({
    adminUserId: actor.user.id,
    action: 'portal.merch.withdraw',
    target: `creator_product:${id}`,
    meta: {
      creativeAssetId: product.creative_asset_id,
      title: product.title,
      creator: product.creator_name,
      by: actor.user.email,
    },
  });

  return db.prepare('SELECT * FROM creator_products WHERE id = ?').get(id);
}

module.exports = {
  getDashboard,
  listApplications,
  approveApplication,
  rejectApplication,
  listPatronsAdmin,
  getPatronStats: patronService.getPatronStats,
  updatePatronStatus,
  getScholarsPending,
  approveScholarItem,
  rejectScholarItem,
  listNewsletterSubscribers,
  listAllNewsletterSubscribers,
  newsletterSubscribersToCsv,
  getCreatorMerchOverview,
  withdrawCreatorProductById,
};
