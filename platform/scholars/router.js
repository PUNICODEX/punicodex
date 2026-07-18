/**
 * PuniCodex — Scholarly Edition API
 *
 * Routes under /api/v1/scholars/
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const {
  hashPassword,
  verifyPassword,
  login,
  logout,
  requireAuth,
  validateSession,
} = require('./auth');
const {
  requireRole,
  requireCurator,
  requireInstitutionAdmin,
  requireDepartmentAdmin,
  isInstitutionAdmin,
  canSubmitEdit,
  canReviewEdit,
  canManageStudent,
  isReviewerOrHigher,
} = require('./authz');
const {
  listTemples,
  countTemples,
  getTempleByEntryId,
  getTempleById,
  listSectionsByTemple,
  countSections,
  getSectionById,
  getSectionByTempleAndKey,
  searchSections,
  createEdit,
  getEditById,
  listPendingEdits,
  listEditsForUser,
  countPendingEdits,
  updateEditStatus,
  createReview,
  updateSection,
  createHistoryRecord,
  getHistoryForSection,
  createMedia,
  getMediaById,
  listMedia,
  countMedia,
  updateMediaStatus,
  audit,
  getUserById,
  getUserByEmail,
  listUsers,
  countUsers,
  listInstitutions,
  countInstitutions,
  getInstitutionById,
  listUsersByInstitution,
  countUsersByInstitution,
  countEditsByInstitution,
  countAttributedSectionsByInstitution,
  countEditsByDay,
  countEditsByDayForInstitution,
  countApprovalsByDayForInstitution,
  topEditedTemplesForInstitution,
  countApprovalsByDay,
  topContributingInstitutions,
  topEditedTemples,
  countViewsByDay,
  withTransaction,
  createNotification,
  listNotificationsForUser,
  markNotificationRead,
  dismissNotification,
  listReviewersForInstitution,
  createInstitutionWithAdmin,
  updateInstitutionSponsorship,
  updateInstitutionAllowlist,
  createUserWithPassword,
  updateUserPassword,
  updateUserStatus,
  updateUserRole,
  updateUserProfile,
  listStudentsByInstitution,
  deleteSessionsForUser,
  getInstitutionBySlug,
  createSponsorshipApplication,
  getSponsorshipApplicationById,
  listSponsorshipApplications,
  countSponsorshipApplications,
  updateSponsorshipApplicationStatus,
} = require('../db/scholars');
const { generateBlankManifest } = require('./taxonomy');
const { scoreEdit, validateEdit, buildQualityReason, MIN_SCORE } = require('./quality');
const {
  securityHeaders,
  createScholarsRateLimit,
  createLoginRateLimit,
  validateInputLength,
  validatePassword,
  auditLog,
} = require('./security');
const {
  get: cacheGet,
  set: cacheSet,
  del: cacheDel,
  delByPrefix: cacheDelByPrefix,
  cacheKey,
} = require('./cache');
const emailModule = require('../api/email');

const router = express.Router();

function cacheMiddleware(namespace, ttlSeconds = 60) {
  return async (req, res, next) => {
    const key = cacheKey(namespace, req.originalUrl);
    const cached = await cacheGet(key);
    if (cached) {
      res.set('X-Scholars-Cache', 'HIT');
      return res.json(cached);
    }
    res.set('X-Scholars-Cache', 'MISS');
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (body?.success) {
        cacheSet(key, body, ttlSeconds).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}

function invalidateTempleCache(entryId) {
  cacheDel(cacheKey('temple', `/api/v1/scholars/temples/${entryId}`)).catch(() => {});
  cacheDel(cacheKey('temple', `/api/v1/scholars/temples/${entryId}/manifest`)).catch(() => {});
  cacheDelByPrefix(cacheKey('search', '')).catch(() => {});
  // Section bodies change on approval; section cache keys are URL-based
  // (both /sections/:id and /temples/:id/sections/:key), so purge the
  // namespace — invalidation is rare and entries re-cache within 60s.
  cacheDelByPrefix(cacheKey('section', '')).catch(() => {});
}

router.use(securityHeaders);

router.use(express.raw({ type: 'multipart/form-data', limit: 6 * 1024 * 1024 }));
router.use(express.json({ limit: '10mb' }));

function success(data) {
  return { success: true, data };
}

function error(message, code = 400) {
  return { success: false, error: message, code };
}

function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function generateTempPassword(length = 16) {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

function sanitizeUser(row) {
  if (!row) return null;
  const user = { ...row };
  delete user.password_hash;
  return user;
}

/**
 * Resolve the department scope for institution-management endpoints.
 *
 * Institution admins and curators act institution-wide (`department: null`).
 * Department admins are confined to their own department; a dept_admin with
 * no assigned department gets a 400 and a `null` return (response already
 * sent), since an unscoped dept_admin must not see institution-wide data.
 */
function resolveDepartmentScope(req, res) {
  if (isInstitutionAdmin(req.user)) return { department: null };
  if (!req.user.department) {
    res.status(400).json(error('No department is associated with this account'));
    return null;
  }
  return { department: req.user.department };
}

function notifyReviewersOfSubmission(edit, section, temple) {
  const author = getUserById(edit.user_id);
  if (!author) return;
  const reviewers = listReviewersForInstitution(author.institution_id);
  const title = `New scholarly edit for ${temple.name}`;
  const body = `${author.display_name || author.email} submitted an edit to "${section.label}". Review it in the queue.`;
  for (const reviewer of reviewers) {
    if (reviewer.id === edit.user_id) continue;
    createNotification({
      userId: reviewer.id,
      type: 'edit_submitted',
      title,
      body,
      data: {
        editId: edit.id,
        sectionId: section.id,
        templeId: temple.entry_id,
        sectionKey: section.key,
      },
    });
  }
}

function notifyAuthorOfDecision(edit, section, temple, decision, comment) {
  const verb =
    decision === 'approved'
      ? 'approved'
      : decision === 'needs_revision'
        ? 'returned for revision'
        : 'rejected';
  const title = `Edit ${verb}: ${temple.name}`;
  const commentText = comment ? ` Comment: "${comment}"` : '';
  const body = `Your edit to "${section.label}" for ${temple.name} was ${verb}.${commentText}`;
  createNotification({
    userId: edit.user_id,
    type: `edit_${decision}`,
    title,
    body,
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

// ─────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────

router.get('/health', createScholarsRateLimit('health', { tier: 'public' }), (_req, res) => {
  res.json(success({ status: 'ok', service: 'scholars' }));
});

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────

router.post(
  '/auth/login',
  createLoginRateLimit(),
  createScholarsRateLimit('auth:login', { tier: 'strict' }),
  validateInputLength([
    { key: 'email', max: 254 },
    { key: 'password', max: 128 },
  ]),
  auditLog('auth_login', {
    getResourceType: () => 'auth',
    getResourceId: (req) => req.body?.email || 'login',
    getDetails: (req, res) => ({ email: req.body?.email, statusCode: res.statusCode }),
  }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json(error('A valid email is required'));
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json(error('Password is required'));
    }

    const result = await login(email, password, {
      ipHash: null,
      userAgent: req.headers['user-agent'],
    });

    if (!result.success) {
      return res.status(401).json(error(result.error, 401));
    }

    res.cookie('scholars_session', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json(success({ token: result.sessionId, user: result.user }));
  })
);

router.get(
  '/auth/session',
  createScholarsRateLimit('auth:session', { tier: 'public' }),
  asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.scholars_session || req.headers['x-scholars-session'];
    if (!sessionId) return res.json(success({ user: null }));
    const session = validateSession(sessionId);
    if (!session) return res.json(success({ user: null }));
    res.json(
      success({
        user: {
          id: session.user_id,
          email: session.email,
          role: session.role,
          institutionId: session.institution_id,
          displayName: session.display_name,
        },
      })
    );
  })
);

router.post(
  '/auth/logout',
  requireAuth,
  createScholarsRateLimit('auth:logout'),
  auditLog('auth_logout', {
    getResourceType: () => 'session',
    getResourceId: (req) =>
      req.cookies?.scholars_session || req.headers['x-scholars-session'] || 'logout',
    getDetails: (_req, res) => ({ statusCode: res.statusCode }),
  }),
  asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.scholars_session || req.headers['x-scholars-session'];
    if (sessionId) logout(sessionId);
    res.clearCookie('scholars_session');
    res.json(success({ loggedOut: true }));
  })
);

router.post(
  '/auth/password',
  requireAuth,
  createScholarsRateLimit('auth:password', { tier: 'strict' }),
  validateInputLength([
    { key: 'currentPassword', max: 128 },
    { key: 'newPassword', max: 128 },
  ]),
  auditLog('auth_password_changed', {
    getResourceType: () => 'user',
    getResourceId: (req) => req.user?.id || 'self',
    getDetails: (_req, res) => ({ statusCode: res.statusCode }),
  }),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || typeof currentPassword !== 'string') {
      return res.status(400).json(error('Current password is required'));
    }

    const user = getUserById(req.user.id);
    if (!user) return res.status(404).json(error('User not found', 404));
    if (!verifyPassword(currentPassword, user.password_hash)) {
      return res.status(401).json(error('Current password is incorrect', 401));
    }

    const passwordCheck = validatePassword(newPassword);
    if (!passwordCheck.valid) {
      return res
        .status(400)
        .json(error(`New password is too weak: ${passwordCheck.errors.join('; ')}`));
    }

    updateUserPassword(user.id, hashPassword(newPassword));

    // Revoke every other session for this account; the session that proved
    // knowledge of the old password stays signed in.
    const currentSessionId = req.cookies?.scholars_session || req.headers['x-scholars-session'];
    deleteSessionsForUser(user.id, { exceptId: currentSessionId });

    res.json(success({ changed: true }));
  })
);

router.post(
  '/auth/password/reset',
  requireAuth,
  requireInstitutionAdmin,
  createScholarsRateLimit('auth:password:reset', { tier: 'strict' }),
  validateInputLength([{ key: 'userId', max: 50 }]),
  auditLog('auth_password_reset', {
    getResourceType: () => 'user',
    getResourceId: (req) => req.body?.userId || 'reset',
    getDetails: (req, res) => ({ targetUserId: req.body?.userId, statusCode: res.statusCode }),
  }),
  asyncHandler(async (req, res) => {
    const { userId } = req.body || {};
    const targetId = Number(userId);
    if (!Number.isFinite(targetId)) {
      return res.status(400).json(error('userId is required'));
    }

    const target = getUserById(targetId);
    if (!target) return res.status(404).json(error('User not found', 404));

    if (!canManageStudent(req.user, target)) {
      return res.status(403).json(error("You cannot reset this user's password"));
    }

    const tempPassword = generateTempPassword();
    updateUserPassword(target.id, hashPassword(tempPassword));

    // Immediate revocation: all existing sessions for this account die now.
    deleteSessionsForUser(target.id);

    res.json(success({ reset: true, tempPassword }));
  })
);

// ─────────────────────────────────────────────────────────────
// Temples
// ─────────────────────────────────────────────────────────────

router.get(
  '/temples',
  createScholarsRateLimit('temples:list', { tier: 'public' }),
  asyncHandler(async (req, res) => {
    const { pantheon } = req.query;
    const temples = listTemples({ pantheon });
    res.json(success(temples));
  })
);

router.get(
  '/temples/:id',
  createScholarsRateLimit('temples:detail', { tier: 'public' }),
  cacheMiddleware('temple', 60),
  asyncHandler(async (req, res) => {
    const temple = getTempleByEntryId(req.params.id);
    if (!temple) return res.status(404).json(error('Temple not found', 404));
    const sections = listSectionsByTemple(temple.id);
    res.json(success({ ...temple, sections }));
  })
);

router.get(
  '/temples/:id/manifest',
  createScholarsRateLimit('temples:manifest', { tier: 'public' }),
  cacheMiddleware('temple', 60),
  asyncHandler(async (req, res) => {
    const temple = getTempleByEntryId(req.params.id);
    if (!temple) return res.status(404).json(error('Temple not found', 404));
    // Taxonomy defines the section structure; database sections merge over
    // the blank form so the manifest serves the real published content.
    const manifest = generateBlankManifest(req.params.id);
    const dbSections = new Map(listSectionsByTemple(temple.id).map((s) => [s.key, s]));
    manifest.sections = manifest.sections.map((section) => {
      const dbSection = dbSections.get(section.key);
      if (!dbSection) return section;
      const updater = dbSection.updated_by ? getUserById(dbSection.updated_by) : null;
      return {
        ...section,
        body: dbSection.body || '',
        sources: dbSection.sources || [],
        media: dbSection.media || [],
        editorNotes: dbSection.editor_notes || '',
        status: dbSection.status || section.status,
        lastModifiedAt: dbSection.updated_at || null,
        lastModifiedBy: (updater && updater.display_name) || null,
      };
    });
    res.json(success(manifest));
  })
);

// ─────────────────────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────────────────────

function makeSnippet(body, q) {
  const text = body || '';
  if (text.length === 0) return '';
  const lower = text.toLowerCase();
  const qLower = q.toLowerCase();
  const idx = lower.indexOf(qLower);
  const snipLen = 180;
  let start = 0;
  if (idx !== -1) {
    start = Math.max(0, idx - Math.floor(snipLen / 3));
  }
  const end = Math.min(text.length, start + snipLen);
  if (end === text.length) {
    start = Math.max(0, end - snipLen);
  }
  let snippet = text.slice(start, end);
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}

router.get(
  '/search',
  createScholarsRateLimit('search', { tier: 'public' }),
  cacheMiddleware('search', 30),
  asyncHandler(async (req, res) => {
    const { q = '', pantheon } = req.query;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
      return res.status(400).json(error('Search query is required'));
    }

    const { total, rows } = searchSections({ q: q.trim(), pantheon, limit, offset });

    const grouped = new Map();
    for (const row of rows) {
      const templeId = row.temple_id;
      if (!grouped.has(templeId)) {
        grouped.set(templeId, {
          temple: {
            id: templeId,
            entryId: row.entry_id,
            name: row.name,
            pantheon: row.pantheon,
            tier: row.tier,
            isFrozen: Boolean(row.is_frozen),
          },
          sections: [],
        });
      }
      grouped.get(templeId).sections.push({
        id: row.id,
        key: row.key,
        label: row.label,
        status: row.status,
        snippet: makeSnippet(row.body, q.trim()),
      });
    }

    res.json(
      success({
        query: q.trim(),
        pantheon: pantheon || null,
        limit,
        offset,
        total,
        results: Array.from(grouped.values()),
      })
    );
  })
);

// ─────────────────────────────────────────────────────────────
// Sections
// ─────────────────────────────────────────────────────────────

router.get(
  '/sections/:id',
  createScholarsRateLimit('sections:detail', { tier: 'public' }),
  cacheMiddleware('section', 60),
  asyncHandler(async (req, res) => {
    const section = getSectionById(Number(req.params.id));
    if (!section) return res.status(404).json(error('Section not found', 404));
    res.json(success(section));
  })
);

router.get(
  '/temples/:id/sections/:key',
  createScholarsRateLimit('sections:byKey', { tier: 'public' }),
  cacheMiddleware('section', 60),
  asyncHandler(async (req, res) => {
    const temple = getTempleByEntryId(req.params.id);
    if (!temple) return res.status(404).json(error('Temple not found', 404));
    const section = getSectionByTempleAndKey(temple.id, req.params.key);
    if (!section) return res.status(404).json(error('Section not found', 404));
    res.json(success(section));
  })
);

// ─────────────────────────────────────────────────────────────
// Edits
// ─────────────────────────────────────────────────────────────

router.post(
  '/temples/:id/sections/:key/edits',
  requireAuth,
  createScholarsRateLimit('edits:submit'),
  validateInputLength([
    { key: 'proposedBody', max: 50000 },
    { key: 'editorNotes', max: 5000 },
    { key: 'proposedSources', max: 50 },
    { key: 'proposedMedia', max: 50 },
  ]),
  asyncHandler(async (req, res) => {
    const temple = getTempleByEntryId(req.params.id);
    if (!temple) return res.status(404).json(error('Temple not found', 404));

    const section = getSectionByTempleAndKey(temple.id, req.params.key);
    if (!section) return res.status(404).json(error('Section not found', 404));

    const institution = req.user.institutionId ? getInstitutionById(req.user.institutionId) : null;

    if (!canSubmitEdit(req.user, institution, temple)) {
      return res.status(403).json(error('You do not have permission to submit edits'));
    }

    const {
      proposedBody = '',
      proposedSources = [],
      proposedMedia = [],
      editorNotes = '',
    } = req.body || {};
    if (typeof proposedBody !== 'string') {
      return res.status(400).json(error('proposedBody must be a string'));
    }

    const validation = validateEdit({ body: proposedBody, sources: proposedSources });
    if (!validation.valid) {
      return res
        .status(422)
        .json(error(`Edit failed quality validation: ${validation.errors.join(' ')}`, 422));
    }

    const score = scoreEdit({ body: proposedBody, sources: proposedSources });
    if (score < MIN_SCORE) {
      return res
        .status(422)
        .json(
          error(
            `Edit quality score ${score} is below the minimum ${MIN_SCORE}. Add citations, expand the body, or use authoritative sources.`,
            422
          )
        );
    }

    const qualityReason = buildQualityReason(
      { body: proposedBody, sources: proposedSources },
      score
    );

    const editResult = createEdit({
      sectionId: section.id,
      userId: req.user.id,
      proposedBody,
      proposedSources,
      proposedMedia,
      editorNotes,
      qualityReason,
    });

    audit({
      actorId: req.user.id,
      action: 'edit_submitted',
      resourceType: 'section',
      resourceId: section.id,
      details: {
        editId: editResult.lastInsertRowid,
        templeId: temple.entry_id,
        key: section.key,
        score,
      },
      ipHash: null,
    });

    const createdEdit = getEditById(editResult.lastInsertRowid);
    if (createdEdit) {
      notifyReviewersOfSubmission(createdEdit, section, temple);
    }

    res
      .status(201)
      .json(success({ editId: editResult.lastInsertRowid, score, warnings: validation.warnings }));
  })
);

router.get(
  '/edits/pending',
  requireAuth,
  requireRole('reviewer'),
  createScholarsRateLimit('edits:pending'),
  asyncHandler(async (req, res) => {
    const { sectionId, userId, limit = 100, offset = 0 } = req.query;
    const edits = listPendingEdits({
      sectionId: sectionId ? Number(sectionId) : undefined,
      userId: userId ? Number(userId) : undefined,
      institutionId: req.user.institutionId,
      limit: Number(limit),
      offset: Number(offset),
    });
    res.json(success(edits));
  })
);

router.get(
  '/edits/mine',
  requireAuth,
  createScholarsRateLimit('edits:mine'),
  asyncHandler(async (req, res) => {
    const { limit = 200, offset = 0 } = req.query;
    const edits = listEditsForUser(req.user.id, {
      limit: Math.min(Number(limit) || 200, 500),
      offset: Number(offset) || 0,
    });
    res.json(success(edits));
  })
);

router.get(
  '/edits/:id',
  requireAuth,
  createScholarsRateLimit('edits:detail'),
  asyncHandler(async (req, res) => {
    const edit = getEditById(Number(req.params.id));
    if (!edit) return res.status(404).json(error('Edit not found', 404));
    res.json(success(edit));
  })
);

router.post(
  '/edits/:id/withdraw',
  requireAuth,
  createScholarsRateLimit('edits:withdraw'),
  auditLog('edit_withdrawn', {
    getResourceType: () => 'edit',
    getResourceId: (req) => req.params.id,
    getDetails: (_req, res) => ({ statusCode: res.statusCode }),
  }),
  asyncHandler(async (req, res) => {
    const edit = getEditById(Number(req.params.id));
    if (!edit) return res.status(404).json(error('Edit not found', 404));
    if (edit.user_id !== req.user.id) {
      return res.status(403).json(error('You can only withdraw your own edits'));
    }
    if (!['pending', 'needs_revision'].includes(edit.status)) {
      return res.status(400).json(error(`Cannot withdraw an edit with status '${edit.status}'`));
    }
    updateEditStatus(edit.id, 'withdrawn', edit.comment);
    res.json(success({ withdrawn: true, editId: edit.id }));
  })
);

// ─────────────────────────────────────────────────────────────
// Reviews
// ─────────────────────────────────────────────────────────────

class EditNoLongerPendingError extends Error {}
class DuplicateEmailError extends Error {}

router.post(
  '/edits/:id/approve',
  requireAuth,
  requireRole('reviewer'),
  createScholarsRateLimit('edits:approve'),
  validateInputLength([{ key: 'comment', max: 5000 }]),
  asyncHandler(async (req, res) => {
    const edit = getEditById(Number(req.params.id));
    if (!edit) return res.status(404).json(error('Edit not found', 404));
    if (edit.status !== 'pending') return res.status(400).json(error('Edit is not pending'));
    if (edit.user_id === req.user.id)
      return res.status(403).json(error('You cannot approve your own edit'));

    const section = getSectionById(edit.section_id);
    const author = getUserById(edit.user_id);
    const editInstitution = author?.institution_id
      ? getInstitutionById(author.institution_id)
      : null;

    if (!canReviewEdit(req.user, editInstitution, author)) {
      return res.status(403).json(error('You cannot review edits from this institution'));
    }

    const { comment = '' } = req.body || {};

    try {
      withTransaction(() => {
        const currentEdit = getEditById(edit.id);
        if (currentEdit.status !== 'pending') {
          throw new EditNoLongerPendingError();
        }

        createReview({ editId: edit.id, reviewerId: req.user.id, decision: 'approved', comment });
        updateEditStatus(edit.id, 'approved', comment);

        const previousBody = section.body;
        const previousSources = section.sources;
        const previousMedia = section.media;

        updateSection({
          id: section.id,
          body: edit.proposed_body,
          sources: edit.proposed_sources,
          media: edit.proposed_media,
          status: 'published',
          updatedBy: edit.user_id,
        });

        createHistoryRecord({
          sectionId: section.id,
          editId: edit.id,
          body: edit.proposed_body,
          sources: edit.proposed_sources,
          media: edit.proposed_media,
          attribution: {
            userId: edit.user_id,
            institutionId: author ? author.institution_id : null,
            reviewerId: req.user.id,
          },
          diff: JSON.stringify({
            previousBody,
            previousSources,
            previousMedia,
          }),
        });
      });
    } catch (err) {
      if (err instanceof EditNoLongerPendingError) {
        return res.status(400).json(error('Edit is not pending'));
      }
      throw err;
    }

    audit({
      actorId: req.user.id,
      action: 'edit_approved',
      resourceType: 'edit',
      resourceId: edit.id,
      details: { sectionId: section.id },
    });

    const temple = getTempleById(section.temple_id);
    if (temple) {
      notifyAuthorOfDecision(edit, section, temple, 'approved', comment);
      invalidateTempleCache(temple.entry_id);
    }

    res.json(success({ approved: true }));
  })
);

router.post(
  '/edits/:id/reject',
  requireAuth,
  requireRole('reviewer'),
  createScholarsRateLimit('edits:reject'),
  validateInputLength([
    { key: 'comment', max: 5000 },
    { key: 'status', max: 50 },
  ]),
  asyncHandler(async (req, res) => {
    const edit = getEditById(Number(req.params.id));
    if (!edit) return res.status(404).json(error('Edit not found', 404));
    if (edit.status !== 'pending') return res.status(400).json(error('Edit is not pending'));
    if (edit.user_id === req.user.id)
      return res.status(403).json(error('You cannot reject your own edit'));

    const section = getSectionById(edit.section_id);
    const author = getUserById(edit.user_id);
    const editInstitution = author?.institution_id
      ? getInstitutionById(author.institution_id)
      : null;

    if (!canReviewEdit(req.user, editInstitution, author)) {
      return res.status(403).json(error('You cannot review edits from this institution'));
    }

    const { comment = '', status = 'rejected' } = req.body || {};
    const finalStatus = status === 'needs_revision' ? 'needs_revision' : 'rejected';

    try {
      withTransaction(() => {
        const currentEdit = getEditById(edit.id);
        if (currentEdit.status !== 'pending') {
          throw new EditNoLongerPendingError();
        }

        createReview({ editId: edit.id, reviewerId: req.user.id, decision: finalStatus, comment });
        updateEditStatus(edit.id, finalStatus, comment);
      });
    } catch (err) {
      if (err instanceof EditNoLongerPendingError) {
        return res.status(400).json(error('Edit is not pending'));
      }
      throw err;
    }

    audit({
      actorId: req.user.id,
      action: 'edit_rejected',
      resourceType: 'edit',
      resourceId: edit.id,
      details: { status: finalStatus },
    });

    const temple = section ? getTempleById(section.temple_id) : null;
    if (temple) {
      notifyAuthorOfDecision(edit, section, temple, finalStatus, comment);
    }

    res.json(success({ rejected: true }));
  })
);

// ─────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────

router.get(
  '/notifications',
  requireAuth,
  createScholarsRateLimit('notifications:list'),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const unreadOnly = req.query.unread === 'true' || req.query.unread === '1';
    const notifications = listNotificationsForUser(req.user.id, { limit, offset, unreadOnly });
    const unreadCount = listNotificationsForUser(req.user.id, { unreadOnly: true }).length;
    res.json(success({ notifications, unreadCount, limit, offset }));
  })
);

router.post(
  '/notifications/:id/read',
  requireAuth,
  createScholarsRateLimit('notifications:read'),
  auditLog('notification_read', {
    getResourceType: () => 'notification',
    getResourceId: (req) => req.params.id,
  }),
  asyncHandler(async (req, res) => {
    const ok = markNotificationRead(Number(req.params.id), req.user.id);
    if (!ok) return res.status(404).json(error('Notification not found', 404));
    res.json(success({ read: true }));
  })
);

router.post(
  '/notifications/:id/dismiss',
  requireAuth,
  createScholarsRateLimit('notifications:dismiss'),
  auditLog('notification_dismissed', {
    getResourceType: () => 'notification',
    getResourceId: (req) => req.params.id,
  }),
  asyncHandler(async (req, res) => {
    const ok = dismissNotification(Number(req.params.id), req.user.id);
    if (!ok) return res.status(404).json(error('Notification not found', 404));
    res.json(success({ dismissed: true }));
  })
);

// ─────────────────────────────────────────────────────────────
// History
// ─────────────────────────────────────────────────────────────

router.get(
  '/sections/:id/history',
  createScholarsRateLimit('history:list', { tier: 'public' }),
  asyncHandler(async (req, res) => {
    const history = getHistoryForSection(Number(req.params.id), {
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0,
    });
    res.json(success(history));
  })
);

// ─────────────────────────────────────────────────────────────
// Institution admin dashboard
// ─────────────────────────────────────────────────────────────

router.get(
  '/institution',
  requireAuth,
  requireDepartmentAdmin,
  createScholarsRateLimit('institution:dashboard'),
  asyncHandler(async (req, res) => {
    const institutionId = req.user.institutionId;
    if (!institutionId) {
      return res.status(400).json(error('No institution is associated with this account'));
    }
    const scope = resolveDepartmentScope(req, res);
    if (!scope) return;

    const institution = getInstitutionById(institutionId);
    if (!institution) return res.status(404).json(error('Institution not found', 404));

    const allUsers = listUsersByInstitution(institutionId);
    const scopedUsers = scope.department
      ? allUsers.filter((u) => u.department === scope.department)
      : allUsers;
    const scopedReviewers = scope.department
      ? listReviewersForInstitution(institutionId).filter((u) => u.department === scope.department)
      : listReviewersForInstitution(institutionId);

    const stats = {
      memberCount: scope.department ? scopedUsers.length : countUsersByInstitution(institutionId),
      studentCount: listStudentsByInstitution(institutionId, {
        department: scope.department ?? undefined,
      }).length,
      reviewerCount: scopedReviewers.length,
      totalSubmitted: countEditsByInstitution(institutionId, {
        department: scope.department ?? undefined,
      }),
      approved: countEditsByInstitution(institutionId, {
        status: 'approved',
        department: scope.department ?? undefined,
      }),
      pending: countEditsByInstitution(institutionId, {
        status: 'pending',
        department: scope.department ?? undefined,
      }),
      attributedSections: countAttributedSectionsByInstitution(institutionId, {
        department: scope.department ?? undefined,
      }),
    };

    const users = scopedUsers.map((u) => sanitizeUser(u));

    res.json(success({ institution, department: scope.department, stats, users }));
  })
);

router.get(
  '/institution/analytics',
  requireAuth,
  requireInstitutionAdmin,
  createScholarsRateLimit('institution:analytics'),
  asyncHandler(async (req, res) => {
    const institutionId = req.user.institutionId;
    if (!institutionId) {
      return res.status(400).json(error('No institution is associated with this account'));
    }
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    res.json(
      success({
        periodDays: days,
        editsByDay: countEditsByDayForInstitution(institutionId, days),
        approvalsByDay: countApprovalsByDayForInstitution(institutionId, days),
        topTemples: topEditedTemplesForInstitution(institutionId, limit),
      })
    );
  })
);

router.get(
  '/institution/students',
  requireAuth,
  requireDepartmentAdmin,
  createScholarsRateLimit('institution:students:list'),
  asyncHandler(async (req, res) => {
    const institutionId = req.user.institutionId;
    if (!institutionId) return res.status(400).json(error('No institution associated'));
    const scope = resolveDepartmentScope(req, res);
    if (!scope) return;
    const students = listStudentsByInstitution(institutionId, {
      department: scope.department ?? undefined,
    }).map((u) => sanitizeUser(u));
    res.json(success(students));
  })
);

router.post(
  '/institution/students',
  requireAuth,
  requireDepartmentAdmin,
  createScholarsRateLimit('institution:students:create'),
  validateInputLength([
    { key: 'email', max: 254 },
    { key: 'displayName', max: 200 },
    { key: 'department', max: 100 },
    { key: 'password', max: 128 },
  ]),
  auditLog('institution_student_created', {
    getResourceType: () => 'user',
    getResourceId: (_req, res) => res.locals?.createdUserId || 'new',
    getDetails: (req, res) => ({ email: req.body?.email, statusCode: res.statusCode }),
  }),
  asyncHandler(async (req, res) => {
    const institutionId = req.user.institutionId;
    if (!institutionId) return res.status(400).json(error('No institution associated'));
    const scope = resolveDepartmentScope(req, res);
    if (!scope) return;

    const { email, displayName, department, password } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json(error('A valid email is required'));
    }
    if (password !== undefined) {
      const passwordCheck = validatePassword(password);
      if (!passwordCheck.valid) {
        return res
          .status(400)
          .json(error(`Password is too weak: ${passwordCheck.errors.join('; ')}`));
      }
    }
    // Department admins can only provision students into their own department.
    if (scope.department && department && department !== scope.department) {
      return res
        .status(403)
        .json(error('Department admins can only add students to their own department'));
    }
    const effectiveDepartment = scope.department ?? department;

    const institution = getInstitutionById(institutionId);
    if (!institution) return res.status(404).json(error('Institution not found', 404));
    if (effectiveDepartment && !institution.department_allowlist.includes(effectiveDepartment)) {
      return res.status(400).json(error('Department is not in the institution allowlist'));
    }

    const normalizedEmail = email.toLowerCase().trim();
    const tempPassword = password || generateTempPassword();

    let result;
    try {
      result = withTransaction(() => {
        const existing = getUserByEmail(normalizedEmail);
        if (existing) {
          throw new DuplicateEmailError();
        }
        return createUserWithPassword({
          email: normalizedEmail,
          institutionId,
          role: 'student',
          displayName,
          department: effectiveDepartment,
          passwordHash: hashPassword(tempPassword),
          accountStatus: 'active',
        });
      });
    } catch (err) {
      if (err instanceof DuplicateEmailError) {
        return res.status(409).json(error('A user with this email already exists', 409));
      }
      throw err;
    }

    res.locals.createdUserId = result.lastInsertRowid;

    audit({
      actorId: req.user.id,
      action: 'student_created',
      resourceType: 'user',
      resourceId: result.lastInsertRowid,
      details: { email: email.toLowerCase().trim(), institutionId },
      ipHash: null,
    });

    // Email the one-time temp password to the student. Fire-and-forget: a
    // delivery failure must not roll back the provisioned account, and the
    // password is still shown to the admin exactly once below.
    emailModule
      .notifyScholarsAccountProvisioned({
        email: normalizedEmail,
        displayName,
        institutionName: institution.name,
        tempPassword,
      })
      .catch(() => {});

    res.status(201).json(
      success({
        userId: result.lastInsertRowid,
        tempPassword,
      })
    );
  })
);

router.get(
  '/institution/reviewers',
  requireAuth,
  requireInstitutionAdmin,
  createScholarsRateLimit('institution:reviewers:list'),
  asyncHandler(async (req, res) => {
    const institutionId = req.user.institutionId;
    if (!institutionId) return res.status(400).json(error('No institution associated'));
    const reviewers = listReviewersForInstitution(institutionId).map((u) => sanitizeUser(u));
    res.json(success(reviewers));
  })
);

router.post(
  '/institution/reviewers',
  requireAuth,
  requireInstitutionAdmin,
  createScholarsRateLimit('institution:reviewers:promote'),
  validateInputLength([{ key: 'userId', max: 50 }]),
  auditLog('institution_reviewer_promoted', {
    getResourceType: () => 'user',
    getResourceId: (req) => req.body?.userId || 'promote',
  }),
  asyncHandler(async (req, res) => {
    const institutionId = req.user.institutionId;
    if (!institutionId) return res.status(400).json(error('No institution associated'));

    const { userId } = req.body || {};
    const targetId = Number(userId);
    if (!Number.isFinite(targetId)) {
      return res.status(400).json(error('userId is required'));
    }

    const target = getUserById(targetId);
    if (!target) return res.status(404).json(error('User not found', 404));
    if (!canManageStudent(req.user, target)) {
      return res.status(403).json(error('Only students in your institution can be promoted'));
    }

    updateUserRole(target.id, 'reviewer');

    audit({
      actorId: req.user.id,
      action: 'reviewer_promoted',
      resourceType: 'user',
      resourceId: target.id,
      details: { previousRole: target.role },
      ipHash: null,
    });

    res.json(success({ promoted: true, userId: target.id }));
  })
);

router.patch(
  '/institution/students/:id',
  requireAuth,
  requireDepartmentAdmin,
  createScholarsRateLimit('institution:students:update'),
  validateInputLength([
    { key: 'displayName', max: 200 },
    { key: 'department', max: 100 },
    { key: 'accountStatus', max: 50 },
  ]),
  auditLog('institution_student_updated', {
    getResourceType: () => 'user',
    getResourceId: (req) => req.params.id,
  }),
  asyncHandler(async (req, res) => {
    const targetId = Number(req.params.id);
    const target = getUserById(targetId);
    if (!target) return res.status(404).json(error('User not found', 404));
    if (!canManageStudent(req.user, target)) {
      return res.status(403).json(error('You cannot update this user'));
    }

    const { displayName, department, accountStatus } = req.body || {};
    // Moving a student between departments reshapes dept_admin scope, so only
    // institution admins may do it.
    if (department !== undefined && !isInstitutionAdmin(req.user)) {
      return res
        .status(403)
        .json(error('Department admins cannot move students between departments'));
    }
    if (department !== undefined) {
      const institution = getInstitutionById(req.user.institutionId);
      if (department && !institution.department_allowlist.includes(department)) {
        return res.status(400).json(error('Department is not in the institution allowlist'));
      }
    }

    updateUserProfile(target.id, { displayName, department });
    if (accountStatus !== undefined) {
      updateUserStatus(target.id, accountStatus);
    }

    audit({
      actorId: req.user.id,
      action: 'student_updated',
      resourceType: 'user',
      resourceId: target.id,
      details: { displayName, department, accountStatus },
      ipHash: null,
    });

    res.json(success({ updated: true, userId: target.id }));
  })
);

router.post(
  '/institution/students/:id/reset-password',
  requireAuth,
  requireDepartmentAdmin,
  createScholarsRateLimit('institution:students:reset-password', { tier: 'strict' }),
  auditLog('institution_student_password_reset', {
    getResourceType: () => 'user',
    getResourceId: (req) => req.params.id,
  }),
  asyncHandler(async (req, res) => {
    const targetId = Number(req.params.id);
    const target = getUserById(targetId);
    if (!target) return res.status(404).json(error('User not found', 404));
    if (!canManageStudent(req.user, target)) {
      return res.status(403).json(error("You cannot reset this user's password"));
    }

    const tempPassword = generateTempPassword();
    updateUserPassword(target.id, hashPassword(tempPassword));

    // Immediate revocation: all existing sessions for this account die now.
    deleteSessionsForUser(target.id);

    audit({
      actorId: req.user.id,
      action: 'student_password_reset',
      resourceType: 'user',
      resourceId: target.id,
      ipHash: null,
    });

    // Email the new one-time temp password to the student (fire-and-forget;
    // it is also shown to the admin exactly once below).
    const institution = getInstitutionById(target.institution_id);
    emailModule
      .notifyScholarsAccountProvisioned({
        email: target.email,
        displayName: target.display_name,
        institutionName: institution?.name,
        tempPassword,
      })
      .catch(() => {});

    res.json(success({ reset: true, tempPassword }));
  })
);

router.delete(
  '/institution/students/:id',
  requireAuth,
  requireDepartmentAdmin,
  createScholarsRateLimit('institution:students:delete'),
  auditLog('institution_student_disabled', {
    getResourceType: () => 'user',
    getResourceId: (req) => req.params.id,
  }),
  asyncHandler(async (req, res) => {
    const targetId = Number(req.params.id);
    const target = getUserById(targetId);
    if (!target) return res.status(404).json(error('User not found', 404));
    if (!canManageStudent(req.user, target)) {
      return res.status(403).json(error('You cannot disable this user'));
    }

    updateUserStatus(target.id, 'disabled');

    // Immediate revocation: disabling an account kills its sessions now,
    // not at the 7-day session expiry.
    deleteSessionsForUser(target.id);

    audit({
      actorId: req.user.id,
      action: 'student_disabled',
      resourceType: 'user',
      resourceId: target.id,
      ipHash: null,
    });

    res.json(success({ disabled: true, userId: target.id }));
  })
);

// ─────────────────────────────────────────────────────────────
// Media
// ─────────────────────────────────────────────────────────────

const ALLOWED_MEDIA_TYPES = ['image/webp', 'image/png', 'image/jpeg'];
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR =
  process.env.PUNICODEX_SCHOLARS_UPLOAD_DIR ||
  path.join(__dirname, '..', 'public', 'uploads', 'scholars');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function extensionForMime(mime) {
  return { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg' }[mime];
}

function sanitizeBaseFilename(name) {
  return path
    .basename(name || 'upload')
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/\.{2,}/g, '.');
}

function uniqueFilename(mime, originalName) {
  const ext = extensionForMime(mime);
  const base = sanitizeBaseFilename(originalName).replace(/\.[^.]+$/, '');
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  return `${base || 'media'}-${suffix}.${ext}`;
}

function parseDataUri(dataUri) {
  const match = String(dataUri).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], 'base64');
  return { mimeType: match[1], buffer };
}

function parseMultipart(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=([^;\s]+)/);
  if (!boundaryMatch) throw new Error('Missing multipart boundary');
  const boundaryString = boundaryMatch[1].trim().replace(/^"|"$/g, '');
  const boundary = Buffer.from(`--${boundaryString}`);

  const parts = [];
  let start = buffer.indexOf(boundary);
  while (start !== -1) {
    const next = buffer.indexOf(boundary, start + boundary.length);
    if (next === -1) break;
    const part = buffer.subarray(start + boundary.length, next);
    parts.push(part);
    start = next;
  }

  for (const part of parts) {
    let body = part;
    if (body.slice(0, 2).toString() === '\r\n') body = body.subarray(2);
    if (body.slice(-2).toString() === '\r\n') body = body.subarray(0, -2);
    if (body.slice(0, 2).toString() === '--') continue;

    const headerEnd = body.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    const headers = body.subarray(0, headerEnd).toString('latin1');
    const content = body.subarray(headerEnd + 4);
    const dispositionMatch = headers.match(
      /Content-Disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]+)")?/i
    );
    if (!dispositionMatch) continue;
    const name = dispositionMatch[1];
    const filename = dispositionMatch[2];
    const typeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    const mimeType = typeMatch ? typeMatch[1].trim() : 'application/octet-stream';
    if (filename) {
      return { name, filename, mimeType, buffer: content };
    }
  }
  return null;
}

async function extractUploadedFile(req) {
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    const body =
      typeof req.body === 'object' && !Buffer.isBuffer(req.body)
        ? req.body
        : JSON.parse(req.body.toString('utf8') || '{}');
    const data = body.data || body.file || '';
    if (!data || typeof data !== 'string') {
      throw new Error('Missing base64 data field');
    }
    const parsed = parseDataUri(data) || {
      mimeType: body.mimeType,
      buffer: Buffer.from(data, 'base64'),
    };
    if (!parsed?.buffer) throw new Error('Invalid base64 data');
    return {
      buffer: parsed.buffer,
      mimeType: parsed.mimeType || body.mimeType,
      filename:
        body.filename || `upload.${extensionForMime(parsed.mimeType || body.mimeType) || 'bin'}`,
      caption: body.caption || '',
      license: body.license || '',
      source: body.source || '',
      creator: body.creator || '',
    };
  }

  if (contentType.includes('multipart/form-data')) {
    const parsed = parseMultipart(req.body, contentType);
    if (!parsed) throw new Error('Could not extract file from multipart body');
    return {
      buffer: parsed.buffer,
      mimeType: parsed.mimeType,
      filename: parsed.filename,
      caption: '',
      license: '',
      source: '',
      creator: '',
    };
  }

  throw new Error('Unsupported content type. Use application/json (base64) or multipart/form-data');
}

router.post(
  '/media',
  requireAuth,
  createScholarsRateLimit('media:upload'),
  asyncHandler(async (req, res) => {
    const institution = req.user.institutionId ? getInstitutionById(req.user.institutionId) : null;
    if (!canSubmitEdit(req.user, institution, null)) {
      return res.status(403).json(error('You do not have permission to upload media'));
    }

    let upload;
    try {
      upload = await extractUploadedFile(req);
    } catch (err) {
      return res.status(400).json(error(err.message));
    }

    if (!upload.mimeType || !ALLOWED_MEDIA_TYPES.includes(upload.mimeType)) {
      return res.status(415).json(error(`Unsupported media type: ${upload.mimeType || 'unknown'}`));
    }
    if (!upload.filename) upload.filename = `upload.${extensionForMime(upload.mimeType)}`;
    if (upload.buffer.length > MAX_MEDIA_BYTES) {
      return res.status(413).json(error(`File exceeds ${MAX_MEDIA_BYTES / 1024 / 1024}MB limit`));
    }

    ensureUploadDir();
    const filename = uniqueFilename(upload.mimeType, upload.filename);
    const filePath = path.join(UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, upload.buffer);

    const url = `/uploads/scholars/${filename}`;
    const result = createMedia({
      filename,
      url,
      mimeType: upload.mimeType,
      sizeBytes: upload.buffer.length,
      caption: upload.caption,
      license: upload.license,
      source: upload.source,
      creator: upload.creator,
      uploadedBy: req.user.id,
    });

    audit({
      actorId: req.user.id,
      action: 'media_uploaded',
      resourceType: 'media',
      resourceId: result.lastInsertRowid,
      details: { filename, mimeType: upload.mimeType, sizeBytes: upload.buffer.length },
      ipHash: null,
    });

    res.status(201).json(
      success({
        mediaId: result.lastInsertRowid,
        filename,
        url,
        mimeType: upload.mimeType,
        sizeBytes: upload.buffer.length,
        status: 'pending',
      })
    );
  })
);

router.get(
  '/media',
  requireAuth,
  createScholarsRateLimit('media:list'),
  asyncHandler(async (req, res) => {
    if (!isReviewerOrHigher(req.user)) {
      return res.status(403).json(error('Reviewer access required'));
    }
    const status = req.query.status;
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const items = listMedia({ status, limit, offset });
    const total = countMedia({ status });
    res.json(success({ items, total, limit, offset }));
  })
);

router.post(
  '/media/:id/approve',
  requireAuth,
  createScholarsRateLimit('media:approve'),
  asyncHandler(async (req, res) => {
    if (!isReviewerOrHigher(req.user)) {
      return res.status(403).json(error('Reviewer access required'));
    }
    const id = Number(req.params.id);
    const media = getMediaById(id);
    if (!media) return res.status(404).json(error('Media not found', 404));
    updateMediaStatus(id, 'approved');
    audit({
      actorId: req.user.id,
      action: 'media_approved',
      resourceType: 'media',
      resourceId: id,
      details: { filename: media.filename },
      ipHash: null,
    });
    res.json(success({ approved: true }));
  })
);

router.post(
  '/media/:id/reject',
  requireAuth,
  createScholarsRateLimit('media:reject'),
  asyncHandler(async (req, res) => {
    if (!isReviewerOrHigher(req.user)) {
      return res.status(403).json(error('Reviewer access required'));
    }
    const id = Number(req.params.id);
    const media = getMediaById(id);
    if (!media) return res.status(404).json(error('Media not found', 404));
    updateMediaStatus(id, 'rejected');
    audit({
      actorId: req.user.id,
      action: 'media_rejected',
      resourceType: 'media',
      resourceId: id,
      details: { filename: media.filename },
      ipHash: null,
    });
    res.json(success({ rejected: true }));
  })
);

// ─────────────────────────────────────────────────────────────
// Analytics
// ─────────────────────────────────────────────────────────────

router.post(
  '/analytics/view',
  createScholarsRateLimit('analytics:view', { tier: 'public' }),
  validateInputLength([{ key: 'templeId', max: 120 }]),
  asyncHandler(async (req, res) => {
    const { templeId } = req.body || {};
    if (!templeId || typeof templeId !== 'string') {
      return res.status(400).json(error('templeId is required'));
    }
    audit({
      actorId: req.user?.id || null,
      action: 'temple_view',
      resourceType: 'temple',
      resourceId: templeId,
      details: { userAgent: req.headers['user-agent'] },
      ipHash: null,
    });
    res.json(success({ recorded: true }));
  })
);

router.get(
  '/analytics',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('analytics:dashboard'),
  asyncHandler(async (req, res) => {
    const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const data = {
      periodDays: days,
      editsByDay: countEditsByDay(days),
      approvalsByDay: countApprovalsByDay(days),
      viewsByDay: countViewsByDay(days),
      topInstitutions: topContributingInstitutions(limit),
      topTemples: topEditedTemples(limit),
    };
    res.json(success(data));
  })
);

// ─────────────────────────────────────────────────────────────
// Curator-only utilities
// ─────────────────────────────────────────────────────────────

router.get(
  '/stats',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('curator:stats'),
  asyncHandler(async (_req, res) => {
    const stats = {
      totalTemples: countTemples(),
      totalSections: countSections(),
      publishedSections: countSections({ status: 'published' }),
      pendingEdits: countPendingEdits(),
      totalUsers: countUsers(),
      totalInstitutions: countInstitutions(),
    };
    res.json(success(stats));
  })
);

router.get(
  '/users',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('curator:users'),
  asyncHandler(async (req, res) => {
    const filters = {};
    if (req.query.role) filters.role = req.query.role;
    if (req.query.institutionId !== undefined)
      filters.institutionId = Number(req.query.institutionId);
    if (req.query.accountStatus) filters.accountStatus = req.query.accountStatus;
    if (req.query.q) filters.q = req.query.q;
    const users = listUsers(filters).map((u) => sanitizeUser(u));
    res.json(success(users));
  })
);

router.patch(
  '/users/:id/role',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('curator:users:role'),
  validateInputLength([
    { key: 'role', max: 50 },
    { key: 'userId', max: 50 },
  ]),
  auditLog('curator_user_role_changed', {
    getResourceType: () => 'user',
    getResourceId: (req) => req.params.id,
  }),
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const { role } = req.body || {};
    const validRoles = ['student', 'reviewer', 'dept_admin', 'inst_admin', 'curator'];
    if (!role || !validRoles.includes(role)) {
      return res.status(400).json(error('A valid role is required'));
    }

    const target = getUserById(userId);
    if (!target) return res.status(404).json(error('User not found', 404));

    updateUserRole(userId, role);

    audit({
      actorId: req.user.id,
      action: 'user_role_changed',
      resourceType: 'user',
      resourceId: userId,
      details: { previousRole: target.role, newRole: role },
      ipHash: null,
    });

    res.json(success({ changed: true, userId, role }));
  })
);

router.patch(
  '/users/:id/status',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('curator:users:status'),
  validateInputLength([{ key: 'accountStatus', max: 50 }]),
  auditLog('curator_user_status_changed', {
    getResourceType: () => 'user',
    getResourceId: (req) => req.params.id,
  }),
  asyncHandler(async (req, res) => {
    const userId = Number(req.params.id);
    const { accountStatus } = req.body || {};
    const validStatuses = ['active', 'disabled', 'pending'];
    if (!accountStatus || !validStatuses.includes(accountStatus)) {
      return res.status(400).json(error('A valid accountStatus is required'));
    }

    const target = getUserById(userId);
    if (!target) return res.status(404).json(error('User not found', 404));

    updateUserStatus(userId, accountStatus);

    // Immediate revocation: any non-active status kills existing sessions.
    if (accountStatus !== 'active') {
      deleteSessionsForUser(userId);
    }

    audit({
      actorId: req.user.id,
      action: 'user_status_changed',
      resourceType: 'user',
      resourceId: userId,
      details: { previousStatus: target.account_status, newStatus: accountStatus },
      ipHash: null,
    });

    res.json(success({ changed: true, userId, accountStatus }));
  })
);

router.get(
  '/institutions',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('curator:institutions'),
  asyncHandler(async (req, res) => {
    const institutions = listInstitutions({
      status: req.query.status,
      sponsorshipStatus: req.query.sponsorshipStatus,
    });
    res.json(success(institutions));
  })
);

router.post(
  '/institutions',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('curator:institutions:create'),
  validateInputLength([
    { key: 'name', max: 200 },
    { key: 'slug', max: 120 },
    { key: 'domain', max: 120 },
    { key: 'accreditation', max: 100 },
    { key: 'adminEmail', max: 254 },
    { key: 'adminPassword', max: 128 },
    { key: 'adminDisplayName', max: 200 },
    { key: 'adminDepartment', max: 100 },
  ]),
  auditLog('curator_institution_created', {
    getResourceType: () => 'institution',
    getResourceId: (_req, res) => res.locals?.institutionId || 'new',
  }),
  asyncHandler(async (req, res) => {
    const {
      name,
      slug,
      domain,
      accreditation,
      adminEmail,
      adminPassword,
      adminDisplayName,
      adminDepartment,
      sponsorshipStatus,
      sponsorshipExpiresAt,
      departmentAllowlist,
    } = req.body || {};

    if (!name || !slug || !adminEmail) {
      return res.status(400).json(error('name, slug, and adminEmail are required'));
    }
    if (!adminEmail.includes('@')) {
      return res.status(400).json(error('A valid adminEmail is required'));
    }
    if (adminPassword !== undefined) {
      const passwordCheck = validatePassword(adminPassword);
      if (!passwordCheck.valid) {
        return res
          .status(400)
          .json(error(`Admin password is too weak: ${passwordCheck.errors.join('; ')}`));
      }
    }

    const password = adminPassword || generateTempPassword(20);

    const result = createInstitutionWithAdmin({
      name,
      slug,
      domain,
      accreditation,
      sponsorshipStatus: sponsorshipStatus || 'pending',
      sponsorshipExpiresAt: sponsorshipExpiresAt || null,
      departmentAllowlist: Array.isArray(departmentAllowlist) ? departmentAllowlist : [],
      adminEmail: adminEmail.toLowerCase().trim(),
      adminPasswordHash: hashPassword(password),
      adminDisplayName,
      adminDepartment,
    });

    res.locals.institutionId = result.institutionId;

    audit({
      actorId: req.user.id,
      action: 'institution_created',
      resourceType: 'institution',
      resourceId: result.institutionId,
      details: { slug, adminId: result.adminId },
      ipHash: null,
    });

    res.status(201).json(
      success({
        institutionId: result.institutionId,
        adminId: result.adminId,
        adminPassword: adminPassword ? undefined : password,
      })
    );
  })
);

router.patch(
  '/institutions/:id/sponsorship',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('curator:institutions:sponsorship'),
  validateInputLength([
    { key: 'sponsorshipStatus', max: 50 },
    { key: 'sponsorshipExpiresAt', max: 50 },
  ]),
  auditLog('curator_institution_sponsorship_updated', {
    getResourceType: () => 'institution',
    getResourceId: (req) => req.params.id,
  }),
  asyncHandler(async (req, res) => {
    const institutionId = Number(req.params.id);
    const { sponsorshipStatus, sponsorshipExpiresAt } = req.body || {};
    const validStatuses = ['active', 'pending', 'expired'];

    if (sponsorshipStatus !== undefined && !validStatuses.includes(sponsorshipStatus)) {
      return res.status(400).json(error('Invalid sponsorshipStatus'));
    }

    const institution = getInstitutionById(institutionId);
    if (!institution) return res.status(404).json(error('Institution not found', 404));

    updateInstitutionSponsorship(institutionId, {
      sponsorshipStatus,
      sponsorshipExpiresAt,
    });

    audit({
      actorId: req.user.id,
      action: 'institution_sponsorship_updated',
      resourceType: 'institution',
      resourceId: institutionId,
      details: { sponsorshipStatus, sponsorshipExpiresAt },
      ipHash: null,
    });

    res.json(success({ updated: true, institutionId }));
  })
);

router.patch(
  '/institutions/:id/allowlist',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('curator:institutions:allowlist'),
  validateInputLength([{ key: 'departmentAllowlist', max: 2000 }]),
  auditLog('curator_institution_allowlist_updated', {
    getResourceType: () => 'institution',
    getResourceId: (req) => req.params.id,
  }),
  asyncHandler(async (req, res) => {
    const institutionId = Number(req.params.id);
    const { departmentAllowlist } = req.body || {};
    if (!Array.isArray(departmentAllowlist)) {
      return res.status(400).json(error('departmentAllowlist must be an array'));
    }

    const institution = getInstitutionById(institutionId);
    if (!institution) return res.status(404).json(error('Institution not found', 404));

    updateInstitutionAllowlist(institutionId, departmentAllowlist);

    audit({
      actorId: req.user.id,
      action: 'institution_allowlist_updated',
      resourceType: 'institution',
      resourceId: institutionId,
      details: { departmentAllowlist },
      ipHash: null,
    });

    res.json(success({ updated: true, institutionId, departmentAllowlist }));
  })
);

router.post(
  '/temples/:id/freeze',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('temples:freeze'),
  validateInputLength([{ key: 'isFrozen', max: 50 }]),
  asyncHandler(async (req, res) => {
    const { isFrozen } = req.body || {};
    const { setTempleFrozen } = require('../db/scholars');
    setTempleFrozen(req.params.id, Boolean(isFrozen));
    invalidateTempleCache(req.params.id);
    audit({
      actorId: req.user.id,
      action: 'temple_frozen',
      resourceType: 'temple',
      resourceId: req.params.id,
      details: { isFrozen },
    });
    res.json(success({ frozen: Boolean(isFrozen) }));
  })
);

// ─────────────────────────────────────────────────────────────
// Sponsorship applications (self-serve university onboarding)
// ─────────────────────────────────────────────────────────────

const APPLICATION_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const APPLICATION_DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

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
  while (getInstitutionBySlug(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

router.post(
  '/sponsorship/apply',
  createScholarsRateLimit('sponsorship:apply', { tier: 'strict' }),
  validateInputLength([
    { key: 'institutionName', max: 200 },
    { key: 'domain', max: 200 },
    { key: 'contactName', max: 200 },
    { key: 'contactEmail', max: 254 },
    { key: 'departmentFocus', max: 300 },
    { key: 'message', max: 5000 },
    { key: 'website', max: 200 },
  ]),
  asyncHandler(async (req, res) => {
    const {
      institutionName,
      domain,
      contactName,
      contactEmail,
      departmentFocus = '',
      message = '',
      website,
    } = req.body || {};

    // Honeypot: bots that fill the hidden 'website' field get a fake success.
    if (website) {
      return res.status(201).json(success({ received: true }));
    }

    if (!institutionName || !domain || !contactName || !contactEmail) {
      return res
        .status(400)
        .json(error('institutionName, domain, contactName, and contactEmail are required'));
    }
    if (!APPLICATION_EMAIL_RE.test(contactEmail)) {
      return res.status(400).json(error('contactEmail must be a valid email address'));
    }
    if (!APPLICATION_DOMAIN_RE.test(domain)) {
      return res
        .status(400)
        .json(error('domain must be a valid domain name (e.g. university.edu)'));
    }

    const result = createSponsorshipApplication({
      institutionName: institutionName.trim(),
      domain: domain.trim().toLowerCase(),
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim().toLowerCase(),
      departmentFocus: String(departmentFocus).trim(),
      message: String(message).trim(),
    });

    audit({
      actorId: null,
      action: 'sponsorship_application_received',
      resourceType: 'sponsorship_application',
      resourceId: result.lastInsertRowid,
      details: { domain: domain.trim().toLowerCase() },
      ipHash: null,
    });

    res.status(201).json(success({ received: true, applicationId: result.lastInsertRowid }));
  })
);

router.get(
  '/sponsorship/applications',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('sponsorship:applications:list'),
  asyncHandler(async (req, res) => {
    const status = req.query.status || undefined;
    if (status && !['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json(error('Invalid status filter'));
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const items = listSponsorshipApplications({ status, limit, offset });
    const total = countSponsorshipApplications({ status });
    const pendingCount = countSponsorshipApplications({ status: 'pending' });
    res.json(success({ items, total, pendingCount, limit, offset }));
  })
);

router.post(
  '/sponsorship/applications/:id/approve',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('sponsorship:applications:approve', { tier: 'strict' }),
  validateInputLength([{ key: 'reviewComment', max: 2000 }]),
  auditLog('sponsorship_application_approved', {
    getResourceType: () => 'sponsorship_application',
    getResourceId: (req) => req.params.id,
    getDetails: (_req, res) => ({ statusCode: res.statusCode }),
  }),
  asyncHandler(async (req, res) => {
    const application = getSponsorshipApplicationById(Number(req.params.id));
    if (!application) return res.status(404).json(error('Application not found', 404));
    if (application.status !== 'pending') {
      return res.status(400).json(error(`Application has already been ${application.status}`));
    }

    const tempPassword = generateTempPassword();
    const slug = uniqueInstitutionSlug(application.institution_name);

    let created;
    try {
      created = createInstitutionWithAdmin({
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
        return res
          .status(409)
          .json(error('An institution or admin account with this slug/email already exists', 409));
      }
      throw err;
    }

    updateSponsorshipApplicationStatus(application.id, 'approved', {
      reviewComment: req.body?.reviewComment || null,
      reviewedBy: req.user.id,
      createdInstitutionId: created.institutionId,
    });

    // Email the one-time temp password to the new institution admin.
    // Fire-and-forget: a delivery failure must not fail the approval, and
    // the password is still shown to the curator exactly once below.
    emailModule
      .notifyScholarsAccountProvisioned({
        email: application.contact_email,
        displayName: application.contact_name,
        institutionName: application.institution_name,
        tempPassword,
      })
      .catch(() => {});

    // The temp password is shown to the curator exactly once as a fallback
    // delivery channel alongside the provisioning email.
    res.json(
      success({
        approved: true,
        institutionId: created.institutionId,
        adminId: created.adminId,
        adminEmail: application.contact_email,
        adminPassword: tempPassword,
      })
    );
  })
);

router.post(
  '/sponsorship/applications/:id/reject',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('sponsorship:applications:reject', { tier: 'strict' }),
  validateInputLength([{ key: 'reviewComment', max: 2000 }]),
  auditLog('sponsorship_application_rejected', {
    getResourceType: () => 'sponsorship_application',
    getResourceId: (req) => req.params.id,
    getDetails: (_req, res) => ({ statusCode: res.statusCode }),
  }),
  asyncHandler(async (req, res) => {
    const application = getSponsorshipApplicationById(Number(req.params.id));
    if (!application) return res.status(404).json(error('Application not found', 404));
    if (application.status !== 'pending') {
      return res.status(400).json(error(`Application has already been ${application.status}`));
    }

    updateSponsorshipApplicationStatus(application.id, 'rejected', {
      reviewComment: req.body?.reviewComment || null,
      reviewedBy: req.user.id,
    });

    res.json(success({ rejected: true }));
  })
);

module.exports = router;
