/**
 * PÚNYCODEX — Scholarly Edition API
 *
 * Routes under /api/v1/scholars/
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const { requestMagicLink, verifyMagicToken, getSession, logout, requireAuth } = require('./auth');
const {
  requireRole,
  requireCurator,
  canSubmitEdit,
  canReviewEdit,
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
} = require('../db/scholars');
const { generateBlankManifest } = require('./taxonomy');
const { scoreEdit, validateEdit, buildQualityReason, MIN_SCORE } = require('./quality');
const {
  securityHeaders,
  createPublicRateLimit,
  createScholarsRateLimit,
  validateInputLength,
  auditLog,
} = require('./security');
const { get: cacheGet, set: cacheSet, del: cacheDel, cacheKey } = require('./cache');

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
      if (body && body.success) {
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
  cacheDel(cacheKey('search', '*')).catch(() => {});
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
  '/auth/magic-link',
  createPublicRateLimit('auth:magic-link'),
  validateInputLength([{ key: 'email', max: 254 }]),
  auditLog('auth_magic_link_sent', {
    getResourceType: () => 'auth',
    getResourceId: (req) => req.body?.email || 'magic-link',
    getDetails: (req, res) => ({ email: req.body?.email, statusCode: res.statusCode }),
  }),
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json(error('A valid email is required'));
    }
    const result = await requestMagicLink(email);
    res.json(
      success({
        email: result.email,
        note: 'Magic link generated; in development it is logged to stdout.',
      })
    );
  })
);

router.get(
  '/auth/verify',
  createScholarsRateLimit('auth:verify', { tier: 'public' }),
  asyncHandler(async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json(error('Token is required'));
    }
    const result = verifyMagicToken(token);
    if (!result) {
      return res.status(401).json(error('Invalid or expired token'));
    }
    res.cookie('scholars_session', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json(success({ sessionId: result.sessionId, user: result.user }));
  })
);

router.get(
  '/auth/session',
  createScholarsRateLimit('auth:session', { tier: 'public' }),
  asyncHandler(async (req, res) => {
    const sessionId = req.cookies?.scholars_session || req.headers['x-scholars-session'];
    if (!sessionId) return res.json(success({ user: null }));
    const session = getSession(sessionId);
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
  asyncHandler(async (req, res) => {
    const temple = getTempleByEntryId(req.params.id);
    if (!temple) return res.status(404).json(error('Temple not found', 404));
    const manifest = generateBlankManifest(req.params.id);
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
    if (!canSubmitEdit(req.user)) {
      return res.status(403).json(error('You do not have permission to submit edits'));
    }
    const temple = getTempleByEntryId(req.params.id);
    if (!temple) return res.status(404).json(error('Temple not found', 404));
    if (temple.is_frozen) return res.status(403).json(error('This temple is currently frozen'));

    const section = getSectionByTempleAndKey(temple.id, req.params.key);
    if (!section) return res.status(404).json(error('Section not found', 404));

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
  '/edits/:id',
  requireAuth,
  createScholarsRateLimit('edits:detail'),
  asyncHandler(async (req, res) => {
    const edit = getEditById(Number(req.params.id));
    if (!edit) return res.status(404).json(error('Edit not found', 404));
    res.json(success(edit));
  })
);

// ─────────────────────────────────────────────────────────────
// Reviews
// ─────────────────────────────────────────────────────────────

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
    const editInstitutionId = author ? author.institution_id : null;
    if (!canReviewEdit(req.user, editInstitutionId)) {
      return res.status(403).json(error('You cannot review edits from this institution'));
    }

    const { comment = '' } = req.body || {};

    withTransaction(() => {
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
          institutionId: editInstitutionId,
          reviewerId: req.user.id,
        },
        diff: JSON.stringify({
          previousBody,
          previousSources,
          previousMedia,
        }),
      });
    });

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
    const editInstitutionId = author ? author.institution_id : null;
    if (!canReviewEdit(req.user, editInstitutionId)) {
      return res.status(403).json(error('You cannot review edits from this institution'));
    }

    const { comment = '', status = 'rejected' } = req.body || {};
    const finalStatus = status === 'needs_revision' ? 'needs_revision' : 'rejected';

    createReview({ editId: edit.id, reviewerId: req.user.id, decision: finalStatus, comment });
    updateEditStatus(edit.id, finalStatus, comment);

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
// Institution dashboard
// ─────────────────────────────────────────────────────────────

router.get(
  '/institution',
  requireAuth,
  requireRole('reviewer'),
  createScholarsRateLimit('institution:dashboard'),
  asyncHandler(async (req, res) => {
    const institutionId = req.user.institutionId;
    if (!institutionId) {
      return res.status(400).json(error('No institution is associated with this account'));
    }

    const institution = getInstitutionById(institutionId);
    if (!institution) return res.status(404).json(error('Institution not found', 404));

    const stats = {
      memberCount: countUsersByInstitution(institutionId),
      totalSubmitted: countEditsByInstitution(institutionId),
      approved: countEditsByInstitution(institutionId, { status: 'approved' }),
      pending: countEditsByInstitution(institutionId, { status: 'pending' }),
      attributedSections: countAttributedSectionsByInstitution(institutionId),
    };

    const users = listUsersByInstitution(institutionId).map((u) => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name,
      role: u.role,
      department: u.department,
      status: u.status,
    }));

    res.json(success({ institution, stats, users }));
  })
);

// ─────────────────────────────────────────────────────────────
// Media
// ─────────────────────────────────────────────────────────────

const ALLOWED_MEDIA_TYPES = ['image/webp', 'image/png', 'image/jpeg'];
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const UPLOAD_DIR =
  process.env.PUNYCODEX_SCHOLARS_UPLOAD_DIR ||
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
    if (!canSubmitEdit(req.user)) {
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
  asyncHandler(async (_req, res) => {
    const users = listUsers();
    res.json(success(users));
  })
);

router.get(
  '/institutions',
  requireAuth,
  requireCurator,
  createScholarsRateLimit('curator:institutions'),
  asyncHandler(async (_req, res) => {
    const institutions = listInstitutions();
    res.json(success(institutions));
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

module.exports = router;
