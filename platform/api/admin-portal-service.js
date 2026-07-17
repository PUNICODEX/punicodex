/**
 * PÚNYCODEX — Admin Portal Service
 *
 * Composition layer behind the /api/admin/portal/* serverless handlers.
 * Aggregates leasing, scholars, patrons, and observability data into the
 * unified portal views, and delegates mutations to the existing service
 * layers (admin-booking-service, platform/db/scholars, patron-service)
 * instead of duplicating their SQL.
 *
 * Scholarly and university approvals executed here act through the canonical
 * "PÚNYCODEX Team" curator identity (the same machine identity the Scholars
 * seed publishes under), because scholars_reviews.reviewer_id must reference
 * a scholars user. The acting portal user is always recorded in the
 * admin_actions audit trail.
 */

const { get, all } = require('../db/operational');
const { getDb } = require('../db/connection');
const { migrate: migrateScholars } = require('../db/migrate-scholars');
const { migrate: migrateQuality } = require('../db/migrate-scholars-quality');
const { migrate: migratePatrons } = require('../db/migrate-patrons');
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

// Cold-start schema for every subsystem the portal touches. All migrations
// are idempotent; safe to run on every serverless cold start.
const db = getDb();
migrateScholars(db);
migrateQuality(db);
migratePatrons(db);

function portalError(status, message, code) {
  return Object.assign(new Error(message), { status, code });
}

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────

async function getDashboard() {
  const [pendingBusinessRow, revenue, metrics, health, patronStats] = await Promise.all([
    get("SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_application'"),
    getRevenueStats(30),
    getMetrics({ hours: 24 }),
    getHealthSummary(),
    patronService.getPatronStats(),
  ]);

  const universityPending = dbApi.countSponsorshipApplications({ status: 'pending' });
  const pendingEdits = dbApi.countPendingEdits();
  const pendingMedia = dbApi.countMedia({ status: 'pending' });

  const revenue30dCents = revenue.daily.reduce((sum, d) => sum + d.revenueCents, 0);
  const bookings30d = revenue.daily.reduce((sum, d) => sum + d.bookings, 0);

  return {
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
  const businessStatus = status === 'pending' || !status ? 'pending_application' : status;
  const universityStatus = status || null;

  let business = [];
  let university = [];
  if (!kind || kind === 'business') {
    business = (
      await all(
        `SELECT b.*, s.name as slot_name
         FROM bookings b
         JOIN ad_slots s ON b.slot_id = s.id
         WHERE b.status = $1
         ORDER BY b.created_at DESC
         LIMIT 500`,
        [businessStatus]
      )
    ).map(toBusinessApplication);
  }
  if (!kind || kind === 'university') {
    university = dbApi
      .listSponsorshipApplications({ status: universityStatus, limit: 500, offset: 0 })
      .map(toUniversityApplication);
  }

  const items = [...business, ...university]
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(offset, offset + limit);

  const pendingBusinessRow = await get(
    "SELECT COUNT(*) as c FROM bookings WHERE status = 'pending_application'"
  );

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

  // The temp password is shown to the approver exactly once so it can be
  // relayed to the university out-of-band (email delivery is not wired up).
  return {
    approved: true,
    institutionId: created.institutionId,
    adminId: created.adminId,
    adminEmail: application.contact_email,
    adminPassword: tempPassword,
  };
}

async function rejectUniversityApplication(id, actor, { reviewComment } = {}) {
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
  // The canonical "PÚNYCODEX Team" curator identity used for machine-side
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
};
